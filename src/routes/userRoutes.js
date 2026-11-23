const express = require('express');
const { body, param } = require('express-validator');
const authenticate = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validateMiddleware');
const {
  getAllRoles,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

const router = express.Router();

// Hanya Admin yang dapat mengakses modul manajemen user
router.use(authenticate, authorizeRoles('Admin'));

router.get('/roles', getAllRoles);
router.get('/', getAllUsers);
router.get('/:id', getUserById);

router.post(
  '/',
  [
    body('username').trim().isLength({ min: 3, max: 80 }).withMessage('Username harus 3–80 karakter'),
    body('email').isEmail().isLength({ max: 255 }).withMessage('Format email tidak valid atau terlalu panjang'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('role_id').isInt({ min: 1 }).withMessage('Role ID harus berupa angka positif').toInt()
  ],
  validateRequest,
  createUser
);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID pengguna harus berupa angka positif').toInt(),
    body('username').optional().trim().isLength({ min: 3, max: 80 }).withMessage('Username harus 3–80 karakter'),
    body('email').optional().isEmail().withMessage('Format email tidak valid'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('role_id').optional().isInt({ min: 1 }).withMessage('Role ID harus berupa angka positif').toInt(),
    body('is_active').optional().isBoolean().withMessage('Status aktif harus boolean').toBoolean()
  ],
  validateRequest,
  updateUser
);

router.delete(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID pengguna harus berupa angka positif').toInt()],
  validateRequest,
  deleteUser
);

module.exports = router;
