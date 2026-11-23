let app;
let initError = null;

try {
  app = require('../src/app');
} catch (error) {
  console.error('[Vercel Serverless Boot Error]:', error);
  initError = error;
}

module.exports = (req, res) => {
  if (initError) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menginisialisasi REST API di Vercel.',
      error: initError.message,
      hint: 'Pastikan Environment Variables di Vercel Dashboard (Settings > Environment Variables) sudah terisi lengkap.'
    });
  }

  // Normalisasi routing jika Vercel rewrite menambahkan prefix /api/index.js
  if (req.url && req.url.startsWith('/api/index.js')) {
    req.url = req.url.replace('/api/index.js', '') || '/';
  }

  return app(req, res);
};
