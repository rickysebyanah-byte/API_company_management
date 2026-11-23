const express = require('express');
const { query, body } = require('express-validator');
const authenticate = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validateMiddleware');
const {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getMyAttendances,
  checkIn,
  checkOut
} = require('../controllers/employeeController');

const router = express.Router();

// Semua role internal yang sudah login bisa melihat profil & absensi sendiri
router.use(authenticate, authorizeRoles('Admin', 'HRD', 'Keuangan', 'Manager', 'Karyawan'));

router.get('/profile', getMyProfile);

router.put(
  '/profile',
  [
    body('full_name').optional().trim().notEmpty().withMessage('Nama lengkap tidak boleh kosong'),
    body('phone').optional({ nullable: true }).isString().withMessage('Nomor telepon harus berupa teks')
  ],
  validateRequest,
  updateMyProfile
);

router.put(
  '/password',
  [
    body('old_password').notEmpty().withMessage('Password lama wajib diisi'),
    body('new_password').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter')
  ],
  validateRequest,
  changePassword
);

// Check-in & check-out dapat dilakukan oleh semua karyawan (semua role)
router.post('/attendances/check-in', checkIn);
router.post('/attendances/check-out', checkOut);

router.get(
  '/attendances',
  [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000000 })
      .withMessage('Halaman harus berupa angka antara 1 dan 1000000')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Batas data harus berupa angka antara 1 dan 100')
      .toInt(),
    query('from')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Tanggal awal harus berformat YYYY-MM-DD')
      .bail()
      .isISO8601({ strict: true, strictSeparator: true })
      .withMessage('Tanggal awal harus berformat YYYY-MM-DD'),
    query('to')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Tanggal akhir harus berformat YYYY-MM-DD')
      .bail()
      .isISO8601({ strict: true, strictSeparator: true })
      .withMessage('Tanggal akhir harus berformat YYYY-MM-DD')
      .custom((to, { req }) => !req.query.from || to >= req.query.from)
      .withMessage('Tanggal akhir tidak boleh sebelum tanggal awal')
  ],
  validateRequest,
  getMyAttendances
);

module.exports = router;

