require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { getPool } = require('./db');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ok: true, message: 'RideMetrics backend running'}));
app.use('/auth', authRoutes);
app.use('/strava', require('./routes/stravaApi'));
app.use('/profile', require('./routes/profile'));
app.use('/advanced', require('./routes/advanced'));
app.use('/specialized', require('./routes/specialized'));
app.use('/towns', require('./routes/towns'));

// Initialize database tables
async function initDatabase() {
  console.log('Initializing database...');
  try {
    const pool = await getPool();
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await pool.query(statement);
        const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
        if (tableName) {
          console.log(`✓ Table ${tableName} ready`);
        }
      } catch (err) {
        console.error('Error creating table:', err.message);
      }
    }
    console.log('✓ Database initialized');
  } catch (err) {
    console.error('Database initialization failed:', err.message);
  }
}

const PORT = process.env.PORT || 3000;

// Initialize DB and start server
initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`Server listening on port ${PORT}`));
});

// Token refresh scheduler
const { getAthletesToRefresh, refreshAthleteToken } = require('./models/tokens');
const { computePowerCurve } = require('./models/powerCurves');
const { getProfile, updateProfileFtp } = require('./models/profiles');
const { estimateFTPFromPowerCurve } = require('./services/predictions');

async function runRefreshCycle() {
	try {
		const toRefresh = await getAthletesToRefresh(5); // refresh tokens expiring in next 5 minutes
		if (!toRefresh || toRefresh.length === 0) return;
		console.log('Refreshing tokens for', toRefresh.map(r => r.athlete_id));
		for (const row of toRefresh) {
			try {
				await refreshAthleteToken(row.athlete_id);
				console.log('Refreshed', row.athlete_id);
			} catch (err) {
				console.error('Error refreshing', row.athlete_id, err.message);
			}
		}
	} catch (err) {
		console.error('Refresh cycle error', err.message);
	}
}

// Run once on startup then schedule every 15 minutes
runRefreshCycle();
setInterval(runRefreshCycle, 15 * 60 * 1000);

let powerCurveJobRunning = false;
async function runPowerCurveRefreshCycle() {
  if (powerCurveJobRunning) return;
  powerCurveJobRunning = true;
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT athlete_id FROM athletes');
    if (!rows || rows.length === 0) return;

    for (const row of rows) {
      const athlete_id = row.athlete_id;
      try {
        console.log(`[PowerCurve] Computing power curve for athlete ${athlete_id}`);
        const data = await computePowerCurve(athlete_id, {
          perPage: 200,
          maxPages: 30,
          batchDelayMs: 200,
          concurrency: 4
        });

        const profile = await getProfile(athlete_id);
        if (!profile || !profile.ftp || profile.ftp <= 0) {
          const estimate = estimateFTPFromPowerCurve(data);
          if (estimate && estimate.ftpEstimated > 0) {
            await updateProfileFtp(athlete_id, estimate.ftpEstimated);
            console.log(`[PowerCurve] Auto FTP updated for ${athlete_id}: ${estimate.ftpEstimated}W`);
          }
        }
      } catch (err) {
        console.error(`[PowerCurve] Failed for ${athlete_id}:`, err && err.message ? err.message : err);
      }
    }
  } catch (err) {
    console.error('[PowerCurve] Refresh cycle error', err && err.message ? err.message : err);
  } finally {
    powerCurveJobRunning = false;
  }
}

setTimeout(runPowerCurveRefreshCycle, 5000);
setInterval(runPowerCurveRefreshCycle, 24 * 60 * 60 * 1000);
