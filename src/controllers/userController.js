const bcrypt = require('bcryptjs');
const { run, get, all } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const getAllRoles = async (req, res, next) => {
  try {
    const roles = await all('SELECT id, name, description FROM roles ORDER BY id');
    return successResponse(res, 200, 'Daftar role berhasil diambil', roles);
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await all(
      `SELECT u.id, u.username, u.email, u.is_active, u.created_at, r.id AS role_id, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.id ASC`
    );
    return successResponse(res, 200, 'Daftar pengguna berhasil diambil', users);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await get(
      `SELECT u.id, u.username, u.email, u.is_active, u.created_at, r.id AS role_id, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.params.id]
    );
    if (!user) return errorResponse(res, 404, 'Pengguna tidak ditemukan');
    return successResponse(res, 200, 'Detail pengguna berhasil diambil', user);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { username, email, password, role_id } = req.body;

    const roleExists = await get(`SELECT id FROM roles WHERE id = ?`, [role_id]);
    if (!roleExists) return errorResponse(res, 400, 'Role ID tidak valid');

    const duplicate = await get(`SELECT id FROM users WHERE username = ? OR email = ?`, [username, email]);
    if (duplicate) return errorResponse(res, 409, 'Username atau email sudah terdaftar');

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      `INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)`,
      [username, email, passwordHash, role_id]
    );

    return successResponse(res, 201, 'Pengguna berhasil ditambahkan', {
      id: result.id,
      username,
      email,
      role_id
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 409, 'Username atau email sudah terdaftar');
    }
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, email, password, role_id, is_active } = req.body;

    const existing = await get(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!existing) return errorResponse(res, 404, 'Pengguna tidak ditemukan');

    const nextRoleId = role_id === undefined ? existing.role_id : role_id;
    const nextRole = await get('SELECT id, name FROM roles WHERE id = ?', [nextRoleId]);
    if (!nextRole) return errorResponse(res, 400, 'Role ID tidak valid');

    const currentRole = await get('SELECT name FROM roles WHERE id = ?', [existing.role_id]);
    const employee = await get('SELECT id FROM employees WHERE user_id = ?', [id]);
    if (employee && currentRole.name === 'Manager' && nextRole.name !== 'Manager') {
      const reports = await get('SELECT COUNT(*) AS total FROM employees WHERE manager_id = ?', [employee.id]);
      if (reports.total) {
        return errorResponse(res, 409, 'Role Manager tidak dapat diubah selama masih memiliki bawahan. Alihkan bawahan terlebih dahulu.');
      }
    }

    const targetActiveStatus = is_active !== undefined ? Boolean(is_active) : Boolean(existing.is_active);
    if (employee && currentRole.name === 'Manager' && !targetActiveStatus) {
      const reports = await get('SELECT COUNT(*) AS total FROM employees WHERE manager_id = ?', [employee.id]);
      if (reports.total && Number(reports.total) > 0) {
        return errorResponse(res, 409, 'Akun Manager dengan bawahan tidak dapat dinonaktifkan. Alihkan bawahan terlebih dahulu.');
      }
    }

    let passwordHash = existing.password_hash;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    await run(
      `UPDATE users SET username = ?, email = ?, password_hash = ?, role_id = ?, is_active = ? WHERE id = ?`,
      [
        username === undefined ? existing.username : username,
        email === undefined ? existing.email : email,
        passwordHash,
        nextRoleId,
        targetActiveStatus,
        id
      ]
    );

    return successResponse(res, 200, 'Data pengguna berhasil diperbarui');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 409, 'Username atau email sudah terdaftar');
    }
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) {
      return errorResponse(res, 400, 'Admin tidak dapat menghapus akunnya sendiri');
    }

    const existing = await get(`SELECT id FROM users WHERE id = ?`, [id]);
    if (!existing) return errorResponse(res, 404, 'Pengguna tidak ditemukan');

    const linkedData = await get(
      `SELECT
         (SELECT COUNT(*) FROM employees WHERE user_id = ?) AS employee_count,
         (SELECT COUNT(*) FROM employees e
          JOIN employees supervisor ON supervisor.id = e.manager_id
          WHERE supervisor.user_id = ?) AS report_count,
         (SELECT COUNT(*) FROM financial_transactions WHERE recorded_by = ?) AS transaction_count`,
      [id, id, id]
    );
    if (linkedData.employee_count || linkedData.report_count || linkedData.transaction_count) {
      return errorResponse(res, 409, 'Pengguna memiliki relasi karyawan, bawahan, atau transaksi. Nonaktifkan akun, jangan hapus.');
    }

    await run(`DELETE FROM users WHERE id = ?`, [id]);
    return successResponse(res, 200, 'Pengguna berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllRoles, getAllUsers, getUserById, createUser, updateUser, deleteUser };
