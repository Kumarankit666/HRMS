-- =============================================================================
-- HRMS Enterprise — PostgreSQL Schema
-- Run this once against a fresh database: psql -d hrms -f database/schema.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('EMPLOYEE', 'HR_ADMIN', 'SUPER_ADMIN');
CREATE TYPE employee_status AS ENUM ('Active', 'Inactive');
CREATE TYPE onboarding_status AS ENUM ('Pending', 'Submitted', 'Approved', 'Rejected', 'ChangesRequested');
CREATE TYPE leave_status AS ENUM ('Pending', 'Approved', 'Rejected');
CREATE TYPE leave_type AS ENUM ('Casual', 'Sick', 'Earned', 'Maternity', 'Paternity', 'LossOfPay');
CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Late', 'HalfDay', 'WeekOff', 'Holiday', 'Leave');
CREATE TYPE otp_purpose AS ENUM ('RESET_PASSWORD');

-- ---------------------------------------------------------------------------
-- Reference tables
-- ---------------------------------------------------------------------------
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE designations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'Active'
);

-- ---------------------------------------------------------------------------
-- Core: Employees
-- ---------------------------------------------------------------------------
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code VARCHAR(20) UNIQUE NOT NULL,        -- EMP000001
  full_name VARCHAR(150) NOT NULL,
  personal_email VARCHAR(150) NOT NULL,
  work_email VARCHAR(150),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  designation_id INTEGER REFERENCES designations(id) ON DELETE SET NULL,
  joining_date DATE,
  reporting_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employment_type VARCHAR(30) DEFAULT 'Full-Time',
  work_location VARCHAR(120),
  status employee_status DEFAULT 'Active',

  gender VARCHAR(20),
  dob DATE,
  blood_group VARCHAR(5),
  marital_status VARCHAR(20),
  father_name VARCHAR(150),
  mother_name VARCHAR(150),
  emergency_contact VARCHAR(30),
  current_address TEXT,
  permanent_address TEXT,
  bank_account_number VARCHAR(40),
  bank_ifsc VARCHAR(20),
  bank_name VARCHAR(120),
  photo_url TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_employees_manager ON employees(reporting_manager_id);
CREATE INDEX idx_employees_department ON employees(department_id);

-- ---------------------------------------------------------------------------
-- Login credentials — separate table from employees, never plaintext.
-- ---------------------------------------------------------------------------
CREATE TABLE employee_login (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,          -- bcrypt hash (salt embedded, no separate salt column needed)
  role user_role NOT NULL DEFAULT 'EMPLOYEE',
  must_reset_password BOOLEAN DEFAULT true,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- One-time codes for forgot-password flow. Normal login does NOT use OTP.
CREATE TABLE password_reset_otps (
  id SERIAL PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,               -- OTP is hashed at rest too
  purpose otp_purpose NOT NULL DEFAULT 'RESET_PASSWORD',
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Onboarding
-- ---------------------------------------------------------------------------
CREATE TABLE onboarding (
  id SERIAL PRIMARY KEY,
  employee_id UUID UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  status onboarding_status DEFAULT 'Pending',
  submitted_data JSONB,                 -- flexible: education, skills, aadhaar, pan, etc.
  review_note TEXT,
  reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Leave
-- ---------------------------------------------------------------------------
CREATE TABLE leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days NUMERIC(4,1) NOT NULL,
  reason TEXT,
  status leave_status DEFAULT 'Pending',
  actioned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  actioned_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_status ON leave_requests(status);

CREATE TABLE leave_balance (
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  casual_leave NUMERIC(4,1) DEFAULT 12,
  sick_leave NUMERIC(4,1) DEFAULT 8,
  earned_leave NUMERIC(4,1) DEFAULT 15,
  maternity_leave NUMERIC(4,1) DEFAULT 0,
  paternity_leave NUMERIC(4,1) DEFAULT 0,
  loss_of_pay NUMERIC(4,1) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (employee_id, year)
);

-- ---------------------------------------------------------------------------
-- Attendance — read-mostly, updated by HR
-- ---------------------------------------------------------------------------
CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL,
  in_time TIME,
  out_time TIME,
  remarks TEXT,
  updated_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (employee_id, date)
);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);

-- ---------------------------------------------------------------------------
-- Offer Letters
-- ---------------------------------------------------------------------------
CREATE TABLE offer_letters (
  id SERIAL PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  salary VARCHAR(50),
  location VARCHAR(120),
  department VARCHAR(120),
  designation VARCHAR(120),
  joining_date DATE,
  file_path TEXT,                      -- local path or object-storage URL to the generated PDF
  generated_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Audit log — every sensitive action, for accountability
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  module VARCHAR(50) NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ---------------------------------------------------------------------------
-- Auto-update updated_at columns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_login_updated BEFORE UPDATE ON employee_login
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_onboarding_updated BEFORE UPDATE ON onboarding
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
