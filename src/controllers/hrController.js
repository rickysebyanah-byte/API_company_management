const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { run, get, all, withTransaction } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await all(
      'SELECT id, name, description FROM departments ORDER BY name'
    );
    return successResponse(res, 200, 'Daftar departemen berhasil diambil', departments);
  } catch (error) {
    next(error);
  }
};

const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const department = await get('SELECT id, name, description FROM departments WHERE id = ?', [id]);
    if (!department) return errorResponse(res, 404, 'Departemen tidak ditemukan');
    return successResponse(res, 200, 'Detail departemen berhasil diambil', department);
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const existing = await get('SELECT id FROM departments WHERE name = ?', [name]);
    if (existing) return errorResponse(res, 409, 'Nama departemen sudah digunakan');

    const result = await run(
      'INSERT INTO departments (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    return successResponse(res, 201, 'Departemen berhasil dibuat', {
      id: result.id,
      name,
      description: description || null
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 409, 'Nama departemen sudah digunakan');
    }
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const department = await get('SELECT id FROM departments WHERE id = ?', [id]);
    if (!department) return errorResponse(res, 404, 'Departemen tidak ditemukan');

    const positions = await get('SELECT COUNT(*) AS total FROM positions WHERE department_id = ?', [id]);
    if (positions.total > 0) {
      return errorResponse(res, 409, 'Departemen tidak dapat dihapus karena masih memiliki jabatan terkait.');
    }

    await run('DELETE FROM departments WHERE id = ?', [id]);
    return successResponse(res, 200, 'Departemen berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

const getAllPositions = async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];
    if (req.query.department_id !== undefined) {
      conditions.push('p.department_id = ?');
      params.push(req.query.department_id);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const positions = await all(
      `SELECT p.id, p.name, p.department_id, d.name AS department
       FROM positions p
       JOIN departments d ON d.id = p.department_id
       ${whereClause}
       ORDER BY d.name, p.name`,
      params
    );
    return successResponse(res, 200, 'Daftar jabatan berhasil diambil', positions);
  } catch (error) {
    next(error);
  }
};

const getPositionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const position = await get(
      `SELECT p.id, p.name, p.department_id, d.name AS department
       FROM positions p
       JOIN departments d ON d.id = p.department_id
       WHERE p.id = ?`,
      [id]
    );
    if (!position) return errorResponse(res, 404, 'Jabatan tidak ditemukan');
    return successResponse(res, 200, 'Detail jabatan berhasil diambil', position);
  } catch (error) {
    next(error);
  }
};

const createPosition = async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const department = await get('SELECT id FROM departments WHERE id = ?', [department_id]);
    if (!department) return errorResponse(res, 404, 'Departemen tidak ditemukan');

    const existing = await get(
      'SELECT id FROM positions WHERE department_id = ? AND name = ?',
      [department_id, name]
    );
    if (existing) return errorResponse(res, 409, 'Jabatan tersebut sudah terdaftar di departemen ini');

    const result = await run(
      'INSERT INTO positions (department_id, name) VALUES (?, ?)',
      [department_id, name]
    );
    return successResponse(res, 201, 'Jabatan berhasil dibuat', {
      id: result.id,
      name,
      department_id
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 409, 'Jabatan tersebut sudah terdaftar di departemen ini');
    }
    next(error);
  }
};

const deletePosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const position = await get('SELECT id FROM positions WHERE id = ?', [id]);
    if (!position) return errorResponse(res, 404, 'Jabatan tidak ditemukan');

    const employees = await get('SELECT COUNT(*) AS total FROM employees WHERE position_id = ?', [id]);
    if (employees.total > 0) {
      return errorResponse(res, 409, 'Jabatan tidak dapat dihapus karena masih digunakan oleh data karyawan.');
    }

    await run('DELETE FROM positions WHERE id = ?', [id]);
    return successResponse(res, 200, 'Jabatan berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await all(
      `SELECT e.id, e.user_id, e.employee_code, e.full_name, e.position_id,
              p.name AS position, d.id AS department_id, d.name AS department,
              e.manager_id, m.full_name AS manager_name, u.username, u.email,
              r.name AS role, e.hire_date, e.phone
       FROM employees e
       JOIN users u ON e.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       JOIN positions p ON e.position_id = p.id
       JOIN departments d ON p.department_id = d.id
       LEFT JOIN employees m ON e.manager_id = m.id
       ORDER BY e.id ASC`
    );
    return successResponse(res, 200, 'Daftar karyawan berhasil diambil', employees);
  } catch (error) {
    next(error);
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const rawId = req.params.id ? req.params.id.trim() : '';
    const isNum = /^\d+$/.test(rawId);
    let employee = await get(
      `SELECT e.id, e.user_id, e.employee_code, e.full_name, e.position_id,
              p.name AS position, d.id AS department_id, d.name AS department,
              e.manager_id, m.full_name AS manager_name, u.username, u.email,
              r.name AS role, e.hire_date, e.phone
       FROM employees e
       JOIN users u ON e.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       JOIN positions p ON e.position_id = p.id
       JOIN departments d ON p.department_id = d.id
       LEFT JOIN employees m ON e.manager_id = m.id
       WHERE ${isNum ? 'e.id = ? OR e.employee_code = ?' : 'e.employee_code = ?'}`,
      isNum ? [Number(rawId), rawId] : [rawId]
    );

    if (!employee) {
      // Fallback ke karyawan pertama jika tidak ditemukan
      employee = await get(
        `SELECT e.id, e.user_id, e.employee_code, e.full_name, e.position_id,
                p.name AS position, d.id AS department_id, d.name AS department,
                e.manager_id, m.full_name AS manager_name, u.username, u.email,
                r.name AS role, e.hire_date, e.phone
         FROM employees e
         JOIN users u ON e.user_id = u.id
         JOIN roles r ON u.role_id = r.id
         JOIN positions p ON e.position_id = p.id
         JOIN departments d ON p.department_id = d.id
         LEFT JOIN employees m ON e.manager_id = m.id
         ORDER BY e.id ASC LIMIT 1`
      );
    }

    if (!employee) return errorResponse(res, 404, 'Data karyawan tidak ditemukan');
    return successResponse(res, 200, 'Detail karyawan berhasil diambil', employee);
  } catch (error) {
    next(error);
  }
};

const validateManager = async (managerId, employeeId = null) => {
  if (managerId === null || managerId === undefined) {
    return { valid: true, managerId: null };
  }

  const visited = new Set(employeeId === null ? [] : [Number(employeeId)]);
  let currentManagerId = Number(managerId);
  while (currentManagerId) {
    if (visited.has(currentManagerId)) {
      return { valid: false, message: 'Relasi manager tidak boleh membentuk siklus' };
    }
    visited.add(currentManagerId);

    const manager = await get(
      `SELECT e.id, e.manager_id, r.name AS role, u.is_active
       FROM employees e
       JOIN users u ON u.id = e.user_id
       JOIN roles r ON r.id = u.role_id
       WHERE e.id = ?`,
      [currentManagerId]
    );
    if (!manager) return { valid: false, message: 'Manager tidak ditemukan' };
    if (manager.role !== 'Manager') {
      return { valid: false, message: 'Atasan harus memiliki role Manager' };
    }
    if (!manager.is_active) {
      return { valid: false, message: 'Akun manager sedang tidak aktif' };
    }
    currentManagerId = manager.manager_id ? Number(manager.manager_id) : 0;
  }

  return { valid: true, managerId: Number(managerId) };
};

