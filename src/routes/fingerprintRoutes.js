const router = require('express').Router();
const fingerprintController = require('../controllers/fingerprintController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/fingerprint/challenge  — generates a WebAuthn challenge (auth required)
router.get('/challenge', authMiddleware, fingerprintController.getChallenge);

// POST /api/fingerprint/verify  — verifies a WebAuthn credential (auth required)
router.post('/verify', authMiddleware, fingerprintController.verifyFingerprint);

module.exports = router;
