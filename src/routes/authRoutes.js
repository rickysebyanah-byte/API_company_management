const express = require('express');
const { body } = require('express-validator');
const { login } = require('../controllers/authController');
const validateRequest = require('../middlewares/validateMiddleware');

const router = express.Router();

router.post(
  '/login',
  [
    body('username')
      .custom((value, { req }) => {
        const username = typeof value === 'string' ? value.trim() : '';
        const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
        return Boolean(username || email);
      })
      .withMessage('Username atau email wajib diisi'),
    body('password')
      .isString()
      .withMessage('Password wajib diisi')
      .bail()
      .notEmpty()
      .withMessage('Password wajib diisi')
  ],
  validateRequest,
  login
);

module.exports = router;
