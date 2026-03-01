// Integration tests for VoteGuard API routes
// Uses supertest to test Express endpoints end-to-end with mocked DB

const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

// ── Mocks ────────────────────────────────────────────────
jest.mock('../../src/config/db');
jest.mock('../../src/utils/emailService');
jest.mock('../../src/blockchain/blockchainServiceV2', () => ({
    initialize: jest.fn().mockResolvedValue(true),
    getElections: jest.fn().mockResolvedValue([]),
    getElection: jest.fn().mockResolvedValue(null),
    getCandidates: jest.fn().mockResolvedValue([]),
    hasUserVoted: jest.fn().mockResolvedValue(false),
    getUserVotes: jest.fn().mockResolvedValue([]),
    getChainStatus: jest.fn().mockResolvedValue({ chainLength: 1, totalTransactions: 1 }),
    getVotesByElection: jest.fn().mockResolvedValue([]),
    castVote: jest.fn().mockResolvedValue({ block: { index: 1, hash: '0x0' }, vote: { timestamp: new Date() } }),
    verifyVote: jest.fn().mockResolvedValue(null),
    updateElectionStatus: jest.fn().mockResolvedValue(true),
    getFullChain: jest.fn().mockReturnValue([]),
    searchTransactions: jest.fn().mockReturnValue([])
}));

const prisma = require('../../src/config/db');

// ── Helpers ──────────────────────────────────────────────
const generateTestToken = (payload = { user_id: 1, role: 'voter' }) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// ── Build a mini Express app with just the routes we need ───
let app;
let supertest;

beforeAll(() => {
    // Dynamically require supertest only if available
    try {
        supertest = require('supertest');
    } catch (e) {
        console.warn('supertest not installed – skipping integration tests');
    }

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', require('../../src/routes/authRoutes'));
    app.use('/api/admin', require('../../src/routes/adminRoutes'));
    app.use('/api/dashboard', require('../../src/routes/dashboardRoutes'));
});

// ── Helper to skip all tests when supertest is unavailable ───
const describeIf = (condition) => (condition ? describe : describe.skip);

describeIf(typeof supertest !== 'undefined')('API Integration Tests', () => {

    // ─────────────── Auth Routes ─────────────────────────
    describe('POST /api/auth/verify-citizen', () => {
        it('should return 404 for non-existent citizen', async () => {
            prisma.govtRegistry.findUnique.mockResolvedValue(null);

            const res = await supertest(app)
                .post('/api/auth/verify-citizen')
                .send({ citizenId: 'INVALID' });

            expect(res.status).toBe(404);
            expect(res.body.message).toContain('not found');
        });

        it('should return citizen data for valid citizenId', async () => {
            prisma.govtRegistry.findUnique.mockResolvedValue({
                citizenId: 'CIT001',
                fullName: 'John Doe',
                email: 'john@example.com',
                isRegistered: false
            });

            const res = await supertest(app)
                .post('/api/auth/verify-citizen')
                .send({ citizenId: 'CIT001' });

            expect(res.status).toBe(200);
            expect(res.body.citizenId).toBe('CIT001');
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should clear the cookie and return success', async () => {
            const res = await supertest(app)
                .post('/api/auth/logout');

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('Logged out');
        });
    });

    // ─────────────── Admin Routes ────────────────────────
    describe('GET /api/admin/validate-token', () => {
        it('should reject request without token', async () => {
            const res = await supertest(app)
                .get('/api/admin/validate-token');

            expect(res.status).toBe(401);
        });

        it('should validate admin token and return user info', async () => {
            const token = generateTestToken({ user_id: 1, role: 'admin' });

            prisma.user.findUnique.mockResolvedValue({
                userId: 1,
                username: 'admin',
                role: 'admin',
                citizenId: 'CIT001',
                citizen: {
                    fullName: 'Admin User',
                    email: 'admin@voteguard.com',
                    constituency: 'District-1'
                }
            });

            const res = await supertest(app)
                .get('/api/admin/validate-token')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.valid).toBe(true);
            expect(res.body.user.role).toBe('admin');
        });

        it('should reject voter trying to access admin route', async () => {
            const token = generateTestToken({ user_id: 2, role: 'voter' });

            const res = await supertest(app)
                .get('/api/admin/validate-token')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });
    });

    // ─────────────── Dashboard Routes ────────────────────
    describe('GET /api/dashboard', () => {
        it('should reject unauthenticated request', async () => {
            const res = await supertest(app)
                .get('/api/dashboard');

            expect(res.status).toBe(401);
        });

        it('should return dashboard data for authenticated user', async () => {
            const token = generateTestToken({ user_id: 1, role: 'voter' });

            prisma.user.findUnique.mockResolvedValue({
                userId: 1,
                citizen: {
                    fullName: 'John Doe',
                    citizenId: 'CIT001',
                    constituency: 'District-1',
                    ward: 'Ward-A',
                    isRegistered: true
                }
            });

            const blockchainService = require('../../src/blockchain/blockchainServiceV2');
            blockchainService.getElections.mockResolvedValue([]);
            blockchainService.getUserVotes.mockResolvedValue([]);
            blockchainService.getChainStatus.mockResolvedValue({
                chainLength: 1,
                totalTransactions: 1
            });

            const res = await supertest(app)
                .get('/api/dashboard')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.userSession).toBeDefined();
            expect(res.body.userSession.name).toBe('John Doe');
        });
    });
});
