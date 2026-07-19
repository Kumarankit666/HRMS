# HRMS Enterprise — Full-Stack (React + Node/Express + PostgreSQL)

Fully integrated system: **frontend**, **backend**, and **database** all included, ready to run in VS Code.

## Run order

### 1. Database
```bash
createdb hrms
psql -d hrms -f backend/database/schema.sql
psql -d hrms -f backend/database/seed.sql
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, SMTP_*
npm run dev
```
Runs on `http://localhost:5000`.

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm run dev
```
Runs on `http://localhost:5173`. Open it in your browser.

## Login
- **Employee ID:** `EMP000001`
- **Password:** `Admin@123`

## What's included
| Module | Backend | Frontend |
|---|---|---|
| Login (no OTP) | ✅ | ✅ |
| Forgot/Reset Password (OTP) | ✅ | ✅ |
| Add/Edit/Deactivate Employee | ✅ | ✅ |
| Assign Manager | ✅ | ✅ |
| Reset Employee Password (by HR) | ✅ | ✅ |
| Onboarding form + review | ✅ | ✅ |
| Leave apply + approve (Manager/HR) | ✅ | ✅ |
| Offer Letter (PDF, blocked until onboarding approved) | ✅ | ✅ |
| Role-based Dashboard (Employee/Manager vs HR/Admin) | ✅ | ✅ |

## Not yet built (say the word and I'll add them next)
- Attendance (read-only from HR-updated records)
- Payroll / payslips
- Documents module (uploads)
- Performance reviews
- Reports/exports

## Mobile app, later
Since the frontend only talks to the backend over plain REST + JWT, a React Native or Flutter app can reuse the exact same `backend` — no backend changes needed.

## Security notes
- Passwords: bcrypt, never plaintext.
- JWT sessions, `Authorization: Bearer <token>`.
- Every mutation is server-side permission-checked (`requirePermission` / `requireRole` middleware) — the frontend hiding a button is a UX nicety, not the actual security boundary.
- Parameterized SQL everywhere (no string concatenation) — protects against SQL injection.