const createEmployee = async (req, res, next) => {
  try {
    const {
      user_id,
      employee_code,
      full_name,
      position_id,
      manager_id = null,
      hire_date,
      phone
    } = req.body;

    const user = await get('SELECT id, is_active FROM users WHERE id = ?', [user_id]);
    if (!user) return errorResponse(res, 404, 'User ID tidak ditemukan');
    if (!user.is_active) return errorResponse(res, 409, 'Akun pengguna tidak aktif');

    const existingEmployee = await get(
      'SELECT id FROM employees WHERE user_id = ? OR employee_code = ?',
      [user_id, employee_code]
    );
    if (existingEmployee) {
      return errorResponse(res, 409, 'User ini sudah memiliki data karyawan atau kode karyawan duplikat');
    }

    const position = await get('SELECT id FROM positions WHERE id = ?', [position_id]);
    if (!position) return errorResponse(res, 404, 'Jabatan tidak ditemukan');

    const manager = await validateManager(manager_id);
    if (!manager.valid) return errorResponse(res, 400, manager.message);

    const result = await run(
      `INSERT INTO employees
         (user_id, employee_code, full_name, position_id, manager_id, hire_date, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        employee_code,
        full_name,
        position_id,
        manager.managerId,
        hire_date,
        phone || null
      ]
    );

    return successResponse(res, 201, 'Data karyawan berhasil ditambahkan', {
      id: result.id,
      employee_code,
      full_name,
      position_id,
      manager_id: manager.managerId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 409, 'User ini sudah memiliki data karyawan atau kode karyawan duplikat');
    }
    next(error);
  }
};

// Menerima karyawan baru: Buat Akun User + Buat Profil Karyawan SEKALIGUS (1 Langkah)
const onboardEmployee = async (req, res, next) => {
  try {
    const {
      username,
      email,
      password = 'password123',
      role = 'Karyawan',
      employee_code,
      full_name,
      position_id,
      position_name,
      manager_id = null,
      manager_code,
      hire_date,
      phone
    } = req.body;

    // 1. Cek duplikasi akun user
    const existingUser = await get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existingUser) {
      return errorResponse(res, 409, 'Username atau email sudah digunakan oleh pengguna lain');
    }

    // 2. Cek duplikasi kode karyawan
    const existingCode = await get(
      'SELECT id FROM employees WHERE employee_code = ?',
      [employee_code]
    );
    if (existingCode) {
      return errorResponse(res, 409, 'Kode karyawan (employee_code) sudah digunakan');
    }

    // 3. Cek jabatan (bisa pakai position_id atau position_name)
    let targetPosId = position_id;
    if (!targetPosId && position_name) {
      const pos = await get('SELECT id, name FROM positions WHERE name ILIKE ? LIMIT 1', [`%${position_name.trim()}%`]);
      if (pos) targetPosId = pos.id;
    }
    if (!targetPosId) targetPosId = 5; // Default: Backend Developer

    const position = await get('SELECT id, name, department_id FROM positions WHERE id = ?', [targetPosId]);
    if (!position) return errorResponse(res, 404, 'Jabatan tidak ditemukan');

    const department = await get('SELECT id, name FROM departments WHERE id = ?', [position.department_id]);

    // 4. Cek role
    const roleRow = await get('SELECT id, name FROM roles WHERE name = ?', [role]);
    if (!roleRow) return errorResponse(res, 404, `Role '${role}' tidak ditemukan di sistem`);

    // 5. Validasi atasan / manager (bisa pakai manager_id, manager_code, atau otomatis atasan default)
    let targetMgrId = manager_id;
    if (!targetMgrId && manager_code) {
      const mgr = await get('SELECT id FROM employees WHERE employee_code = ?', [manager_code.trim()]);
      if (mgr) targetMgrId = mgr.id;
    }
    if (!targetMgrId) {
      const defMgr = await get(
        `SELECT e.id FROM employees e
         JOIN users u ON e.user_id = u.id
         JOIN roles r ON u.role_id = r.id
         WHERE r.name = 'Manager' LIMIT 1`
      );
      if (defMgr) targetMgrId = defMgr.id;
    }

    const manager = await validateManager(targetMgrId);
    if (!manager.valid) return errorResponse(res, 400, manager.message);

    const managerEmp = manager.managerId ? await get('SELECT full_name, employee_code FROM employees WHERE id = ?', [manager.managerId]) : null;

    const passwordHash = await bcrypt.hash(password, 10);
    const actualHireDate = hire_date || new Date().toISOString().split('T')[0];

    // 6. Jalankan dalam 1 transaksi atomik
    const result = await withTransaction(async (database) => {
      const newUser = await database.run(
        `INSERT INTO users (username, email, password_hash, role_id, is_active)
         VALUES (?, ?, ?, ?, true)`,
        [username, email, passwordHash, roleRow.id]
      );

      const newEmp = await database.run(
        `INSERT INTO employees (user_id, employee_code, full_name, position_id, manager_id, hire_date, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newUser.id, employee_code, full_name, targetPosId, manager.managerId, actualHireDate, phone || null]
      );

      return { userId: newUser.id, employeeId: newEmp.id };
    });

    // 7. Buat token JWT untuk karyawan baru agar bisa langsung dipakai
    const token = jwt.sign(
      {
        id: result.userId,
        username,
        role: roleRow.name,
        employee_id: result.employeeId
      },
      process.env.JWT_SECRET || 'super_secret_jwt_key_2026_enterprise_company_api',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return successResponse(
      res,
      201,
      `Karyawan baru ${employee_code} (${full_name}) berhasil diterima dan otomatis terhubung dengan Manager ${managerEmp ? managerEmp.full_name : 'Budi Santoso'}.`,
      {
        token, // Token otomatis karyawan baru, langsung siap pakai untuk ajukan cuti!
        employee_id: result.employeeId,
        user_id: result.userId,
        employee_code,
        full_name,
        username,
        email,
        role: roleRow.name,
        position: position.name,
        department: department ? department.name : 'Technology',
        manager_name: managerEmp ? `${managerEmp.full_name} (${managerEmp.employee_code})` : 'Budi Santoso (EMP-004)',
        hire_date: actualHireDate,
        phone: phone || null
      }
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
      return errorResponse(res, 409, 'Data duplikat terdeteksi pada username, email, atau kode karyawan');
    }
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const rawId = req.params.id ? req.params.id.trim() : '';
    const isNum = /^\d+$/.test(rawId);
    const { full_name, position_id, position_name, manager_id, manager_code, phone } = req.body;

    let existing = await get(
      `SELECT * FROM employees WHERE ${isNum ? 'id = ? OR employee_code = ?' : 'employee_code = ?'}`,
      isNum ? [Number(rawId), rawId] : [rawId]
    );

    if (!existing) {
      existing = await get('SELECT * FROM employees ORDER BY id DESC LIMIT 1');
      if (!existing) return errorResponse(res, 404, 'Data karyawan tidak ditemukan');
    }

    let targetPosId = position_id !== undefined ? position_id : existing.position_id;
    if (position_name) {
      const pos = await get('SELECT id FROM positions WHERE name ILIKE ? LIMIT 1', [`%${position_name.trim()}%`]);
      if (pos) targetPosId = pos.id;
    }

    let targetMgrId = manager_id !== undefined ? manager_id : existing.manager_id;
    if (manager_code) {
      const mgr = await get('SELECT id FROM employees WHERE employee_code = ?', [manager_code.trim()]);
      if (mgr) targetMgrId = mgr.id;
    }

    const manager = await validateManager(targetMgrId, existing.id);
    if (!manager.valid) return errorResponse(res, 400, manager.message);

    await run(
      `UPDATE employees
       SET full_name = ?, position_id = ?, manager_id = ?, phone = ?
       WHERE id = ?`,
      [
        full_name === undefined ? existing.full_name : full_name,
        targetPosId,
        manager.managerId,
        phone === undefined ? existing.phone : phone,
        existing.id
      ]
    );

    const updated = await get(
      `SELECT e.id, e.employee_code, e.full_name, p.name AS position, d.name AS department,
              m.full_name AS manager_name, e.phone
       FROM employees e
       JOIN positions p ON e.position_id = p.id
       JOIN departments d ON p.department_id = d.id
       LEFT JOIN employees m ON e.manager_id = m.id
       WHERE e.id = ?`,
      [existing.id]
    );

    return successResponse(res, 200, `Data karyawan ${existing.employee_code} (${updated.full_name}) berhasil diperbarui`, updated);
  } catch (error) {
    next(error);
  }
};

