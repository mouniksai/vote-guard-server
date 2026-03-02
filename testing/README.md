# VoteGuard Server — Test Suite

## Overview

Comprehensive unit, integration, and blockchain test suite for the VoteGuard e-voting system backend using **Jest** and **Hardhat**.

npx jest --testPathPattern="testing/unit" --no-coverage 2>&1

## Test Structure

```
testing/
├── setup.js                              # Test environment configuration
├── run-tests.ps1                         # Windows PowerShell test runner
├── mocks/
│   └── prismaMock.js                     # Prisma client mock
├── helpers/
│   └── testHelpers.js                    # Shared test utilities
├── unit/
│   ├── controllers/
│   │   ├── authController.test.js        # Login, Register, OTP, Logout
│   │   ├── adminController.test.js       # Token validation, Elections, Candidates
│   │   ├── dashboardController.test.js   # User dashboard data
│   │   ├── voteController.test.js        # Ballot, Cast Vote, Decrypt, Verify
│   │   ├── electionController.test.js    # Results, Details, Time calculation
│   │   └── verificationController.test.js# Face verification, Token validation
│   ├── middleware/
│   │   ├── authMiddleware.test.js        # JWT validation (header + cookies)
│   │   └── roleMiddleware.test.js        # Role-based access control
│   └── utils/
│       ├── cryptoUtils.test.js           # SHA-256 receipt hash generation
│       ├── emailService.test.js          # OTP email via nodemailer
│       ├── encodingService.test.js       # Base64, QR code, barcode
│       └── encryptionService.test.js     # AES-256-CBC encryption/decryption
├── integration/
│   └── api.test.js                       # API route integration tests
└── blockchain/
    └── VoteGuardBlockchain.test.js       # Hardhat smart contract tests
```

## Running Tests

### All unit tests
```powershell
npm test
```

### Using the PowerShell runner script
```powershell
.\testing\run-tests.ps1 all
.\testing\run-tests.ps1 coverage
.\testing\run-tests.ps1 controllers
.\testing\run-tests.ps1 middleware
.\testing\run-tests.ps1 utils
```

### Specific test file
```powershell
npx jest -- authController
```

### With coverage report
```powershell
npm test -- --coverage
```

## Test Coverage

| Category     | Files | Tests |
|------------- |-------|-------|
| Controllers  | 6     | 50+   |
| Middleware   | 2     | 25+   |
| Utilities    | 4     | 20+   |
| Integration  | 1     | 8+    |
| Blockchain   | 1     | 12+   |
| **Total**    | **14**| **115+** |

## Key Testing Strategies

1. **Database Mocking** — All Prisma calls are mocked via `prismaMock.js`
2. **Transaction Testing** — `prisma.$transaction` tested without real DB commits
3. **External API Mocking** — Face++ API and email via nodemailer are mocked
4. **Time-based Testing** — Elections and OTP expiry tested with controlled dates
5. **Security Testing** — JWT validation, role-based access, double-vote prevention

## Environment Variables

Tests use mock env vars configured in `setup.js`:
```
JWT_SECRET, AES_SECRET_KEY, EMAIL_USER, EMAIL_PASS, FACE_API_KEY, FACE_API_SECRET
```

> ⚠️ **These are NOT production secrets — never use real credentials in tests.**
