const fetch = global.fetch || require('node-fetch');
const { getAthleteById, refreshAthleteToken } = require('../models/tokens');

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

async function apiRequestWithToken(athlete_id, path, opts = {}) {
  console.log(`[STRAVA_API] Requesting ${path} for athlete ${athlete_id}`);
  const athlete = await getAthleteById(athlete_id);
  if (!athlete) {
    console.error(`[STRAVA_API] Athlete not found in DB for ID ${athlete_id}`);
    throw new Error('Athlete not found');
  }

  const accessToken = athlete.access_token;
  if (!accessToken) {
    console.error(`[STRAVA_API] No access token found for athlete ${athlete_id}`);
    throw new Error('No access token for athlete');
  }

  const headers = Object.assign({}, opts.headers || {}, {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json'
  });

  const url = path.startsWith('http') ? path : `${STRAVA_API_BASE}${path}`;

  let resp = await fetch(url, Object.assign({}, opts, { headers }));
  console.log(`[STRAVA_API] Initial response status: ${resp.status}`);
  
  if (resp.status === 401) {
    console.log(`[STRAVA_API] Got 401 - attempting token refresh for athlete ${athlete_id}`);
    // Try refresh and retry once
    try {
      await refreshAthleteToken(athlete_id);
      const refreshed = await getAthleteById(athlete_id);
      const newHeaders = Object.assign({}, opts.headers || {}, {
        Authorization: `Bearer ${refreshed.access_token}`,
        Accept: 'application/json'
      });
      resp = await fetch(url, Object.assign({}, opts, { headers: newHeaders }));
      console.log(`[STRAVA_API] Retry response status: ${resp.status}`);
    } catch (err) {
      console.error(`[STRAVA_API] Token refresh failed: ${err.message}`);
      throw new Error('Token refresh failed: ' + String(err));
    }
  }

  const text = await resp.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!resp.ok) {
    console.error(`[STRAVA_API] API error - status: ${resp.status}, message:`, data?.message || 'unknown');
    const msg = data && data.message ? data.message : resp.statusText || 'Strava API error';
    const err = new Error(msg);
    err.status = resp.status;
    err.body = data;
    throw err;
  }
  console.log(`[STRAVA_API] Success for ${path}`);
  return data;
}

async function getAuthenticatedAthlete(athlete_id) {
  return apiRequestWithToken(athlete_id, '/athlete');
}

async function getActivities(athlete_id, query = {}) {
  const qs = new URLSearchParams();
  ['before','after','page','per_page'].forEach(k => { if (query[k]) qs.set(k, String(query[k])); });
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequestWithToken(athlete_id, `/athlete/activities${suffix}`);
}

async function getActivityStreams(athlete_id, activityId, keys = []) {
  if (!Array.isArray(keys)) keys = [keys];
  const q = new URLSearchParams({ keys: keys.join(','), key_by_type: 'true' });
  return apiRequestWithToken(athlete_id, `/activities/${activityId}/streams?${q.toString()}`);
}

async function getActivityById(athlete_id, activityId) {
  return apiRequestWithToken(athlete_id, `/activities/${activityId}`);
}

async function getAthleteZones(athlete_id) {
  return apiRequestWithToken(athlete_id, `/athlete/zones`);
}

async function getAthleteStats(athlete_id) {
  const athlete = await getAuthenticatedAthlete(athlete_id);
  if (!athlete || !athlete.id) throw new Error('Cannot get athlete stats without athlete ID');
  return apiRequestWithToken(athlete_id, `/athletes/${athlete.id}/stats`);
}

module.exports = { 
  getAuthenticatedAthlete, 
  getActivities, 
  getActivityStreams, 
  getActivityById,
  getAthleteZones,
  getAthleteStats,
  apiRequestWithToken 
};
