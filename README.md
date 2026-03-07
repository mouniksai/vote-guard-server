---
title: VoteGuard Backend
emoji: ⚙️
colorFrom: green
colorTo: green
sdk: docker
pinned: false
---

# ⚙️ VoteGuard Server

![Node.js](https://img.shields.io/badge/Node.js-v18-green?style=flat&logo=node.js)
![Express.js](https://img.shields.io/badge/Express-5.x-white?style=flat&logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=flat&logo=postgresql)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?style=flat&logo=prisma)
![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-3C3C3D?style=flat&logo=ethereum)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat)

The backend API powering VoteGuard — handles authentication, election management, secure vote casting, blockchain integration, and government registry verification.

> 📚 **[Full API Documentation →](https://mouniksai.github.io/voteguard-docs/)**

---

## Tech Stack

| Component | Technology | Purpose |
|:---|:---|:---|
| Runtime | Node.js 18 | Server-side JavaScript |
| Framework | Express.js 5 | REST API routing |
| Database | PostgreSQL (Supabase) | Identity & auth storage |
| ORM | Prisma | Type-safe database access |
| Blockchain | Ethereum Sepolia | Immutable vote storage |
| Smart Contracts | Solidity 0.8.20 + Hardhat | Election/vote logic |
| Auth | JWT + bcrypt + OTP | Token auth & password hashing |
| Encryption | RSA-2048 | Key exchange for secure comms |
| Email | Nodemailer | OTP delivery |

## Project Structure

```
vote-guard-server/
├── contracts/              # Solidity smart contracts
│   └── VoteGuardBlockchain.sol
├── prisma/
│   └── schema.prisma       # Database schema (GovtRegistry + User)
├── src/
│   ├── blockchain/         # Sepolia blockchain service
│   ├── config/             # Database & env config
│   ├── controllers/        # Business logic (7 controllers)
│   ├── middleware/          # Auth & role-based access
│   ├── routes/             # API route definitions (8 modules)
│   └── utils/              # Crypto, email, encoding, keys
├── __tests__/              # Jest test suites
├── server.js               # Entry point
└── package.json
```

## Quick Start

```bash
npm install
cp .env.example .env        # Configure your keys
npx prisma generate
npx prisma db push
npm run dev
```

## API Endpoints

### 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `POST` | `/verify-citizen` | Public | Verify Citizen ID against government registry |
| `POST` | `/register` | Public | Register new user with verified Citizen ID |
| `POST` | `/login` | Public | Authenticate user, triggers OTP via email |
| `POST` | `/verify-otp` | Public | Verify 2FA OTP and issue JWT token |
| `POST` | `/logout` | 🔒 | Clear session cookie |

### ⚙️ Admin (`/api/admin`)

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/validate-token` | 🛡 Admin | Validate admin JWT token |
| `GET` | `/stats` | 🛡 Admin | System-wide statistics |
| `GET` | `/elections` | 🛡 Admin | List elections for dropdowns |
| `POST` | `/create-election` | 🛡 Admin | Create election on blockchain |
| `POST` | `/add-candidate` | 🛡 Admin | Add candidate to election |

### 🗳️ Elections (`/api/elections`)

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/results` | 🔒 | All election results & history |
| `GET` | `/:id/details` | 🔒 | Detailed results for specific election |

### ✅ Voting (`/api/vote`)

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/ballot` | Public | Active elections & candidates |
| `POST` | `/cast` | 🔒 | Cast encrypted vote on blockchain |
| `POST` | `/verify-receipt` | 🔒 | Verify encoded vote receipt |
| `POST` | `/verify-signature` | Public | Verify digital signature |
| `GET` | `/decrypt/:voteId` | 🔒 | Decrypt vote details (demo) |

### 📊 Dashboard (`/api/dashboard`)

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/` | 🔒 | User's dashboard data & stats |

### 🔍 Verification (`/api/verification`)

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `POST` | `/face` | 🔒 | Face recognition verification |
| `POST` | `/token` | 🔒 | Validate verification token |

### 🔑 Key Exchange (`/api/keys`)

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/public-key` | Public | Server's RSA-2048 public key (PEM) |
| `GET` | `/info` | Public | Key exchange mechanism details |

### ⛓️ Blockchain (`/api/blockchain`)

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/status` | Public | Blockchain connection status |
| `GET` | `/validate` | Public | Validate chain integrity |
| `GET` | `/verify/:receiptHash` | Public | Verify vote by receipt hash |
| `GET` | `/chain` | 🛡 Admin | Full blockchain data |
| `GET` | `/block/:index` | 🔒 | Get specific block by index |

## Commands

```bash
npm run dev          # Start with nodemon
npm start            # Production mode
npm run test         # Jest tests with coverage
npx hardhat compile  # Compile smart contracts
npx hardhat test     # Test smart contracts
```

## License

MIT License
