-- =============================================================================
-- Migration 007: Faculty qualification + experience
-- Run once: psql -U postgres -d hrms -f database/migration_007_faculty_details.sql
-- =============================================================================

ALTER TABLE faculty_members ADD COLUMN IF NOT EXISTS qualification VARCHAR(150);
ALTER TABLE faculty_members ADD COLUMN IF NOT EXISTS experience_years NUMERIC(4,1);