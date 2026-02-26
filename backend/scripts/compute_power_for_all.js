#!/usr/bin/env node
const path = require('path');
const dotenv = require('dotenv');

// Load .env file from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  try {
    const { getPool } = require('../src/db');
    const { computePowerCurve } = require('../src/models/powerCurves');

    const pool = await getPool();
    // Ensure power_curves table exists (in case DB was initialized before schema copy)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS power_curves (
        athlete_id BIGINT NOT NULL PRIMARY KEY,
        computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        data TEXT,
        INDEX (computed_at)
      )
    `);

    const [rows] = await pool.query('SELECT athlete_id FROM athletes');
    if (!rows || !rows.length) {
      console.log('No athletes found in DB.');
      process.exit(0);
    }

    for (const r of rows) {
      const athlete_id = r.athlete_id;
      console.log(`Computing power curve for athlete ${athlete_id}...`);
      try {
        const res = await computePowerCurve(athlete_id, { limit: 100, concurrency: 4 });
        console.log(`Result for ${athlete_id}:`, res);
      } catch (err) {
        console.error(`Failed for ${athlete_id}:`, err && err.message ? err.message : err);
      }
    }

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err && err.stack ? err.stack : err);
    process.exit(2);
  }
}

main();
