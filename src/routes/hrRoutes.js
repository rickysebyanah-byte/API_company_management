const express = require('express');
const { body, param, query } = require('express-validator');
const authenticate = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validateMiddleware');
const {
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
  updateEmployee,
  deleteEmployee,
  getAllAttendances,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance
} = require('../controllers/hrController');

const router = express.Router();

// Hanya Admin dan HRD yang dapat mengelola data karyawan & absensi
router.use(authenticate, authorizeRoles('Admin', 'HRD'));

// --- Departemen ---
router.get('/departments', getAllDepartments);
router.get(
  '/departments/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID departemen harus berupa angka positif').toInt()],
  validateRequest,
  getDepartmentById
);
router.post(
  '/departments',
  [
    body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Nama departemen wajib diisi (2–120 karakter)'),
    body('description').optional({ nullable: true }).isString()
  ],
  validateRequest,
  createDepartment
);
router.delete(
  '/departments/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID departemen harus berupa angka positif').toInt()],
  validateRequest,
  deleteDepartment
);

// --- Jabatan ---
router.get(
  '/positions',
  [
    query('department_id').optional().isInt({ min: 1 }).withMessage('ID departemen harus berupa angka positif').toInt()
  ],
  validateRequest,
  getAllPositions
);
router.get(
  '/positions/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID jabatan harus berupa angka positif').toInt()],
  validateRequest,
  getPositionById
);
router.post(
  '/positions',
  [
    body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Nama jabatan wajib diisi (2–120 karakter)'),
    body('department_id').isInt({ min: 1 }).withMessage('ID departemen wajib berupa angka positif').toInt()
  ],
  validateRequest,
  createPosition
);
router.delete(
  '/positions/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID jabatan harus berupa angka positif').toInt()],
  validateRequest,
  deletePosition
);

// --- Karyawan ---
router.get('/employees', getAllEmployees);
router.get(
  '/employees/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID karyawan harus berupa angka positif').toInt()],
  validateRequest,
  getEmployeeById
);
router.post(
  '/employees',
  [
    body('user_id').isInt({ min: 1 }).withMessage('User ID wajib diisi dan berupa angka positif').toInt(),
    body('employee_code').trim().notEmpty().withMessage('Kode karyawan wajib diisi'),
    body('full_name').trim().notEmpty().withMessage('Nama lengkap wajib diisi'),
    body('position_id').isInt({ min: 1 }).withMessage('ID jabatan wajib berupa angka positif').toInt(),
    body('manager_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('ID manager harus berupa angka positif').toInt(),
    body('hire_date').isISO8601({ strict: true, strictSeparator: true }).withMessage('Tanggal bergabung harus format YYYY-MM-DD'),
    body('phone').optional({ nullable: true }).isString()
  ],
  validateRequest,
  createEmployee
);
router.put(
  '/employees/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID karyawan harus berupa angka positif').toInt(),
    body('full_name').optional().trim().notEmpty().withMessage('Nama lengkap tidak boleh kosong'),
    body('position_id').optional().isInt({ min: 1 }).withMessage('ID jabatan harus berupa angka positif').toInt(),
    body('manager_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('ID manager harus berupa angka positif').toInt(),
    body('phone').optional({ nullable: true }).isString()
  ],
  validateRequest,
  updateEmployee
);
router.delete(
  '/employees/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID karyawan harus berupa angka positif').toInt()],
  validateRequest,
  deleteEmployee
);

// --- Absensi ---
router.get('/attendances', getAllAttendances);
router.get(
  '/attendances/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID absensi harus berupa angka positif').toInt()],
  validateRequest,
  getAttendanceById
);
router.post(
  '/attendances',
  [
    body('employee_id').isInt({ min: 1 }).withMessage('Employee ID wajib berupa angka positif').toInt(),
    body('date').isISO8601({ strict: true, strictSeparator: true }).withMessage('Tanggal harus format YYYY-MM-DD'),
    body('check_in').optional({ nullable: true }).matches(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/).withMessage('Jam masuk harus berformat HH:mm atau HH:mm:ss'),
    body('check_out').optional({ nullable: true }).matches(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/).withMessage('Jam pulang harus berformat HH:mm atau HH:mm:ss'),
    body('status').isIn(['Hadir', 'Izin', 'Sakit', 'Alpa']).withMessage('Status harus Hadir, Izin, Sakit, atau Alpa'),
    body('notes').optional({ nullable: true }).isString()
  ],
  validateRequest,
  createAttendance
);
router.patch(
  '/attendances/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID absensi harus berupa angka positif').toInt(),
    body('check_in').optional({ nullable: true }).matches(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/).withMessage('Jam masuk harus berformat HH:mm atau HH:mm:ss'),
    body('check_out').optional({ nullable: true }).matches(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/).withMessage('Jam pulang harus berformat HH:mm atau HH:mm:ss'),
    body('status').optional().isIn(['Hadir', 'Izin', 'Sakit', 'Alpa']).withMessage('Status harus Hadir, Izin, Sakit, atau Alpa'),
    body('notes').optional({ nullable: true }).isString()
  ],
  validateRequest,
  updateAttendance
);
router.delete(
  '/attendances/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID absensi harus berupa angka positif').toInt()],
  validateRequest,
  deleteAttendance
);

module.exports = router;

