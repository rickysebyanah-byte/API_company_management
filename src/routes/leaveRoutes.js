const express = require('express');
const { body, param, query } = require('express-validator');
const authenticate = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validateMiddleware');
const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  getLeaveById,
  reviewLeave,
  cancelMyLeave
} = require('../controllers/leaveController');

const router = express.Router();

router.use(authenticate);

// 1. Karyawan mengajukan & melihat cuti sendiri (Semua role yang punya profil)
router.post(
  '/apply',
  [
    body('leave_type')
      .isIn(['Cuti Tahunan', 'Tahunan', 'Sakit', 'Izin', 'Izin Penting', 'Melahirkan', 'Lainnya'])
      .withMessage('Tipe cuti tidak valid. Pilihan: Cuti Tahunan, Sakit, Izin Penting, Melahirkan, Lainnya'),
    body('start_date').isISO8601({ strict: true }).withMessage('Format start_date harus YYYY-MM-DD'),
    body('end_date').isISO8601({ strict: true }).withMessage('Format end_date harus YYYY-MM-DD'),
    body('reason').trim().notEmpty().withMessage('Alasan cuti/izin wajib diisi')
  ],
  validateRequest,
  applyLeave
);

router.get('/my', getMyLeaves);

router.delete(
  '/my/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID cuti harus berupa angka positif').toInt()],
  validateRequest,
  cancelMyLeave
);

// 2. HRD, Manager, Admin melihat & mereview permohonan cuti
router.get(
  '/',
  authorizeRoles('Admin', 'HRD', 'Manager'),
  [query('status').optional().isIn(['Pending', 'Approved', 'Rejected']).withMessage('Filter status harus Pending, Approved, atau Rejected')],
  validateRequest,
  getAllLeaves
);

router.get(
  '/:id',
  authorizeRoles('Admin', 'HRD', 'Manager'),
  [param('id').isInt({ min: 1 }).withMessage('ID cuti harus berupa angka positif').toInt()],
  validateRequest,
  getLeaveById
);

router.patch(
  '/:id/review',
  authorizeRoles('Admin', 'HRD', 'Manager'),
  [
    param('id').isInt({ min: 1 }).withMessage('ID cuti harus berupa angka positif').toInt(),
    body('status').isIn(['Approved', 'Rejected']).withMessage('Status review harus Approved atau Rejected'),
    body('review_notes').optional({ nullable: true }).isString()
  ],
  validateRequest,
  reviewLeave
);

module.exports = router;
