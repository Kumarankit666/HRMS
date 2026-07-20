-- =============================================================================
-- Migration 004: Training Portal
-- Run once: psql -U postgres -d hrms -f database/migration_004_training.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS training_departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS training_videos (
  id SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES training_departments(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL DEFAULT 1,
  title VARCHAR(200) NOT NULL,
  youtube_id VARCHAR(30) NOT NULL,
  transcript TEXT,               -- used only for AI question generation, not shown to employees
  question_count INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_videos_dept ON training_videos(department_id);

CREATE TABLE IF NOT EXISTS training_questions (
  id SERIAL PRIMARY KEY,
  video_id INTEGER REFERENCES training_videos(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL   -- 'A' | 'B' | 'C' | 'D'
);
CREATE INDEX IF NOT EXISTS idx_training_questions_video ON training_questions(video_id);

-- Which employees are enrolled in which training department (manual OR auto-assigned after offer letter).
CREATE TABLE IF NOT EXISTS training_assignments (
  id SERIAL PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES training_departments(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,  -- NULL = auto-assigned by system
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (employee_id, department_id)
);

CREATE TABLE IF NOT EXISTS training_attempts (
  id SERIAL PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  video_id INTEGER REFERENCES training_videos(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percentage INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_attempts_emp_video ON training_attempts(employee_id, video_id);

CREATE TABLE IF NOT EXISTS training_certificates (
  id SERIAL PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES training_departments(id) ON DELETE CASCADE,
  issue_date TIMESTAMPTZ DEFAULT now(),
  email_sent BOOLEAN DEFAULT false,
  cert_file_path TEXT,
  UNIQUE (employee_id, department_id)
);

CREATE TABLE IF NOT EXISTS training_retakes (
  id SERIAL PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  video_id INTEGER REFERENCES training_videos(id) ON DELETE CASCADE,
  assigned_on TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'Pending'   -- Pending | Done | Cancelled
);
CREATE INDEX IF NOT EXISTS idx_training_retakes_emp ON training_retakes(employee_id, video_id, status);