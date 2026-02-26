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

// Convert ISO 8601 date to MySQL DATETIME format
function toMySQLDateTime(isoDate) {
  if (!isoDate) return null;
  // Remove 'Z' and replace 'T' with space: '2025-08-30T08:37:17Z' -> '2025-08-30 08:37:17'
  return isoDate.replace('T', ' ').replace('Z', '').substring(0, 19);
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
    const { getPool } = require('../db');
    const pool = await getPool();
    const daysParam = req.query.days;
    const days = daysParam === 'all' ? 0 : Number(daysParam) || 180;
    const force = String(req.query.force || '').toLowerCase() === 'true' || req.query.force === '1';

    // STEP 1: Verificar caché en BD (más eficiente que memory)
    if (!force) {
      const [rows] = await pool.query(
        'SELECT * FROM achievements_cache WHERE athlete_id = ? AND days_range = ? AND TIMESTAMPDIFF(HOUR, cached_at, NOW()) < 24',
        [athlete_id, days]
      );
      
      if (rows && rows.length > 0) {
        const dbCache = rows[0];
        console.log('[Achievements] Using DB cache (24h valid)');
        return res.json({
          koms: JSON.parse(dbCache.koms || '[]'),
          top10: JSON.parse(dbCache.top10 || '[]'),
          podios: JSON.parse(dbCache.podios || '[]'),
          localLegends: JSON.parse(dbCache.local_legends || '[]'),
          total_segments: dbCache.total_segments,
          cached: true,
          cached_at: dbCache.cached_at
        });
      }
    }

    const afterTimestamp = days > 0
      ? Math.floor((Date.now() / 1000) - (days * 86400))
      : null;
    const perPage = Number(req.query.per_page) || 100;
    const maxPages = Number(req.query.max_pages) || 10;
    const maxActivitiesPerSync = Number(req.query.max_activities) || 50; // Limit to avoid rate limits
    const batchDelayMs = Number(req.query.batch_delay) || 500; // 500ms delay between requests

    // STEP 2: Get last sync time to fetch only NEW activities
    const [syncRows] = await pool.query(
      'SELECT last_sync_timestamp FROM api_sync_log WHERE athlete_id = ? AND endpoint = "activities"',
      [athlete_id]
    );
    const lastSync = syncRows && syncRows.length > 0 ? syncRows[0].last_sync_timestamp : (afterTimestamp || 0);

    const syncAfterTimestamp = lastSync || afterTimestamp;
    console.log('[Achievements] Last sync:', new Date(syncAfterTimestamp * 1000), 'Fetching newer activities...');

    // STEP 3: Fetch ONLY new activities since last sync
    let activities = [];
    let page = 1;
    
    while (page <= maxPages) {
      const batch = await strava.getActivities(athlete_id, {
        after: syncAfterTimestamp || undefined,
        per_page: perPage,
        page
      });
      if (Array.isArray(batch) && batch.length) {
        activities.push(...batch);
      }
      if (!Array.isArray(batch) || batch.length < perPage) break;
      page += 1;
    }

    console.log('[Achievements] Fetched', activities.length, 'NEW activities');

    // Limit activities to prevent rate limit exhaustion
    const limitedActivities = activities.slice(0, maxActivitiesPerSync);
    if (activities.length > maxActivitiesPerSync) {
      console.log(`[Achievements] Limiting processing to ${maxActivitiesPerSync} activities (${activities.length - maxActivitiesPerSync} will be processed next time)`);
    }

    // STEP 4: Load activities from cache that are OLDER than last sync
    const [cachedRows] = await pool.query(
      'SELECT * FROM activities_cache WHERE athlete_id = ? ORDER BY updated_at DESC',
      [athlete_id]
    );
    const cachedActivities = cachedRows || [];

    console.log('[Achievements] Loaded', cachedActivities.length, 'activities from cache');

    // STEP 5: Process NEW activities and INSERT/UPDATE cache
    const achievements = {
      koms: [],
      top10: [],
      podios: [],
      localLegends: [],
      total_segments: 0
    };

    // Process only NEW activities (to save API calls)
    for (const activity of limitedActivities) {
      try {
        console.log(`[Achievements] Processing NEW activity ${activity.id}/${limitedActivities.length}`);
        const detail = await strava.getActivityById(athlete_id, activity.id, { include_all_efforts: true });
        
        if (detail && detail.segment_efforts && Array.isArray(detail.segment_efforts)) {
          achievements.total_segments += detail.segment_efforts.length;
          
          // INSERT or UPDATE activity cache
          await pool.query(
            `INSERT INTO activities_cache (athlete_id, activity_id, activity_name, activity_date, elapsed_time, distance, type, segment_efforts_data)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             segment_efforts_data = VALUES(segment_efforts_data),
             updated_at = NOW()`,
            [athlete_id, activity.id, activity.name, toMySQLDateTime(activity.start_date), activity.elapsed_time, activity.distance, activity.type, JSON.stringify(detail.segment_efforts)]
          );
          
          // Process segment efforts for achievements
          detail.segment_efforts.forEach(effort => {
            const isKom = Boolean(effort.is_kom) || effort.kom_rank === 1;
            const segmentInfo = {
              segment_id: effort.segment ? effort.segment.id : null,
              segment_name: effort.segment ? effort.segment.name : effort.name,
              activity_id: activity.id,
              activity_name: activity.name,
              activity_date: toMySQLDateTime(activity.start_date),
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

            if (isKom) achievements.koms.push(segmentInfo);
            if (effort.kom_rank && effort.kom_rank <= 10) {
              achievements.top10.push({ ...segmentInfo, rank: effort.kom_rank });
            }
            if (effort.kom_rank && effort.kom_rank <= 3) {
              achievements.podios.push({ ...segmentInfo, rank: effort.kom_rank });
            }
            const effortCount = effort.segment?.athlete_segment_stats?.effort_count || 0;
            if (effortCount >= 10) {
              achievements.localLegends.push({ ...segmentInfo, effort_count: effortCount });
            }
          });
        }
      } catch (activityError) {
        console.error('[Achievements] Error fetching activity', activity.id, ':', activityError.message);
      }

      // Add delay between requests to avoid rate limits
      if (batchDelayMs > 0) {
        await sleep(batchDelayMs);
      }
    }

    // STEP 6: Add cached activities' achievements (older than last sync)
    cachedActivities.forEach(cached => {
      try {
        const segmentEfforts = JSON.parse(cached.segment_efforts_data || '[]');
        achievements.total_segments += segmentEfforts.length;
        
        segmentEfforts.forEach(effort => {
          const isKom = Boolean(effort.is_kom) || effort.kom_rank === 1;
          const segmentInfo = {
            segment_id: effort.segment ? effort.segment.id : null,
            segment_name: effort.segment ? effort.segment.name : effort.name,
            activity_id: cached.activity_id,
            activity_name: cached.activity_name,
            activity_date: cached.activity_date,
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

          if (isKom) achievements.koms.push(segmentInfo);
          if (effort.kom_rank && effort.kom_rank <= 10) {
            achievements.top10.push({ ...segmentInfo, rank: effort.kom_rank });
          }
          if (effort.kom_rank && effort.kom_rank <= 3) {
            achievements.podios.push({ ...segmentInfo, rank: effort.kom_rank });
          }
          const effortCount = effort.segment?.athlete_segment_stats?.effort_count || 0;
          if (effortCount >= 10) {
            achievements.localLegends.push({ ...segmentInfo, effort_count: effortCount });
          }
        });
      } catch (e) {
        console.error('[Achievements] Error parsing cached activity:', e.message);
      }
    });

    // STEP 7: Deduplicate and sort results
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

    const finalAchievements = {
      koms: uniqueKoms,
      top10: uniqueTop10,
      podios: uniquePodios,
      localLegends: uniqueLocalLegends,
      total_segments: achievements.total_segments
    };

    // STEP 8: Save to achievements cache
    await pool.query(
      `INSERT INTO achievements_cache (athlete_id, koms, top10, podios, local_legends, total_segments, days_range)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       koms = VALUES(koms),
       top10 = VALUES(top10),
       podios = VALUES(podios),
       local_legends = VALUES(local_legends),
       total_segments = VALUES(total_segments),
       cached_at = NOW()`,
      [athlete_id, JSON.stringify(uniqueKoms), JSON.stringify(uniqueTop10), JSON.stringify(uniquePodios), JSON.stringify(uniqueLocalLegends), achievements.total_segments, days]
    );

    // STEP 9: Update sync log
    await pool.query(
      `INSERT INTO api_sync_log (athlete_id, endpoint, last_sync_timestamp, request_count)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       last_sync_timestamp = VALUES(last_sync_timestamp),
       request_count = request_count + 1,
       cached_at = NOW()`,
      [athlete_id, 'activities', Math.floor(Date.now() / 1000), activities.length]
    );

    console.log('[Achievements] Results:', {
      koms: uniqueKoms.length,
      top10: uniqueTop10.length,
      podios: uniquePodios.length,
      localLegends: uniqueLocalLegends.length,
      total_segments: achievements.total_segments,
      new_activities: activities.length,
      cached_activities: cachedActivities.length
    });

    const response = {
      koms: finalAchievements.koms,
      top10: finalAchievements.top10,
      podios: finalAchievements.podios,
      localLegends: finalAchievements.localLegends,
      stats: {
        total_koms: finalAchievements.koms.length,
        total_top10: finalAchievements.top10.length,
        total_podios: finalAchievements.podios.length,
        total_local_legends: finalAchievements.localLegends.length,
        total_segments_analyzed: finalAchievements.total_segments,
        new_activities_processed: activities.length,
        cached_activities_used: cachedActivities.length,
        total_activities: activities.length + cachedActivities.length,
        api_calls_saved: cachedActivities.length // Each cached activity = 1 saved API call
      }
    };

    res.json({ ...response, cached: false, cached_at: new Date() });

  } catch (err) {
    console.error('[Achievements] Error:', err);
    res.status(err.status || 500).json({ 
      error: String(err), 
      details: err.body || null 
    });
  }
});

