/**
 * 🏘️ Towns/Routes searching - Routes for town-based activity search
 */

const express = require('express');
const router = express.Router();
const { extractTownsFromTrack } = require('../services/towns');
const { getTownsForActivity, getActivitiesInTown, getTownsForAthlete, searchTownsByName, linkActivityToTowns, upsertActivityCache } = require('../models/towns');
const { getPool } = require('../db');
const strava = require('../services/strava');
const { getProfile } = require('../models/profiles');

// Extract athlete_id from JWT token or query
function extractAthleteId(req) {
  if (req.query.athlete_id) return parseInt(req.query.athlete_id);
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    return decoded?.athlete_id;
  } catch {
    return null;
  }
}

function addStartLocationTown(towns, activity) {
  if (!activity?.location_city) return towns;

  const startLat = Array.isArray(activity.start_latlng) ? activity.start_latlng[0] : null;
  const startLng = Array.isArray(activity.start_latlng) ? activity.start_latlng[1] : null;

  const startTown = {
    name: activity.location_city,
    province: activity.location_state || null,
    country: activity.location_country || null,
    lat: typeof startLat === 'number' ? startLat : null,
    lng: typeof startLng === 'number' ? startLng : null
  };

  const exists = towns.some(t =>
    String(t.name || '').toLowerCase() === String(startTown.name || '').toLowerCase() &&
    String(t.province || '').toLowerCase() === String(startTown.province || '').toLowerCase()
  );

  if (!exists) {
    return [...towns, startTown];
  }

  return towns;
}

/**
 * 📍 GET /towns/athlete
 * Get all towns for the athlete with activity counts
 */
