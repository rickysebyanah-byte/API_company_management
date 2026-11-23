const express = require('express');
const authenticate = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const { getDashboardStats } = require('../controllers/dashboardController');

const router = express.Router();

// Hanya Admin, HRD, Keuangan, dan Manager yang dapat mengakses metrik analitik dashboard
router.use(authenticate, authorizeRoles('Admin', 'HRD', 'Keuangan', 'Manager'));

router.get('/', getDashboardStats);
router.get('/stats', getDashboardStats);

module.exports = router;
