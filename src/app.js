const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const hrRoutes = require('./routes/hrRoutes');
const financeRoutes = require('./routes/financeRoutes');
const managerRoutes = require('./routes/managerRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const { get } = require('./config/database');
const { errorResponse } = require('./utils/responseHelper');

const app = express();
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : null;

// Global Middlewares
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !allowedOrigins || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  }
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

// Root REST API Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Company Management REST API berjalan dengan baik.',
    version: '1.2.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      hr: '/api/hr',
      finance: '/api/finance',
      manager: '/api/manager',
      employee: '/api/me',
      dashboard: '/api/dashboard/stats',
      leaves: '/api/leaves',
      announcements: '/api/announcements',
      health: '/health'
    }
  });
});

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    await get('SELECT 1 AS database_ready');
    return res.status(200).json({
      success: true,
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check database gagal:', error);
    return res.status(503).json({
      success: false,
      status: 'unavailable',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/me', employeeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/announcements', announcementRoutes);

// 404 Handler untuk route yang tidak terdaftar
app.use((req, res) => {
  return errorResponse(res, 404, `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`);
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('[Server Error]:', err);
  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode < 500
    ? err.message
    : 'Terjadi kesalahan internal pada server.';
  return errorResponse(res, statusCode, message);
});

module.exports = app;