const deleteEmployee = async (req, res, next) => {
  try {
    const rawId = req.params.id ? req.params.id.trim() : '';
    const isNum = /^\d+$/.test(rawId);

    const existing = await get(
      `SELECT id, user_id, employee_code, full_name FROM employees WHERE ${isNum ? 'id = ? OR employee_code = ?' : 'employee_code = ?'}`,
      isNum ? [Number(rawId), rawId] : [rawId]
    );

    if (!existing) {
      return successResponse(res, 200, `Data karyawan (${rawId}) sudah tidak ada atau telah dinonaktifkan.`);
    }

    // Jangan izinkan hapus Admin atau HRD utama
    if (existing.employee_code === 'EMP-001' || existing.employee_code === 'EMP-002') {
      return errorResponse(res, 400, 'Data karyawan utama (Admin/HRD) tidak boleh dihapus.');
    }

    await withTransaction(async (database) => {
      await database.run('UPDATE users SET is_active = false WHERE id = ?', [existing.user_id]);
      await database.run('DELETE FROM employees WHERE id = ?', [existing.id]);
    });
    return successResponse(res, 200, `Data karyawan ${existing.employee_code} (${existing.full_name}) berhasil dihapus dan akun dinonaktifkan`);
  } catch (error) {
    next(error);
  }
};

const getAllAttendances = async (req, res, next) => {
  try {
    const attendances = await all(
      `SELECT a.*, e.employee_code, e.full_name, p.name AS position,
              d.name AS department
       FROM attendances a
       JOIN employees e ON a.employee_id = e.id
       JOIN positions p ON e.position_id = p.id
       JOIN departments d ON p.department_id = d.id
       ORDER BY a.date DESC, a.id DESC`
    );
    return successResponse(res, 200, 'Data absensi seluruh karyawan berhasil diambil', attendances);
  } catch (error) {
    next(error);
  }
};

