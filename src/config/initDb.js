const bcrypt = require('bcryptjs');
const { pool, run, get, ddl, withTransaction } = require('./database');

const rolesData = [
  { name: 'Admin', description: 'Akses penuh ke seluruh endpoint dan pengelolaan pengguna' },
  { name: 'HRD', description: 'Mengelola karyawan, departemen, jabatan, dan absensi' },
  { name: 'Keuangan', description: 'Mengelola gaji, transaksi, dan laporan keuangan' },
  { name: 'Manager', description: 'Melihat anggota tim dan laporan kinerja bawahan' },
  { name: 'Karyawan', description: 'Melihat profil dan absensi sendiri' }
];

const createTables = async () => {
  await ddl(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      description VARCHAR(255)
    );
  `);

  await ddl(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(80) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await ddl(`
    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      description VARCHAR(255)
    );
  `);

  await ddl(`
    CREATE TABLE IF NOT EXISTS positions (
      id SERIAL PRIMARY KEY,
      department_id INT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      name VARCHAR(120) NOT NULL,
      CONSTRAINT uq_positions_department_name UNIQUE (department_id, name)
    );
  `);

  await ddl(`
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
  `);

  await ddl(`
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
  `);

  await ddl(`
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
  `);

  await ddl(`
    CREATE TABLE IF NOT EXISTS financial_transactions (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL CHECK (type IN ('Pemasukan', 'Pengeluaran')),
      category VARCHAR(120) NOT NULL,
      amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
      description TEXT,
      transaction_date DATE NOT NULL,
      recorded_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
    );
  `);

  await ddl(`
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
  `);

  await ddl(`
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
  `);

  await ddl(`
    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      priority VARCHAR(20) NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
      category VARCHAR(50) NOT NULL DEFAULT 'Umum',
      author_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

const seedReferenceData = async () => {
  for (const role of rolesData) {
    await run(
      'INSERT INTO roles (name, description) VALUES (?, ?) ON CONFLICT (name) DO NOTHING',
      [role.name, role.description]
    );
  }

  const departmentNames = [
    'Executive & Management',
    'Technology & Engineering',
    'Human Resources',
    'Finance & Accounting',
    'Product & UI/UX Design',
    'Marketing & Communications',
    'Sales & Business Development',
    'Operations & Logistics',
    'Legal & Compliance'
  ];
  for (const name of departmentNames) {
    await run('INSERT INTO departments (name) VALUES (?) ON CONFLICT (name) DO NOTHING', [name]);
  }

  const positionData = [
    // Executive & Management
    ['Chief Executive Officer (CEO)', 'Executive & Management'],
    ['Chief Technology Officer (CTO)', 'Executive & Management'],
    ['Chief Financial Officer (CFO)', 'Executive & Management'],
    ['Chief Operating Officer (COO)', 'Executive & Management'],

    // Technology & Engineering
    ['Engineering Manager', 'Technology & Engineering'],
    ['Tech Lead', 'Technology & Engineering'],
    ['Senior Backend Developer', 'Technology & Engineering'],
    ['Backend Developer', 'Technology & Engineering'],
    ['Frontend Developer', 'Technology & Engineering'],
    ['Mobile App Developer (Flutter/React Native)', 'Technology & Engineering'],
    ['DevOps & Cloud Engineer', 'Technology & Engineering'],
    ['QA Engineer & Tester', 'Technology & Engineering'],
    ['Database Administrator', 'Technology & Engineering'],
    ['Cybersecurity Analyst', 'Technology & Engineering'],
    ['System Administrator', 'Technology & Engineering'],

    // Human Resources
    ['HR Director', 'Human Resources'],
    ['HR Manager', 'Human Resources'],
    ['Talent Acquisition Specialist', 'Human Resources'],
    ['People Operations Officer', 'Human Resources'],
    ['Compensation & Benefits Specialist', 'Human Resources'],

    // Finance & Accounting
    ['Finance Lead', 'Finance & Accounting'],
    ['Senior Accountant', 'Finance & Accounting'],
    ['Financial Analyst', 'Finance & Accounting'],
    ['Tax Specialist', 'Finance & Accounting'],
    ['Payroll Specialist', 'Finance & Accounting'],

    // Product & UI/UX Design
    ['Head of Product', 'Product & UI/UX Design'],
    ['Product Manager', 'Product & UI/UX Design'],
    ['UI/UX Designer', 'Product & UI/UX Design'],
    ['UX Researcher', 'Product & UI/UX Design'],

    // Marketing & Communications
    ['Marketing Manager', 'Marketing & Communications'],
    ['Digital Marketing Specialist', 'Marketing & Communications'],
    ['Content & SEO Specialist', 'Marketing & Communications'],
    ['Social Media Strategist', 'Marketing & Communications'],

    // Sales & Business Development
    ['Head of Sales', 'Sales & Business Development'],
    ['Enterprise Account Executive', 'Sales & Business Development'],
    ['Business Development Representative', 'Sales & Business Development'],
    ['Client Success Manager', 'Sales & Business Development'],

    // Operations & Legal
    ['Operations Manager', 'Operations & Logistics'],
    ['Supply Chain Coordinator', 'Operations & Logistics'],
    ['Corporate Legal Counsel', 'Legal & Compliance'],
    ['Compliance & Risk Officer', 'Legal & Compliance']
  ];

  for (const [name, departmentName] of positionData) {
    await run(
      `INSERT INTO positions (department_id, name)
       SELECT id, ? FROM departments WHERE name = ?
       ON CONFLICT (department_id, name) DO NOTHING`,
      [name, departmentName]
    );
  }
};

