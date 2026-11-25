const { run, get, all } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// --- Manajemen Gaji ---
const getAllSalaries = async (req, res, next) => {
  try {
    const salaries = await all(
      `SELECT s.id, s.employee_id, s.month, s.base_salary, s.allowance, s.deduction,
              s.net_salary, s.payment_status, s.paid_at,
              e.employee_code, e.full_name, p.name AS position, d.name AS department
       FROM salaries s
       JOIN employees e ON s.employee_id = e.id
       JOIN positions p ON e.position_id = p.id
       JOIN departments d ON p.department_id = d.id
       ORDER BY s.month DESC, e.full_name ASC`
    );
    return successResponse(res, 200, 'Data gaji karyawan berhasil diambil', salaries);
  } catch (error) {
    next(error);
  }
};

const getSalaryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const salary = await get(
      `SELECT s.id, s.employee_id, s.month, s.base_salary, s.allowance, s.deduction,
              s.net_salary, s.payment_status, s.paid_at,
              e.employee_code, e.full_name, p.name AS position, d.name AS department
       FROM salaries s
       JOIN employees e ON s.employee_id = e.id
       JOIN positions p ON e.position_id = p.id
       JOIN departments d ON p.department_id = d.id
       WHERE s.id = ?`,
      [id]
    );
    if (!salary) return errorResponse(res, 404, 'Data gaji tidak ditemukan');
    return successResponse(res, 200, 'Detail data gaji berhasil diambil', salary);
  } catch (error) {
    next(error);
  }
};

