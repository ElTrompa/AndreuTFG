const express = require('express');
const router = express.Router();

// Credenciales de la app de Strava (se leen de variables de entorno por seguridad)
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REDIRECT_URI = process.env.STRAVA_REDIRECT_URI;
// URI de la app móvil donde se redirige el JWT tras el login (esquema personalizado o URL web)
const FRONTEND_CALLBACK_URI = process.env.FRONTEND_CALLBACK_URI || 'ridemetrics://auth';

// Funciones del modelo de tokens para guardar y renovar tokens de atletas
const { saveOrUpdateAthleteToken } = require('../models/tokens');
const { refreshAthleteToken, getAthleteById, getAthletesToRefresh } = require('../models/tokens');
// Funciones para gestionar sesiones temporales del flujo de polling OAuth
const { createSession, storeJwtForState, getJwtForState } = require('../models/loginSessions');
// Librería para crear y verificar tokens JWT
const jwt = require('jsonwebtoken');

// Comprueba que las variables de entorno de Strava están configuradas
function validateStravaConfig() {
  const missing = [];
  if (!STRAVA_CLIENT_ID) missing.push('STRAVA_CLIENT_ID');
  if (!STRAVA_CLIENT_SECRET) missing.push('STRAVA_CLIENT_SECRET');
  if (!STRAVA_REDIRECT_URI) missing.push('STRAVA_REDIRECT_URI');
  return missing;
}

// GET /auth/strava — Redirige directamente al formulario de autorización de Strava
router.get('/strava', (req, res) => {
  const missing = validateStravaConfig();
  if (missing.length) {
    return res.status(500).json({
      error: 'Missing Strava configuration in backend/.env',
      missing
    });
  }
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: STRAVA_REDIRECT_URI,
    approval_prompt: 'force',
    scope: 'read,activity:read_all,profile:read_all'
  });
  const url = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  res.redirect(url);
});

// GET /auth/start — Inicia el flujo OAuth: genera un state único, lo guarda en BD y devuelve la URL de autorización
router.get('/start', async (req, res) => {
  const missing = validateStravaConfig();
  if (missing.length) return res.status(500).json({ error: 'Missing Strava configuration in backend/.env', missing });
  // Genera un state aleatorio para prevenir ataques CSRF
  const state = (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 32);
  try {
    // Guarda la sesión temporal en la base de datos
    await createSession(state);
    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      response_type: 'code',
      redirect_uri: STRAVA_REDIRECT_URI,
      approval_prompt: 'force',
      scope: 'read,activity:read_all,profile:read_all',
      state
    });
    const url = `https://www.strava.com/oauth/authorize?${params.toString()}`;
    // Devuelve la URL y el state al frontend para que inicie el polling
    res.json({ ok: true, url, state });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /auth/callback — Strava redirige aquí tras que el usuario autorice la app
router.get('/callback', async (req, res) => {
  const missing = validateStravaConfig();
  if (missing.length) {
    return res.status(500).json({
      error: 'Missing Strava configuration in backend/.env',
      missing
    });
  }
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  try {
    // Intercambia el código de autorización por los tokens de acceso y refresco
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code'
      })
    });

    const data = await tokenRes.json();
    // Guarda o actualiza los tokens del atleta en la base de datos
    try {
      await saveOrUpdateAthleteToken(data);
    } catch (dbErr) {
      console.error('DB save error', dbErr);
      // Continúa aunque falle el guardado en BD para no bloquear el login
    }

    // Genera el JWT propio de la aplicación y gestiona el flujo de polling si hay state
    try {
      const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
      const athlete_id = data.athlete && data.athlete.id ? data.athlete.id : null;
      // Firma el JWT con el athlete_id, válido 30 días
      const token = jwt.sign({ athlete_id }, jwtSecret, { expiresIn: '30d' });

      const state = req.query.state;
      if (state) {
        try {
          // Guarda el JWT en la BD asociado al state para que el frontend lo recoja por polling
          await storeJwtForState(state, token);
          // Redirige a la página de confirmación para que el usuario vuelva a la app
          return res.redirect(`/auth/complete?state=${encodeURIComponent(state)}`);
        } catch (err) {
          console.error('Failed storing jwt for state', err);
          return res.status(500).json({ error: 'Failed storing session' });
        }
      }

      // Sin state: redirige directamente al esquema URI de la app móvil con el JWT
      try {
        const redirectTo = `${FRONTEND_CALLBACK_URI}?jwt=${encodeURIComponent(token)}`;
        return res.redirect(redirectTo);
      } catch (err) {
        console.error('Fallback redirect failed', err);
        return res.json({ ok: true, jwt: token, data });
      }
    } catch (err) {
      console.error('JWT generation failed', err);
      return res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// GET /auth/refresh — Refresca el token de un atleta concreto o de todos los expirados
router.get('/refresh', async (req, res) => {
  const athleteId = req.query.athlete_id;
  try {
    if (athleteId) {
      // Refresca solo el atleta indicado por parámetro
      const data = await refreshAthleteToken(athleteId);
      return res.json({ ok: true, refreshed: [athleteId], data });
    }

    // Si no se indica atleta, refresca los 5 primeros con el token más próximo a expirar
    const toRefresh = await getAthletesToRefresh(5);
    const refreshed = [];
    for (const row of toRefresh) {
      try {
        await refreshAthleteToken(row.athlete_id);
        refreshed.push(row.athlete_id);
      } catch (err) {
        console.error('Failed refreshing', row.athlete_id, err.message);
      }
    }
    res.json({ ok: true, refreshed });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /auth/token-login — Login directo con un access_token de Strava ya obtenido (modo monousuario)
router.post('/token-login', async (req, res) => {
  const access_token = req.body.access_token || req.headers['x-access-token'];
  if (!access_token) return res.status(400).json({ error: 'Missing access_token' });

  try {
    // Verifica el token consultando el perfil del atleta en Strava
    const profileRes = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const profile = await profileRes.json();
    if (!profileRes.ok) return res.status(400).json({ error: 'Invalid access token', details: profile });

    const athlete_id = profile.id;

    // Construye un objeto de token compatible con el modelo para guardarlo en BD
    const tokenResponse = {
      access_token,
      refresh_token: null,
      expires_at: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365), // Expira en 1 año por defecto
      token_type: 'Bearer',
      scope: 'read',
      athlete: { id: athlete_id }
    };

    // Guarda el token en la base de datos
    try {
      await saveOrUpdateAthleteToken(tokenResponse, athlete_id);
    } catch (dbErr) {
      console.error('DB save error', dbErr);
    }

    // Genera y devuelve el JWT de la aplicación
    const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
    const token = jwt.sign({ athlete_id }, jwtSecret, { expiresIn: '30d' });

    res.json({ ok: true, jwt: token, athlete: profile });
  } catch (err) {
    console.error('token-login error', err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /auth/poll — El frontend consulta periódicamente si ya se completó el login (flujo polling)
router.get('/poll', async (req, res) => {
  const state = req.query.state;
  if (!state) return res.status(400).json({ error: 'Missing state' });
  try {
    const jwt = await getJwtForState(state);
    // Si todavía no hay JWT asociado al state, devuelve pending: true
    if (!jwt) return res.json({ pending: true });
    return res.json({ ok: true, jwt });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /auth/complete — Página de confirmación en el navegador tras autorizar en Strava
router.get('/complete', (req, res) => {
  const state = req.query.state || '';
  res.send(`<html><body><h3>Autorización completada</h3><p>Puedes volver a la app. Si tu app no detecta automáticamente la sesión, usa este código:</p><pre>${state}</pre></body></html>`);
});

