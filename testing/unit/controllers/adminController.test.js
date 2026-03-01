// Unit tests for adminController.js
// Updated to use blockchainServiceV2 mocking (current implementation)

const adminController = require('../../../src/controllers/adminController');
const prisma = require('../../../src/config/db');
const blockchainService = require('../../../src/blockchain/blockchainServiceV2');

jest.mock('../../../src/config/db');
jest.mock('../../../src/blockchain/blockchainServiceV2');

describe('AdminController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { user_id: 1 },
            body: {},
            ip: '127.0.0.1'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation();

        // Default blockchain mocks
        blockchainService.getChainStatus.mockResolvedValue({ chainLength: 1, totalTransactions: 0, isValid: true });
        blockchainService.getElections.mockResolvedValue([]);
        blockchainService.getElection.mockResolvedValue(null);
        blockchainService.addElection.mockResolvedValue({ block: { blockIndex: 1, blockHash: '0x0', transactionHash: '0xtx' }, election: { id: 1 } });
        blockchainService.addCandidate.mockResolvedValue({ block: { blockIndex: 2, blockHash: '0x1', transactionHash: '0xtx2' }, candidate: { id: 1 } });
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('validateToken', () => {
        it('should validate admin token and return user data', async () => {
            const mockUser = {
                userId: 1,
                username: 'admin',
                role: 'admin',
                citizenId: 'CIT001',
                citizen: {
                    fullName: 'Admin User',
                    email: 'admin@voteguard.com',
                    constituency: 'District-1'
                }
            };

            prisma.user.findUnique.mockResolvedValue(mockUser);

            await adminController.validateToken(req, res);

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { userId: 1 },
                select: expect.any(Object)
            });
            expect(res.json).toHaveBeenCalledWith({
                valid: true,
                user: {
                    user_id: 1,
                    email: 'admin@voteguard.com',
                    role: 'admin',
                    full_name: 'Admin User',
                    constituency: 'District-1',
                    username: 'admin'
                },
                message: "Token is valid"
            });
        });

        it('should return 404 when user not found', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await adminController.validateToken(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "User not found"
            });
        });

        it('should handle database errors', async () => {
            prisma.user.findUnique.mockRejectedValue(new Error('DB Error'));

            await adminController.validateToken(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Token validation error"
            });
        });
    });

    describe('getSystemStats', () => {
        it('should return system statistics from Prisma + blockchain', async () => {
            prisma.user.count.mockResolvedValue(150);
            blockchainService.getChainStatus.mockResolvedValue({
                chainLength: 10,
                totalTransactions: 120,
                isValid: true
            });
            blockchainService.getElections.mockResolvedValue([
                { id: 1, title: 'General Election 2026', status: 'LIVE' }
            ]);

            await adminController.getSystemStats(req, res);

            expect(prisma.user.count).toHaveBeenCalledWith({
                where: { role: 'voter' }
            });
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                totalVoters: 150,
                totalVotes: 120,
                activeElection: 'General Election 2026',
                status: 'System Operational',
                blockchain: expect.objectContaining({
                    chainLength: 10,
                    totalTransactions: 120
                })
            }));
        });

        it('should handle no active election', async () => {
            prisma.user.count.mockResolvedValue(100);
            blockchainService.getChainStatus.mockResolvedValue({ chainLength: 1, totalTransactions: 0, isValid: true });
            blockchainService.getElections.mockResolvedValue([]);

            await adminController.getSystemStats(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    activeElection: "No Live Election"
                })
            );
        });

        it('should handle errors', async () => {
            prisma.user.count.mockRejectedValue(new Error('Stats error'));

            await adminController.getSystemStats(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Stats Error"
            });
        });
    });

    describe('createElection', () => {
        it('should create new election on blockchain', async () => {
            const futureStart = new Date(Date.now() + 60000);
            const futureEnd = new Date(Date.now() + 120000);

            req.body = {
                title: 'New Election',
                description: 'Description',
                constituency: 'District-1',
                startTime: futureStart.toISOString(),
                endTime: futureEnd.toISOString()
            };

            blockchainService.getElections.mockResolvedValue([]);
            blockchainService.addElection.mockResolvedValue({
                block: { blockIndex: 1, blockHash: '0xhash', transactionHash: '0xtx' },
                election: { id: 1 }
            });

            await adminController.createElection(req, res);

            expect(blockchainService.addElection).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Election Created on Blockchain",
                electionId: 1
            }));
        });

        it('should return 400 for missing required fields', async () => {
            req.body = { title: 'Only Title' };

            await adminController.createElection(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Missing required fields"
            }));
        });

        it('should return 400 for past start time', async () => {
            req.body = {
                title: 'Election',
                description: 'Desc',
                constituency: 'District-1',
                startTime: new Date(Date.now() - 120000).toISOString(),
                endTime: new Date(Date.now() + 120000).toISOString()
            };

            await adminController.createElection(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Start time must be in the future"
            }));
        });

        it('should handle errors during election creation', async () => {
            const futureStart = new Date(Date.now() + 60000);
            const futureEnd = new Date(Date.now() + 120000);

            req.body = {
                title: 'Election',
                description: 'Desc',
                constituency: 'District-1',
                startTime: futureStart.toISOString(),
                endTime: futureEnd.toISOString()
            };

            blockchainService.getElections.mockResolvedValue([]);
            blockchainService.addElection.mockRejectedValue(new Error('Blockchain error'));

            await adminController.createElection(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Server Error"
            });
        });
    });

    describe('addCandidate', () => {
        it('should add candidate to election on blockchain', async () => {
            req.body = {
                electionId: 1,
                name: 'John Doe',
                party: 'Party X',
                symbol: 'X',
                keyPoints: ['Point 1', 'Point 2'],
                age: '45',
                education: 'MBA',
                experience: '10 years'
            };

            blockchainService.getElection.mockResolvedValue({ id: 1, title: 'Test Election' });
            blockchainService.addCandidate.mockResolvedValue({
                block: { blockIndex: 2, blockHash: '0xhash2', transactionHash: '0xtx2' },
                candidate: { id: 1, name: 'John Doe', party: 'Party X' }
            });

            await adminController.addCandidate(req, res);

            expect(blockchainService.addCandidate).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Candidate Added to Blockchain"
            }));
        });

        it('should return 404 when election not found', async () => {
            req.body = { electionId: 999, name: 'Test', party: 'P', symbol: 'S', age: '30', education: 'BSc', experience: '5 years' };
            blockchainService.getElection.mockResolvedValue(null);

            await adminController.addCandidate(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "Election not found on blockchain"
            });
        });

        it('should handle errors during candidate addition', async () => {
            req.body = { electionId: 1, name: 'Test', party: 'P', symbol: 'S', age: '30', education: 'BSc', experience: '5 years' };
            blockchainService.getElection.mockResolvedValue({ id: 1 });
            blockchainService.addCandidate.mockRejectedValue(new Error('Add failed'));

            await adminController.addCandidate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getElections', () => {
        it('should return all elections from blockchain', async () => {
            blockchainService.getElections.mockResolvedValue([
                { id: 1, title: 'Election 1', status: 'LIVE', constituency: 'D1', startTime: new Date(), endTime: new Date() },
                { id: 2, title: 'Election 2', status: 'ENDED', constituency: 'D2', startTime: new Date(), endTime: new Date() }
            ]);

            await adminController.getElections(req, res);

            expect(blockchainService.getElections).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ id: 1, title: 'Election 1', status: 'LIVE' }),
                    expect.objectContaining({ id: 2, title: 'Election 2', status: 'ENDED' })
                ])
            );
        });

        it('should handle empty election list', async () => {
            blockchainService.getElections.mockResolvedValue([]);

            await adminController.getElections(req, res);

            expect(res.json).toHaveBeenCalledWith([]);
        });

        it('should handle errors', async () => {
            blockchainService.getElections.mockRejectedValue(new Error('Fetch failed'));

            await adminController.getElections(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error fetching elections from blockchain"
            });
        });
    });
});
