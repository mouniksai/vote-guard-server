// Unit tests for electionController.js
// Updated to use blockchainServiceV2 mocking (current implementation)

const electionController = require('../../../src/controllers/electionController');
const prisma = require('../../../src/config/db');
const blockchainService = require('../../../src/blockchain/blockchainServiceV2');

jest.mock('../../../src/config/db');
jest.mock('../../../src/blockchain/blockchainServiceV2');

describe('ElectionController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { user_id: 1 },
            params: {},
            ip: '127.0.0.1'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation();
        jest.spyOn(console, 'log').mockImplementation();

        // Default blockchain mocks
        blockchainService.getElections.mockResolvedValue([]);
        blockchainService.getElection.mockResolvedValue(null);
        blockchainService.getCandidates.mockResolvedValue([]);
        blockchainService.getVotesByElection.mockResolvedValue([]);
        blockchainService.hasUserVoted.mockResolvedValue(false);
    });

    afterEach(() => {
        console.error.mockRestore();
        console.log.mockRestore();
    });

    describe('getElectionResults', () => {
        it('should return election results for user constituency', async () => {
            const mockUser = {
                userId: 1,
                citizen: { constituency: 'District-1' }
            };

            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getElections.mockResolvedValue([
                {
                    id: 1,
                    title: 'Election 2026',
                    status: 'ENDED',
                    constituency: 'District-1',
                    endTime: new Date()
                }
            ]);
            blockchainService.getCandidates.mockResolvedValue([
                { id: 1, name: 'Candidate A', party: 'Party X', voteCount: 100 },
                { id: 2, name: 'Candidate B', party: 'Party Y', voteCount: 80 }
            ]);
            blockchainService.getVotesByElection.mockResolvedValue([]);

            await electionController.getElectionResults(req, res);

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { userId: 1 },
                include: { citizen: true }
            });
            expect(blockchainService.getElections).toHaveBeenCalledWith({
                constituency: 'District-1'
            });
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                elections: expect.any(Array),
                summary: expect.objectContaining({
                    total: 1
                })
            }));
        });

        it('should calculate total votes correctly', async () => {
            const mockUser = {
                userId: 1,
                citizen: { constituency: 'District-1' }
            };

            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getElections.mockResolvedValue([
                {
                    id: 1,
                    title: 'Election',
                    status: 'ENDED',
                    constituency: 'District-1',
                    endTime: new Date()
                }
            ]);
            blockchainService.getCandidates.mockResolvedValue([
                { id: 1, name: 'A', voteCount: 50 },
                { id: 2, name: 'B', voteCount: 30 },
                { id: 3, name: 'C', voteCount: 20 }
            ]);
            blockchainService.getVotesByElection.mockResolvedValue([]);

            await electionController.getElectionResults(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.elections[0].totalVotes).toBe(100);
        });

        it('should identify winner for ended elections', async () => {
            const mockUser = {
                userId: 1,
                citizen: { constituency: 'District-1' }
            };

            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getElections.mockResolvedValue([
                {
                    id: 1,
                    title: 'Election',
                    status: 'ENDED',
                    constituency: 'District-1',
                    endTime: new Date()
                }
            ]);
            blockchainService.getCandidates.mockResolvedValue([
                { id: 1, name: 'Winner', voteCount: 100 },
                { id: 2, name: 'Runner-up', voteCount: 50 }
            ]);
            blockchainService.getVotesByElection.mockResolvedValue([]);

            await electionController.getElectionResults(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.elections[0].winner.name).toBe('Winner');
            expect(response.elections[0].winner.voteCount).toBe(100);
        });

        it('should calculate time remaining for live elections', async () => {
            const mockUser = {
                userId: 1,
                citizen: { constituency: 'District-1' }
            };

            const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getElections.mockResolvedValue([
                {
                    id: 1,
                    title: 'Live Election',
                    status: 'LIVE',
                    constituency: 'District-1',
                    endTime: futureTime
                }
            ]);
            blockchainService.getCandidates.mockResolvedValue([]);
            blockchainService.getVotesByElection.mockResolvedValue([]);

            await electionController.getElectionResults(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.elections[0].timeRemaining).toMatch(/\d{2}h : \d{2}m/);
        });

        it('should return 404 when user not found', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await electionController.getElectionResults(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "User not found"
            });
        });
    });

    describe('getElectionDetails', () => {
        it('should return detailed election results from blockchain', async () => {
            req.params = { id: '1' };

            blockchainService.getElection.mockResolvedValue({
                id: '1',
                title: 'General Election',
                description: 'Description',
                status: 'ENDED',
                constituency: 'District-1',
                startTime: new Date(),
                endTime: new Date()
            });
            blockchainService.getCandidates.mockResolvedValue([
                { id: 1, name: 'Candidate A', party: 'Party X', voteCount: 150 }
            ]);
            blockchainService.getVotesByElection.mockResolvedValue([
                { userId: 1, timestamp: new Date() },
                { userId: 2, timestamp: new Date() }
            ]);
            blockchainService.hasUserVoted.mockResolvedValue(false);

            await electionController.getElectionDetails(req, res);

            expect(blockchainService.getElection).toHaveBeenCalledWith('1');
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    totalVotes: 150
                })
            );
        });

        it('should return 404 when election not found', async () => {
            req.params = { id: '999' };
            blockchainService.getElection.mockResolvedValue(null);

            await electionController.getElectionDetails(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});
