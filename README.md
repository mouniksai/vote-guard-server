---
title: VoteGuard Backend
emoji: ⚙️
colorFrom: green
colorTo: green
sdk: docker
pinned: false
---

# Vote Guard Server

![Node.js](https://img.shields.io/badge/Node.js-v18-green?style=flat&logo=node.js)
![Express.js](https://img.shields.io/badge/Framework-Express-white?style=flat&logo=express)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=flat&logo=postgresql)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?style=flat&logo=prisma)
![License](https://img.shields.io/badge/License-ISC-blue?style=flat)

**Vote Guard Server** is the robust backend API powering the Vote Guard electronic voting system. It orchestrates user authentication, election lifecycle management, secure vote casting, and integration with simulated government registries to ensure election integrity.

Built with **Node.js** and **Express**, it leverages **Prisma ORM** with **PostgreSQL** to provide type-safe, scalable data management.

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

---

## Features

###  Secure Authentication & Integrity
* **JWT Session Management:** Stateless authentication using JSON Web Tokens.
* **Secure Hashing:** Passwords are hashed using `bcryptjs` for maximum security.
* **HttpOnly Cookies:** Secure cookie-based session handling to prevent XSS attacks.
* **Audit Logging:** Comprehensive logs for non-repudiation and forensic audit trails.

###  Election Management
* **Lifecycle Automation:** Automated transitions for election statuses (Upcoming → Live → Ended).
* **Candidate Control:** Management of candidate profiles, manifestos, and metadata.
* **Simulated Registry:** Integration with a mock government registry to validate Citizen IDs.

###  Secure Voting Engine
* **Double-Voting Prevention:** Enforced via composite unique constraints at the database level.
* **Receipt Generation:** Cryptographic receipt hashes generated for every cast vote.

---

## Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Runtime** | Node.js | Server-side JavaScript runtime |
| **Framework** | Express.js | Minimalist web framework for API routing |
| **Database** | PostgreSQL | Primary relational database system |
| **ORM** | Prisma | Modern, type-safe ORM for Node.js |
| **Auth** | JWT & Bcrypt | Token-based auth and password hashing |
| **Utilities** | Nodemailer | Email service for OTP delivery |

---

## Project Structure

```
vote-guard-server/
├── prisma/                 # Database schema and migrations
│   └── schema.prisma       # Prisma schema definition
├── src/
│   ├── config/             # Configuration (DB, env variables)
│   ├── controllers/        # Business logic & request handlers
│   ├── middleware/         # Express middleware (Auth, Validation)
│   ├── routes/             # API route definitions
│   └── utils/              # Helper functions & shared logic
├── server.js               # Application entry point
└── package.json            # Dependencies and scripts

```

## Getting Started
Prerequisites

    Node.js (v18 or higher)

    PostgreSQL database instance running locally or in the cloud.

Installation

  Clone the repository and navigate to the directory:
  ```
    git clone [https://github.com/your-username/vote-guard-server.git](https://github.com/your-username/vote-guard-server.git)
    cd vote-guard-server
  ```

  Install dependencies:
  
```
    npm install
```

## Environment Configuration

Create a .env file in the root directory based on the following template:
Code snippet

```

# Server Configuration
PORT=5001

# Database Connection
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
DATABASE_URL="postgresql://user:password@localhost:5432/vote_guard?schema=public"

# Security Secrets
JWT_SECRET="your_super_secret_jwt_key_here"

# Email Service (Optional for Development)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-email-app-password"

```

 ## Database Setup

We use Prisma to manage the database schema.

Generate the Prisma Client:
```
 npx prisma generate
```

 Run Migrations:

Development (Prototyping):
 ```
  npx prisma db push
```

 Production (Versioning):
```
npx prisma migrate dev --name init
```
 Running the Server

Development Mode (with auto-restart via Nodemon):
```
 npm run dev
```

Production Mode:
```
npm start
```
The server will start on http://localhost:5001.

##  API Endpoints

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user with Citizen ID |
| `POST` | `/api/auth/login` | Authenticate user and set session |
| `POST` | `/api/auth/verify-otp` | Verify Two-Factor Authentication OTP |
| `POST` | `/api/auth/logout` | Clear session cookie |

###  Elections
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/elections` | List all available elections |
| `GET` | `/api/elections/:id` | Get details of a specific election |

###  Voting
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/vote/cast` | Cast a secure vote for a candidate |

### Dashboard
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats` | Get user-specific voting statistics |

---

## Contributing

Contributions are welcome! Please follow these steps to contribute to the project:

1.  **Fork the repository.**
2.  Create a new feature branch:
    ```bash
    git checkout -b feature/AmazingFeature
    ```
3.  Commit your changes:
    ```bash
    git commit -m 'Add some AmazingFeature'
    ```
4.  Push to the branch:
    ```bash
    git push origin feature/AmazingFeature
    ```
5.  **Open a Pull Request.**

---

## License

This project is licensed under the **MIT License**.
