const express = require('express');
const { body, param } = require('express-validator');
const authenticate = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validateMiddleware');
const {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');

const router = express.Router();

router.use(authenticate);

// Semua pengguna yang login dapat membaca pengumuman perusahaan
router.get('/', getAllAnnouncements);
router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID pengumuman harus berupa angka positif').toInt()],
  validateRequest,
  getAnnouncementById
);

// Hanya Admin dan HRD yang dapat menerbitkan, mengedit, dan menghapus pengumuman
router.post(
  '/',
  authorizeRoles('Admin', 'HRD'),
  [
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Judul pengumuman harus 3–200 karakter'),
    body('content').trim().notEmpty().withMessage('Isi pengumuman tidak boleh kosong'),
    body('priority').optional().isIn(['Low', 'Normal', 'High', 'Urgent']).withMessage('Prioritas harus Low, Normal, High, atau Urgent'),
    body('category').optional().trim().isLength({ max: 50 }).withMessage('Kategori maksimal 50 karakter')
  ],
  validateRequest,
  createAnnouncement
);

router.put(
  '/:id',
  authorizeRoles('Admin', 'HRD'),
  [
    param('id').isInt({ min: 1 }).withMessage('ID pengumuman harus berupa angka positif').toInt(),
    body('title').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Judul pengumuman harus 3–200 karakter'),
    body('content').optional().trim().notEmpty().withMessage('Isi pengumuman tidak boleh kosong'),
    body('priority').optional().isIn(['Low', 'Normal', 'High', 'Urgent']).withMessage('Prioritas harus Low, Normal, High, atau Urgent'),
    body('category').optional().trim().isLength({ max: 50 }).withMessage('Kategori maksimal 50 karakter')
  ],
  validateRequest,
  updateAnnouncement
);

router.delete(
  '/:id',
  authorizeRoles('Admin', 'HRD'),
  [param('id').isInt({ min: 1 }).withMessage('ID pengumuman harus berupa angka positif').toInt()],
  validateRequest,
  deleteAnnouncement
);

module.exports = router;
