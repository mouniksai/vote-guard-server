const crypto = require('crypto');
const prisma = require('../config/db');

/**
 * GET /api/fingerprint/challenge
 * Generates a random WebAuthn challenge for the client to use in navigator.credentials.create()
 * Requires: valid JWT session (authMiddleware)
 */
exports.getChallenge = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Fetch user to check if they have a registered fingerprint
        const user = await prisma.user.findUnique({
            where: { userId },
            include: { citizen: true }
        });

        if (!user || !user.citizen) {
            return res.status(404).json({ success: false, message: 'Citizen record not found' });
        }

        // 32 cryptographically random bytes → base64url encoded challenge
        const challengeBuffer = crypto.randomBytes(32);
        const challenge = challengeBuffer.toString('base64');
        const storedCredentialId = user.citizen.fingerprintCredentialId;

        console.log(`--> [Fingerprint] Challenge generated for user: ${userId} (Registered: ${!!storedCredentialId})`);

        return res.json({
            success: true,
            challenge,           // base64 string, frontend decodes to Uint8Array
            userId: userId,      // used as WebAuthn user.id handle
            isRegistered: !!storedCredentialId,
            storedCredentialId: storedCredentialId || null
        });

    } catch (error) {
        console.error('[Fingerprint] Challenge generation error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate fingerprint challenge'
        });
    }
};

/**
 * POST /api/fingerprint/verify
 * Accepts a WebAuthn credential produced by the platform authenticator.
 * - First scan:      stores credentialId in govt_registry.fingerprint_credential_id
 * - Subsequent scan: validates credentialId matches what is stored
 * Requires: valid JWT session (authMiddleware)
 * Body: { credentialId: string }
 */
exports.verifyFingerprint = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { credentialId } = req.body;

        if (!credentialId || typeof credentialId !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'No credential provided. Fingerprint scan may have failed.'
            });
        }

        console.log(`--> [Fingerprint] Credential received for user: ${userId}`);

        // 1. Fetch the user and their govt_registry record
        //    Same JOIN pattern as face verification (verificationController.js)
        const user = await prisma.user.findUnique({
            where: { userId },
            include: { citizen: true }   // citizen → govt_registry row
        });

        if (!user || !user.citizen) {
            return res.status(404).json({
                success: false,
                message: 'Voter record not found in Government Registry.'
            });
        }

        const storedCredentialId = user.citizen.fingerprintCredentialId;

        if (!storedCredentialId) {
            // --- FIRST REGISTRATION: no fingerprint stored yet ---
            // Store the new credentialId in govt_registry
            await prisma.govtRegistry.update({
                where: { citizenId: user.citizenId },
                data: { fingerprintCredentialId: credentialId }
            });

            console.log(`--> [Fingerprint] Credential registered for citizen: ${user.citizenId}`);

            return res.json({
                success: true,
                message: 'Fingerprint registered and verified successfully.'
            });

        } else {
            // --- SUBSEQUENT SCANS: validate credential matches stored value ---
            if (storedCredentialId !== credentialId) {
                console.warn(`--> [Fingerprint] Mismatch for user: ${userId}`);
                return res.status(401).json({
                    success: false,
                    message: 'Fingerprint does not match registered biometric. Access denied.'
                });
            }

            console.log(`--> [Fingerprint] Credential matched for user: ${userId}`);

            return res.json({
                success: true,
                message: 'Biometric verification successful.'
            });
        }

    } catch (error) {
        console.error('[Fingerprint] Verification error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Fingerprint verification failed due to a server error'
        });
    }
};
