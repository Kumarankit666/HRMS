# HRMS Backend (Node.js + Express + PostgreSQL)

## 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally (or a cloud instance — Render/Railway/Supabase/Neon all offer free PostgreSQL)

## 2. Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — your Postgres connection string
- `JWT_SECRET` — any long random string
- `SMTP_*` — Gmail: create an "App Password" at https://myaccount.google.com/apppasswords and use that as `SMTP_PASS`

## 3. Create the database

```bash
createdb hrms
psql -d hrms -f database/schema.sql
psql -d hrms -f database/seed.sql
```

(Or set `DATABASE_URL` in your shell and run `npm run seed`, which does both steps.)

This creates a Super Admin login:
- **Employee ID:** `EMP000001`
- **Password:** `Admin@123`

## 4. Run

```bash
npm run dev     # auto-restarts on file changes (nodemon)
# or
npm start
```

Server runs at `http://localhost:5000`. Test it:

```bash
curl http://localhost:5000/api/health
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employeeCode":"EMP000001","password":"Admin@123"}'
```

You should get back a JWT `token` — copy it and use it as `Authorization: Bearer <token>` for every other protected endpoint.

## Project structure

```
backend/
├── database/
│   ├── schema.sql      # all tables, enums, indexes, triggers
│   └── seed.sql        # default departments + Super Admin login
├── src/
│   ├── config/          # db pool, roles/permissions constants
│   ├── middleware/       # JWT auth, permission checks, error handler
│   ├── controllers/      # business logic per module
│   ├── routes/           # Express routers, one per module
│   ├── utils/            # helpers (employee code gen, audit log, email)
│   └── server.js         # app entry point
├── .env.example
└── package.json
```

## What's built so far
- ✅ Auth: login (single-step, no OTP), forgot/reset password (OTP-protected), `/me`
- ⏳ Next: Employees CRUD, Onboarding, Leave, Manager assignment, Offer Letters — same pattern (controller + route), added module by module.

Every new module will register itself in `src/server.js` under the commented-out route lines.
