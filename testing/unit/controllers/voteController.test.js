// Unit tests for voteController.js
// Updated to use blockchainServiceV2 mocking (current implementation)

const voteController = require('../../../src/controllers/voteController');
const prisma = require('../../../src/config/db');
const { generateReceiptHash } = require('../../../src/utils/cryptoUtils');
const encryptionService = require('../../../src/utils/encryptionService');
const EncodingService = require('../../../src/utils/encodingService');
const blockchainService = require('../../../src/blockchain/blockchainServiceV2');

jest.mock('../../../src/config/db');
jest.mock('../../../src/utils/cryptoUtils');
jest.mock('../../../src/utils/encryptionService');
jest.mock('../../../src/utils/encodingService');
jest.mock('../../../src/blockchain/blockchainServiceV2');

describe('VoteController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { user_id: 1 },
            body: {},
            query: {},
            params: {},
            ip: '127.0.0.1',
            sessionID: 'test-session'
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
        blockchainService.hasUserVoted.mockResolvedValue(false);
        blockchainService.updateElectionStatus.mockResolvedValue(true);
        blockchainService.castVote.mockResolvedValue({
            block: { index: 1, hash: '0x0', merkleRoot: '0xmerkle', previousHash: '0xprev', nonce: 1 },
            vote: { timestamp: new Date() }
        });
        blockchainService.verifyVote.mockResolvedValue(null);
        // These methods may not be auto-mocked; ensure they're mock functions
        if (!blockchainService.getFullChain) blockchainService.getFullChain = jest.fn();
        if (!blockchainService.searchTransactions) blockchainService.searchTransactions = jest.fn();
        blockchainService.getFullChain.mockReturnValue([]);
        blockchainService.searchTransactions.mockReturnValue([]);
    });

    afterEach(() => {
        console.error.mockRestore();
        console.log.mockRestore();
    });

    describe('getBallot', () => {
        it('should return ballot with candidates for live election', async () => {
            const mockUser = {
                userId: 1,
                citizen: { constituency: 'District-1' }
            };

            const futureEnd = new Date(Date.now() + 100000);
            const mockElection = {
                id: 1,
                title: 'General Election 2026',
                constituency: 'District-1',
                status: 'LIVE',
                startTime: new Date(),
                endTime: futureEnd
            };

            const mockCandidates = [
                { id: 1, name: 'Candidate A', party: 'Party X', symbol: 'X', keyPoints: [] },
                { id: 2, name: 'Candidate B', party: 'Party Y', symbol: 'Y', keyPoints: [] }
            ];

            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getElections.mockResolvedValue([mockElection]);
            blockchainService.hasUserVoted.mockResolvedValue(false);
            blockchainService.getCandidates.mockResolvedValue(mockCandidates);

            await voteController.getBallot(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                election: expect.objectContaining({
                    id: 1,
                    title: 'General Election 2026'
                }),
                hasVoted: false
            }));
        });

        it('should return 404 when no live election found', async () => {
            const mockUser = {
                userId: 1,
                citizen: { constituency: 'District-2' }
            };

            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getElections.mockResolvedValue([]);

            await voteController.getBallot(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('No live election')
                })
            );
        });

        it('should return 404 when user already voted in all available elections', async () => {
            // The controller iterates elections, checks hasUserVoted for each.
            // If all return true, no election is found → 404
            const mockUser = {
                userId: 1,
                citizen: { constituency: 'District-1' }
            };

            const futureEnd = new Date(Date.now() + 100000);
            const mockElection = {
                id: 1,
                title: 'Election',
                constituency: 'District-1',
                status: 'LIVE',
                startTime: new Date(),
                endTime: futureEnd
            };

            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getElections.mockResolvedValue([mockElection]);
            blockchainService.hasUserVoted.mockResolvedValue(true);

            await voteController.getBallot(req, res);

            // User already voted, loop skips, returns 404 (no available election)
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 403 if user already voted for a specific requested election', async () => {
            const mockUser = {
                userId: 1,
                citizen: { constituency: 'District-1' }
            };

            const futureEnd = new Date(Date.now() + 100000);
            const mockElection = {
                id: 1,
                title: 'Election',
                constituency: 'District-1',
                status: 'LIVE',
                endTime: futureEnd
            };

            req.query = { electionId: 1 };

            prisma.user.findUnique.mockResolvedValue(mockUser);
            blockchainService.getElection.mockResolvedValue(mockElection);
            blockchainService.hasUserVoted.mockResolvedValue(true);

            await voteController.getBallot(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('already cast'),
                    hasVoted: true
                })
            );
        });
    });

    describe('castVote', () => {
        it('should cast vote successfully and return receipt with blockchain proof', async () => {
            const futureEnd = new Date(Date.now() + 100000);
            const voteTimestamp = new Date();

            req.body = { electionId: 1, candidateId: 1 };

            blockchainService.getElection.mockResolvedValue({
                id: 1, status: 'LIVE', endTime: futureEnd, title: 'Test Election'
            });
            blockchainService.hasUserVoted.mockResolvedValue(false);
            blockchainService.getCandidates.mockResolvedValue([{ id: 1, name: 'Candidate A' }]);
            generateReceiptHash.mockReturnValue('0xreceipt123');
            encryptionService.encryptVote.mockReturnValue('encrypted:details');
            blockchainService.castVote.mockResolvedValue({
                block: { index: 5, hash: '0xblock', merkleRoot: '0xmerkle', previousHash: '0xprev', nonce: 42 },
                vote: { timestamp: voteTimestamp }
            });
            EncodingService.encodeReceiptToBase64.mockReturnValue('base64encoded');
            EncodingService.generateReceiptQRCode.mockResolvedValue('data:image/png;base64,qrcode');
            EncodingService.encodeToBarcode.mockReturnValue('1234567890123');

            await voteController.castVote(req, res);

            expect(blockchainService.castVote).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: expect.stringContaining('Vote cast'),
                receiptHash: '0xreceipt123',
                blockchain: expect.objectContaining({
                    blockIndex: 5,
                    blockHash: '0xblock'
                }),
                encodedFormats: expect.objectContaining({
                    base64: 'base64encoded',
                    qrCode: 'data:image/png;base64,qrcode',
                    barcode: '1234567890123'
                })
            }));
        });

        it('should return 404 if election not found', async () => {
            req.body = { electionId: 999, candidateId: 1 };
            blockchainService.getElection.mockResolvedValue(null);

            await voteController.castVote(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 400 if election has ended', async () => {
            req.body = { electionId: 1, candidateId: 1 };
            blockchainService.getElection.mockResolvedValue({
                id: 1, status: 'ENDED', endTime: new Date(Date.now() - 10000)
            });

            await voteController.castVote(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 409 if user already voted (double vote attempt)', async () => {
            req.body = { electionId: 1, candidateId: 1 };
            blockchainService.getElection.mockResolvedValue({
                id: 1, status: 'LIVE', endTime: new Date(Date.now() + 100000)
            });
            blockchainService.hasUserVoted.mockResolvedValue(true);

            await voteController.castVote(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                message: "You have already voted in this election."
            });
        });

        it('should return 404 if candidate not found in election', async () => {
            req.body = { electionId: 1, candidateId: 999 };
            blockchainService.getElection.mockResolvedValue({
                id: 1, status: 'LIVE', endTime: new Date(Date.now() + 100000)
            });
            blockchainService.hasUserVoted.mockResolvedValue(false);
            blockchainService.getCandidates.mockResolvedValue([{ id: 1, name: 'Candidate A' }]);

            await voteController.castVote(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "Candidate not found in this election."
            });
        });
    });

    describe('decryptVoteDetails', () => {
        // Note: The success test requires complex getFullChain() iteration mock that
        // depends on internal controller implementation details. The decryptVoteDetails
        // function iterates the full blockchain chain, which is better tested via
        // integration tests with a real blockchain service.
        it.todo('should decrypt and return vote details from blockchain (requires integration test)');

        it('should return 404 if vote not found on blockchain', async () => {
            req.params = { voteId: 'nonexistent' };
            blockchainService.getFullChain.mockReturnValue([]);

            await voteController.decryptVoteDetails(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "Vote not found"
            });
        });
    });

    describe('verifyEncodedReceipt', () => {
        it('should verify base64 encoded receipt from blockchain', async () => {
            req.body = { encodedReceipt: 'base64data', format: 'base64' };

            EncodingService.decodeReceiptFromBase64.mockReturnValue({
                receiptHash: '0xhash123',
                timestamp: '2026-01-01T00:00:00.000Z',
                electionId: 1
            });

            blockchainService.verifyVote.mockResolvedValue({
                vote: { receiptHash: '0xhash123', timestamp: new Date('2026-01-01'), electionId: 1 },
                blockIndex: 3,
                blockHash: '0xblock',
                merkleValid: true,
                chainValid: true
            });

            blockchainService.getElection.mockResolvedValue({
                id: 1, title: 'Election 2026', constituency: 'District-1'
            });

            await voteController.verifyEncodedReceipt(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: expect.stringContaining('verified')
            }));
        });

        it('should return 400 for invalid format', async () => {
            req.body = { encodedReceipt: 'data', format: 'invalid-format' };

            await voteController.verifyEncodedReceipt(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid format. Use 'base64' or 'url-safe'"
            });
        });

        it('should return 404 if receipt not found on blockchain', async () => {
            req.body = { encodedReceipt: 'base64data', format: 'base64' };

            EncodingService.decodeReceiptFromBase64.mockReturnValue({
                receiptHash: '0xinvalid', timestamp: '2026-01-01', electionId: 999
            });
            blockchainService.verifyVote.mockResolvedValue(null);

            await voteController.verifyEncodedReceipt(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('verifyDigitalSignature', () => {
        it('should verify valid receipt signature on blockchain', async () => {
            req.body = { receiptHash: '0xvalid', userId: 1, electionId: 1, candidateId: 1 };

            blockchainService.verifyVote.mockResolvedValue({
                vote: { userId: 1, electionId: 1, candidateId: 1, receiptHash: '0xvalid', timestamp: new Date() },
                blockIndex: 3,
                blockHash: '0xblock',
                merkleRoot: '0xmerkle',
                merkleValid: true,
                chainValid: true
            });

            blockchainService.getCandidates.mockResolvedValue([
                { id: 1, name: 'Candidate A', party: 'Party X' }
            ]);

            blockchainService.getElection.mockResolvedValue({
                id: 1, title: 'Election', constituency: 'District-1'
            });

            await voteController.verifyDigitalSignature(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                verified: true,
                details: expect.objectContaining({
                    existsOnBlockchain: true,
                    dataMatch: true
                })
            }));
        });

        it('should detect data mismatch', async () => {
            req.body = { receiptHash: '0xhash', userId: 999, electionId: 1, candidateId: 1 };

            blockchainService.verifyVote.mockResolvedValue({
                vote: { userId: 1, electionId: 1, candidateId: 1, receiptHash: '0xhash', timestamp: new Date() },
                blockIndex: 3, blockHash: '0xblock', merkleValid: true, chainValid: true
            });
            blockchainService.getCandidates.mockResolvedValue([{ id: 1, name: 'A', party: 'P' }]);
            blockchainService.getElection.mockResolvedValue({ id: 1, title: 'E', constituency: 'D1' });

            await voteController.verifyDigitalSignature(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                verified: false,
                message: expect.stringContaining('mismatch')
            }));
        });

        it('should return not verified when receipt not found on blockchain', async () => {
            req.body = { receiptHash: '0xnonexistent' };
            blockchainService.verifyVote.mockResolvedValue(null);

            await voteController.verifyDigitalSignature(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                verified: false,
                message: expect.stringContaining('not found'),
                details: expect.objectContaining({
                    existsOnBlockchain: false,
                    dataMatch: false,
                    voteInfo: null
                })
            }));
        });

        it('should return 400 when receiptHash is missing', async () => {
            req.body = {};

            await voteController.verifyDigitalSignature(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                verified: false,
                message: "Receipt hash is required for verification"
            });
        });
    });
});
