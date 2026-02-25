const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const strava = require('../services/strava');
const { computePowerCurve, getPowerCurve } = require('../models/powerCurves');
const { getProfile } = require('../models/profiles');
const { generateAdvancedAnalytics, calculateTSS, calculateIntensityFactor } = require('../services/analytics');
const { calculatePMC, getWeeklySummary, getMonthlySummary, groupByWeek, groupByMonth } = require('../services/pmc');

const achievementsCache = new Map();
const ACHIEVEMENTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

    const daysParam = req.query.days;
    const days = daysParam === 'all' ? 0 : Number(daysParam) || 730;
    const perPage = Number(req.query.per_page) || 200;
    const maxPages = Number(req.query.max_pages) || 30;
    const batchDelayMs = Number(req.query.batch_delay_ms) || 0;
    const afterTimestamp = days > 0
      ? Math.floor((Date.now() / 1000) - (days * 86400))
      : null;
    if (background) {
      // start compute asynchronously and return accepted
      computePowerCurve(athlete_id, { perPage, maxPages, after: afterTimestamp, batchDelayMs }).then(() => console.log('background compute finished for', athlete_id)).catch(e => console.error('background compute error', e));
      return res.status(202).json({ ok: true, background: true, message: 'Computation started' });
    }

    const data = await computePowerCurve(athlete_id, { perPage, maxPages, after: afterTimestamp, batchDelayMs });
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
    const daysParam = req.query.days;
    const days = daysParam === 'all' ? 0 : Number(daysParam) || 90;
    const perPage = Number(req.query.per_page) || 200;
    const maxPages = Number(req.query.max_pages) || 25;
    const afterTimestamp = days > 0
      ? Math.floor((Date.now() / 1000) - (days * 86400))
      : null;

    let activities = [];
    try {
      const all = [];
      let page = 1;
      while (page <= maxPages) {
        const batch = await strava.getActivities(athlete_id, {
          after: afterTimestamp || undefined,
          per_page: perPage,
          page
        });
        if (Array.isArray(batch) && batch.length) {
          all.push(...batch);
        }
        if (!Array.isArray(batch) || batch.length < perPage) break;
        page += 1;
      }
      activities = all;
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

// Endpoint para obtener logros en segmentos (Palmarés)
router.get('/achievements', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  console.log('[Achievements] Request received - athlete_id:', athlete_id);
  
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    // Obtener actividades recientes (por defecto 6 meses, pero configurable)
    const daysParam = req.query.days;
    const days = daysParam === 'all' ? 0 : Number(daysParam) || 180;
    const afterTimestamp = days > 0
      ? Math.floor((Date.now() / 1000) - (days * 86400))
      : null;
    const perPage = Number(req.query.per_page) || 100;
    const maxPages = Number(req.query.max_pages) || 10;
    const batchDelayMs = Number(req.query.batch_delay_ms) || 300;
    const force = String(req.query.force || '').toLowerCase() === 'true' || req.query.force === '1';

    const cacheKey = `${athlete_id}:${daysParam || 180}:${perPage}:${maxPages}`;
    const cached = achievementsCache.get(cacheKey);
    if (cached && !force) {
      const ageMs = Date.now() - cached.cached_at;
      if (ageMs < ACHIEVEMENTS_CACHE_TTL_MS) {
        return res.json({ ...cached.data, cached: true, cached_at: cached.cached_at });
      }
    }

    let activities = [];
    let page = 1;
    
    while (page <= maxPages) {
      const batch = await strava.getActivities(athlete_id, {
        after: afterTimestamp || undefined,
        per_page: perPage,
        page
      });
      if (Array.isArray(batch) && batch.length) {
        activities.push(...batch);
      }
      if (!Array.isArray(batch) || batch.length < perPage) break;
      page += 1;
    }

    console.log('[Achievements] Fetched', activities.length, 'activities');

    // Obtener detalles de cada actividad para conseguir segment_efforts
    const achievements = {
      koms: [],          // is_kom = true
      top10: [],         // kom_rank entre 1-10
      podios: [],        // kom_rank entre 1-3
      localLegends: [],  // effort_count muy alto (simulado como "local legend")
      total_segments: 0
    };

    // Procesar actividades SECUENCIALMENTE para respetar rate limits
    // (No usar Promise.all() ya que causa bloqueos de rate limit)
    const batchSize = 1; // Procesar de 1 en 1
    for (let i = 0; i < activities.length; i += batchSize) {
      const batchActivities = activities.slice(i, i + batchSize);
      
      for (const activity of batchActivities) {
        try {
          // Obtener detalle de actividad con segment_efforts
          console.log(`[Achievements] Processing activity ${activity.id}/${activities.length}`);
          const detail = await strava.getActivityById(athlete_id, activity.id, { include_all_efforts: true });
          
          if (detail && detail.segment_efforts && Array.isArray(detail.segment_efforts)) {
            achievements.total_segments += detail.segment_efforts.length;
            
            detail.segment_efforts.forEach(effort => {
              const isKom = Boolean(effort.is_kom) || effort.kom_rank === 1;
              const segmentInfo = {
                segment_id: effort.segment ? effort.segment.id : null,
                segment_name: effort.segment ? effort.segment.name : effort.name,
                activity_id: activity.id,
                activity_name: activity.name,
                activity_date: activity.start_date,
                elapsed_time: effort.elapsed_time,
                distance: effort.distance,
                kom_rank: effort.kom_rank,
                pr_rank: effort.pr_rank,
                is_kom: isKom,
                effort_count: effort.segment?.athlete_segment_stats?.effort_count || 0,
                pr_elapsed_time: effort.segment?.athlete_segment_stats?.pr_elapsed_time || null,
                city: effort.segment?.city || null,
                country: effort.segment?.country || null
              };

              // KOMs (tienes el récord del segmento)
              if (isKom) {
                achievements.koms.push(segmentInfo);
              }

              // Top 10 en el ranking del segmento
              if (effort.kom_rank && effort.kom_rank <= 10) {
                achievements.top10.push({
                  ...segmentInfo,
                  rank: effort.kom_rank
                });
              }

              // Podios (top 3)
              if (effort.kom_rank && effort.kom_rank <= 3) {
                achievements.podios.push({
                  ...segmentInfo,
                  rank: effort.kom_rank
                });
              }

              // "Local Legends" simulado: segmentos donde has hecho muchos intentos (>= 10)
              const effortCount = effort.segment?.athlete_segment_stats?.effort_count || 0;
              if (effortCount >= 10) {
                achievements.localLegends.push({
                  ...segmentInfo,
                  effort_count: effortCount
                });
              }
            });
          }
        } catch (activityError) {
          console.error('[Achievements] Error fetching activity', activity.id, ':', activityError.message);
          // Continuar con las demás actividades
        }
      }

      // No need for extra batch delay since rate limiter handles it
      // But add a small delay between batches if needed
      if (i + batchSize < activities.length && batchDelayMs > 0) {
        await sleep(Math.max(0, batchDelayMs - 100)); // Reduce since rate limiter adds delay
      }
      }
    }

    // Eliminar duplicados (el mismo segmento puede aparecer en múltiples actividades)
    // Mantener solo el mejor logro por segmento
    const uniqueKoms = Array.from(new Map(
      achievements.koms.map(item => [item.segment_id, item])
    ).values());

    const uniqueTop10 = Array.from(new Map(
      achievements.top10.map(item => [item.segment_id, item])
    ).values()).sort((a, b) => a.rank - b.rank);

    const uniquePodios = Array.from(new Map(
      achievements.podios.map(item => [item.segment_id, item])
    ).values()).sort((a, b) => a.rank - b.rank);

    const uniqueLocalLegends = Array.from(new Map(
      achievements.localLegends.map(item => [item.segment_id, item])
    ).values()).sort((a, b) => b.effort_count - a.effort_count);

    console.log('[Achievements] Results:', {
      koms: uniqueKoms.length,
      top10: uniqueTop10.length,
      podios: uniquePodios.length,
      localLegends: uniqueLocalLegends.length,
      total_segments: achievements.total_segments
    });

    const response = {
      koms: uniqueKoms,
      top10: uniqueTop10,
      podios: uniquePodios,
      localLegends: uniqueLocalLegends,
      stats: {
        total_koms: uniqueKoms.length,
        total_top10: uniqueTop10.length,
        total_podios: uniquePodios.length,
        total_local_legends: uniqueLocalLegends.length,
        total_segments_analyzed: achievements.total_segments,
        activities_analyzed: activities.length
      }
    };

    achievementsCache.set(cacheKey, { cached_at: Date.now(), data: response });
    res.json({ ...response, cached: false });

  } catch (err) {
    console.error('[Achievements] Error:', err);
    res.status(err.status || 500).json({ 
      error: String(err), 
      details: err.body || null 
    });
  }
});

// Endpoint para verificar el estado de rate limiting
router.get('/rate-limit-status', (req, res) => {
  const status = strava.getRateLimitStatus();
  res.json({
    ...status,
    message: status.percentageUsed > 90 
      ? 'WARNING: High API usage, throttling requests'
      : status.percentageUsed > 70
      ? 'Caution: API usage is moderate'
      : 'OK: API usage is healthy'
  });
});

module.exports = router;

