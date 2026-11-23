const { get, all } = require('../config/database');
const { successResponse } = require('../utils/responseHelper');

const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Ringkasan Karyawan & User
    const userStats = await get(`
      SELECT 
        COUNT(*) AS total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) AS active_users,
        COUNT(CASE WHEN is_active = false THEN 1 END) AS inactive_users
      FROM users
    `);

    const employeeCount = await get('SELECT COUNT(*) AS total FROM employees');

    // 2. Breakdown per Departemen
    const departmentBreakdown = await all(`
      SELECT d.name AS department, COUNT(e.id) AS total_employees
      FROM departments d
      LEFT JOIN positions p ON p.department_id = d.id
      LEFT JOIN employees e ON e.position_id = p.id
      GROUP BY d.id, d.name
      ORDER BY total_employees DESC, d.name ASC
    `);

    // 3. Ringkasan Presensi Hari Ini (WIB)
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    const attendanceStats = await get(`
      SELECT 
        COUNT(CASE WHEN status = 'Hadir' THEN 1 END) AS hadir,
        COUNT(CASE WHEN status = 'Izin' THEN 1 END) AS izin,
        COUNT(CASE WHEN status = 'Sakit' THEN 1 END) AS sakit,
        COUNT(CASE WHEN status = 'Alpa' THEN 1 END) AS alpa,
        COUNT(*) AS total_presensi
      FROM attendances
      WHERE date = ?
    `, [today]);

    // 4. Ringkasan Keuangan
    const financialSummary = await get(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'Pemasukan' THEN amount ELSE 0 END), 0) AS total_pemasukan,
        COALESCE(SUM(CASE WHEN type = 'Pengeluaran' THEN amount ELSE 0 END), 0) AS total_pengeluaran
      FROM financial_transactions
    `);

    const payrollSummary = await get(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN net_salary ELSE 0 END), 0) AS total_gaji_terbayar,
        COALESCE(SUM(CASE WHEN payment_status = 'Pending' THEN net_salary ELSE 0 END), 0) AS total_gaji_tertunda
      FROM salaries
    `);

    const totalPemasukan = parseFloat(financialSummary.total_pemasukan) || 0;
    const totalPengeluaran = parseFloat(financialSummary.total_pengeluaran) || 0;
    const totalGajiTerbayar = parseFloat(payrollSummary.total_gaji_terbayar) || 0;
    const saldoKasBersih = totalPemasukan - (totalPengeluaran + totalGajiTerbayar);

    // 5. Pengajuan Cuti & Pengumuman
    const pendingLeaves = await get(`
      SELECT COUNT(*) AS total FROM leave_requests WHERE status = 'Pending'
    `);

    const announcementCount = await get(`
      SELECT COUNT(*) AS total FROM announcements
    `);

    const stats = {
      overview: {
        total_employees: parseInt(employeeCount.total) || 0,
        total_users: parseInt(userStats.total_users) || 0,
        active_users: parseInt(userStats.active_users) || 0,
        inactive_users: parseInt(userStats.inactive_users) || 0,
        pending_leave_requests: parseInt(pendingLeaves.total) || 0,
        total_announcements: parseInt(announcementCount.total) || 0
      },
      today_attendance: {
        date: today,
        hadir: parseInt(attendanceStats.hadir) || 0,
        izin: parseInt(attendanceStats.izin) || 0,
        sakit: parseInt(attendanceStats.sakit) || 0,
        alpa: parseInt(attendanceStats.alpa) || 0,
        total: parseInt(attendanceStats.total_presensi) || 0
      },
      finance: {
        total_pemasukan: totalPemasukan,
        total_pengeluaran_operasional: totalPengeluaran,
        total_gaji_terbayar: totalGajiTerbayar,
        total_gaji_tertunda: parseFloat(payrollSummary.total_gaji_tertunda) || 0,
        saldo_kas_bersih: saldoKasBersih
      },
      departments: departmentBreakdown.map(d => ({
        department: d.department,
        total_employees: parseInt(d.total_employees) || 0
      }))
    };

    return successResponse(res, 200, 'Statistik analitik dashboard berhasil diambil', stats);
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
