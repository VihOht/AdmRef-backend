# AdmRef — Backend

This repository contains the backend API for AdmRef — a simple personal finance manager (accounts, transactions, categories, reports).

## Quickstart

Prerequisites

- Node.js 16+ (Node 18+ recommended)
- npm (or yarn)
- PostgreSQL (or a compatible DATABASE_URL)

Install dependencies

```bash
npm install
```

Environment

Create a `.env` file at the project root with the minimum required variables:

```env
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your_jwt_secret
PORT=3000

# SMTP config for nodemailer (example using a transactional SMTP provider)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
```

Notes:
- This project expects a running Postgres instance reachable via `DATABASE_URL`.
- `nodemailer` is used to send verification and notification emails. Configure the SMTP_* environment variables above to match your provider (SendGrid, Mailgun, SMTP relay, etc.). You can also combine Cloudflare Email Routing for inbound handling with any SMTP relay for outbound delivery.

Run (development)

If a dev script (e.g., using nodemon) is available in `package.json`:

```bash
npm run dev
```

Or run directly:

```bash
node main.js
# or
npm start
```

The API will be available at: http://localhost:$PORT (defaults to 3000 if not set)

Run tests

```bash
npm test
# or
npx jest
```

Project docs

See the project overview and main routes for detailed documentation:

- Project overview: `docs/project_overview.md`
- API routes: `docs/api_routes.md`

Quick links

- [Project Overview](./docs/project_overview.md)
- [API Routes](./docs/api_routes.md)

---

