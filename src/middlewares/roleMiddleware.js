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

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Akses ditolak (Forbidden). Role '${req.user.role}' tidak memiliki izin untuk mengakses fitur ini.`
      );
    }

    next();
  };
};

module.exports = authorizeRoles;
