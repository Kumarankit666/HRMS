-- =============================================================================
-- Migration 011: Detailed payslip fields
-- Run once: psql -U postgres -d hrms -f database/migration_011_payslip_details.sql
-- =============================================================================

ALTER TABLE payroll ADD COLUMN IF NOT EXISTS incentive NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS arrear NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS travelling_allowance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS loan_advance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS lop_days NUMERIC(4,1) DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS lop_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS days_in_month INTEGER;

-- Company letterhead details, editable via Settings later — for now a single-row config table.
CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  company_name VARCHAR(200) DEFAULT 'MSMG Education Solution',
  address TEXT,
  contact_email VARCHAR(150),
  contact_phone VARCHAR(30),
  registration_no VARCHAR(100),
  CHECK (id = 1)
);
INSERT INTO company_settings (id, company_name) VALUES (1, 'MSMG Education Solution') ON CONFLICT (id) DO NOTHING;