// Endpoint para refrescar el cache de achievements
router.post('/cache/refresh', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  console.log('[Cache] Refresh request - athlete_id:', athlete_id);
  
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const { getPool } = require('../db');
    const pool = await getPool();
    
    // Clear cache entries for this athlete
    await pool.query(
      'DELETE FROM achievements_cache WHERE athlete_id = ?',
      [athlete_id]
    );

    // Clear sync log to force full refresh
    await pool.query(
      'DELETE FROM api_sync_log WHERE athlete_id = ? AND endpoint = "activities"',
      [athlete_id]
    );

    console.log('[Cache] Cleared cache for athlete', athlete_id);

    res.json({
      success: true,
      message: 'Cache cleared successfully. Next request will fetch fresh data from Strava.',
      athlete_id
    });
  } catch (err) {
    console.error('[Cache] Error clearing cache:', err);
    res.status(500).json({
      error: 'Error clearing cache',
      details: err.message
    });
  }
});

// Endpoint para ver estadísticas de cache y API usage
router.get('/cache/stats', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  console.log('[Cache] Stats request - athlete_id:', athlete_id);
  
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const { getPool } = require('../db');
    const pool = await getPool();
    
    // Get achievements cache info
    const [achievementRows] = await pool.query(
      `SELECT koms, top10, podios, local_legends, total_segments, cached_at, 
              TIMESTAMPDIFF(HOUR, cached_at, NOW()) as age_hours
       FROM achievements_cache 
       WHERE athlete_id = ? 
       ORDER BY cached_at DESC LIMIT 1`,
      [athlete_id]
    );
    const achievementsCache = achievementRows && achievementRows.length > 0 ? achievementRows[0] : null;

    // Get activities cache info
    const [activityRows] = await pool.query(
      `SELECT COUNT(*) as count, MAX(updated_at) as latest_update
       FROM activities_cache 
       WHERE athlete_id = ?`,
      [athlete_id]
    );
    const activitiesCache = activityRows && activityRows.length > 0 ? activityRows[0] : { count: 0, latest_update: null };

    // Get sync log info
    const [syncRows] = await pool.query(
      `SELECT endpoint, last_sync_timestamp, request_count, cached_at
       FROM api_sync_log 
       WHERE athlete_id = ?`,
      [athlete_id]
    );
    const syncLog = syncRows || [];

    const rateLimit = strava.getRateLimitStatus();

    res.json({
      athlete_id,
      achievements: achievementsCache ? {
        cached: true,
        koms_count: JSON.parse(achievementsCache.koms || '[]').length,
        top10_count: JSON.parse(achievementsCache.top10 || '[]').length,
        podios_count: JSON.parse(achievementsCache.podios || '[]').length,
        local_legends_count: JSON.parse(achievementsCache.local_legends || '[]').length,
        total_segments: achievementsCache.total_segments,
        age_hours: achievementsCache.age_hours,
        expires_in_hours: Math.max(0, 24 - achievementsCache.age_hours),
        cached_at: achievementsCache.cached_at
      } : { cached: false },
      activities: {
        cached_count: activitiesCache.count,
        latest_update: activitiesCache.latest_update
      },
      sync_log: syncLog.map(log => ({
        endpoint: log.endpoint,
        last_sync: new Date(log.last_sync_timestamp * 1000),
        request_count: log.request_count,
        cached_at: log.cached_at
      })),
      rate_limit: {
        used: rateLimit.remainingRequests,
        total: rateLimit.requests,
        percentage_used: rateLimit.percentageUsed,
        reset_time: new Date(rateLimit.reset * 1000)
      }
    });
  } catch (err) {
    console.error('[Cache] Error getting stats:', err);
    res.status(500).json({
      error: 'Error getting cache stats',
      details: err.message
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

