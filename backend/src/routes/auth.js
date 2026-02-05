const express = require('express');
const router = express.Router();

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REDIRECT_URI = process.env.STRAVA_REDIRECT_URI;

const { saveOrUpdateAthleteToken } = require('../models/tokens');
const { refreshAthleteToken, getAthleteById, getAthletesToRefresh } = require('../models/tokens');
const jwt = require('jsonwebtoken');

router.get('/strava', (req, res) => {
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

router.get('/callback', async (req, res) => {
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

    // For a real app: create session / JWT and redirect to mobile app or frontend
    res.json(data);
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

