-- ========================================================
-- Company Management REST API — Supabase PostgreSQL Schema
-- Buka Supabase Dashboard > SQL Editor > New Query > Paste & Run
-- ========================================================

-- 1. Tabel Roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255)
);

-- 2. Tabel Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Departments
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(255)
);

-- 4. Tabel Positions
CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  department_id INT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  name VARCHAR(120) NOT NULL,
  CONSTRAINT uq_positions_department_name UNIQUE (department_id, name)
);

-- 5. Tabel Employees
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  employee_code VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  position_id INT NOT NULL REFERENCES positions(id) ON DELETE RESTRICT,
  manager_id INT NULL REFERENCES employees(id) ON DELETE SET NULL,
  hire_date DATE NOT NULL,
  phone VARCHAR(30)
);

-- 6. Tabel Attendances
CREATE TABLE IF NOT EXISTS attendances (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  check_in TIME NULL,
  check_out TIME NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')),
  notes TEXT,
  CONSTRAINT uq_attendances_employee_date UNIQUE (employee_id, date),
  CONSTRAINT chk_attendance_checkout_after_checkin CHECK (check_out IS NULL OR check_in IS NOT NULL)
);

-- 7. Tabel Salaries
CREATE TABLE IF NOT EXISTS salaries (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  month CHAR(7) NOT NULL,
  base_salary NUMERIC(15, 2) NOT NULL,
  allowance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  deduction NUMERIC(15, 2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(15, 2) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid')),
  paid_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_salaries_employee_month UNIQUE (employee_id, month),
  CONSTRAINT chk_salary_amounts CHECK (
    base_salary >= 0 AND allowance >= 0 AND deduction >= 0 AND net_salary >= 0
  )
);

-- 8. Tabel Financial Transactions
CREATE TABLE IF NOT EXISTS financial_transactions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('Pemasukan', 'Pengeluaran')),
  category VARCHAR(120) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  transaction_date DATE NOT NULL,
  recorded_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

