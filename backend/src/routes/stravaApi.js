const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const strava = require('../services/strava');
const { computePowerCurve, getPowerCurve } = require('../models/powerCurves');
const { getProfile } = require('../models/profiles');
const { generateAdvancedAnalytics, calculateTSS, calculateIntensityFactor } = require('../services/analytics');
const { calculatePMC, getWeeklySummary, getMonthlySummary, groupByWeek, groupByMonth } = require('../services/pmc');

function extractAthleteId(req) {
  // 1) If a JWT is provided as Bearer token, decode it
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      console.log('[JWT] Decoded payload:', payload);
      if (payload && payload.athlete_id) return payload.athlete_id;
    } catch (e) {
      console.error('[JWT] Verification failed:', e.message);
    }
  }

  // 2) fallback to query or header
  if (req.query.athlete_id) return req.query.athlete_id;
  if (req.headers['x-athlete-id']) return req.headers['x-athlete-id'];
  return null;
}

// Endpoint de diagnóstico para verificar que los datos de Strava se pueden obtener
router.get('/athlete/debug', async (req, res) => {
  const athlete_id = extractAthleteId(req) || req.query.athlete_id;
  console.log('[DEBUG] athlete_id:', athlete_id);
  
  if (!athlete_id) {
    return res.status(400).json({ 
      error: 'Missing athlete_id',
      auth_header: req.headers.authorization ? 'present' : 'missing',
      hint: 'Use ?athlete_id=YOUR_ID or provide a valid JWT'
    });
  }

  try {
    // Check if athlete exists in DB
    const { getAthleteById } = require('../models/tokens');
    const athleteRecord = await getAthleteById(athlete_id);
    if (!athleteRecord) {
      return res.json({
        error: 'Athlete not found in database',
        athlete_id,
        suggestions: 'Try logging in again to refresh tokens'
      });
    }

    console.log('[DEBUG] Athlete record found, has_access_token:', !!athleteRecord.access_token, 'has_refresh_token:', !!athleteRecord.refresh_token);

    // Try getting athlete data
    const data = await strava.getAuthenticatedAthlete(athlete_id);
    res.json({
      ok: true,
      athlete_id,
      athlete: data,
      db_record: {
        has_access_token: !!athleteRecord.access_token,
        has_refresh_token: !!athleteRecord.refresh_token,
        expires_at: athleteRecord.expires_at
      }
    });
  } catch (err) {
    console.error('[DEBUG] Error:', err.message);
    res.status(500).json({ 
      error: String(err),
      athlete_id,
      details: err.body || null
    });
  }
});

// Endpoint para listar todos los atletas en BD (solo debug)
router.get('/admin/athletes', async (req, res) => {
  try {
    const pool = await require('../db').getPool();
    const [rows] = await pool.query('SELECT athlete_id, access_token IS NOT NULL as has_access_token, refresh_token IS NOT NULL as has_refresh_token, expires_at FROM athletes');
    res.json({ athletes: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get('/athlete', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  console.log('[ATHLETE] Request for athlete_id:', athlete_id);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id (JWT / ?athlete_id / x-athlete-id)' });
  try {
    const data = await strava.getAuthenticatedAthlete(athlete_id);
    console.log('[ATHLETE] Success! Got athlete data:', data ? 'present' : 'empty');
    res.json(data);
  } catch (err) {
    console.error('[ATHLETE] Error:', err.message, 'Status:', err.status || 500);
    res.status(err.status || 500).json({ error: String(err), details: err.body || null });
  }
});

router.get('/athlete/zones', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });
  try {
    const data = await strava.getAthleteZones(athlete_id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: String(err), details: err.body || null });
  }
});

router.get('/athlete/stats', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });
  try {
    const data = await strava.getAthleteStats(athlete_id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: String(err), details: err.body || null });
  }
});

router.get('/activities', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });
  try {
    const data = await strava.getActivities(athlete_id, req.query);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: String(err), details: err.body || null });
  }
});

// GET /strava/activities/:id
// Obtiene actividad individual con analítica avanzada completa
router.get('/activities/:id', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });
  
  try {
    // Obtener datos en paralelo donde sea posible
    const [activity, profile, athleteData] = await Promise.all([
      strava.getActivityById(athlete_id, req.params.id),
      getProfile(athlete_id),
      strava.getAuthenticatedAthlete(athlete_id).catch(() => null)
    ]);

    // Obtener zonas y stats (opcionales, pueden fallar)
    let zones = null;
    let stats = null;
    let streams = null;

    try {
      zones = await strava.getAthleteZones(athlete_id);
    } catch (e) {
      console.log('Could not fetch zones:', e.message);
    }

    try {
      stats = await strava.getAthleteStats(athlete_id);
    } catch (e) {
      console.log('Could not fetch stats:', e.message);
    }

    // Si se solicita incluir streams, obtenerlos
    const includeStreams = req.query.streams === 'true' || req.query.streams === '1';
    if (includeStreams) {
      try {
        const streamKeys = req.query.stream_keys 
          ? String(req.query.stream_keys).split(',') 
          : ['time', 'watts', 'heartrate', 'cadence', 'temp', 'altitude', 'distance'];
        streams = await strava.getActivityStreams(athlete_id, req.params.id, streamKeys);
      } catch (e) {
        console.log('Could not fetch streams:', e.message);
      }
    }

    // Generar analítica avanzada
    const analytics = profile ? generateAdvancedAnalytics(activity, profile, streams) : null;

    // Respuesta completa
    const response = {
      activity,
      profile: profile || null,
      athlete: athleteData || null,
      zones: zones || null,
      stats: stats || null,
      streams: streams || null,
      analytics: analytics || null
    };

    res.json(response);
  } catch (err) {
    res.status(err.status || 500).json({ error: String(err), details: err.body || null });
  }
});

