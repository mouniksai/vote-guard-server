const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const electionController = require('./src/controllers/electionController');
const keyExchangeService = require('./src/utils/keyExchangeService');
const app = express();
require('dotenv').config();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // Your Next.js frontend URL
    credentials: true // Enable credentials (cookies)
}));
app.use(express.json());
app.use(cookieParser()); // Add cookie parser middleware

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/dashboard', require('./src/routes/dashboardRoutes'));
app.use('/api/vote', require('./src/routes/voteRoutes'));
app.use('/api/elections', require('./src/routes/electionRoutes'));
app.use('/api/verification', require('./src/routes/verificationRoutes'));
app.use('/api/keys', require('./src/routes/keyRoutes'));
app.use('/api/fingerprint', require('./src/routes/fingerprintRoutes'));

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`VoteGuard Server running on port ${PORT}`);
    // Initialize RSA key exchange mechanism
    keyExchangeService.generateKeyPair();
    // Start the automatic election status updater
    electionController.startElectionStatusUpdater();
});