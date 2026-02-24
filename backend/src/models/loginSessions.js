const { getPool } = require('../db');

async function ensureTable(pool) {
  const sql = `
    CREATE TABLE IF NOT EXISTS login_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      state VARCHAR(128) NOT NULL UNIQUE,
      jwt TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;
  await pool.query(sql);
}

async function createSession(state) {
  const pool = await getPool();
  await ensureTable(pool);
  const sql = `INSERT INTO login_sessions (state, jwt, created_at, updated_at) VALUES (?, NULL, NOW(), NOW())`;
  await pool.query(sql, [state]);
}

async function storeJwtForState(state, jwt) {
  const pool = await getPool();
  await ensureTable(pool);
  const sql = `UPDATE login_sessions SET jwt = ?, updated_at = NOW() WHERE state = ?`;
  const [res] = await pool.query(sql, [jwt, state]);
  return res;
}

async function getJwtForState(state) {
  const pool = await getPool();
  await ensureTable(pool);
  const [rows] = await pool.query('SELECT jwt FROM login_sessions WHERE state = ?', [state]);
  if (!rows || !rows.length) return null;
  return rows[0].jwt || null;
}

module.exports = { createSession, storeJwtForState, getJwtForState };
