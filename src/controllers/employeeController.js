const { get, all, run } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const getJakartaDateTime = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const getPart = (type) => parts.find((part) => part.type === type).value;

  return {
    date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
    time: `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`
  };
};

const getMyProfile = async (req, res, next) => {
  try {
    const profile = await get(
      `SELECT u.id AS user_id, u.username, u.email, r.name AS role,
              e.id AS employee_id, e.employee_code, e.full_name,
              p.id AS position_id, p.name AS position, d.id AS department_id, d.name AS department,
              e.hire_date, e.phone,
              m.id AS manager_id, m.full_name AS manager_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN positions p ON e.position_id = p.id
       LEFT JOIN departments d ON p.department_id = d.id
       LEFT JOIN employees m ON e.manager_id = m.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!profile) return errorResponse(res, 404, 'Profil tidak ditemukan');
    return successResponse(res, 200, 'Profil dan informasi pekerjaan sendiri berhasil diambil', profile);
  } catch (error) {
    next(error);
  }
};

const getMyAttendances = async (req, res, next) => {
  try {
    if (!req.user.employee_id) {
      return errorResponse(res, 404, 'Data kepegawaian Anda belum terdaftar. Hubungi HRD.');
    }

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const offset = (page - 1) * limit;
    const conditions = ['employee_id = ?'];
    const params = [req.user.employee_id];

    if (req.query.from) {
      conditions.push('date >= ?');
      params.push(req.query.from);
    }

    if (req.query.to) {
      conditions.push('date <= ?');
      params.push(req.query.to);
    }

    const whereClause = conditions.join(' AND ');
    const totalResult = await get(
      `SELECT COUNT(*) AS total FROM attendances WHERE ${whereClause}`,
      params
    );
    const attendances = await all(
      `SELECT id, date, check_in, check_out, status, notes
       FROM attendances
       WHERE ${whereClause}
       ORDER BY date DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return successResponse(res, 200, 'Riwayat absensi sendiri berhasil diambil', {
      items: attendances,
      pagination: {
        page,
        limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const checkIn = async (req, res, next) => {
  try {
    if (!req.user.employee_id) {
      return errorResponse(res, 404, 'Data kepegawaian Anda belum terdaftar. Hubungi HRD.');
    }

    const { date, time } = getJakartaDateTime();

    // Cek apakah sudah check-in hari ini
    const existing = await get(
      'SELECT id, date, check_in, check_out, status, notes FROM attendances WHERE employee_id = ? AND date = ?',
      [req.user.employee_id, date]
    );

    if (existing) {
      return successResponse(
        res,
        200,
        `Anda sudah melakukan check-in hari ini pada pukul ${existing.check_in || 'tadi'}.`,
        existing
      );
    }

    const result = await run(
      `INSERT INTO attendances (employee_id, date, check_in, check_out, status, notes)
       VALUES (?, ?, ?, NULL, 'Hadir', NULL)`,
      [req.user.employee_id, date, time]
    );

    const attendance = await get(
      `SELECT id, date, check_in, check_out, status, notes
       FROM attendances WHERE id = ?`,
      [result.id]
    );
    return successResponse(res, 201, 'Check-in berhasil dicatat', attendance);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
      const existing = await get(
        'SELECT id, date, check_in, check_out, status, notes FROM attendances WHERE employee_id = ? AND date = ?',
        [req.user.employee_id, getJakartaDateTime().date]
      );
      return successResponse(res, 200, 'Check-in hari ini sudah tercatat sebelumnya.', existing);
    }
    next(error);
  }
};

const checkOut = async (req, res, next) => {
  try {
    if (!req.user.employee_id) {
      return errorResponse(res, 404, 'Data kepegawaian Anda belum terdaftar. Hubungi HRD.');
    }

    const { date, time } = getJakartaDateTime();
    const existing = await get(
      'SELECT id, date, check_in, check_out, status, notes FROM attendances WHERE employee_id = ? AND date = ?',
      [req.user.employee_id, date]
    );

    if (!existing) {
      // Jika belum check-in hari ini, otomatis catat hadir jam 08:30 dan checkout sekarang
      const ins = await run(
        `INSERT INTO attendances (employee_id, date, check_in, check_out, status, notes)
         VALUES (?, ?, '08:30:00', ?, 'Hadir', 'Check-in otomatis saat check-out')`,
        [req.user.employee_id, date, time]
      );
      const att = await get('SELECT id, date, check_in, check_out, status, notes FROM attendances WHERE id = ?', [ins.id]);
      return successResponse(res, 200, 'Presensi pulang (check-out) berhasil dicatat', att);
    }

    if (existing.check_out) {
      return successResponse(
        res,
        200,
        `Anda sudah melakukan check-out hari ini pada pukul ${existing.check_out}.`,
        existing
      );
    }

    await run('UPDATE attendances SET check_out = ? WHERE id = ?', [time, existing.id]);
    const updated = await get('SELECT id, date, check_in, check_out, status, notes FROM attendances WHERE id = ?', [existing.id]);
    return successResponse(res, 200, 'Check-out berhasil dicatat', updated);
  } catch (error) {
    next(error);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const { full_name, phone } = req.body;
    if (!req.user.employee_id) {
      return errorResponse(res, 404, 'Data kepegawaian Anda belum terdaftar.');
    }

    const current = await get('SELECT full_name, phone FROM employees WHERE id = ?', [req.user.employee_id]);
    const updatedName = full_name !== undefined && full_name.trim() !== '' ? full_name.trim() : current.full_name;
    const updatedPhone = phone !== undefined ? phone.trim() : current.phone;

    await run(
      'UPDATE employees SET full_name = ?, phone = ? WHERE id = ?',
      [updatedName, updatedPhone, req.user.employee_id]
    );

    return successResponse(res, 200, 'Profil berhasil diperbarui', {
      employee_id: req.user.employee_id,
      full_name: updatedName,
      phone: updatedPhone
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { old_password, new_password } = req.body;
    const bcrypt = require('bcryptjs');

    const user = await get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!user) return errorResponse(res, 404, 'Pengguna tidak ditemukan');

    const isValid = await bcrypt.compare(old_password, user.password_hash);
    if (!isValid) {
      return errorResponse(res, 400, 'Password lama Anda salah');
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    return successResponse(res, 200, 'Password berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getMyAttendances,
  checkIn,
  checkOut
};
