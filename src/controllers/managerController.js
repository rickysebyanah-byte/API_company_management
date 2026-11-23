const { get, all, run } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const getTeamMembers = async (req, res, next) => {
  try {
    // Admin melihat semua karyawan; Manager hanya melihat bawahan langsung.
    let query = `
      SELECT e.id, e.employee_code, e.full_name, e.position_id,
             p.name AS position, d.id AS department_id, d.name AS department,
             e.hire_date, e.phone, e.manager_id, u.username, u.email
      FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN positions p ON e.position_id = p.id
      JOIN departments d ON p.department_id = d.id
    `;
    const params = [];

    if (req.user.role === 'Manager') {
      if (!req.user.employee_id) {
        return errorResponse(res, 404, 'Profil karyawan untuk Manager ini belum terdaftar');
      }
      query += ` WHERE e.manager_id = ?`;
      params.push(req.user.employee_id);
    }

    query += ` ORDER BY e.full_name ASC`;
    const team = await all(query, params);
    return successResponse(res, 200, 'Data anggota tim berhasil diambil', team);
  } catch (error) {
    next(error);
  }
};

const getTeamPerformanceReports = async (req, res, next) => {
  try {
    let query = `
      SELECT pr.id, pr.employee_id, pr.period, pr.tasks_completed, pr.kpi_score, pr.feedback,
             pr.reviewed_by, pr.created_at,
             reviewer.full_name AS reviewer_name,
             e.employee_code, e.full_name, p.name AS position, d.name AS department
      FROM performance_reports pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN positions p ON e.position_id = p.id
      JOIN departments d ON p.department_id = d.id
      JOIN employees reviewer ON pr.reviewed_by = reviewer.id
    `;
    const params = [];

    if (req.user.role === 'Manager') {
      if (!req.user.employee_id) {
        return errorResponse(res, 404, 'Profil karyawan untuk Manager ini belum terdaftar');
      }
      query += ` WHERE e.manager_id = ?`;
      params.push(req.user.employee_id);
    }

    query += ` ORDER BY pr.period DESC, pr.kpi_score DESC`;
    const reports = await all(query, params);
    return successResponse(res, 200, 'Laporan pekerjaan & kinerja tim berhasil diambil', reports);
  } catch (error) {
    next(error);
  }
};

const getPerformanceReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await get(
      `SELECT pr.id, pr.employee_id, pr.period, pr.tasks_completed, pr.kpi_score, pr.feedback,
              pr.reviewed_by, pr.created_at,
              reviewer.full_name AS reviewer_name,
              e.employee_code, e.full_name, p.name AS position, d.name AS department,
              e.manager_id
       FROM performance_reports pr
       JOIN employees e ON pr.employee_id = e.id
       JOIN positions p ON e.position_id = p.id
       JOIN departments d ON p.department_id = d.id
       JOIN employees reviewer ON pr.reviewed_by = reviewer.id
       WHERE pr.id = ?`,
      [id]
    );
    if (!report) return errorResponse(res, 404, 'Laporan kinerja tidak ditemukan');

    if (req.user.role === 'Manager' && Number(report.manager_id) !== Number(req.user.employee_id)) {
      return errorResponse(res, 403, 'Akses ditolak. Anda hanya dapat melihat laporan bawahan langsung Anda.');
    }

    delete report.manager_id;
    return successResponse(res, 200, 'Detail laporan kinerja berhasil diambil', report);
  } catch (error) {
    next(error);
  }
};

const createPerformanceReport = async (req, res, next) => {
  try {
    if (!req.user.employee_id) {
      return errorResponse(res, 404, 'Profil karyawan untuk Manager ini belum terdaftar');
    }

    const { employee_code, employee_id, period, tasks_completed, kpi_score, feedback } = req.body;

    let employee;
    if (employee_code) {
      employee = await get('SELECT id, employee_code, full_name, manager_id FROM employees WHERE employee_code = ?', [employee_code.trim()]);
    } else if (employee_id) {
      employee = await get('SELECT id, employee_code, full_name, manager_id FROM employees WHERE id = ?', [employee_id]);
    }

    if (!employee) {
      employee = await get('SELECT id, employee_code, full_name, manager_id FROM employees WHERE manager_id = ? LIMIT 1', [req.user.employee_id]);
    }
    if (!employee) return errorResponse(res, 404, 'Karyawan tidak ditemukan');

    // Manager hanya bisa menilai bawahan langsungnya (jika bukan admin)
    if (req.user.role === 'Manager' && employee.manager_id && Number(employee.manager_id) !== Number(req.user.employee_id)) {
      return errorResponse(res, 403, 'Anda hanya dapat membuat laporan kinerja untuk bawahan langsung Anda');
    }

    const result = await run(
      `INSERT INTO performance_reports (employee_id, period, tasks_completed, kpi_score, feedback, reviewed_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        employee.id,
        period,
        tasks_completed || 0,
        kpi_score,
        feedback || null,
        req.user.employee_id
      ]
    );

    return successResponse(res, 201, `Laporan kinerja karyawan ${employee.employee_code} (${employee.full_name}) berhasil dibuat`, {
      id: result.id,
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      period,
      tasks_completed: tasks_completed || 0,
      kpi_score,
      reviewed_by: req.user.employee_id
    });
  } catch (error) {
    next(error);
  }
};

const updatePerformanceReport = async (req, res, next) => {
  try {
    if (!req.user.employee_id) {
      return errorResponse(res, 404, 'Profil karyawan untuk Manager ini belum terdaftar');
    }

    const { id } = req.params;
    const { tasks_completed, kpi_score, feedback } = req.body;

    const existing = await get(
      `SELECT pr.*, e.manager_id FROM performance_reports pr
       JOIN employees e ON pr.employee_id = e.id
       WHERE pr.id = ?`,
      [id]
    );
    if (!existing) return errorResponse(res, 404, 'Laporan kinerja tidak ditemukan');

    // Manager hanya bisa mengubah laporan yang ia buat untuk bawahannya
    if (req.user.role === 'Manager' && Number(existing.reviewed_by) !== Number(req.user.employee_id)) {
      return errorResponse(res, 403, 'Anda hanya dapat mengubah laporan kinerja yang Anda buat');
    }

    await run(
      `UPDATE performance_reports
       SET tasks_completed = ?, kpi_score = ?, feedback = ?
       WHERE id = ?`,
      [
        tasks_completed !== undefined ? tasks_completed : existing.tasks_completed,
        kpi_score !== undefined ? kpi_score : existing.kpi_score,
        feedback !== undefined ? feedback : existing.feedback,
        id
      ]
    );

    return successResponse(res, 200, 'Laporan kinerja berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

const deletePerformanceReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await get('SELECT id, reviewed_by FROM performance_reports WHERE id = ?', [id]);
    if (!existing) return errorResponse(res, 404, 'Laporan kinerja tidak ditemukan');

    if (req.user.role === 'Manager' && Number(existing.reviewed_by) !== Number(req.user.employee_id)) {
      return errorResponse(res, 403, 'Anda hanya dapat menghapus laporan kinerja yang Anda buat');
    }

    await run('DELETE FROM performance_reports WHERE id = ?', [id]);
    return successResponse(res, 200, 'Laporan kinerja berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeamMembers,
  getTeamPerformanceReports,
  getPerformanceReportById,
  createPerformanceReport,
  updatePerformanceReport,
  deletePerformanceReport
};
