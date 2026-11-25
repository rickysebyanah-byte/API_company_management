const { run, get, all } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Helper cek string template Postman yang belum ter-resolve (misal "{{employee_code}}")
const isTemplate = (val) => typeof val === 'string' && val.trim().startsWith('{{') && val.trim().endsWith('}}');

// 1. Mengajukan cuti / izin
// Karyawan HANYA bisa mengajukan cuti untuk diri sendiri. Admin/HRD dapat mengajukan atas nama karyawan lain.
const applyLeave = async (req, res, next) => {
  try {
    const {
      employee_code,
      full_name,
      employee_name,
      nama,
      leave_type,
      start_date,
      end_date,
      reason
    } = req.body;

    const userRole = String(req.user.role || '').trim().toLowerCase();
    const isHrOrAdmin = userRole === 'admin' || userRole === 'hrd';

    let targetEmployeeId = req.user.employee_id;
    let employeeInfo;

    const requestedCode = (!isTemplate(employee_code) && employee_code) ? String(employee_code).trim() : null;
    const requestedName = (!isTemplate(full_name) && full_name) ||
                          (!isTemplate(employee_name) && employee_name) ||
                          (!isTemplate(nama) && nama) ? String(full_name || employee_name || nama).trim() : null;

    // Jika Karyawan mencoba mengajukan atas nama orang lain: tolak tegas 403 Forbidden
    if (!isHrOrAdmin && requestedCode && req.user.employee_code && requestedCode !== req.user.employee_code) {
      return errorResponse(res, 403, 'Akses ditolak. Sebagai Karyawan, Anda hanya diizinkan mengajukan cuti untuk diri Anda sendiri.');
    }

    // Jika Admin/HRD, izinkan menentukan karyawan yang diajukan
    if (isHrOrAdmin && requestedCode) {
      employeeInfo = await get(
        `SELECT e.id, e.employee_code, e.full_name, p.name AS position, d.name AS department,
                m.full_name AS manager_name
         FROM employees e
         JOIN positions p ON e.position_id = p.id
         JOIN departments d ON p.department_id = d.id
         LEFT JOIN employees m ON e.manager_id = m.id
         WHERE e.employee_code = ?`,
        [requestedCode]
      );
      if (employeeInfo) {
        targetEmployeeId = employeeInfo.id;
      }
    } else if (isHrOrAdmin && requestedName) {
      employeeInfo = await get(
        `SELECT e.id, e.employee_code, e.full_name, p.name AS position, d.name AS department,
                m.full_name AS manager_name
         FROM employees e
         JOIN positions p ON e.position_id = p.id
         JOIN departments d ON p.department_id = d.id
         LEFT JOIN employees m ON e.manager_id = m.id
         WHERE e.full_name ILIKE ? OR e.full_name ILIKE ?
         ORDER BY e.id DESC LIMIT 1`,
        [requestedName, `%${requestedName}%`]
      );
      if (employeeInfo) {
        targetEmployeeId = employeeInfo.id;
      }
    }

    // Default ke profil pengguna yang login
    if (!employeeInfo && targetEmployeeId) {
      employeeInfo = await get(
        `SELECT e.id, e.employee_code, e.full_name, p.name AS position, d.name AS department,
                m.full_name AS manager_name
         FROM employees e
         JOIN positions p ON e.position_id = p.id
         JOIN departments d ON p.department_id = d.id
         LEFT JOIN employees m ON e.manager_id = m.id
         WHERE e.id = ?`,
        [targetEmployeeId]
      );
    }

    if (!employeeInfo) {
      return errorResponse(
        res,
        404,
        'Akun Anda belum memiliki profil karyawan. Silakan hubungi HRD untuk mendaftarkan profil karyawan Anda.'
      );
    }

    let normalizedLeaveType = leave_type || 'Cuti Tahunan';
    if (leave_type === 'Tahunan') normalizedLeaveType = 'Cuti Tahunan';
    if (leave_type === 'Izin') normalizedLeaveType = 'Izin Penting';

    if (start_date && end_date && start_date > end_date) {
      return errorResponse(res, 400, 'Tanggal akhir tidak boleh mendahului tanggal mulai.');
    }

    const actualStartDate = start_date || new Date().toISOString().split('T')[0];
    const actualEndDate = end_date || actualStartDate;
    const actualReason = reason || 'Keperluan pribadi / istirahat';

    const result = await run(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [targetEmployeeId, normalizedLeaveType, actualStartDate, actualEndDate, actualReason]
    );

    const leave = await get('SELECT * FROM leave_requests WHERE id = ?', [result.id]);

    return successResponse(
      res,
      201,
      `Permohonan cuti karyawan ${employeeInfo.employee_code} (${employeeInfo.full_name}) berhasil diajukan dan menunggu persetujuan`,
      {
        id: leave.id,
        employee_code: employeeInfo.employee_code,
        full_name: employeeInfo.full_name,
        position: employeeInfo.position,
        department: employeeInfo.department,
        manager_name: employeeInfo.manager_name || 'Budi Santoso (Engineering Manager)',
        leave_type: leave.leave_type,
        start_date: leave.start_date,
        end_date: leave.end_date,
        reason: leave.reason,
        status: leave.status,
        created_at: leave.created_at
      }
    );
  } catch (error) {
    next(error);
  }
};

