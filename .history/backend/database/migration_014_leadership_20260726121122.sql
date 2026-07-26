-- =============================================================================
-- Migration 014: Leadership Team (Chairman, Director, etc.)
-- Run once: psql $DB -f database/migration_014_leadership.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS leadership_members (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  designation VARCHAR(100) NOT NULL,   -- e.g. Chairman, Director, Managing Director
  photo_path TEXT,
  message TEXT,                         -- optional short quote/message
  display_order INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leadership_active ON leadership_members(active, display_order);