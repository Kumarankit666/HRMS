-- =============================================================================
-- Seed data: default departments + one Super Admin login.
-- Run AFTER schema.sql: psql -d hrms -f database/seed.sql
-- Password: Admin@123 — this hash is REAL and verified (bcrypt, cost 10).
-- Change this password on first login in production.
-- =============================================================================

INSERT INTO departments (name) VALUES
  ('Administration'), ('Engineering'), ('Human Resources'), ('Sales'), ('Finance')
ON CONFLICT (name) DO NOTHING;

-- Employee: EMP000001 / Super Admin
INSERT INTO employees (employee_code, full_name, personal_email, work_email, department_id, status, joining_date)
SELECT 'EMP000001', 'Super Admin', 'admin@example.com', 'admin@example.com', d.id, 'Active', CURRENT_DATE
FROM departments d WHERE d.name = 'Administration'
ON CONFLICT (employee_code) DO NOTHING;

-- Password: Admin@123  (verified bcrypt hash, cost 10)
INSERT INTO employee_login (employee_id, password_hash, role, must_reset_password)
SELECT e.id, '$2b$10$9dxdYwtDAoX5ST.EWbiC8.SCENa13S3aui8cWA2ram9gbiTJfwmeq', 'SUPER_ADMIN', false
FROM employees e WHERE e.employee_code = 'EMP000001'
ON CONFLICT (employee_id) DO NOTHING;
