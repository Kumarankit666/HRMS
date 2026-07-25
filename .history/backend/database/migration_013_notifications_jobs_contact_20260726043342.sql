-- =============================================================================
-- Migration 013: Notifications, Job Postings, Contact Queries, Attendance In/Out time
-- Run once: psql -U postgres -d hrms -f database/migration_013_notifications_jobs_contact.sql
-- =============================================================================

-- Notifications: recipient_role broadcasts to everyone with that role; recipient_id targets one person.
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  recipient_role VARCHAR(20),                 -- 'HR_ADMIN' / 'SUPER_ADMIN' / 'HR' (both) / NULL
  recipient_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  link VARCHAR(200),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(recipient_role, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);

-- Job postings for the public Careers page (HR/Admin managed).
CREATE TABLE IF NOT EXISTS job_postings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  job_type VARCHAR(50) DEFAULT 'Full-Time',
  location VARCHAR(150),
  description TEXT,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 1,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON job_postings(active, display_order);

-- Contact / query submissions from the public website (admissions, product queries, general, etc.).
CREATE TABLE IF NOT EXISTS contact_queries (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  category VARCHAR(50) DEFAULT 'General',   -- Admission, Product, Service, General, Other
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'New',          -- New, Responded, Closed
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_queries(status);

-- Job applications submitted via the public Careers page.
CREATE TABLE IF NOT EXISTS job_applications (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  position VARCHAR(200) NOT NULL,
  resume_link TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- In/out time on attendance correction requests.
ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS in_time TIME;
ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS out_time TIME;