const bcrypt = require('bcryptjs');
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
    const { id } = req.params;
    const employee = await get(
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
       WHERE e.id = ?`,
      [id]
    );
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
      manager_id = null,
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

    // 3. Cek jabatan
    const position = await get('SELECT id, name FROM positions WHERE id = ?', [position_id]);
    if (!position) return errorResponse(res, 404, 'Jabatan (position_id) tidak ditemukan');

    // 4. Cek role
    const roleRow = await get('SELECT id, name FROM roles WHERE name = ?', [role]);
    if (!roleRow) return errorResponse(res, 404, `Role '${role}' tidak ditemukan di sistem`);

    // 5. Validasi atasan / manager jika diisi
    const manager = await validateManager(manager_id);
    if (!manager.valid) return errorResponse(res, 400, manager.message);

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
        [newUser.id, employee_code, full_name, position_id, manager.managerId, actualHireDate, phone || null]
      );

      return { userId: newUser.id, employeeId: newEmp.id };
    });

    return successResponse(res, 201, 'Karyawan baru berhasil diterima! Akun dan profil langsung aktif siap login.', {
      employee_id: result.employeeId,
      user_id: result.userId,
      employee_code,
      full_name,
      username,
      email,
      role: roleRow.name,
      position: position.name,
      hire_date: actualHireDate,
      phone: phone || null
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 409, 'Data duplikat terdeteksi pada username, email, atau kode karyawan');
    }
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, position_id, manager_id, phone } = req.body;
    const existing = await get('SELECT * FROM employees WHERE id = ?', [id]);
    if (!existing) return errorResponse(res, 404, 'Data karyawan tidak ditemukan');

    const newPositionId = position_id === undefined ? existing.position_id : position_id;
    const position = await get('SELECT id FROM positions WHERE id = ?', [newPositionId]);
    if (!position) return errorResponse(res, 404, 'Jabatan tidak ditemukan');

    const newManagerId = manager_id === undefined ? existing.manager_id : manager_id;
    const manager = await validateManager(newManagerId, Number(id));
    if (!manager.valid) return errorResponse(res, 400, manager.message);

    await run(
      `UPDATE employees
       SET full_name = ?, position_id = ?, manager_id = ?, phone = ?
       WHERE id = ?`,
      [
        full_name === undefined ? existing.full_name : full_name,
        newPositionId,
        manager.managerId,
        phone === undefined ? existing.phone : phone,
        id
      ]
    );

    return successResponse(res, 200, 'Data karyawan berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await get('SELECT id, user_id FROM employees WHERE id = ?', [id]);
    if (!existing) return errorResponse(res, 404, 'Data karyawan tidak ditemukan');

    const dependencies = await get(
      `SELECT
         (SELECT COUNT(*) FROM attendances WHERE employee_id = ?) AS attendance_count,
         (SELECT COUNT(*) FROM salaries WHERE employee_id = ?) AS salary_count,
         (SELECT COUNT(*) FROM performance_reports WHERE employee_id = ? OR reviewed_by = ?) AS report_count,
         (SELECT COUNT(*) FROM employees WHERE manager_id = ?) AS direct_report_count`,
      [id, id, id, id, id]
    );
    if (
      Number(dependencies.attendance_count) ||
      Number(dependencies.salary_count) ||
      Number(dependencies.report_count)
    ) {
      return errorResponse(res, 409, 'Karyawan memiliki riwayat absensi, gaji, atau evaluasi sehingga tidak dapat dihapus');
    }
    if (Number(dependencies.direct_report_count)) {
      return errorResponse(res, 409, 'Karyawan masih memiliki bawahan. Alihkan bawahan ke manager lain terlebih dahulu.');
    }

    await withTransaction(async (database) => {
      await database.run('UPDATE users SET is_active = false WHERE id = ?', [existing.user_id]);
      await database.run('DELETE FROM employees WHERE id = ?', [id]);
    });
    return successResponse(res, 200, 'Data karyawan dihapus dan akun terkait dinonaktifkan');
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
    const { employee_id, date, check_in, check_out, status, notes } = req.body;
    const employee = await get('SELECT id FROM employees WHERE id = ?', [employee_id]);
    if (!employee) return errorResponse(res, 404, 'Karyawan tidak ditemukan');

    const existing = await get(
      'SELECT id FROM attendances WHERE employee_id = ? AND date = ?',
      [employee_id, date]
    );
    if (existing) return errorResponse(res, 409, 'Absensi karyawan pada tanggal tersebut sudah ada');

    const result = await run(
      `INSERT INTO attendances (employee_id, date, check_in, check_out, status, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employee_id, date, check_in || null, check_out || null, status, notes || null]
    );

    return successResponse(res, 201, 'Data absensi berhasil dicatat', {
      id: result.id,
      employee_id,
      date,
      status
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 409, 'Absensi karyawan pada tanggal tersebut sudah ada');
    }
    next(error);
  }
};

const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { check_in, check_out, status, notes } = req.body;
    const existing = await get('SELECT * FROM attendances WHERE id = ?', [id]);
    if (!existing) return errorResponse(res, 404, 'Data absensi tidak ditemukan');

    await run(
      `UPDATE attendances
       SET check_in = ?, check_out = ?, status = ?, notes = ?
       WHERE id = ?`,
      [
        check_in === undefined ? existing.check_in : check_in,
        check_out === undefined ? existing.check_out : check_out,
        status === undefined ? existing.status : status,
        notes === undefined ? existing.notes : notes,
        id
      ]
    );

    return successResponse(res, 200, 'Data absensi berhasil diperbarui');
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
