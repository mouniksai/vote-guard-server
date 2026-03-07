---
title: VoteGuard Backend
emoji: ⚙️
colorFrom: green
colorTo: green
sdk: docker
pinned: false
---

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Ethereum-Sepolia-3C3C3D?style=for-the-badge&logo=ethereum" alt="Ethereum" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

# VoteGuard Server

The backend REST API for the [VoteGuard](https://github.com/mouniksai/vote-guard) electronic voting system. Handles user authentication, election lifecycle management, secure vote casting, blockchain integration, and government registry verification.

> **[Full API Documentation →](https://mouniksai.github.io/voteguard-docs/)** — Interactive endpoint reference with request/response examples.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [API Endpoints](#api-endpoints)
- [Commands](#commands)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Tech Stack

| Component | Technology | Purpose |
|:---|:---|:---|
| Runtime | Node.js 18 | Server-side JavaScript execution |
| Framework | Express.js 5 | REST API routing and middleware |
| Database | PostgreSQL (Supabase) | User identity and authentication storage |
| ORM | Prisma | Type-safe, auto-generated database client |
| Blockchain | Ethereum Sepolia | Immutable vote and election storage |
| Smart Contracts | Solidity 0.8.20, Hardhat | On-chain election and voting logic |
| Authentication | JWT, bcryptjs | Token-based sessions, password hashing |
| 2FA | Nodemailer, crypto | Email OTP generation and delivery |
| Encryption | RSA-2048 | Asymmetric key exchange for secure comms |

---

## Project Structure

```
vote-guard-server/
├── contracts/                  # Solidity smart contracts
│   └── VoteGuardBlockchain.sol # Main voting contract (deployed on Sepolia)
├── prisma/
│   └── schema.prisma           # Database schema (GovtRegistry, User)
├── src/
│   ├── blockchain/             # Sepolia blockchain service (ethers.js v6)
│   ├── config/                 # Database connection, environment config
│   ├── controllers/            # Request handlers and business logic
│   │   ├── authController.js       # Registration, login, OTP, logout
│   │   ├── adminController.js      # Election/candidate management, stats
│   │   ├── voteController.js       # Vote casting, receipt verification
│   │   ├── electionController.js   # Election results, status automation
│   │   ├── dashboardController.js  # User dashboard data
│   │   ├── verificationController.js # Face and token verification
│   │   └── blockchainController.js # Chain status, block explorer
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT token verification
│   │   └── roleMiddleware.js       # Role-based access control (admin)
│   ├── routes/                 # Express route definitions (8 modules)
│   └── utils/                  # Crypto, email, encoding, key exchange
├── __tests__/                  # Jest test suites
├── server.js                   # Application entry point
├── hardhat.config.js           # Hardhat configuration
└── package.json                # Dependencies and scripts
```

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- PostgreSQL database (local or [Supabase](https://supabase.com/) free tier)
- Alchemy API key ([Get one free](https://dashboard.alchemy.com/))
- MetaMask wallet with Sepolia ETH

### Installation

```bash
git clone https://github.com/mouniksai/vote-guard-server.git
cd vote-guard-server
npm install
```

---

## Environment Configuration

Create a `.env` file in the root directory:

```env
# Server
PORT=5001

# Database
DATABASE_URL="postgresql://user:password@host:5432/vote_guard?schema=public"

# Blockchain
BLOCKCHAIN_NETWORK=sepolia
CONTRACT_ADDRESS=0xE08b2c325F4e64DDb7837b6a4b1443935473ECB2
ALCHEMY_API_KEY=your_alchemy_api_key
SEPOLIA_PRIVATE_KEY=your_wallet_private_key

# Security
JWT_SECRET=your_jwt_secret

# Email Service (OTP delivery)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

> **Note:** For Gmail, generate an [App Password](https://myaccount.google.com/apppasswords) — your regular password will not work with Nodemailer.

---

## Database Setup

VoteGuard uses Prisma ORM. Only identity and authentication data is stored in PostgreSQL — all voting data lives on the blockchain.

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Create versioned migration (production)
npx prisma migrate dev --name init
```

### Schema Models

| Model | Table | Fields | Purpose |
|:---|:---|:---|:---|
| `GovtRegistry` | `govt_registry` | citizenId, fullName, constituency, DOB, email, mobile | Government citizen records |
| `User` | `users` | userId, username, passwordHash, role, otpCode, citizenId | Registered voter accounts |

---

## API Endpoints

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `POST` | `/verify-citizen` | Public | Verify Citizen ID against government registry |
| `POST` | `/register` | Public | Register new user with verified Citizen ID |
| `POST` | `/login` | Public | Authenticate user, triggers email OTP |
| `POST` | `/verify-otp` | Public | Verify 2FA OTP code and issue JWT |
| `POST` | `/logout` | Required | Clear session cookie |

### Admin — `/api/admin`

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/validate-token` | Admin | Validate admin JWT token |
| `GET` | `/stats` | Admin | System-wide statistics |
| `GET` | `/elections` | Admin | List all elections (for dropdowns) |
| `POST` | `/create-election` | Admin | Create election on blockchain |
| `POST` | `/add-candidate` | Admin | Add candidate to an election |

### Elections — `/api/elections`

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/results` | Required | All election results and history |
| `GET` | `/:id/details` | Required | Detailed results for a specific election |

### Voting — `/api/vote`

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/ballot` | Public | Active elections and candidates |
| `POST` | `/cast` | Required | Cast encrypted vote on blockchain |
| `POST` | `/verify-receipt` | Required | Verify encoded vote receipt |
| `POST` | `/verify-signature` | Public | Verify digital signature on vote |
| `GET` | `/decrypt/:voteId` | Required | Decrypt vote details (demo) |

### Dashboard — `/api/dashboard`

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/` | Required | User dashboard data and statistics |

### Verification — `/api/verification`

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `POST` | `/face` | Required | Face recognition verification |
| `POST` | `/token` | Required | Validate verification token |

### Key Exchange — `/api/keys`

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/public-key` | Public | Server's RSA-2048 public key (PEM format) |
| `GET` | `/info` | Public | Key exchange mechanism details |

### Blockchain — `/api/blockchain`

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/status` | Public | Blockchain connection status |
| `GET` | `/validate` | Public | Validate chain integrity |
| `GET` | `/verify/:receiptHash` | Public | Verify vote by receipt hash |
| `GET` | `/chain` | Admin | Full blockchain data |
| `GET` | `/block/:index` | Required | Get specific block by index |

---

## Commands

```bash
npm run dev          # Development server with auto-restart (nodemon)
npm run start        # Production server
npm run test         # Run all tests with coverage
npm run test:unit    # Run unit tests only
npm run test:watch   # Watch mode for tests
```

### Smart Contracts

```bash
npx hardhat compile  # Compile Solidity contracts
npx hardhat test     # Run contract test suite
```

---

## Testing

The project uses **Jest** with **Supertest** for API testing.

```bash
# Run full test suite with coverage
npm run test

# Run only unit tests
npm run test:unit

# Watch mode
npm run test:watch
```

Test files are located in `__tests__/` and follow the naming convention `*.test.js`.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is licensed under the **MIT License**.