router.get('/athlete', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const towns = await getTownsForAthlete(athlete_id);
    res.json({
      athlete_id,
      totalTowns: towns.length,
      towns: towns.map(t => ({
        id: t.id,
        name: t.name,
        province: t.province,
        country: t.country,
        activityCount: t.activity_count,
        lat: t.lat,
        lng: t.lng
      }))
    });
  } catch (err) {
    console.error('[Towns] Error getting towns for athlete:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 🔍 GET /towns/search
 * Search towns by name
 */
router.get('/search', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  const { q } = req.query;

  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });
  if (!q || q.trim().length === 0) return res.status(400).json({ error: 'Missing search query (q)' });

  try {
    const towns = await searchTownsByName(athlete_id, q);
    res.json({
      query: q,
      results: towns.map(t => ({
        id: t.id,
        name: t.name,
        province: t.province,
        activityCount: t.activity_count,
        lat: t.lat,
        lng: t.lng
      }))
    });
  } catch (err) {
    console.error('[Towns] Error searching towns:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 🏘️ GET /towns/:townId/activities
 * Get all activities that pass through a specific town
 */
router.get('/:townId/activities', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  const { townId } = req.params;

  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });
  if (!townId) return res.status(400).json({ error: 'Missing townId' });

  try {
    const activities = await getActivitiesInTown(athlete_id, parseInt(townId));

    const missingCacheActivities = activities.filter(a => Number(a.cache_missing) === 1).slice(0, 25);
    if (missingCacheActivities.length > 0) {
      for (const missingActivity of missingCacheActivities) {
        try {
          const detail = await strava.getActivityById(athlete_id, missingActivity.activity_id);
          if (detail?.id) {
            await upsertActivityCache(athlete_id, detail);
            missingActivity.activity_name = detail.name || missingActivity.activity_name;
            missingActivity.activity_date = detail.start_date || missingActivity.activity_date;
            missingActivity.distance = detail.distance ?? missingActivity.distance;
            missingActivity.elapsed_time = detail.elapsed_time ?? detail.moving_time ?? missingActivity.elapsed_time;
            missingActivity.type = detail.type || missingActivity.type;
            missingActivity.cache_missing = 0;
          }
        } catch (enrichError) {
          console.warn(`[Towns] Could not enrich activity ${missingActivity.activity_id}:`, enrichError.message);
        }
      }
    }
    
    res.json({
      townId: parseInt(townId),
      activityCount: activities.length,
      activities: activities.map(a => ({
        id: a.activity_id,
        name: a.activity_name,
        date: a.activity_date,
        distance: parseFloat(a.distance),
        movingTime: a.elapsed_time,
        type: a.type
      }))
    });
  } catch (err) {
    console.error('[Towns] Error getting activities in town:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 📍 GET /towns/activity/:activityId
 * Get all towns for a specific activity
 */
router.get('/activity/:activityId', async (req, res) => {
  const { activityId } = req.params;

  if (!activityId) return res.status(400).json({ error: 'Missing activityId' });

  try {
    const towns = await getTownsForActivity(parseInt(activityId));
    
    res.json({
      activityId: parseInt(activityId),
      townCount: towns.length,
      towns: towns.map(t => ({
        id: t.id,
        name: t.name,
        province: t.province,
        country: t.country,
        lat: parseFloat(t.lat),
        lng: parseFloat(t.lng)
      }))
    });
  } catch (err) {
    console.error('[Towns] Error getting towns for activity:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 🔄 POST /towns/activity/:activityId/extract
 * Process an activity and extract its towns from track data
 */
router.post('/activity/:activityId/extract', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  const { activityId } = req.params;

  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });
  if (!activityId) return res.status(400).json({ error: 'Missing activityId' });

  try {
    // Get activity details from Strava (including stream data)
    const activity = await strava.getActivityById(athlete_id, parseInt(activityId));

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    let towns = [];
    if (activity?.map?.summary_polyline) {
      const coordinates = decodePolyline(activity.map.summary_polyline);
      towns = await extractTownsFromTrack(coordinates);
    }

    towns = addStartLocationTown(towns, activity);
    
    if (towns.length === 0) {
      return res.json({
        activityId: parseInt(activityId),
        message: 'No towns found for this activity',
        towns: []
      });
    }

    // Link activity to towns in database
    await linkActivityToTowns(athlete_id, parseInt(activityId), towns);

    res.json({
      activityId: parseInt(activityId),
      townCount: towns.length,
      towns: towns.map(t => ({
        name: t.name,
        province: t.province,
        country: t.country,
        lat: t.lat,
        lng: t.lng
      }))
    });
  } catch (err) {
    console.error('[Towns] Error extracting towns:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 🔄 POST /towns/batch-process
 * Process all activities for an athlete and extract towns
 */
router.post('/batch-process', async (req, res) => {
  // For POST requests, check body first, then query, then JWT
  let athlete_id = req.body?.athlete_id ? parseInt(req.body.athlete_id) : null;
  if (!athlete_id) athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });
  
  const forceReprocess = req.body?.force_reprocess === true;

  try {
    console.log(`[Towns] Starting batch processing for athlete ${athlete_id} (force: ${forceReprocess})`);
    
    // Get all activities for this athlete with pagination
    let activities = [];
    let page = 1;
    const perPage = 100;
    const maxPages = 50; // Limit to 5000 activities max
    
    while (page <= maxPages) {
      const batch = await strava.getActivities(athlete_id, {
        per_page: perPage,
        page
      });
      if (Array.isArray(batch) && batch.length > 0) {
        activities.push(...batch);
        console.log(`[Towns] Fetched page ${page}: ${batch.length} activities (total: ${activities.length})`);
      }
      if (!Array.isArray(batch) || batch.length < perPage) {
        console.log(`[Towns] Reached last page at page ${page}`);
        break;
      }
      page++;
    }
    
    if (activities.length === 0) {
      console.log(`[Towns] No activities found for athlete ${athlete_id}`);
      return res.json({
        message: 'No activities found',
        processed: 0,
        skipped: 0,
        reason: 'No activities to process'
      });
    }

    console.log(`[Towns] Found ${activities.length} activities to process`);

    let processed = 0;
    let skipped = 0;
    const errors = [];

    // Get already processed activities to avoid reprocessing
    const pool = await getPool();
    let existingActivityIds = new Set();
    
    if (!forceReprocess) {
      const [existingRows] = await pool.query(
        'SELECT DISTINCT activity_id FROM activity_towns WHERE athlete_id = ?',
        [athlete_id]
      );
      existingActivityIds = new Set(existingRows.map(r => r.activity_id));
      console.log(`[Towns] Found ${existingActivityIds.size} activities already processed`);
    } else {
      console.log(`[Towns] Force reprocess enabled, will process all activities`);
    }

    // Process each activity
    for (const activity of activities) {
      // Skip if already processed (unless we want to force reprocess)
      if (!forceReprocess && existingActivityIds.has(activity.id)) {
        console.log(`[Towns] Activity ${activity.id} already processed, skipping`);
        skipped++;
        continue;
      }

      try {
        const currentProgress = processed + skipped + 1;
        console.log(`[Towns] [${currentProgress}/${activities.length}] Processing activity ${activity.id}: ${activity.name}`);

        let polyline = activity?.map?.summary_polyline || null;
        let activityDetails = activity;

        if (!polyline) {
          activityDetails = await strava.getActivityById(athlete_id, activity.id);
          polyline = activityDetails?.map?.summary_polyline || null;
        }

        let towns = [];
        if (polyline) {
          // Decode polyline to coordinates
          const coordinates = decodePolyline(polyline);
          console.log(`[Towns] Extracted ${coordinates.length} coordinates from activity ${activity.id}`);

          if (coordinates.length > 0) {
            towns = await extractTownsFromTrack(coordinates);
          }
        }

        towns = addStartLocationTown(towns, activityDetails);
        console.log(`[Towns] Found ${towns.length} towns in activity ${activity.id}:`, towns.map(t => t.name).join(', '));
        
        if (towns.length > 0) {
          await linkActivityToTowns(athlete_id, activity.id, towns);
          await upsertActivityCache(athlete_id, activityDetails);
          processed++;
        } else {
          console.log(`[Towns] No towns extracted from activity ${activity.id}`);
          skipped++;
        }

        // Rate limiting: delay between activities to avoid throttling
        await new Promise(r => setTimeout(r, 350));
      } catch (err) {
        console.error(`[Towns] Error processing activity ${activity.id}:`, err.message);
        errors.push({ activityId: activity.id, error: err.message });
      }
    }

    console.log(`[Towns] Batch processing complete: ${processed} processed, ${skipped} skipped`);
    
    const alreadyProcessed = forceReprocess ? 0 : existingActivityIds.size;
    
    res.json({
      message: 'Batch processing complete',
      processed,
      skipped,
      total: activities.length,
      alreadyProcessed,
      newlyProcessed: processed,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('[Towns] Error in batch process:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * Decode Google polyline format to coordinates array
 * @param {string} encoded - Encoded polyline string
 * @returns {Array} - Array of [lat, lng] pairs
 */
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dLat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dLng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildGpx(activity, latlng = [], time = [], altitude = []) {
  const startDate = activity?.start_date ? new Date(activity.start_date) : null;
  const hasValidStartDate = !!startDate && !Number.isNaN(startDate.getTime());

  const trackPoints = latlng.map((point, index) => {
    const [lat, lon] = Array.isArray(point) ? point : [];
    if (typeof lat !== 'number' || typeof lon !== 'number') return '';

    const ele = typeof altitude[index] === 'number' ? `<ele>${altitude[index]}</ele>` : '';
    let timeTag = '';

    if (hasValidStartDate && typeof time[index] === 'number') {
      const pointDate = new Date(startDate.getTime() + (time[index] * 1000));
      timeTag = `<time>${pointDate.toISOString()}</time>`;
    } else if (hasValidStartDate && index === 0) {
      timeTag = `<time>${startDate.toISOString()}</time>`;
    }

    return `<trkpt lat="${lat}" lon="${lon}">${ele}${timeTag}</trkpt>`;
  }).filter(Boolean).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RideMetrics" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(activity?.name || `Actividad ${activity?.id || ''}`)}</name>
    ${hasValidStartDate ? `<time>${startDate.toISOString()}</time>` : ''}
  </metadata>
  <trk>
    <name>${escapeXml(activity?.name || `Actividad ${activity?.id || ''}`)}</name>
    <type>${escapeXml(activity?.type || 'Activity')}</type>
    <trkseg>${trackPoints}</trkseg>
  </trk>
</gpx>`;
}

/**
 * 📥 GET /towns/activity/:activityId/gpx
 * Download activity track as GPX
 */
router.get('/activity/:activityId/gpx', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  const { activityId } = req.params;

  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });
  if (!activityId) return res.status(400).json({ error: 'Missing activityId' });

  try {
    const numericActivityId = parseInt(activityId, 10);
    const activity = await strava.getActivityById(athlete_id, numericActivityId);

    const streams = await strava.getActivityStreams(athlete_id, numericActivityId, ['latlng', 'time', 'altitude']);
    const latlng = streams?.latlng?.data || [];
    const time = streams?.time?.data || [];
    const altitude = streams?.altitude?.data || [];

    if (!Array.isArray(latlng) || latlng.length === 0) {
      return res.status(404).json({ error: 'No GPS track available for this activity' });
    }

    const gpx = buildGpx(activity, latlng, time, altitude);
    const safeName = String(activity?.name || `activity-${numericActivityId}`)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .slice(0, 80);

    res.setHeader('Content-Type', 'application/gpx+xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}-${numericActivityId}.gpx"`);
    res.send(gpx);
  } catch (err) {
    console.error('[Towns] Error generating GPX:', err);
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
