-- =============================================================================
-- Migration 010: Topper marks obtained
-- Run once: psql -U postgres -d hrms -f database/migration_010_topper_marks.sql
-- =============================================================================

ALTER TABLE topper_students ADD COLUMN IF NOT EXISTS marks_obtained VARCHAR(50);