const { errorResponse } = require('../utils/responseHelper');

/**
 * Middleware otorisasi berbasis Role (RBAC)
 * @param  {...string} allowedRoles - Daftar role yang diizinkan mengakses endpoint
 */
const authorizeRoles = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map((r) => String(r).trim().toLowerCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 401, 'Pengguna belum terautentikasi.');
    }

    const userRole = String(req.user.role).trim();
    const userRoleLower = userRole.toLowerCase();

    // Admin selalu memiliki akses ke seluruh fitur sistem (Superuser)
    if (userRoleLower === 'admin' || normalizedAllowed.includes(userRoleLower)) {
      return next();
    }

    return errorResponse(
      res,
      403,
      `Akses ditolak (Forbidden). Anda sedang menggunakan token dengan Role '${userRole}'. Fitur ini khusus untuk Role: ${allowedRoles.join(', ')}.`
    );
  };
};

module.exports = authorizeRoles;
