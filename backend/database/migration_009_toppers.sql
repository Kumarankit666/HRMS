-- =============================================================================
-- Migration 009: Topper Students (public website)
-- Run once: psql -U postgres -d hrms -f database/migration_009_toppers.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS topper_students (
  id SERIAL PRIMARY KEY,
  student_name VARCHAR(150) NOT NULL,
  exam_name VARCHAR(150) NOT NULL,
  exam_year INTEGER NOT NULL,
  rank_achieved VARCHAR(50) NOT NULL,       -- e.g. "AIR 12", "Rank 1", "Top 1%"
  current_status VARCHAR(200),               -- e.g. "Studying at IIT Delhi", "Working at Google"
  photo_path TEXT,
  display_order INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_toppers_active ON topper_students(active, display_order);