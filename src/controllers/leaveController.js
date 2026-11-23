const { run, get, all } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// 1. Karyawan mengajukan cuti / izin
const applyLeave = async (req, res, next) => {
  try {
    if (!req.user.employee_id) {
      return errorResponse(res, 404, 'Profil karyawan Anda belum terdaftar. Hubungi HRD.');
    }

    const { leave_type, start_date, end_date, reason } = req.body;

    if (start_date > end_date) {
      return errorResponse(res, 400, 'Tanggal akhir tidak boleh mendahului tanggal mulai.');
    }

    const result = await run(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [req.user.employee_id, leave_type, start_date, end_date, reason]
    );

    const leave = await get('SELECT * FROM leave_requests WHERE id = ?', [result.id]);
    return successResponse(res, 201, 'Permohonan cuti/izin berhasil diajukan dan menunggu persetujuan', leave);
  } catch (error) {
    next(error);
  }
};

// 2. Karyawan melihat riwayat cuti miliknya sendiri
const getMyLeaves = async (req, res, next) => {
  try {
    if (!req.user.employee_id) {
      return errorResponse(res, 404, 'Profil karyawan Anda belum terdaftar.');
    }

    const leaves = await all(
      `SELECT lr.*, rev.full_name AS reviewer_name
       FROM leave_requests lr
       LEFT JOIN employees rev ON lr.reviewed_by = rev.id
       WHERE lr.employee_id = ?
       ORDER BY lr.created_at DESC`,
      [req.user.employee_id]
    );

    return successResponse(res, 200, 'Riwayat pengajuan cuti berhasil diambil', leaves);
  } catch (error) {
    next(error);
  }
};

// 3. HRD, Manager, Admin melihat seluruh pengajuan cuti
const getAllLeaves = async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];

    if (req.query.status) {
      conditions.push('lr.status = ?');
      params.push(req.query.status);
    }

    // Jika role Manager, hanya tampilkan bawahan langsung
    if (req.user.role === 'Manager') {
      if (!req.user.employee_id) {
        return errorResponse(res, 404, 'Profil karyawan untuk Manager ini belum terdaftar');
      }
      conditions.push('e.manager_id = ?');
      params.push(req.user.employee_id);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT lr.*, e.employee_code, e.full_name, p.name AS position, d.name AS department,
             rev.full_name AS reviewer_name
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN positions p ON e.position_id = p.id
      JOIN departments d ON p.department_id = d.id
      LEFT JOIN employees rev ON lr.reviewed_by = rev.id
      ${whereClause}
      ORDER BY lr.created_at DESC
    `;

    const leaves = await all(query, params);
    return successResponse(res, 200, 'Daftar permohonan cuti berhasil diambil', leaves);
  } catch (error) {
    next(error);
  }
};

// 4. Detail satu pengajuan cuti
const getLeaveById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const leave = await get(
      `SELECT lr.*, e.employee_code, e.full_name, p.name AS position, d.name AS department,
              rev.full_name AS reviewer_name
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       JOIN positions p ON e.position_id = p.id
       JOIN departments d ON p.department_id = d.id
       LEFT JOIN employees rev ON lr.reviewed_by = rev.id
       WHERE lr.id = ?`,
      [id]
    );

    if (!leave) return errorResponse(res, 404, 'Data permohonan cuti tidak ditemukan');
    return successResponse(res, 200, 'Detail permohonan cuti berhasil diambil', leave);
  } catch (error) {
    next(error);
  }
};

// 5. HRD atau Manager me-review (Approve / Reject) cuti
const reviewLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;

    const existing = await get(
      `SELECT lr.*, e.manager_id FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE lr.id = ?`,
      [id]
    );

    if (!existing) return errorResponse(res, 404, 'Data permohonan cuti tidak ditemukan');

    if (existing.status !== 'Pending') {
      return errorResponse(res, 409, `Permohonan cuti ini sudah berstatus '${existing.status}' dan tidak dapat diubah lagi.`);
    }

    // Jika Manager me-review, pastikan pemohon adalah bawahan langsungnya
    if (req.user.role === 'Manager') {
      if (!req.user.employee_id || Number(existing.manager_id) !== Number(req.user.employee_id)) {
        return errorResponse(res, 403, 'Anda hanya dapat meninjau permohonan cuti bawahan langsung Anda.');
      }
    }

    await run(
      `UPDATE leave_requests
       SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, req.user.employee_id || null, review_notes || null, id]
    );

    const updated = await get('SELECT * FROM leave_requests WHERE id = ?', [id]);
    return successResponse(res, 200, `Permohonan cuti berhasil di-${status.toLowerCase()}`, updated);
  } catch (error) {
    next(error);
  }
};

// 6. Karyawan membatalkan pengajuan cuti yang masih Pending
const cancelMyLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await get('SELECT * FROM leave_requests WHERE id = ?', [id]);
    if (!existing) return errorResponse(res, 404, 'Data permohonan cuti tidak ditemukan');

    if (Number(existing.employee_id) !== Number(req.user.employee_id)) {
      return errorResponse(res, 403, 'Anda hanya dapat membatalkan permohonan cuti milik sendiri');
    }

    if (existing.status !== 'Pending') {
      return errorResponse(res, 409, 'Hanya permohonan berstatus Pending yang dapat dibatalkan');
    }

    await run('DELETE FROM leave_requests WHERE id = ?', [id]);
    return successResponse(res, 200, 'Permohonan cuti berhasil dibatalkan');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  getLeaveById,
  reviewLeave,
  cancelMyLeave
};
