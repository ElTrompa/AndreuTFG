const { getPool } = require('../db');
const strava = require('../services/strava');

const DURATIONS = [
  { key: '5s', sec: 5 },{ key: '15s', sec:15 },{ key:'30s', sec:30 },{ key:'1m', sec:60 },
  { key:'2m', sec:120 },{ key:'3m', sec:180 },{ key:'5m', sec:300 },{ key:'10m', sec:600 },
  { key:'15m', sec:900 },{ key:'20m', sec:1200 },{ key:'30m', sec:1800 },{ key:'45m', sec:2700 },{ key:'1h', sec:3600 }
];

async function getPowerCurve(athlete_id) {
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM power_curves WHERE athlete_id = ?', [athlete_id]);
  if (!rows || !rows.length) return null;
  const r = rows[0];
  return { athlete_id: r.athlete_id, computed_at: r.computed_at, data: JSON.parse(r.data) };
}

async function savePowerCurve(athlete_id, data) {
  const pool = await getPool();
  const js = JSON.stringify(data);
  const sql = `INSERT INTO power_curves (athlete_id, computed_at, data) VALUES (?, NOW(), ?)
    ON DUPLICATE KEY UPDATE data = VALUES(data), computed_at = NOW()`;
  await pool.query(sql, [athlete_id, js]);
}

// compute best rolling averages from recent activities
async function listActivitiesPaged(athlete_id, opts = {}) {
  const perPage = opts.perPage || 200;
  const maxPages = opts.maxPages || 30;
  const after = opts.after || null;
  const all = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await strava.getActivities(athlete_id, {
      per_page: perPage,
      page,
      after: after || undefined
    });
    if (Array.isArray(batch) && batch.length) {
      all.push(...batch);
    }
    if (!Array.isArray(batch) || batch.length < perPage) break;
  }

  return all;
}

async function computePowerCurve(athlete_id, opts = {}) {
  const after = opts.after || null; // optional epoch seconds
  const perPage = opts.perPage || 200;
  const maxPages = opts.maxPages || 30;
  const batchDelayMs = Number(opts.batchDelayMs) || 0;
  const activities = await listActivitiesPaged(athlete_id, { perPage, maxPages, after });

  // best power per duration
  const best = {};
  DURATIONS.forEach(d => best[d.key] = 0);

  // filter activities by device_watts and optional after
  const candidates = activities.filter(a => a.device_watts).filter(a => {
    if (!after) return true;
    const start = a.start_date ? Math.floor(new Date(a.start_date).getTime()/1000) : 0;
    return start >= after;
  });

  // process in batches with limited concurrency
  const concurrency = Number(opts.concurrency) || 4;
  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency);
    const batchPromises = batch.map(async (act) => {
      try {
        const streams = await strava.getActivityStreams(athlete_id, act.id, ['watts','time']);
        const wattsStream = streams.watts && streams.watts.data ? streams.watts.data : null;
        const timeStream = streams.time && streams.time.data ? streams.time.data : null;
        if (!wattsStream || wattsStream.length === 0) return null;

        const n = wattsStream.length;

        // Compute seconds per sample using timeStream if available
        let secPerSample = 1;
        if (timeStream && timeStream.length >= 2) {
          const dt = (timeStream[timeStream.length-1] - timeStream[0]) / Math.max(1, timeStream.length-1);
          if (dt > 0) secPerSample = dt;
        }

        // prefix sums
        const prefix = new Array(n+1).fill(0);
        for (let k=0;k<n;k++) prefix[k+1] = prefix[k] + (Number(wattsStream[k])||0);

        const localBest = {};
        for (const d of DURATIONS) {
          const winSec = d.sec;
          const winSamples = Math.max(1, Math.ceil(winSec / secPerSample));
          if (winSamples > n) { localBest[d.key] = 0; continue; }
          let localMax = 0;
          for (let s=0; s + winSamples <= n; s++) {
            const sum = prefix[s+winSamples] - prefix[s];
            const avg = sum / winSamples; // average watts over the window
            if (avg > localMax) localMax = avg;
          }
          localBest[d.key] = Math.round(localMax);
        }
        return localBest;
      } catch (err) {
        console.error('stream error', act.id, err.message || err);
        return null;
      }
    });

    const results = await Promise.all(batchPromises);
    for (const res of results) {
      if (!res) continue;
      for (const k of Object.keys(res)) {
        if (res[k] > (best[k] || 0)) best[k] = res[k];
      }
    }
    if (batchDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, batchDelayMs));
    }
  }

  await savePowerCurve(athlete_id, best);
  return best;
}

module.exports = { computePowerCurve, getPowerCurve, savePowerCurve, DURATIONS };
