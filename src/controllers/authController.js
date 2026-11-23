const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');
require('dotenv').config();

const login = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const usernameIdentifier = typeof username === 'string' ? username.trim() : '';
    const emailIdentifier = typeof email === 'string' ? email.trim() : '';
    const identifier = usernameIdentifier || emailIdentifier;

    const user = await get(
      `SELECT u.id, u.username, u.email, u.password_hash, u.is_active, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
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
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return successResponse(res, 200, 'Login berhasil', {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login };
