-- =============================================================================
-- Migration 006: Faculty Members (public website)
-- Run once: psql -U postgres -d hrms -f database/migration_006_faculty.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS faculty_members (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  role VARCHAR(150),
  subject VARCHAR(150),
  photo_path TEXT,
  display_order INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_faculty_active ON faculty_members(active, display_order);