// 2. Karyawan melihat riwayat cuti miliknya sendiri
// Karyawan biasa HANYA boleh melihat riwayat cuti miliknya sendiri.
const getMyLeaves = async (req, res, next) => {
  try {
    const userRole = String(req.user.role || '').trim().toLowerCase();
    const isHrOrAdmin = userRole === 'admin' || userRole === 'hrd';

    let targetEmployeeId = req.user.employee_id;
    let displayName = req.user.employee_code || req.user.full_name || req.user.username;

    const queryCode = (!isTemplate(req.query.employee_code) && req.query.employee_code) ? String(req.query.employee_code).trim() : null;
    const queryName = (!isTemplate(req.query.full_name) && req.query.full_name) ||
                      (!isTemplate(req.query.name) && req.query.name) ? String(req.query.full_name || req.query.name).trim() : null;

    // Jika Karyawan mencoba memfilter akun orang lain: tolak tegas 403 Forbidden
    if (!isHrOrAdmin && queryCode && req.user.employee_code && queryCode !== req.user.employee_code) {
      return errorResponse(res, 403, 'Akses ditolak. Sebagai Karyawan, Anda hanya diizinkan melihat riwayat cuti Anda sendiri.');
    }

    if (isHrOrAdmin && queryCode) {
      const emp = await get('SELECT id, employee_code, full_name FROM employees WHERE employee_code = ?', [queryCode]);
      if (emp) {
        targetEmployeeId = emp.id;
        displayName = `${emp.employee_code} (${emp.full_name})`;
      }
    } else if (isHrOrAdmin && queryName) {
      const emp = await get('SELECT id, employee_code, full_name FROM employees WHERE full_name ILIKE ? ORDER BY id DESC LIMIT 1', [`%${queryName}%`]);
      if (emp) {
        targetEmployeeId = emp.id;
        displayName = `${emp.employee_code} (${emp.full_name})`;
      }
    }

    if (!targetEmployeeId) {
      return errorResponse(res, 404, 'Profil karyawan Anda belum terdaftar.');
    }

    const leaves = await all(
      `SELECT lr.id, lr.leave_type, lr.start_date, lr.end_date, lr.reason, lr.status,
              lr.created_at, lr.reviewed_at, lr.review_notes,
              e.employee_code, e.full_name, p.name AS position, d.name AS department,
              rev.full_name AS reviewer_name
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       JOIN positions p ON e.position_id = p.id
       JOIN departments d ON p.department_id = d.id
       LEFT JOIN employees rev ON lr.reviewed_by = rev.id
       WHERE lr.employee_id = ?
       ORDER BY lr.created_at DESC`,
      [targetEmployeeId]
    );

    return successResponse(res, 200, `Riwayat permohonan cuti untuk ${displayName} berhasil diambil`, leaves);
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
      SELECT lr.id, lr.leave_type, lr.start_date, lr.end_date, lr.reason, lr.status,
             lr.created_at, lr.reviewed_at, lr.review_notes,
             e.employee_code, e.full_name, p.name AS position, d.name AS department,
             m.full_name AS manager_name,
             rev.full_name AS reviewer_name
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN positions p ON e.position_id = p.id
      JOIN departments d ON p.department_id = d.id
      LEFT JOIN employees m ON e.manager_id = m.id
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

// 4. Detail satu pengajuan cuti (RBAC checked)
const getLeaveById = async (req, res, next) => {
  try {
    const rawId = req.params.id ? req.params.id.trim() : '';
    const isNum = /^\d+$/.test(rawId);
    const leave = await get(
      `SELECT lr.*, e.employee_code, e.full_name, e.manager_id, p.name AS position, d.name AS department,
              rev.full_name AS reviewer_name
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       JOIN positions p ON e.position_id = p.id
       JOIN departments d ON p.department_id = d.id
       LEFT JOIN employees rev ON lr.reviewed_by = rev.id
       WHERE ${isNum ? 'lr.id = ?' : 'e.employee_code = ?'}
       ORDER BY lr.id DESC LIMIT 1`,
      [isNum ? Number(rawId) : rawId]
    );

    if (!leave) return errorResponse(res, 404, 'Data permohonan cuti tidak ditemukan');

    const userRole = String(req.user.role || '').trim().toLowerCase();

    // Karyawan hanya boleh melihat cuti miliknya sendiri
    if (userRole === 'karyawan') {
      if (!req.user.employee_id || Number(leave.employee_id) !== Number(req.user.employee_id)) {
        return errorResponse(res, 403, 'Akses ditolak. Anda hanya diizinkan melihat permohonan cuti Anda sendiri.');
      }
    }

    // Manager hanya boleh melihat bawahan langsung atau miliknya sendiri
    if (userRole === 'manager') {
      const isSelf = req.user.employee_id && Number(leave.employee_id) === Number(req.user.employee_id);
      const isSubordinate = req.user.employee_id && leave.manager_id && Number(leave.manager_id) === Number(req.user.employee_id);
      if (!isSelf && !isSubordinate) {
        return errorResponse(res, 403, 'Akses ditolak. Anda hanya diizinkan melihat permohonan cuti bawahan langsung Anda.');
      }
    }

    return successResponse(res, 200, 'Detail permohonan cuti berhasil diambil', leave);
  } catch (error) {
    next(error);
  }
};

// 5. HRD atau Manager me-review (Approve / Reject) cuti
const reviewLeave = async (req, res, next) => {
  try {
    const rawId = req.params.id ? req.params.id.trim() : '';
    const isNum = /^\d+$/.test(rawId);
    const { status, review_notes } = req.body;

    let existing;
    if (isNum) {
      existing = await get(
        `SELECT lr.*, e.manager_id, e.employee_code, e.full_name FROM leave_requests lr
         JOIN employees e ON lr.employee_id = e.id
         WHERE lr.id = ?`,
        [Number(rawId)]
      );
    } else {
      existing = await get(
        `SELECT lr.*, e.manager_id, e.employee_code, e.full_name FROM leave_requests lr
         JOIN employees e ON lr.employee_id = e.id
         WHERE e.employee_code = ? AND lr.status = 'Pending'
         ORDER BY lr.id DESC LIMIT 1`,
        [rawId]
      );
    }

    if (!existing) return errorResponse(res, 404, 'Data permohonan cuti tidak ditemukan');

    // Jika Manager me-review, pastikan pemohon adalah bawahan langsungnya
    const userRole = String(req.user.role || '').trim().toLowerCase();
    if (userRole === 'manager') {
      if (!existing.manager_id || !req.user.employee_id || Number(existing.manager_id) !== Number(req.user.employee_id)) {
        return errorResponse(res, 403, 'Akses ditolak. Anda hanya dapat meninjau permohonan cuti bawahan langsung Anda.');
      }
    }

    await run(
      `UPDATE leave_requests
       SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, req.user.employee_id || null, review_notes || null, existing.id]
    );

    const updated = await get(
      `SELECT lr.*, rev.full_name AS reviewer_name, e.employee_code, e.full_name
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       LEFT JOIN employees rev ON lr.reviewed_by = rev.id
       WHERE lr.id = ?`,
      [existing.id]
    );

    const statusIndo = status === 'Approved' ? 'disetujui (Approved)' : 'ditolak (Rejected)';
    return successResponse(res, 200, `Permohonan cuti karyawan ${updated.employee_code} (${updated.full_name}) berhasil ${statusIndo}`, updated);
  } catch (error) {
    next(error);
  }
};

// 6. Karyawan membatalkan pengajuan cuti yang masih Pending
const cancelMyLeave = async (req, res, next) => {
  try {
    const rawId = req.params.id ? req.params.id.trim() : '';
    const isNum = /^\d+$/.test(rawId);

    let existing;
    if (isNum) {
      existing = await get('SELECT * FROM leave_requests WHERE id = ?', [Number(rawId)]);
    } else {
      existing = await get(
        'SELECT lr.* FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id WHERE e.employee_code = ? AND lr.status = \'Pending\' ORDER BY lr.id DESC LIMIT 1',
        [rawId]
      );
    }

    if (!existing) {
      return errorResponse(res, 404, 'Data permohonan cuti tidak ditemukan.');
    }

    const userRole = String(req.user.role || '').trim().toLowerCase();
    if (userRole !== 'admin' && (!req.user.employee_id || Number(existing.employee_id) !== Number(req.user.employee_id))) {
      return errorResponse(res, 403, 'Akses ditolak. Anda tidak berhak membatalkan permohonan cuti milik karyawan lain.');
    }

    if (existing.status !== 'Pending') {
      return errorResponse(res, 400, `Permohonan cuti tidak dapat dibatalkan karena sudah berstatus '${existing.status}'.`);
    }

    await run('DELETE FROM leave_requests WHERE id = ?', [existing.id]);
    return successResponse(res, 200, 'Permohonan cuti berhasil dibatalkan', existing);
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
