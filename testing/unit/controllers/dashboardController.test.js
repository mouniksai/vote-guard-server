// Unit tests for dashboardController.js
// Updated to use blockchainServiceV2 mocking (current controller implementation)

const dashboardController = require('../../../src/controllers/dashboardController');
const prisma = require('../../../src/config/db');
const blockchainService = require('../../../src/blockchain/blockchainServiceV2');

jest.mock('../../../src/config/db');
jest.mock('../../../src/blockchain/blockchainServiceV2');

describe('DashboardController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { user_id: 1 },
            ip: '127.0.0.1'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation();

        // Default blockchain mocks
        blockchainService.getElections.mockResolvedValue([]);
        blockchainService.getUserVotes.mockResolvedValue([]);
        blockchainService.getChainStatus.mockResolvedValue({ chainLength: 1, totalTransactions: 0 });
        blockchainService.hasUserVoted.mockResolvedValue(false);
        blockchainService.getElection.mockResolvedValue(null);
        blockchainService.getCandidates.mockResolvedValue([]);
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('getDashboardData', () => {
        it('should return complete dashboard data', async () => {
            const mockUser = {
                userId: 1,
                citizen: {
                    fullName: 'John Doe',
                    citizenId: 'CIT001',
                    constituency: 'District-1',
                    ward: 'Ward-A',
                    isRegistered: true
                }
            };

            const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
            const mockElection = {
                id: 1,
                title: 'General Election 2026',
                description: 'National election',
                status: 'LIVE',
                startTime: new Date(),
                endTime: futureDate
            };

            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getElections.mockResolvedValue([mockElection]);
            blockchainService.hasUserVoted.mockResolvedValue(false);
            blockchainService.getUserVotes.mockResolvedValue([]);

            await dashboardController.getDashboardData(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    userSession: expect.objectContaining({
                        name: 'John Doe',
                        citizenId: 'CIT001',
                        constituency: 'District-1',
                        ward: 'Ward-A',
                        verified: true
                    }),
                    activeElection: expect.objectContaining({
                        id: 1,
                        title: 'General Election 2026',
                        status: 'LIVE',
                        eligible: true
                    })
                })
            );
        });

        it('should return null for activeElection when none exists', async () => {
            const mockUser = {
                userId: 1,
                citizen: {
                    fullName: 'John Doe',
                    citizenId: 'CIT001',
                    constituency: 'District-1',
                    ward: 'Ward-A',
                    isRegistered: true
                }
            };

            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getElections.mockResolvedValue([]);

            await dashboardController.getDashboardData(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.activeElection).toBeNull();
        });

        it('should skip elections where user has already voted', async () => {
            const mockUser = {
                userId: 1,
                citizen: {
                    fullName: 'Test User',
                    citizenId: 'CIT002',
                    constituency: 'District-2',
                    ward: 'Ward-B',
                    isRegistered: true
                }
            };

            const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
            const mockElection = {
                id: 1,
                title: 'Test Election',
                status: 'LIVE',
                startTime: new Date(),
                endTime: futureDate
            };

            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getElections.mockResolvedValue([mockElection]);
            blockchainService.hasUserVoted.mockResolvedValue(true); // Already voted

            await dashboardController.getDashboardData(req, res);

            expect(blockchainService.hasUserVoted).toHaveBeenCalledWith(1, 1);
            const response = res.json.mock.calls[0][0];
            expect(response.activeElection).toBeNull();
        });

        it('should format voting history from blockchain', async () => {
            const mockUser = {
                userId: 1,
                citizen: {
                    fullName: 'User',
                    citizenId: 'CIT001',
                    constituency: 'District-1',
                    ward: 'Ward-A',
                    isRegistered: true
                }
            };

            const mockVotes = [
                {
                    id: 1,
                    electionId: 1,
                    candidateId: 1,
                    timestamp: new Date('2026-01-15T10:30:00Z'),
                    receiptHash: '0xreceipt123'
                }
            ];

            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getUserVotes.mockResolvedValue(mockVotes);
            blockchainService.getElection.mockResolvedValue({
                id: 1,
                title: 'Test Election'
            });
            blockchainService.getCandidates.mockResolvedValue([
                { id: 1, name: 'Test Candidate' }
            ]);

            await dashboardController.getDashboardData(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.history[0]).toMatchObject({
                id: 1,
                election: 'Test Election',
                candidate: 'Test Candidate',
                receiptHash: '0xreceipt123',
                status: 'Confirmed on Blockchain'
            });
        });

        it('should return 404 when user not found', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await dashboardController.getDashboardData(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'User not found'
            });
        });

        it('should handle database errors gracefully', async () => {
            prisma.user.findUnique.mockRejectedValue(new Error('Database error'));

            await dashboardController.getDashboardData(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Server Error'
            });
        });

        it('should include blockchain chain status', async () => {
            const mockUser = {
                userId: 1,
                citizen: {
                    fullName: 'User',
                    citizenId: 'CIT001',
                    constituency: 'District-1',
                    ward: 'Ward-A',
                    isRegistered: true
                }
            };

            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getChainStatus.mockResolvedValue({
                chainLength: 5,
                totalTransactions: 10
            });

            await dashboardController.getDashboardData(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.blockchain).toEqual({
                chainLength: 5,
                totalTransactions: 10
            });
        });

        it('should calculate time remaining correctly for active election', async () => {
            const mockUser = {
                userId: 1,
                citizen: {
                    fullName: 'User',
                    citizenId: 'CIT001',
                    constituency: 'District-1',
                    ward: 'Ward-A',
                    isRegistered: true
                }
            };

            const futureTime = new Date(Date.now() + 3 * 60 * 60 * 1000 + 30 * 60 * 1000);
            const mockElection = {
                id: 1,
                title: 'Active Election',
                description: 'Desc',
                status: 'LIVE',
                startTime: new Date(),
                endTime: futureTime
            };

            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getElections.mockResolvedValue([mockElection]);
            blockchainService.hasUserVoted.mockResolvedValue(false);

            await dashboardController.getDashboardData(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.activeElection.endsIn).toMatch(/03h : \d{2}m/);
        });
    });
});
