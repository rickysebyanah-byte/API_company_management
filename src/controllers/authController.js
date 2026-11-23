const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');
require('dotenv').config();

const login = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const identifierParam = typeof req.body?.identifier === 'string' ? req.body.identifier.trim() : '';
    const usernameIdentifier = typeof username === 'string' ? username.trim() : '';
    const emailIdentifier = typeof email === 'string' ? email.trim() : '';
    const identifier = usernameIdentifier || emailIdentifier || identifierParam;

    const user = await get(
      `SELECT u.id, u.username, u.email, u.password_hash, u.is_active, r.name AS role,
              e.id AS employee_id, e.employee_code, e.full_name, e.hire_date, e.phone,
              p.name AS position, d.name AS department, m.full_name AS manager_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN positions p ON e.position_id = p.id
       LEFT JOIN departments d ON p.department_id = d.id
       LEFT JOIN employees m ON e.manager_id = m.id
       WHERE u.username = ? OR u.email = ?`,
      [identifier, identifier]
    );

    if (!user) {
      return errorResponse(res, 401, 'Username/email atau password salah.');
    }

    if (!user.is_active) {
      return errorResponse(res, 401, 'Akun Anda dinonaktifkan. Hubungi Admin.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return errorResponse(res, 401, 'Username/email atau password salah.');
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        employee_id: user.employee_id || null
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const employeeProfile = user.employee_id
      ? {
          id: user.employee_id,
          employee_code: user.employee_code,
          full_name: user.full_name,
          position: user.position,
          department: user.department,
          manager_name: user.manager_name || 'Tidak ada atasan langsung',
          hire_date: user.hire_date,
          phone: user.phone
        }
      : null;

    return successResponse(
      res,
      200,
      `Login berhasil! Selamat datang, ${user.full_name || user.username}.`,
      {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          is_profile_completed: Boolean(user.employee_id),
          employee: employeeProfile
        }
      }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = { login };
