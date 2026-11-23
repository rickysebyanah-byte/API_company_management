const { errorResponse } = require('../utils/responseHelper');

/**
 * Middleware otorisasi berbasis Role (RBAC)
 * @param  {...string} allowedRoles - Daftar role yang diizinkan mengakses endpoint
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 401, 'Pengguna belum terautentikasi.');
    }

    // Admin selalu memiliki akses ke seluruh fitur sistem (Superuser)
    if (req.user.role === 'Admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return errorResponse(
      res,
      403,
      `Akses ditolak (Forbidden). Anda sedang menggunakan token dengan Role '${req.user.role}'. Fitur ini khusus untuk Role: ${allowedRoles.join(', ')}.`
    );
  };
};

module.exports = authorizeRoles;
