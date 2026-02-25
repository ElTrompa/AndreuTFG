const express = require('express');
const router = express.Router();

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REDIRECT_URI = process.env.STRAVA_REDIRECT_URI;
// URI scheme or URL where the frontend app can receive the JWT (e.g. "ridemetrics://auth" or a web URL)
const FRONTEND_CALLBACK_URI = process.env.FRONTEND_CALLBACK_URI || 'ridemetrics://auth';

const { saveOrUpdateAthleteToken } = require('../models/tokens');
const { refreshAthleteToken, getAthleteById, getAthletesToRefresh } = require('../models/tokens');
const { createSession, storeJwtForState, getJwtForState } = require('../models/loginSessions');
const jwt = require('jsonwebtoken');

function validateStravaConfig() {
  const missing = [];
  if (!STRAVA_CLIENT_ID) missing.push('STRAVA_CLIENT_ID');
  if (!STRAVA_CLIENT_SECRET) missing.push('STRAVA_CLIENT_SECRET');
  if (!STRAVA_REDIRECT_URI) missing.push('STRAVA_REDIRECT_URI');
  return missing;
}

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
    approval_prompt: 'auto',
    scope: 'read,activity:read'
  });
  const url = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  res.redirect(url);
});

// Start OAuth flow: generate state and return URL (frontend will open it)
router.get('/start', async (req, res) => {
  const missing = validateStravaConfig();
  if (missing.length) return res.status(500).json({ error: 'Missing Strava configuration in backend/.env', missing });
  const state = (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 32);
  try {
    await createSession(state);
    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      response_type: 'code',
      redirect_uri: STRAVA_REDIRECT_URI,
      approval_prompt: 'auto',
      scope: 'read,activity:read',
      state
    });
    const url = `https://www.strava.com/oauth/authorize?${params.toString()}`;
    res.json({ ok: true, url, state });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

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
    // Store tokens in database
    try {
      await saveOrUpdateAthleteToken(data);
    } catch (dbErr) {
      console.error('DB save error', dbErr);
      // continue and return token data, but log DB error
    }

    // Create JWT and handle polling flow (if state provided)
    try {
      const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
      const athlete_id = data.athlete && data.athlete.id ? data.athlete.id : null;
      const token = jwt.sign({ athlete_id }, jwtSecret, { expiresIn: '30d' });

      const state = req.query.state;
      if (state) {
        try {
          await storeJwtForState(state, token);
          // Redirect to a simple page where the user is told to return to the app
          return res.redirect(`/auth/complete?state=${encodeURIComponent(state)}`);
        } catch (err) {
          console.error('Failed storing jwt for state', err);
          return res.status(500).json({ error: 'Failed storing session' });
        }
      }

      // No state: fallback to redirecting to the frontend scheme if configured
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

// Endpoint to refresh a single athlete or all expired
router.get('/refresh', async (req, res) => {
  const athleteId = req.query.athlete_id;
  try {
    if (athleteId) {
      const data = await refreshAthleteToken(athleteId);
      return res.json({ ok: true, refreshed: [athleteId], data });
    }

    // refresh all expired athletes
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

// POST /auth/token-login
// Accept a Strava access token (single-user) and create/save athlete record, return JWT
router.post('/token-login', async (req, res) => {
  const access_token = req.body.access_token || req.headers['x-access-token'];
  if (!access_token) return res.status(400).json({ error: 'Missing access_token' });

  try {
    // Fetch athlete profile from Strava
    const profileRes = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const profile = await profileRes.json();
    if (!profileRes.ok) return res.status(400).json({ error: 'Invalid access token', details: profile });

    const athlete_id = profile.id;

    // Construct a tokenResponse-like object to store
    const tokenResponse = {
      access_token,
      refresh_token: null,
      expires_at: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365), // 1 year default
      token_type: 'Bearer',
      scope: 'read',
      athlete: { id: athlete_id }
    };

    // Save token
    try {
      await saveOrUpdateAthleteToken(tokenResponse, athlete_id);
    } catch (dbErr) {
      console.error('DB save error', dbErr);
    }

    // Issue JWT
    const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
    const token = jwt.sign({ athlete_id }, jwtSecret, { expiresIn: '30d' });

    res.json({ ok: true, jwt: token, athlete: profile });
  } catch (err) {
    console.error('token-login error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Poll for JWT using state
router.get('/poll', async (req, res) => {
  const state = req.query.state;
  if (!state) return res.status(400).json({ error: 'Missing state' });
  try {
    const jwt = await getJwtForState(state);
    if (!jwt) return res.json({ pending: true });
    return res.json({ ok: true, jwt });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Simple completion page for browser: show message and state
router.get('/complete', (req, res) => {
  const state = req.query.state || '';
  res.send(`<html><body><h3>Autorización completada</h3><p>Puedes volver a la app. Si tu app no detecta automáticamente la sesión, usa este código:</p><pre>${state}</pre></body></html>`);
});

