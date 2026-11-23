const { Pool, types } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Pastikan tipe DATE dikembalikan sebagai string 'YYYY-MM-DD' tanpa pergeseran timezone
types.setTypeParser(1082, (val) => val);
// Tipe NUMERIC / DECIMAL dikembalikan sebagai number float
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));
// Tipe BIGINT / INT8 (seperti hasil COUNT) dikembalikan sebagai integer number
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

// Konfigurasi Pool PostgreSQL / Supabase
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

let poolConfig;
if (connectionString && connectionString.trim()) {
  poolConfig = {
    connectionString: connectionString.trim(),
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000
  };
} else {
  const host = process.env.DB_HOST || process.env.SUPABASE_DB_HOST;
  const user = process.env.DB_USER || process.env.SUPABASE_DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD || '';
  const database = process.env.DB_NAME || process.env.SUPABASE_DB_NAME || 'postgres';
  const port = Number(process.env.DB_PORT || process.env.SUPABASE_DB_PORT || 5432);

  if (!host) {
    throw new Error(
      'Konfigurasi database Supabase belum lengkap. Isi DATABASE_URL atau (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) di file .env.'
    );
  }

  poolConfig = {
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[Supabase Pool Error]:', err.message);
});

// Helper untuk konversi placeholder MySQL '?' menjadi PostgreSQL '$1, $2, ...'
function prepareSql(sql) {
  let index = 1;
  let converted = sql.replace(/\?/g, () => `$${index++}`);
  const trimmed = converted.trim();

  // Otomatis tambahkan RETURNING id pada perintah INSERT agar mendapatkan ID yang baru dibuat
  if (/^INSERT\s+INTO/i.test(trimmed) && !/RETURNING/i.test(trimmed)) {
    converted = `${trimmed} RETURNING id`;
  }
  return converted;
}

// Tangani normalisasi kode error PostgreSQL agar kompatibel dengan controller
function normalizeError(error) {
  if (error && error.code === '23505') {
    error.code = 'ER_DUP_ENTRY';
  }
  return error;
}

const createOperations = (executor) => ({
  run: async (sql, params = []) => {
    try {
      const finalSql = prepareSql(sql);
      const result = await executor.query(finalSql, params);
      const insertedId = result.rows && result.rows[0] && result.rows[0].id ? result.rows[0].id : null;
      return { id: insertedId, changes: result.rowCount };
    } catch (error) {
      throw normalizeError(error);
    }
  },
  get: async (sql, params = []) => {
    try {
      const finalSql = prepareSql(sql);
      const result = await executor.query(finalSql, params);
      return result.rows[0] || null;
    } catch (error) {
      throw normalizeError(error);
    }
  },
  all: async (sql, params = []) => {
    try {
      const finalSql = prepareSql(sql);
      const result = await executor.query(finalSql, params);
      return result.rows || [];
    } catch (error) {
      throw normalizeError(error);
    }
  }
});

const { run, get, all } = createOperations(pool);

const ddl = async (sql) => {
  try {
    await pool.query(sql);
  } catch (error) {
    throw normalizeError(error);
  }
};

const withTransaction = async (callback) => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const result = await callback(createOperations(client));
    await client.query('COMMIT');
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Gagal membatalkan transaksi database:', rollbackError);
      }
    }
    throw normalizeError(error);
  } finally {
    client.release();
  }
};

// Inisialisasi Supabase JS Client jika URL dan Key tersedia
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

module.exports = {
  pool,
  run,
  get,
  all,
  ddl,
  withTransaction,
  supabase
};
