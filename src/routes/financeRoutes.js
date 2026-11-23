const express = require('express');
const { body, param } = require('express-validator');
const authenticate = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validateMiddleware');
const {
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
} = require('../controllers/financeController');

const router = express.Router();

// Hanya Admin dan Keuangan yang dapat mengakses modul Keuangan
router.use(authenticate, authorizeRoles('Admin', 'Keuangan'));

// Endpoint Gaji
router.get('/salaries', getAllSalaries);
router.get(
  '/salaries/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID gaji harus berupa angka positif').toInt()],
  validateRequest,
  getSalaryById
);
router.post(
  '/salaries',
  [
    body().custom((value, { req }) => {
      if (!req.body?.employee_code && !req.body?.employee_id) {
        throw new Error('Kode karyawan unik (employee_code) atau employee_id wajib diisi');
      }
      return true;
    }),
    body('month').matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('Format bulan harus YYYY-MM (contoh: 2026-11)'),
    body('base_salary').isFloat({ min: 0 }).withMessage('Gaji pokok harus angka positif').toFloat(),
    body('allowance').optional().isFloat({ min: 0 }).withMessage('Tunjangan tidak boleh negatif').toFloat(),
    body('deduction').optional().isFloat({ min: 0 }).withMessage('Potongan tidak boleh negatif').toFloat(),
    body('payment_status').optional().isIn(['Pending', 'Paid']).withMessage('Status pembayaran harus Pending atau Paid')
  ],
  validateRequest,
  createSalary
);
router.patch(
  '/salaries/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID gaji harus berupa angka positif').toInt(),
    body('base_salary').optional().isFloat({ min: 0 }).withMessage('Gaji pokok tidak boleh negatif').toFloat(),
    body('allowance').optional().isFloat({ min: 0 }).withMessage('Tunjangan tidak boleh negatif').toFloat(),
    body('deduction').optional().isFloat({ min: 0 }).withMessage('Potongan tidak boleh negatif').toFloat(),
    body('payment_status').optional().isIn(['Pending', 'Paid']).withMessage('Status pembayaran harus Pending atau Paid')
  ],
  validateRequest,
  updateSalaryStatus
);
router.delete(
  '/salaries/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID gaji harus berupa angka positif').toInt()],
  validateRequest,
  deleteSalary
);

// Endpoint Transaksi & Laporan Keuangan
router.get('/transactions', getAllTransactions);
router.get(
  '/transactions/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID transaksi harus berupa angka positif').toInt()],
  validateRequest,
  getTransactionById
);
router.post(
  '/transactions',
  [
    body('type').isIn(['Pemasukan', 'Pengeluaran']).withMessage('Tipe transaksi harus Pemasukan atau Pengeluaran'),
    body('category').trim().notEmpty().withMessage('Kategori wajib diisi'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Jumlah nominal harus lebih dari 0').toFloat(),
    body('description').optional({ nullable: true }).isString(),
    body('transaction_date').isISO8601({ strict: true, strictSeparator: true }).withMessage('Tanggal transaksi harus format YYYY-MM-DD')
  ],
  validateRequest,
  createTransaction
);
router.delete(
  '/transactions/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID transaksi harus berupa angka positif').toInt()],
  validateRequest,
  deleteTransaction
);
router.get('/reports', getFinancialReport);

module.exports = router;

