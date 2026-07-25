-- =============================================================================
-- Migration 012: Attendance Correction Requests
-- Run once: psql -U postgres -d hrms -f database/migration_012_attendance_requests.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS attendance_requests (
  id SERIAL PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  request_date DATE NOT NULL,
  requested_status VARCHAR(20) NOT NULL,   -- Present, Absent, Late, HalfDay, WeekOff, Holiday, Leave
  reason TEXT,

  manager_status VARCHAR(20) DEFAULT 'Pending',  -- Pending, Approved, Rejected
  manager_actioned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  manager_actioned_at TIMESTAMPTZ,
  manager_remark TEXT,

  hr_status VARCHAR(20) DEFAULT 'Pending',        -- Pending, Approved, Rejected (only relevant once manager_status = Approved)
  hr_actioned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  hr_actioned_at TIMESTAMPTZ,
  hr_remark TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attendance_req_employee ON attendance_requests(employee_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_req_manager ON attendance_requests(manager_status);
CREATE INDEX IF NOT EXISTS idx_attendance_req_hr ON attendance_requests(hr_status, manager_status);