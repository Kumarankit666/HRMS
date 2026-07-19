# HRMS Frontend (React + Vite)

## Setup

```bash
cd frontend
npm install
cp .env.example .env    # set VITE_API_URL if backend isn't on localhost:5000
npm run dev
```

Opens at `http://localhost:5173`. Make sure the backend is running first (see `../backend/README.md`).

Login with the seeded Super Admin: **EMP000001 / Admin@123**

## What's built
- Login (single-step) + Forgot/Reset Password (OTP)
- Onboarding form (blocks dashboard access until HR approves)
- Dashboard (role-aware: Admin/HR overview vs Employee/Manager overview)
- Employees: add, deactivate/reactivate, assign manager, reset password, generate offer letter
- Onboarding Review (HR/Admin: approve / reject / request changes)
- Leave: apply, view balance/history
- Leave Approvals (Manager: team; HR/Admin: everyone)
- Offer Letters: browse generated PDFs

## Build for production

```bash
npm run build
```
Outputs static files to `dist/` — deploy to Netlify, Vercel, or any static host. Point `VITE_API_URL` at your deployed backend before building.

## Mobile app later
This is a plain REST API + JWT setup — a React Native (or Flutter) app can call the exact same `backend` endpoints. No backend changes needed to add a mobile client.
