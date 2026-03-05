// Usa fetch nativo del entorno o node-fetch como alternativa (compatibilidad Node.js < 18)
const fetch = global.fetch || require('node-fetch');
// Funciones para obtener y refrescar tokens de atletas desde la base de datos
const { getAthleteById, refreshAthleteToken } = require('../models/tokens');
// Servicio de control de límite de peticiones a la API
const { RateLimiter } = require('./rateLimit');

// URL base de la API de Strava v3
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

// Inicializa el rate limiter respetando el límite de Strava: 600 peticiones cada 15 minutos
const rateLimiter = new RateLimiter({
  requestsPerWindow: 600,
  windowMs: 15 * 60 * 1000,
  minDelayMs: 150 // Delay mínimo de 150ms entre peticiones para no saturar la API
});

// Encola la petición a través del rate limiter antes de ejecutarla
async function apiRequestWithToken(athlete_id, path, opts = {}) {
  return rateLimiter.enqueue(async () => {
    return await executeRequest(athlete_id, path, opts);
  });
}

// Ejecuta la petición real a la API de Strava con el token del atleta
async function executeRequest(athlete_id, path, opts = {}) {
  console.log(`[STRAVA_API] Requesting ${path} for athlete ${athlete_id}`);

  // Busca el atleta en la base de datos para obtener su token de acceso
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

  // Construye las cabeceras con el token Bearer de autenticación
  const headers = Object.assign({}, opts.headers || {}, {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json'
  });

  // Si la ruta ya es una URL completa se usa directamente, si no se añade la base
  const url = path.startsWith('http') ? path : `${STRAVA_API_BASE}${path}`;

  let resp = await fetch(url, Object.assign({}, opts, { headers }));
  console.log(`[STRAVA_API] Initial response status: ${resp.status}`);

  // Actualiza el estado del rate limiter con las cabeceras de la respuesta
  rateLimiter.updateFromHeaders(resp.headers.raw?.());

  // Si el servidor devuelve 401 (token expirado), se refresca y se reintenta una vez
  if (resp.status === 401) {
    console.log(`[STRAVA_API] Got 401 - attempting token refresh for athlete ${athlete_id}`);
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

  // Lee la respuesta como texto y la parsea a JSON (o la deja como texto si falla)
  const text = await resp.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

  // Actualiza los contadores del rate limiter con las cabeceras de uso
  // Compatible con node-fetch (headers.raw()) y fetch estándar (headers.get())
  if (resp.headers) {
    const headersObj = {};
    if (typeof resp.headers.raw === 'function') {
      // Formato node-fetch: devuelve un objeto con arrays
      const raw = resp.headers.raw();
      Object.assign(headersObj, raw);
    } else if (typeof resp.headers.get === 'function') {
      // Formato fetch estándar del navegador
      const usage = resp.headers.get('x-ratelimit-usage');
      const limit = resp.headers.get('x-ratelimit-limit');
      if (usage) headersObj['x-ratelimit-usage'] = [usage];
      if (limit) headersObj['x-ratelimit-limit'] = [limit];
    }
    if (Object.keys(headersObj).length > 0) {
      rateLimiter.updateFromHeaders(headersObj);
    }
  }

  // Si la respuesta no es OK, lanza un error con el mensaje de Strava y el código de estado
  if (!resp.ok) {
    console.error(`[STRAVA_API] API error - status: ${resp.status}, message:`, data?.message || 'unknown');
    const msg = data && data.message ? data.message : resp.statusText || 'Strava API error';
    const err = new Error(msg);
    err.status = resp.status;
    err.body = data;
    // Si Strava indica cuánto tiempo esperar (cabecera Retry-After), se incluye en el error
    const retryAfter = resp.headers.get?.('retry-after') || resp.headers['retry-after'];
    if (retryAfter) {
      err.retryAfter = retryAfter;
    }
    throw err;
  }
  console.log(`[STRAVA_API] Success for ${path}`);
  return data;
}

// Obtiene el perfil del atleta autenticado
async function getAuthenticatedAthlete(athlete_id) {
  return apiRequestWithToken(athlete_id, '/athlete');
}

// Obtiene la lista de actividades del atleta con filtros opcionales (fecha, página, cantidad)
async function getActivities(athlete_id, query = {}) {
  const qs = new URLSearchParams();
  ['before','after','page','per_page'].forEach(k => { if (query[k]) qs.set(k, String(query[k])); });
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequestWithToken(athlete_id, `/athlete/activities${suffix}`);
}

// Obtiene los streams (datos en serie temporal) de una actividad: potencia, FC, cadencia, etc.
async function getActivityStreams(athlete_id, activityId, keys = []) {
  if (!Array.isArray(keys)) keys = [keys];
  const q = new URLSearchParams({ keys: keys.join(','), key_by_type: 'true' });
  return apiRequestWithToken(athlete_id, `/activities/${activityId}/streams?${q.toString()}`);
}

// Obtiene el detalle completo de una actividad por su ID
async function getActivityById(athlete_id, activityId) {
  return apiRequestWithToken(athlete_id, `/activities/${activityId}`);
}

// Obtiene las zonas de frecuencia cardíaca y potencia configuradas del atleta
async function getAthleteZones(athlete_id) {
  return apiRequestWithToken(athlete_id, `/athlete/zones`);
}

// Obtiene las estadísticas globales del atleta (totales de distancia, tiempo, etc.)
async function getAthleteStats(athlete_id) {
  const athlete = await getAuthenticatedAthlete(athlete_id);
  if (!athlete || !athlete.id) throw new Error('Cannot get athlete stats without athlete ID');
  return apiRequestWithToken(athlete_id, `/athletes/${athlete.id}/stats`);
}

// Exporta todas las funciones públicas del servicio y el estado del rate limiter
module.exports = { 
  getAuthenticatedAthlete, 
  getActivities, 
  getActivityStreams, 
  getActivityById,
  getAthleteZones,
  getAthleteStats,
  apiRequestWithToken,
  getRateLimitStatus: () => rateLimiter.getStatus()
};