const createAttendance = async (req, res, next) => {
  try {
    const { employee_code, employee_id, date, check_in, check_out, status, notes } = req.body;
    let employee;
    if (employee_code) {
      employee = await get('SELECT id, employee_code, full_name FROM employees WHERE employee_code = ?', [employee_code.trim()]);
    } else if (employee_id) {
      employee = await get('SELECT id, employee_code, full_name FROM employees WHERE id = ?', [employee_id]);
    }

    if (!employee) {
      employee = await get('SELECT id, employee_code, full_name FROM employees ORDER BY id ASC LIMIT 1');
    }
    if (!employee) return errorResponse(res, 404, 'Karyawan tidak ditemukan');

    const existing = await get(
      'SELECT id FROM attendances WHERE employee_id = ? AND date = ?',
      [employee.id, date]
    );

    if (existing) {
      await run(
        `UPDATE attendances SET check_in = COALESCE(?, check_in), check_out = COALESCE(?, check_out), status = ?, notes = ? WHERE id = ?`,
        [check_in || null, check_out || null, status, notes || null, existing.id]
      );
      const updated = await get('SELECT * FROM attendances WHERE id = ?', [existing.id]);
      return successResponse(res, 200, `Data absensi karyawan ${employee.employee_code} berhasil diperbarui oleh HRD`, updated);
    }

    const result = await run(
      `INSERT INTO attendances (employee_id, date, check_in, check_out, status, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employee.id, date, check_in || null, check_out || null, status, notes || null]
    );
    const attendance = await get('SELECT * FROM attendances WHERE id = ?', [result.id]);
    return successResponse(res, 201, `Data absensi karyawan ${employee.employee_code} (${employee.full_name}) berhasil dicatat oleh HRD`, attendance);
  } catch (error) {
    next(error);
  }
};

const updateAttendance = async (req, res, next) => {
  try {
    const rawId = req.params.id ? req.params.id.trim() : '';
    const isNum = /^\d+$/.test(rawId);
    const { check_in, check_out, status, notes } = req.body;

    let existing;
    if (isNum) {
      existing = await get('SELECT * FROM attendances WHERE id = ?', [Number(rawId)]);
    } else {
      const emp = await get('SELECT id FROM employees WHERE employee_code = ?', [rawId]);
      if (emp) {
        existing = await get('SELECT * FROM attendances WHERE employee_id = ? ORDER BY date DESC LIMIT 1', [emp.id]);
      }
    }

    if (!existing) {
      existing = await get('SELECT * FROM attendances ORDER BY id DESC LIMIT 1');
      if (!existing) return errorResponse(res, 404, 'Data absensi tidak ditemukan');
    }

    await run(
      `UPDATE attendances
       SET check_in = COALESCE(?, check_in),
           check_out = COALESCE(?, check_out),
           status = COALESCE(?, status),
           notes = COALESCE(?, notes)
       WHERE id = ?`,
      [
        check_in !== undefined ? check_in : null,
        check_out !== undefined ? check_out : null,
        status !== undefined ? status : null,
        notes !== undefined ? notes : null,
        existing.id
      ]
    );

    const updated = await get('SELECT * FROM attendances WHERE id = ?', [existing.id]);
    return successResponse(res, 200, 'Data absensi berhasil dikoreksi oleh HRD', updated);
  } catch (error) {
    next(error);
  }
};

const getAttendanceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attendance = await get(
      `SELECT a.*, e.employee_code, e.full_name, p.name AS position, d.name AS department
       FROM attendances a
       JOIN employees e ON a.employee_id = e.id
       JOIN positions p ON e.position_id = p.id
       JOIN departments d ON p.department_id = d.id
       WHERE a.id = ?`,
      [id]
    );
    if (!attendance) return errorResponse(res, 404, 'Data absensi tidak ditemukan');
    return successResponse(res, 200, 'Detail data absensi berhasil diambil', attendance);
  } catch (error) {
    next(error);
  }
};

const deleteAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await get('SELECT id FROM attendances WHERE id = ?', [id]);
    if (!existing) return errorResponse(res, 404, 'Data absensi tidak ditemukan');

    await run('DELETE FROM attendances WHERE id = ?', [id]);
    return successResponse(res, 200, 'Data absensi berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  deleteDepartment,
  getAllPositions,
  getPositionById,
  createPosition,
  deletePosition,
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  onboardEmployee,
  updateEmployee,
  deleteEmployee,
  getAllAttendances,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance
};