-- 9. Tabel Performance Reports
CREATE TABLE IF NOT EXISTS performance_reports (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  period VARCHAR(20) NOT NULL,
  tasks_completed INT NOT NULL DEFAULT 0,
  kpi_score NUMERIC(5, 2) NOT NULL CHECK (kpi_score >= 0 AND kpi_score <= 100),
  feedback TEXT,
  reviewed_by INT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabel Leave Requests (Pengajuan Cuti & Izin)
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('Cuti Tahunan', 'Sakit', 'Izin Penting', 'Melahirkan', 'Lainnya')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  reviewed_by INT NULL REFERENCES employees(id) ON DELETE SET NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Tabel Announcements (Pengumuman Internal Perusahaan)
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
  category VARCHAR(50) NOT NULL DEFAULT 'Umum',
  author_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- SEED DATA AWAL (Roles, Departemen, 45 Jabatan)
-- ========================================================

INSERT INTO roles (name, description) VALUES
  ('Admin', 'Akses penuh ke seluruh endpoint dan pengelolaan pengguna'),
  ('HRD', 'Mengelola karyawan, departemen, jabatan, dan absensi'),
  ('Keuangan', 'Mengelola gaji, transaksi, dan laporan keuangan'),
  ('Manager', 'Melihat anggota tim dan laporan kinerja bawahan'),
  ('Karyawan', 'Melihat profil dan absensi sendiri')
ON CONFLICT (name) DO NOTHING;

-- 11 Departemen
INSERT INTO departments (name) VALUES
  ('Executive & Management'),
  ('Technology & Engineering'),
  ('Human Resources'),
  ('Finance & Accounting'),
  ('Product & UI/UX Design'),
  ('Marketing & Communications'),
  ('Sales & Business Development'),
  ('Operations & Logistics'),
  ('Legal & Compliance'),
  ('Customer Support & Success'),
  ('Quality Assurance & Testing')
ON CONFLICT (name) DO NOTHING;

-- 45+ Jabatan Berdasarkan Departemen
INSERT INTO positions (department_id, name)
SELECT id, 'Chief Executive Officer (CEO)' FROM departments WHERE name = 'Executive & Management'
UNION ALL SELECT id, 'Chief Technology Officer (CTO)' FROM departments WHERE name = 'Executive & Management'
UNION ALL SELECT id, 'Chief Financial Officer (CFO)' FROM departments WHERE name = 'Executive & Management'
UNION ALL SELECT id, 'Chief Operating Officer (COO)' FROM departments WHERE name = 'Executive & Management'
UNION ALL SELECT id, 'Engineering Manager' FROM departments WHERE name = 'Technology & Engineering'
UNION ALL SELECT id, 'Tech Lead' FROM departments WHERE name = 'Technology & Engineering'
UNION ALL SELECT id, 'Senior Backend Developer' FROM departments WHERE name = 'Technology & Engineering'
UNION ALL SELECT id, 'Backend Developer' FROM departments WHERE name = 'Technology & Engineering'
UNION ALL SELECT id, 'Frontend Developer' FROM departments WHERE name = 'Technology & Engineering'
UNION ALL SELECT id, 'Mobile App Developer (Flutter/React Native)' FROM departments WHERE name = 'Technology & Engineering'
UNION ALL SELECT id, 'DevOps & Cloud Engineer' FROM departments WHERE name = 'Technology & Engineering'
UNION ALL SELECT id, 'QA Engineer & Tester' FROM departments WHERE name = 'Technology & Engineering'
UNION ALL SELECT id, 'Database Administrator' FROM departments WHERE name = 'Technology & Engineering'
UNION ALL SELECT id, 'Cybersecurity Analyst' FROM departments WHERE name = 'Technology & Engineering'
UNION ALL SELECT id, 'System Administrator' FROM departments WHERE name = 'Technology & Engineering'
UNION ALL SELECT id, 'HR Director' FROM departments WHERE name = 'Human Resources'
UNION ALL SELECT id, 'HR Manager' FROM departments WHERE name = 'Human Resources'
UNION ALL SELECT id, 'Talent Acquisition Specialist' FROM departments WHERE name = 'Human Resources'
UNION ALL SELECT id, 'People Operations Officer' FROM departments WHERE name = 'Human Resources'
UNION ALL SELECT id, 'Compensation & Benefits Specialist' FROM departments WHERE name = 'Human Resources'
UNION ALL SELECT id, 'Finance Lead' FROM departments WHERE name = 'Finance & Accounting'
UNION ALL SELECT id, 'Senior Accountant' FROM departments WHERE name = 'Finance & Accounting'
UNION ALL SELECT id, 'Financial Analyst' FROM departments WHERE name = 'Finance & Accounting'
UNION ALL SELECT id, 'Tax Specialist' FROM departments WHERE name = 'Finance & Accounting'
UNION ALL SELECT id, 'Payroll Specialist' FROM departments WHERE name = 'Finance & Accounting'
UNION ALL SELECT id, 'Head of Product' FROM departments WHERE name = 'Product & UI/UX Design'
UNION ALL SELECT id, 'Product Manager' FROM departments WHERE name = 'Product & UI/UX Design'
UNION ALL SELECT id, 'UI/UX Designer' FROM departments WHERE name = 'Product & UI/UX Design'
UNION ALL SELECT id, 'UX Researcher' FROM departments WHERE name = 'Product & UI/UX Design'
UNION ALL SELECT id, 'Marketing Manager' FROM departments WHERE name = 'Marketing & Communications'
UNION ALL SELECT id, 'Digital Marketing Specialist' FROM departments WHERE name = 'Marketing & Communications'
UNION ALL SELECT id, 'Content & SEO Specialist' FROM departments WHERE name = 'Marketing & Communications'
UNION ALL SELECT id, 'Social Media Strategist' FROM departments WHERE name = 'Marketing & Communications'
UNION ALL SELECT id, 'Head of Sales' FROM departments WHERE name = 'Sales & Business Development'
UNION ALL SELECT id, 'Enterprise Account Executive' FROM departments WHERE name = 'Sales & Business Development'
UNION ALL SELECT id, 'Business Development Representative' FROM departments WHERE name = 'Sales & Business Development'
UNION ALL SELECT id, 'Client Success Manager' FROM departments WHERE name = 'Sales & Business Development'
UNION ALL SELECT id, 'Operations Manager' FROM departments WHERE name = 'Operations & Logistics'
UNION ALL SELECT id, 'Supply Chain Coordinator' FROM departments WHERE name = 'Operations & Logistics'
UNION ALL SELECT id, 'Corporate Legal Counsel' FROM departments WHERE name = 'Legal & Compliance'
UNION ALL SELECT id, 'Compliance & Risk Officer' FROM departments WHERE name = 'Legal & Compliance'
ON CONFLICT (department_id, name) DO NOTHING;
