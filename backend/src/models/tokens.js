const { getPool } = require('../db');

async function saveOrUpdateAthleteToken(tokenResponse, fallbackAthleteId = null) {
  const pool = await getPool();
  const athlete = tokenResponse.athlete || {};
  const athlete_id = athlete.id || fallbackAthleteId || null;
  const access_token = tokenResponse.access_token || null;
  const refresh_token = tokenResponse.refresh_token || null;
  const expires_at = tokenResponse.expires_at ? new Date(tokenResponse.expires_at * 1000) : null;
  const token_type = tokenResponse.token_type || null;
  const scope = tokenResponse.scope || null;

  if (!athlete_id) {
    throw new Error('Missing athlete id in token response');
  }

  const sql = `
    INSERT INTO athletes (athlete_id, access_token, refresh_token, expires_at, token_type, scope, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      access_token = VALUES(access_token),
      refresh_token = VALUES(refresh_token),
      expires_at = VALUES(expires_at),
      token_type = VALUES(token_type),
      scope = VALUES(scope),
      updated_at = NOW();
  `;

  const params = [athlete_id, access_token, refresh_token, expires_at, token_type, scope];
  const [result] = await pool.query(sql, params);
  return result;
}

async function getAthletesToRefresh(thresholdMinutes = 5) {
  const pool = await getPool();
  const sql = `SELECT athlete_id, refresh_token FROM athletes WHERE expires_at <= DATE_ADD(NOW(), INTERVAL ? MINUTE)`;
  const [rows] = await pool.query(sql, [thresholdMinutes]);
  return rows;
}

async function getAthleteById(athlete_id) {
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM athletes WHERE athlete_id = ?', [athlete_id]);
  return rows && rows.length ? rows[0] : null;
}

async function refreshAthleteToken(athlete_id) {
  const athlete = await getAthleteById(athlete_id);
  if (!athlete) throw new Error('Athlete not found');
  if (!athlete.refresh_token) throw new Error('No refresh token available');

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: athlete.refresh_token,
  });

  const resp = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data && data.message ? data.message : 'Failed to refresh token');
  }

  // Ensure the token response has the athlete id for saveOrUpdate
  if (!data.athlete) data.athlete = { id: athlete_id };
  await saveOrUpdateAthleteToken(data, athlete_id);
  return data;
}

module.exports = { saveOrUpdateAthleteToken, getAthletesToRefresh, refreshAthleteToken, getAthleteById };
