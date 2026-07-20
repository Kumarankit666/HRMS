-- =============================================================================
-- Migration 008: Faculty experience as free text (e.g. "10+ years")
-- Run once: psql -U postgres -d hrms -f database/migration_008_faculty_experience_text.sql
-- =============================================================================

ALTER TABLE faculty_members ALTER COLUMN experience_years TYPE VARCHAR(50) USING experience_years::text;