const createSeedEmployee = async ({
  database,
  username,
  email,
  fullName,
  employeeCode,
  position,
  department,
  hireDate,
  phone,
  managerId = null
}) => {
  const roleName = username === 'admin' ? 'Admin'
    : username === 'siti_hrd' ? 'HRD'
      : username === 'andi_keuangan' ? 'Keuangan'
        : username === 'budi_manager' ? 'Manager'
          : 'Karyawan';
  const role = await database.get('SELECT id FROM roles WHERE name = ?', [roleName]);
  const passwordHash = await bcrypt.hash('password123', 10);
  const userResult = await database.run(
    `INSERT INTO users (username, email, password_hash, role_id)
     VALUES (?, ?, ?, ?)`,
    [username, email, passwordHash, role.id]
  );
  const positionRow = await database.get(
    `SELECT p.id FROM positions p
     JOIN departments d ON d.id = p.department_id
     WHERE p.name = ? AND d.name = ?`,
    [position, department]
  );
  if (!positionRow) throw new Error(`Jabatan seed tidak ditemukan: ${position}`);

  const employeeResult = await database.run(
    `INSERT INTO employees
       (user_id, employee_code, full_name, position_id, manager_id, hire_date, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userResult.id, employeeCode, fullName, positionRow.id, managerId, hireDate, phone]
  );
  return employeeResult.id;
};

const seedDemoData = async () => {
  const seeded = await withTransaction(async (database) => {
    const admin = await database.get('SELECT id FROM users WHERE username = ?', ['admin']);
    if (admin) return false;

    const adminId = await createSeedEmployee({
      database,
      username: 'admin',
      email: 'admin@perusahaan.com',
      fullName: 'Super Admin',
      employeeCode: 'EMP-001',
      position: 'System Administrator',
      department: 'IT Infrastructure',
      hireDate: '2022-01-01',
      phone: '0811000001'
    });
    const hrdId = await createSeedEmployee({
      database,
      username: 'siti_hrd',
      email: 'siti@perusahaan.com',
      fullName: 'Siti Rahmawati',
      employeeCode: 'EMP-002',
      position: 'HR Manager',
      department: 'Human Resources',
      hireDate: '2022-03-15',
      phone: '0811000002'
    });
    const financeId = await createSeedEmployee({
      database,
      username: 'andi_keuangan',
      email: 'andi@perusahaan.com',
      fullName: 'Andi Wijaya',
      employeeCode: 'EMP-003',
      position: 'Finance Lead',
      department: 'Finance & Accounting',
      hireDate: '2022-05-10',
      phone: '0811000003'
    });
    const managerId = await createSeedEmployee({
      database,
      username: 'budi_manager',
      email: 'budi@perusahaan.com',
      fullName: 'Budi Santoso',
      employeeCode: 'EMP-004',
      position: 'Engineering Manager',
      department: 'Technology',
      hireDate: '2022-06-01',
      phone: '0811000004'
    });
    const rinaId = await createSeedEmployee({
      database,
      username: 'rina_dev',
      email: 'rina@perusahaan.com',
      fullName: 'Rina Kartika',
      employeeCode: 'EMP-005',
      position: 'Backend Developer',
      department: 'Technology',
      hireDate: '2023-02-01',
      phone: '0811000005',
      managerId
    });
    const dimasId = await createSeedEmployee({
      database,
      username: 'dimas_qa',
      email: 'dimas@perusahaan.com',
      fullName: 'Dimas Pratama',
      employeeCode: 'EMP-006',
      position: 'QA Engineer',
      department: 'Technology',
      hireDate: '2023-07-12',
      phone: '0811000006',
      managerId
    });

    await database.run(
      `INSERT INTO attendances (employee_id, date, check_in, check_out, status, notes)
       VALUES (?, ?, ?, ?, 'Hadir', ?)`,
      [rinaId, '2026-11-18', '08:55:00', '17:05:00', 'Tepat waktu']
    );
    await database.run(
      `INSERT INTO attendances (employee_id, date, check_in, check_out, status, notes)
       VALUES (?, ?, ?, ?, 'Hadir', ?)`,
      [dimasId, '2026-11-18', '09:02:00', '17:15:00', 'Normal']
    );
    await database.run(
      `INSERT INTO salaries
         (employee_id, month, base_salary, allowance, deduction, net_salary, payment_status, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Paid', ?)`,
      [rinaId, '2026-11', 12000000, 1500000, 300000, 13200000, '2026-11-25 10:00:00']
    );
    const financeUser = await database.get(
      'SELECT id FROM users WHERE username = ?',
      ['andi_keuangan']
    );
    await database.run(
      `INSERT INTO financial_transactions
         (type, category, amount, description, transaction_date, recorded_by)
       VALUES ('Pemasukan', ?, ?, ?, ?, ?)`,
      ['Pembayaran Klien', 150000000, 'Invoice Proyek Enterprise #INV-2026-01', '2026-11-10', financeUser.id]
    );
    await database.run(
      `INSERT INTO financial_transactions
         (type, category, amount, description, transaction_date, recorded_by)
       VALUES ('Pengeluaran', ?, ?, ?, ?, ?)`,
      ['Operasional Cloud', 12500000, 'Tagihan AWS & Server Produksi', '2026-11-12', financeUser.id]
    );
    await database.run(
      `INSERT INTO performance_reports
         (employee_id, period, tasks_completed, kpi_score, feedback, reviewed_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [rinaId, '2026-Q4', 24, 92.5, 'Sangat baik dalam merancang arsitektur API dan keamanan sistem.', managerId]
    );
    await database.run(
      `INSERT INTO performance_reports
         (employee_id, period, tasks_completed, kpi_score, feedback, reviewed_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dimasId, '2026-Q4', 19, 88, 'Teliti dalam melakukan pengujian regresi otomatis.', managerId]
    );

    // Seed Demo Announcements
    const adminUser = await database.get('SELECT id FROM users WHERE username = ?', ['admin']);
    await database.run(
      `INSERT INTO announcements (title, content, priority, category, author_id)
       VALUES (?, ?, 'High', 'Perusahaan', ?)`,
      [
        'Pengumuman Libur Akhir Tahun & Kebijakan Cuti 2026',
        'Diberitahukan kepada seluruh karyawan bahwa operasional kantor akan libur mulai tanggal 25 Desember hingga 1 Januari. Harap selesaikan seluruh laporan sebelum tanggal 23 Desember.',
        adminUser.id
      ]
    );
    await database.run(
      `INSERT INTO announcements (title, content, priority, category, author_id)
       VALUES (?, ?, 'Normal', 'Teknologi', ?)`,
      [
        'Jadwal Pemeliharaan Server Cloud & Migrasi Database',
        'Pemberitahuan pemeliharaan infrastruktur cloud backend dan upgrade kapasitas database akan dilakukan pada hari Sabtu pukul 22:00 WIB.',
        adminUser.id
      ]
    );

    // Seed Demo Leave Request
    await database.run(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status, reviewed_by, review_notes, reviewed_at)
       VALUES (?, 'Cuti Tahunan', '2026-12-10', '2026-12-12', 'Keperluan keluarga di luar kota', 'Approved', ?, 'Disetujui. Pastikan pekerjaan hand-over selesai.', CURRENT_TIMESTAMP)`,
      [rinaId, managerId]
    );

    return { adminId, hrdId, financeId };
  });

  if (!seeded) {
    console.log('Database Supabase sudah memiliki data pengguna; data demo tidak ditambahkan ulang.');
    return;
  }
  console.log(`Data demo berhasil dibuat di Supabase (admin employee id ${seeded.adminId}, HRD employee id ${seeded.hrdId}, finance employee id ${seeded.financeId}).`);
};

async function initDatabase() {
  try {
    await createTables();
    await seedReferenceData();
    await seedDemoData();
    console.log('Skema Supabase PostgreSQL siap digunakan.');
  } catch (error) {
    console.error('Gagal menginisialisasi database Supabase:', error.message);
    throw error;
  }
}

if (require.main === module) {
  initDatabase()
    .then(() => pool.end())
    .catch(async () => {
      await pool.end();
      process.exitCode = 1;
    });
}

module.exports = initDatabase;
