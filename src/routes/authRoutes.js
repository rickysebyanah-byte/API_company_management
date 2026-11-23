const express = require('express');
const { body } = require('express-validator');
const { login } = require('../controllers/authController');
const validateRequest = require('../middlewares/validateMiddleware');

const router = express.Router();

router.post(
  '/login',
  [
    body().custom((value, { req }) => {
      const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim() : '';
      if (!username && !email && !identifier) {
        throw new Error('Username atau email wajib diisi');
      }
      return true;
    }),
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