router.get('/activities/:id/streams', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });
  const keys = req.query.keys ? String(req.query.keys).split(',') : ['time','latlng','distance','altitude'];
  try {
    const data = await strava.getActivityStreams(athlete_id, req.params.id, keys);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: String(err), details: err.body || null });
  }
});

// GET /strava/power-curve
// Returns cached power curve or computes it from recent activities
router.get('/power-curve', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });
  try {
    const cached = await getPowerCurve(athlete_id);
    const maxAgeHours = Number(req.query.max_age_hours || 24);
    const force = String(req.query.force || '').toLowerCase() === 'true' || req.query.force === '1';
    const background = String(req.query.background || '').toLowerCase() === 'true' || req.query.background === '1';

    if (cached && !force) {
      const ageMs = Date.now() - new Date(cached.computed_at).getTime();
      if (ageMs < maxAgeHours * 3600 * 1000) return res.json({ ok: true, cached: true, data: cached.data, computed_at: cached.computed_at });
    }

    const limit = Number(req.query.limit) || 50;
    if (background) {
      // start compute asynchronously and return accepted
      computePowerCurve(athlete_id, { limit }).then(() => console.log('background compute finished for', athlete_id)).catch(e => console.error('background compute error', e));
      return res.status(202).json({ ok: true, background: true, message: 'Computation started' });
    }

    const data = await computePowerCurve(athlete_id, { limit });
    // fetch saved curve to obtain computed_at timestamp
    const saved = await getPowerCurve(athlete_id);
    const computedAt = saved ? saved.computed_at : null;
    res.json({ ok: true, cached: false, data, computed_at: computedAt });
  } catch (err) {
    res.status(err.status || 500).json({ error: String(err), details: err.body || null });
  }
});

// GET /strava/pmc
// Performance Management Chart: calcula ATL, CTL, TSB
router.get('/pmc', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  console.log('[PMC] Request received - athlete_id:', athlete_id, 'auth header:', req.headers.authorization ? 'present' : 'missing');
  
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    // Obtener perfil del usuario (necesario para calcular TSS)
    const profile = await getProfile(athlete_id);
    if (!profile || !profile.ftp) {
      return res.status(400).json({ 
        error: 'FTP required in profile to calculate TSS/PMC. Please configure your profile first.' 
      });
    }

    // Obtener actividades (últimos 90 días por defecto)
    const days = Number(req.query.days) || 90;
    const perPage = Number(req.query.per_page) || 200;
    const afterTimestamp = Math.floor((Date.now() / 1000) - (days * 86400));

    let activities = [];
    try {
      activities = await strava.getActivities(athlete_id, { 
        after: afterTimestamp,
        per_page: perPage 
      });
    } catch (stravaErr) {
      console.error('[PMC] Strava API error:', stravaErr.message);
      // If Strava API fails, return empty data instead of 500
      return res.json({
        daily: [],
        weekly: [],
        monthly: [],
        summary_week: null,
        summary_month: null,
        message: 'Could not fetch activities from Strava: ' + stravaErr.message,
        error: stravaErr.message
      });
    }

    if (!activities || activities.length === 0) {
      return res.json({
        daily: [],
        weekly: [],
        monthly: [],
        summary_week: null,
        summary_month: null,
        message: 'No activities found'
      });
    }

    // Calcular TSS para cada actividad
    console.log('[PMC] Calculating TSS for', activities.length, 'activities');
    const activitiesWithTSS = activities.map(act => {
      const movingTime = act.moving_time || 0;
      const np = act.weighted_average_watts || act.average_watts || 0;
      
      let tss = 0;
      if (np && movingTime && profile.ftp) {
        const intensityFactor = calculateIntensityFactor(np, profile.ftp);
        tss = calculateTSS(movingTime, np, intensityFactor, profile.ftp);
      }

      return {
        ...act,
        tss,
        date: act.start_date
      };
    });

    // Calcular PMC
    console.log('[PMC] Calculating PMC data');
    const pmcData = calculatePMC(activitiesWithTSS, {
      initialATL: 0,
      initialCTL: 0
    });
    console.log('[PMC] PMC calculated, got', pmcData.length, 'days');

    // Obtener vistas agrupadas
    console.log('[PMC] Grouping by week/month');
    const weeklyData = groupByWeek(pmcData);
    const monthlyData = groupByMonth(pmcData);
    console.log('[PMC] Weekly:', weeklyData.length, 'Monthly:', monthlyData.length);
    
    // Resúmenes
    console.log('[PMC] Calculating summaries');
    const weeklySummary = getWeeklySummary(pmcData);
    const monthlySummary = getMonthlySummary(pmcData);
    console.log('[PMC] Summaries done');

    // Filtrar datos según vista solicitada
    const view = req.query.view || 'all';
    let responseData = {
      daily: pmcData,
      weekly: weeklyData,
      monthly: monthlyData,
      summary_week: weeklySummary,
      summary_month: monthlySummary
    };

    if (view === 'daily') {
      responseData = { daily: pmcData, summary_week: weeklySummary };
    } else if (view === 'weekly') {
      responseData = { weekly: weeklyData, summary_month: monthlySummary };
    } else if (view === 'monthly') {
      responseData = { monthly: monthlyData, summary_month: monthlySummary };
    }

    console.log('[PMC] Sending response with view:', view);
    res.json(responseData);
  } catch (err) {
    console.error('PMC error:', err);
    res.status(err.status || 500).json({ error: String(err), details: err.body || null });
  }
});

module.exports = router;

