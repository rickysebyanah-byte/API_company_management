require('dotenv').config();
const app = require('./app');
const initDatabase = require('./config/initDb');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET wajib diisi dengan secret acak minimal 32 karakter.');
  }

  await initDatabase();
  const server = await new Promise((resolve, reject) => {
    const httpServer = app.listen(PORT, () => resolve(httpServer));
    httpServer.once('error', reject);
  });

  console.log(`Server berjalan di http://localhost:${PORT}`);
  return server;
}

startServer()
  .then((server) => {
    let shuttingDown = false;
    const shutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`${signal} diterima, menutup server...`);
      server.close(async (error) => {
        if (error) console.error('Gagal menutup HTTP server:', error);
        try {
          await pool.end();
        } catch (poolError) {
          console.error('Gagal menutup koneksi database:', poolError);
          process.exitCode = 1;
        }
      });
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch(async (error) => {
    console.error('Server gagal dijalankan:', error);
    try {
      await pool.end();
    } catch (poolError) {
      console.error('Gagal menutup koneksi database:', poolError);
    }
    process.exitCode = 1;
  });
