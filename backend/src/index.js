require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ok: true, message: 'TFGandreu backend running'}));
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// Token refresh scheduler
const { getAthletesToRefresh, refreshAthleteToken } = require('./models/tokens');

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
