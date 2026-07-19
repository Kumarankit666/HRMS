-- =============================================================================
-- Migration 002: Payroll
-- Run once: psql -U postgres -d hrms -f database/migration_002_payroll.sql
-- Safe to re-run (IF NOT EXISTS guards).
-- =============================================================================

CREATE TABLE IF NOT EXISTS salary_structure (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  ctc NUMERIC(12,2) NOT NULL,
  basic NUMERIC(12,2) DEFAULT 0,
  hra NUMERIC(12,2) DEFAULT 0,
  special_allowance NUMERIC(12,2) DEFAULT 0,
  pf NUMERIC(12,2) DEFAULT 0,
  esic NUMERIC(12,2) DEFAULT 0,
  professional_tax NUMERIC(12,2) DEFAULT 0,
  bonus NUMERIC(12,2) DEFAULT 0,
  incentive NUMERIC(12,2) DEFAULT 0,
  other_allowances NUMERIC(12,2) DEFAULT 0,
  effective_from DATE DEFAULT CURRENT_DATE,
  updated_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll (
  id SERIAL PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,           -- 1-12
  year INTEGER NOT NULL,
  gross_salary NUMERIC(12,2) NOT NULL,
  deductions NUMERIC(12,2) DEFAULT 0,
  tds NUMERIC(12,2) DEFAULT 0,
  net_salary NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'Generated',
  file_path TEXT,
  generated_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (employee_id, month, year)
);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);