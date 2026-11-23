const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/responseHelper');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(
      res,
      400,
      'Validasi input gagal',
      errors.array().map((err) => ({ field: err.path, message: err.msg }))
    );
  }
  next();
};

module.exports = validateRequest;
