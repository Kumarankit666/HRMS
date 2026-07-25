-- =============================================================================
-- Migration 003: Employee Documents
-- Run once: psql -U postgres -d hrms -f database/migration_003_documents.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS employee_documents (
  id SERIAL PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL,       -- Aadhaar, PAN, Resume, Certificate, Photo, Passport, DrivingLicense, Other
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  verified_status VARCHAR(20) DEFAULT 'Pending', -- Pending, Verified, Rejected
  verified_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_docs_employee ON employee_documents(employee_id);