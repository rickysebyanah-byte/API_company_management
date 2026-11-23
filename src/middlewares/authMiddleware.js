const jwt = require('jsonwebtoken');
const { get } = require('../config/database');
const { errorResponse } = require('../utils/responseHelper');
require('dotenv').config();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Akses ditolak. Token autentikasi tidak ditemukan atau format salah.');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return errorResponse(res, 401, 'Sesi berakhir. Token telah kedaluwarsa, silakan login kembali.');
      }
      return errorResponse(res, 401, 'Token tidak valid.');
    }

    // Verifikasi apakah user masih ada & aktif di database
    const user = await get(
      `SELECT u.id, u.username, u.email, u.is_active, r.name AS role, e.id AS employee_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (!user || !user.is_active) {
      return errorResponse(res, 401, 'Token tidak valid atau akun pengguna telah dinonaktifkan.');
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = authenticate;
