const bcrypt = require('bcryptjs');
const { run, get, all, withTransaction } = require('./src/config/database');

async function seedPerfectData() {
  console.log('=== MEMULAI SEEDING DATA LENGKAP & SEMPURNA KE SUPABASE ===\n');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Pastikan semua Role lengkap
  const roles = [
    { id: 1, name: 'Admin', description: 'Akses penuh ke seluruh endpoint dan pengelolaan pengguna' },
    { id: 2, name: 'HRD', description: 'Mengelola karyawan, departemen, jabatan, dan absensi' },
    { id: 3, name: 'Keuangan', description: 'Mengelola gaji, transaksi, dan laporan keuangan' },
    { id: 4, name: 'Manager', description: 'Melihat anggota tim dan laporan kinerja bawahan' },
    { id: 5, name: 'Karyawan', description: 'Melihat profil dan absensi sendiri' }
  ];
  for (const r of roles) {
    await run(
      'INSERT INTO roles (id, name, description) VALUES (?, ?, ?) ON CONFLICT (name) DO UPDATE SET description = ?',
      [r.id, r.name, r.description, r.description]
    );
  }
  console.log('1. Roles dipastikan lengkap.');

  // 2. Pastikan Users Utama Aktif
  const coreUsers = [
    { id: 1, username: 'admin', email: 'admin@perusahaan.com', role_id: 1 },
    { id: 2, username: 'siti_hrd', email: 'siti@perusahaan.com', role_id: 2 },
    { id: 3, username: 'andi_keuangan', email: 'andi@perusahaan.com', role_id: 3 },
    { id: 4, username: 'budi_manager', email: 'budi@perusahaan.com', role_id: 4 },
    { id: 5, username: 'rina_dev', email: 'rina@perusahaan.com', role_id: 5 },
    { id: 6, username: 'dimas_qa', email: 'dimas@perusahaan.com', role_id: 5 },
    { id: 99, username: 'user_dummy_test', email: 'dummy_test@perusahaan.com', role_id: 5 }
  ];

  for (const u of coreUsers) {
    const existing = await get('SELECT id FROM users WHERE id = ?', [u.id]);
    if (!existing) {
      await run(
        'INSERT INTO users (id, username, email, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, ?, true)',
        [u.id, u.username, u.email, passwordHash, u.role_id]
      );
    } else {
      await run(
        'UPDATE users SET username = ?, email = ?, password_hash = ?, role_id = ?, is_active = true WHERE id = ?',
        [u.username, u.email, passwordHash, u.role_id, u.id]
      );
    }
  }
  console.log('2. Core Users (Admin, HRD, Keuangan, Manager, Karyawan, Dummy) aktif.');

  // 3. Pastikan Departemen & Posisi Utama
  const pos1 = await get('SELECT id FROM positions WHERE id = 1');
  const pos2 = await get('SELECT id FROM positions WHERE id = 2');
  const pos3 = await get('SELECT id FROM positions WHERE id = 3');
  const pos4 = await get('SELECT id FROM positions WHERE id = 4');
  const pos5 = await get('SELECT id FROM positions WHERE id = 5');
  const pos6 = await get('SELECT id FROM positions WHERE id = 6');

  const p1 = pos1 ? pos1.id : 1;
  const p2 = pos2 ? pos2.id : 2;
  const p3 = pos3 ? pos3.id : 3;
  const p4 = pos4 ? pos4.id : 4;
  const p5 = pos5 ? pos5.id : 5;
  const p6 = pos6 ? pos6.id : 6;

  // 4. Pastikan Employees Lengkap (id 1 s/d 6 + dummy 99)
  const coreEmployees = [
    { id: 1, user_id: 1, employee_code: 'EMP-001', full_name: 'Super Admin', position_id: p1, manager_id: null, hire_date: '2022-01-01', phone: '0811000001' },
    { id: 2, user_id: 2, employee_code: 'EMP-002', full_name: 'Siti Rahmawati S.Psi', position_id: p2, manager_id: null, hire_date: '2022-03-15', phone: '0811000002' },
    { id: 3, user_id: 3, employee_code: 'EMP-003', full_name: 'Andi Wijaya S.E', position_id: p3, manager_id: null, hire_date: '2022-05-10', phone: '0811000003' },
    { id: 4, user_id: 4, employee_code: 'EMP-004', full_name: 'Budi Santoso M.Kom', position_id: p4, manager_id: null, hire_date: '2022-06-01', phone: '0811000004' },
    { id: 5, user_id: 5, employee_code: 'EMP-005', full_name: 'Rina Kartika S.Kom', position_id: p5, manager_id: 4, hire_date: '2023-02-01', phone: '0811000005' },
    { id: 6, user_id: 6, employee_code: 'EMP-006', full_name: 'Dimas Pratama S.Kom', position_id: p6, manager_id: 4, hire_date: '2023-07-12', phone: '0811000006' },
    { id: 99, user_id: 99, employee_code: 'EMP-099', full_name: 'Karyawan Percobaan Delete', position_id: p5, manager_id: null, hire_date: '2026-01-01', phone: '0811000099' }
  ];

  for (const emp of coreEmployees) {
    const existing = await get('SELECT id FROM employees WHERE id = ?', [emp.id]);
    if (!existing) {
      await run(
        `INSERT INTO employees (id, user_id, employee_code, full_name, position_id, manager_id, hire_date, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [emp.id, emp.user_id, emp.employee_code, emp.full_name, emp.position_id, emp.manager_id, emp.hire_date, emp.phone]
      );
    } else {
      await run(
        `UPDATE employees SET user_id = ?, employee_code = ?, full_name = ?, position_id = ?, manager_id = ?, hire_date = ?, phone = ?
         WHERE id = ?`,
        [emp.user_id, emp.employee_code, emp.full_name, emp.position_id, emp.manager_id, emp.hire_date, emp.phone, emp.id]
      );
    }
  }
  console.log('3. Core Employees (ID 1 sampai 6 & Dummy ID 99) berhasil disiapkan.');

  // 5. Pastikan Leave Requests memiliki status Pending & Approved
  // ID 1: Pending (siap di-Approve)
  // ID 2: Pending (siap di-Reject)
  // ID 3: Pending (siap di-Cancel)
  // ID 4: Approved (riwayat)
  const leaves = [
    { id: 1, employee_id: 5, leave_type: 'Cuti Tahunan', start_date: '2026-05-01', end_date: '2026-05-03', reason: 'Liburan keluarga tahunan', status: 'Pending', reviewed_by: null },
    { id: 2, employee_id: 5, leave_type: 'Izin Penting', start_date: '2026-05-10', end_date: '2026-05-11', reason: 'Urusan administrasi perbankan', status: 'Pending', reviewed_by: null },
    { id: 3, employee_id: 5, leave_type: 'Sakit', start_date: '2026-05-15', end_date: '2026-05-16', reason: 'Flu dan demam butuh istirahat', status: 'Pending', reviewed_by: null },
    { id: 4, employee_id: 6, leave_type: 'Cuti Tahunan', start_date: '2026-06-01', end_date: '2026-06-05', reason: 'Mudik lebaran bersama keluarga', status: 'Approved', reviewed_by: 4 }
  ];

  for (const lv of leaves) {
    const existing = await get('SELECT id FROM leave_requests WHERE id = ?', [lv.id]);
    if (!existing) {
      await run(
        `INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, reason, status, reviewed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [lv.id, lv.employee_id, lv.leave_type, lv.start_date, lv.end_date, lv.reason, lv.status, lv.reviewed_by]
      );
    } else {
      await run(
        `UPDATE leave_requests SET employee_id = ?, leave_type = ?, start_date = ?, end_date = ?, reason = ?, status = ?, reviewed_by = ?
         WHERE id = ?`,
        [lv.employee_id, lv.leave_type, lv.start_date, lv.end_date, lv.reason, lv.status, lv.reviewed_by, lv.id]
      );
    }
  }
  console.log('4. Leave Requests (ID 1, 2, 3 [Pending] & ID 4 [Approved]) siap diuji.');

  // 6. Pastikan Salaries memiliki ID 1 (Pending untuk dibayar) dan ID 2 (Paid)
  const salaries = [
    { id: 1, employee_id: 5, month: '2026-02', base_salary: 12000000, allowance: 1500000, deduction: 300000, net_salary: 13200000, payment_status: 'Pending', paid_at: null },
    { id: 2, employee_id: 6, month: '2026-02', base_salary: 10000000, allowance: 1000000, deduction: 200000, net_salary: 10800000, payment_status: 'Paid', paid_at: '2026-02-28 10:00:00' },
    { id: 3, employee_id: 4, month: '2026-02', base_salary: 18000000, allowance: 3000000, deduction: 500000, net_salary: 20500000, payment_status: 'Paid', paid_at: '2026-02-28 10:00:00' }
  ];

  for (const s of salaries) {
    const existing = await get('SELECT id FROM salaries WHERE id = ?', [s.id]);
    if (!existing) {
      await run(
        `INSERT INTO salaries (id, employee_id, month, base_salary, allowance, deduction, net_salary, payment_status, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.employee_id, s.month, s.base_salary, s.allowance, s.deduction, s.net_salary, s.payment_status, s.paid_at]
      );
    } else {
      await run(
        `UPDATE salaries SET employee_id = ?, month = ?, base_salary = ?, allowance = ?, deduction = ?, net_salary = ?, payment_status = ?, paid_at = ?
         WHERE id = ?`,
        [s.employee_id, s.month, s.base_salary, s.allowance, s.deduction, s.net_salary, s.payment_status, s.paid_at, s.id]
      );
    }
  }
  console.log('5. Salaries (ID 1 [Pending] & ID 2, 3 [Paid]) siap diuji.');

  // 7. Pastikan Financial Transactions (Pemasukan & Pengeluaran)
  const transactions = [
    { id: 1, type: 'Pemasukan', category: 'Pembayaran Klien', amount: 150000000, description: 'Invoice Proyek Enterprise #INV-2026-01', transaction_date: '2026-02-10', recorded_by: 3 },
    { id: 2, type: 'Pengeluaran', category: 'Operasional Cloud', amount: 12500000, description: 'Tagihan AWS & Database Supabase', transaction_date: '2026-02-12', recorded_by: 3 },
    { id: 3, type: 'Pemasukan', category: 'Pendapatan Jasa Konsultasi', amount: 45000000, description: 'Konsultasi Arsitektur IT Sistem Enterprise', transaction_date: '2026-02-15', recorded_by: 3 },
    { id: 4, type: 'Pengeluaran', category: 'Sewa Kantor & Utilitas', amount: 18000000, description: 'Biaya utilitas listrik dan fasilitas kantor', transaction_date: '2026-02-18', recorded_by: 3 }
  ];

  for (const tx of transactions) {
    const existing = await get('SELECT id FROM financial_transactions WHERE id = ?', [tx.id]);
    if (!existing) {
      await run(
        `INSERT INTO financial_transactions (id, type, category, amount, description, transaction_date, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tx.id, tx.type, tx.category, tx.amount, tx.description, tx.transaction_date, tx.recorded_by]
      );
    } else {
      await run(
        `UPDATE financial_transactions SET type = ?, category = ?, amount = ?, description = ?, transaction_date = ?, recorded_by = ?
         WHERE id = ?`,
        [tx.type, tx.category, tx.amount, tx.description, tx.transaction_date, tx.recorded_by, tx.id]
      );
    }
  }
  console.log('6. Financial Transactions (ID 1 s/d 4) lengkap.');

  // 8. Pastikan Attendances (Absensi) ID 1, 2, 3
  const attendances = [
    { id: 1, employee_id: 5, date: '2026-02-20', check_in: '08:55:00', check_out: '17:05:00', status: 'Hadir', notes: 'Tepat waktu' },
    { id: 2, employee_id: 6, date: '2026-02-20', check_in: '09:02:00', check_out: '17:15:00', status: 'Hadir', notes: 'Normal' },
    { id: 3, employee_id: 5, date: '2026-02-21', check_in: '08:50:00', check_out: '17:00:00', status: 'Hadir', notes: 'Hadir pagi' }
  ];

  for (const att of attendances) {
    const existing = await get('SELECT id FROM attendances WHERE id = ?', [att.id]);
    if (!existing) {
      await run(
        `INSERT INTO attendances (id, employee_id, date, check_in, check_out, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [att.id, att.employee_id, att.date, att.check_in, att.check_out, att.status, att.notes]
      );
    } else {
      await run(
        `UPDATE attendances SET employee_id = ?, date = ?, check_in = ?, check_out = ?, status = ?, notes = ?
         WHERE id = ?`,
        [att.employee_id, att.date, att.check_in, att.check_out, att.status, att.notes, att.id]
      );
    }
  }
  console.log('7. Attendances (ID 1, 2, 3) lengkap.');

  // 9. Pastikan Performance Reports
  const reports = [
    { id: 1, employee_id: 5, period: '2026-Q1', tasks_completed: 25, kpi_score: 95.0, feedback: 'Sangat baik dalam merancang arsitektur API dan integrasi sistem.', reviewed_by: 4 },
    { id: 2, employee_id: 6, period: '2026-Q1', tasks_completed: 20, kpi_score: 88.0, feedback: 'Teliti dalam QA automation dan pengujian regresi API.', reviewed_by: 4 }
  ];

  for (const rep of reports) {
    const existing = await get('SELECT id FROM performance_reports WHERE id = ?', [rep.id]);
    if (!existing) {
      await run(
        `INSERT INTO performance_reports (id, employee_id, period, tasks_completed, kpi_score, feedback, reviewed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [rep.id, rep.employee_id, rep.period, rep.tasks_completed, rep.kpi_score, rep.feedback, rep.reviewed_by]
      );
    } else {
      await run(
        `UPDATE performance_reports SET employee_id = ?, period = ?, tasks_completed = ?, kpi_score = ?, feedback = ?, reviewed_by = ?
         WHERE id = ?`,
        [rep.employee_id, rep.period, rep.tasks_completed, rep.kpi_score, rep.feedback, rep.reviewed_by, rep.id]
      );
    }
  }
  console.log('8. Performance Reports (ID 1, 2) lengkap.');

  // 10. Pastikan Announcements
  const announcements = [
    { id: 1, title: 'Pengumuman Libur Nasional & Kebijakan Kantor 2026', content: 'Diberitahukan kepada seluruh karyawan bahwa kantor akan libur pada tanggal merah sesuai kalender pemerintah.', priority: 'High', category: 'Umum', author_id: 1 },
    { id: 2, title: 'Jadwal Pemeliharaan Cloud & Server Database', content: 'Pemeliharaan berkala infrastruktur cloud akan dilaksanakan pada hari Sabtu malam.', priority: 'Normal', category: 'Teknologi', author_id: 1 }
  ];

  for (const ann of announcements) {
    const existing = await get('SELECT id FROM announcements WHERE id = ?', [ann.id]);
    if (!existing) {
      await run(
        `INSERT INTO announcements (id, title, content, priority, category, author_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ann.id, ann.title, ann.content, ann.priority, ann.category, ann.author_id]
      );
    } else {
      await run(
        `UPDATE announcements SET title = ?, content = ?, priority = ?, category = ?, author_id = ?
         WHERE id = ?`,
        [ann.title, ann.content, ann.priority, ann.category, ann.author_id, ann.id]
      );
    }
  }
  console.log('9. Announcements (ID 1, 2) lengkap.');

  // Sinkronkan Postgres Sequences agar INSERT berikutnya tidak bentrok dengan ID manual
  const tables = [
    'users', 'employees', 'leave_requests', 'salaries',
    'financial_transactions', 'attendances', 'performance_reports', 'announcements'
  ];
  for (const t of tables) {
    try {
      await run(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) + 1 FROM ${t}), 1), false)`);
    } catch (e) {
      // Abaikan jika sequence tidak ada
    }
  }
  console.log('10. Sequence IDs disinkronkan.');

  console.log('\n=== SEMUA DATA DATABASE BERHASIL DI-SEED DENGAN SEMPURNA! ===');
}

seedPerfectData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error seeding data:', err);
    process.exit(1);
  });