const createSalary = async (req, res, next) => {
  try {
    const {
      employee_code,
      employee_id,
      month,
      base_salary,
      allowance = 0,
      deduction = 0,
      payment_status = 'Pending'
    } = req.body;

    let targetEmployee;
    if (employee_code) {
      targetEmployee = await get('SELECT id, employee_code, full_name FROM employees WHERE employee_code = ?', [employee_code.trim()]);
    } else if (employee_id) {
      targetEmployee = await get('SELECT id, employee_code, full_name FROM employees WHERE id = ?', [employee_id]);
    }

    if (!targetEmployee) return errorResponse(res, 404, 'Karyawan tidak ditemukan');

    const salaryExists = await get(
      'SELECT id FROM salaries WHERE employee_id = ? AND month = ?',
      [targetEmployee.id, month]
    );

    const baseSalary = parseFloat(base_salary) || 0;
    const allowanceVal = parseFloat(allowance) || 0;
    const deductionVal = parseFloat(deduction) || 0;
    const netSalary = baseSalary + allowanceVal - deductionVal;

    if (netSalary < 0) return errorResponse(res, 400, 'Gaji bersih tidak boleh negatif');

    const paidAt = payment_status === 'Paid'
      ? new Date().toISOString().slice(0, 19).replace('T', ' ')
      : null;

    if (salaryExists) {
      await run(
        `UPDATE salaries SET base_salary = ?, allowance = ?, deduction = ?, net_salary = ?, payment_status = ?, paid_at = COALESCE(?, paid_at)
         WHERE id = ?`,
        [baseSalary, allowanceVal, deductionVal, netSalary, payment_status, paidAt, salaryExists.id]
      );
      const updated = await get('SELECT * FROM salaries WHERE id = ?', [salaryExists.id]);
      return successResponse(res, 200, `Data gaji karyawan ${targetEmployee.employee_code} (${targetEmployee.full_name}) berhasil diperbarui`, updated);
    }

    const result = await run(
      `INSERT INTO salaries (employee_id, month, base_salary, allowance, deduction, net_salary, payment_status, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [targetEmployee.id, month, baseSalary, allowanceVal, deductionVal, netSalary, payment_status, paidAt]
    );

    return successResponse(res, 201, `Slip gaji karyawan ${targetEmployee.employee_code} (${targetEmployee.full_name}) berhasil diterbitkan`, {
      id: result.id,
      employee_code: targetEmployee.employee_code,
      full_name: targetEmployee.full_name,
      month,
      base_salary: baseSalary,
      allowance: allowanceVal,
      deduction: deductionVal,
      net_salary: netSalary,
      payment_status
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
      return successResponse(res, 200, 'Data gaji untuk periode ini sudah tercatat sebelumnya');
    }
    next(error);
  }
};

const updateSalaryStatus = async (req, res, next) => {
  try {
    const rawId = req.params.id ? req.params.id.trim() : '';
    const isNum = /^\d+$/.test(rawId);
    const { base_salary, allowance, deduction, payment_status } = req.body;

    let existing;
    if (isNum) {
      existing = await get('SELECT * FROM salaries WHERE id = ?', [Number(rawId)]);
    } else {
      // Find by employee_code
      const emp = await get('SELECT id FROM employees WHERE employee_code = ?', [rawId]);
      if (emp) {
        existing = await get('SELECT * FROM salaries WHERE employee_id = ? ORDER BY month DESC LIMIT 1', [emp.id]);
      }
    }

    if (!existing) return errorResponse(res, 404, 'Data gaji tidak ditemukan');

    const newBase = base_salary !== undefined ? parseFloat(base_salary) : parseFloat(existing.base_salary);
    const newAllowance = allowance !== undefined ? parseFloat(allowance) : parseFloat(existing.allowance);
    const newDeduction = deduction !== undefined ? parseFloat(deduction) : parseFloat(existing.deduction);
    const newNet = newBase + newAllowance - newDeduction;

    const newStatus = payment_status || existing.payment_status;
    const paidAt = newStatus === 'Paid'
      ? (existing.paid_at || new Date().toISOString().slice(0, 19).replace('T', ' '))
      : existing.paid_at;

    await run(
      `UPDATE salaries SET base_salary = ?, allowance = ?, deduction = ?, net_salary = ?, payment_status = ?, paid_at = ?
       WHERE id = ?`,
      [newBase, newAllowance, newDeduction, newNet, newStatus, paidAt, existing.id]
    );

    const updated = await get(
      `SELECT s.*, e.employee_code, e.full_name
       FROM salaries s
       JOIN employees e ON s.employee_id = e.id
       WHERE s.id = ?`,
      [existing.id]
    );
    return successResponse(res, 200, `Gaji karyawan ${updated.employee_code} (${updated.full_name}) berhasil dibayarkan / diperbarui`, updated);
  } catch (error) {
    next(error);
  }
};

const deleteSalary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await get('SELECT id, payment_status FROM salaries WHERE id = ?', [id]);
    if (!existing) return errorResponse(res, 404, 'Data gaji tidak ditemukan');

    await run('DELETE FROM salaries WHERE id = ?', [id]);
    return successResponse(res, 200, 'Data gaji berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

// --- Manajemen Transaksi & Laporan Keuangan ---
const getAllTransactions = async (req, res, next) => {
  try {
    const transactions = await all(
      `SELECT ft.id, ft.type, ft.category, ft.amount, ft.description,
              ft.transaction_date, ft.recorded_by, u.username AS recorded_by_user
       FROM financial_transactions ft
       JOIN users u ON ft.recorded_by = u.id
       ORDER BY ft.transaction_date DESC, ft.id DESC`
    );
    return successResponse(res, 200, 'Daftar transaksi keuangan berhasil diambil', transactions);
  } catch (error) {
    next(error);
  }
};

const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transaction = await get(
      `SELECT ft.id, ft.type, ft.category, ft.amount, ft.description,
              ft.transaction_date, ft.recorded_by, u.username AS recorded_by_user
       FROM financial_transactions ft
       JOIN users u ON ft.recorded_by = u.id
       WHERE ft.id = ?`,
      [id]
    );
    if (!transaction) return errorResponse(res, 404, 'Transaksi tidak ditemukan');
    return successResponse(res, 200, 'Detail transaksi keuangan berhasil diambil', transaction);
  } catch (error) {
    next(error);
  }
};

const createTransaction = async (req, res, next) => {
  try {
    const { type, category, amount, description, transaction_date } = req.body;

    const result = await run(
      `INSERT INTO financial_transactions (type, category, amount, description, transaction_date, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [type, category, parseFloat(amount), description || null, transaction_date, req.user.id]
    );

    return successResponse(res, 201, 'Transaksi keuangan berhasil dicatat', {
      id: result.id,
      type,
      category,
      amount: parseFloat(amount),
      transaction_date
    });
  } catch (error) {
    next(error);
  }
};

const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await get('SELECT id FROM financial_transactions WHERE id = ?', [id]);
    if (!existing) return errorResponse(res, 404, 'Transaksi tidak ditemukan');

    await run('DELETE FROM financial_transactions WHERE id = ?', [id]);
    return successResponse(res, 200, 'Transaksi keuangan berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

const getFinancialReport = async (req, res, next) => {
  try {
    const summary = await get(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'Pemasukan' THEN amount ELSE 0 END), 0) AS total_pemasukan,
        COALESCE(SUM(CASE WHEN type = 'Pengeluaran' THEN amount ELSE 0 END), 0) AS total_pengeluaran
      FROM financial_transactions
    `);

    const payrollSummary = await get(`
      SELECT COALESCE(SUM(net_salary), 0) AS total_gaji_dibayarkan
      FROM salaries
      WHERE payment_status = 'Paid'
    `);

    const totalPemasukan = parseFloat(summary.total_pemasukan) || 0;
    const totalPengeluaran = parseFloat(summary.total_pengeluaran) || 0;
    const totalGaji = parseFloat(payrollSummary.total_gaji_dibayarkan) || 0;
    const saldoBersih = totalPemasukan - (totalPengeluaran + totalGaji);

    return successResponse(res, 200, 'Laporan ringkasan keuangan berhasil diambil', {
      total_pemasukan: totalPemasukan,
      total_pengeluaran_operasional: totalPengeluaran,
      total_pengeluaran_gaji: totalGaji,
      saldo_bersih: saldoBersih
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSalaries,
  getSalaryById,
  createSalary,
  updateSalaryStatus,
  deleteSalary,
  getAllTransactions,
  getTransactionById,
  createTransaction,
  deleteTransaction,
  getFinancialReport
};
