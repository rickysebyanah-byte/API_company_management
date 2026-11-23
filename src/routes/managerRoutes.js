const express = require('express');
const { body, param } = require('express-validator');
const authenticate = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validateMiddleware');
const {
  getTeamMembers,
  getTeamPerformanceReports,
  getPerformanceReportById,
  createPerformanceReport,
  updatePerformanceReport,
  deletePerformanceReport
} = require('../controllers/managerController');

const router = express.Router();

// Hanya Admin dan Manager yang dapat melihat data anggota tim dan laporan kinerja
router.use(authenticate, authorizeRoles('Admin', 'Manager'));

router.get('/team', getTeamMembers);
router.get('/performance-reports', getTeamPerformanceReports);
router.get(
  '/performance-reports/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID laporan harus berupa angka positif').toInt()],
  validateRequest,
  getPerformanceReportById
);
router.post(
  '/performance-reports',
  [
    body('employee_id').isInt({ min: 1 }).withMessage('Employee ID wajib berupa angka positif').toInt(),
    body('period').trim().notEmpty().withMessage('Periode wajib diisi (contoh: 2026-Q4)'),
    body('tasks_completed').optional().isInt({ min: 0 }).withMessage('Jumlah tugas harus angka bulat non-negatif').toInt(),
    body('kpi_score').isFloat({ min: 0, max: 100 }).withMessage('KPI score harus angka antara 0 dan 100').toFloat(),
    body('feedback').optional({ nullable: true }).isString()
  ],
  validateRequest,
  createPerformanceReport
);
router.patch(
  '/performance-reports/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID laporan harus berupa angka positif').toInt(),
    body('tasks_completed').optional().isInt({ min: 0 }).withMessage('Jumlah tugas harus angka bulat non-negatif').toInt(),
    body('kpi_score').optional().isFloat({ min: 0, max: 100 }).withMessage('KPI score harus angka antara 0 dan 100').toFloat(),
    body('feedback').optional({ nullable: true }).isString()
  ],
  validateRequest,
  updatePerformanceReport
);
router.delete(
  '/performance-reports/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID laporan harus berupa angka positif').toInt()],
  validateRequest,
  deletePerformanceReport
);

module.exports = router;

