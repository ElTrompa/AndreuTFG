const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getProfile, saveProfile } = require('../models/profiles');

function getAthleteIdFromAuth(req) {
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (!auth) return null;
  const parts = String(auth).split(' ');
  if (parts.length !== 2) return null;
  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    return payload.athlete_id || null;
  } catch (err) {
    return null;
  }
}

// GET /profile
router.get('/', async (req, res) => {
  try {
    const athlete_id = getAthleteIdFromAuth(req);
    if (!athlete_id) return res.status(401).json({ error: 'Unauthorized' });
    const profile = await getProfile(athlete_id);
    return res.json({ ok: true, profile });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// PUT /profile
router.put('/', async (req, res) => {
  try {
    const athlete_id = getAthleteIdFromAuth(req);
    if (!athlete_id) return res.status(401).json({ error: 'Unauthorized' });
    const payload = req.body || {};
    await saveProfile(athlete_id, payload);
    const profile = await getProfile(athlete_id);
    return res.json({ ok: true, profile });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

module.exports = router;
