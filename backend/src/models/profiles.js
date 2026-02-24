const { getPool } = require('../db');

async function getProfile(athlete_id) {
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM profiles WHERE athlete_id = ?', [athlete_id]);
  return rows && rows.length ? rows[0] : null;
}

async function saveProfile(athlete_id, data = {}) {
  const pool = await getPool();
  const { height_cm = null, weight_kg = null, vo2max = null, ftp = null, hr_max = null, hr_rest = null } = data;
  const sql = `
    INSERT INTO profiles (athlete_id, height_cm, weight_kg, vo2max, ftp, hr_max, hr_rest, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      height_cm = VALUES(height_cm),
      weight_kg = VALUES(weight_kg),
      vo2max = VALUES(vo2max),
      ftp = VALUES(ftp),
      hr_max = VALUES(hr_max),
      hr_rest = VALUES(hr_rest),
      updated_at = NOW();
  `;
  const params = [athlete_id, height_cm, weight_kg, vo2max, ftp, hr_max, hr_rest];
  const [result] = await pool.query(sql, params);
  return result;
}

module.exports = { getProfile, saveProfile };