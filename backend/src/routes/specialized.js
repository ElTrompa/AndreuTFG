const express = require('express');
const router = express.Router();
const {
  calculateHRVAverage,
  analyzeHRVStatus,
  detectHRVAnomalies,
  calculateTrainingReadiness
} = require('../services/hrv');
const {
  detectClimbs,
  analyzeActivityTerrain,
  compareClimbPerformance
} = require('../services/terrain');
const {
  simulateClimb,
  recommendClimbs,
  getAllClimbs
} = require('../services/climbs');
const strava = require('../services/strava');
const { getProfile } = require('../models/profiles');
const { calculatePMC } = require('../services/pmc');

function extractAthleteId(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      if (payload && payload.athlete_id) return payload.athlete_id;
    } catch (e) {
      console.error('[JWT] Verification failed:', e.message);
    }
  }
  if (req.query.athlete_id) return req.query.athlete_id;
  if (req.headers['x-athlete-id']) return req.headers['x-athlete-id'];
  return null;
}

/**
 * 💓 HRV STATUS
 * Analyze current HRV status relative to baseline
 */
router.post('/hrv/status', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const { todayRMSSD, historicalData } = req.body;

    if (!todayRMSSD || !historicalData || !Array.isArray(historicalData)) {
      return res.status(400).json({ 
        error: 'Required: todayRMSSD (number) and historicalData (array of {date, rmssd})' 
      });
    }

    const hrvStatus = analyzeHRVStatus(todayRMSSD, historicalData);
    const average = calculateHRVAverage(historicalData);

    res.json({
      today: todayRMSSD,
      average,
      status: hrvStatus
    });
  } catch (err) {
    console.error('[HRV Status] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 🎯 TRAINING READINESS
 * Combine HRV and TSB for readiness score
 */
router.post('/hrv/readiness', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const { todayRMSSD, historicalData } = req.body;

    if (!todayRMSSD || !historicalData) {
      return res.status(400).json({ error: 'Required: todayRMSSD and historicalData' });
    }

    // Get current TSB
    const activities = await strava.getActivities(athlete_id, { per_page: 100 });
    const profile = await getProfile(athlete_id);
    const pmc = calculatePMC(activities, profile);
    const currentPMC = pmc && pmc.length > 0 ? pmc[pmc.length - 1] : { TSB: 0 };

    const hrvStatus = analyzeHRVStatus(todayRMSSD, historicalData);
    const readiness = calculateTrainingReadiness(hrvStatus, currentPMC.TSB);

    res.json({
      readiness,
      inputs: {
        hrv: hrvStatus,
        tsb: currentPMC.TSB
      }
    });
  } catch (err) {
    console.error('[Training Readiness] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ⚠️ HRV ANOMALIES
 * Detect sudden HRV drops
 */
router.post('/hrv/anomalies', async (req, res) => {
  try {
    const { historicalData, threshold } = req.body;

    if (!historicalData || !Array.isArray(historicalData)) {
      return res.status(400).json({ error: 'Required: historicalData array' });
    }

    const anomalies = detectHRVAnomalies(historicalData, threshold);

    res.json({
      anomalies,
      count: anomalies.length,
      severity: {
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length
      }
    });
  } catch (err) {
    console.error('[HRV Anomalies] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ⛰️ ANALYZE TERRAIN FOR ACTIVITY
 */
router.get('/terrain/:activityId', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const streams = await strava.getActivityStreams(
      athlete_id, 
      req.params.activityId, 
      ['altitude', 'distance', 'watts', 'time']
    );

    if (!streams || !streams.altitude) {
      return res.status(404).json({ error: 'No altitude data available' });
    }

    const profile = await getProfile(athlete_id);
    const weight = profile?.weight || 70; // Default 70kg

    const analysis = analyzeActivityTerrain(streams, weight);

    res.json({
      activity_id: req.params.activityId,
      analysis
    });
  } catch (err) {
    console.error('[Terrain Analysis] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 🏔️ SIMULATE FAMOUS CLIMB
 */
router.get('/climbs/simulate/:climbId', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const profile = await getProfile(athlete_id);
    
    if (!profile || !profile.ftp || !profile.weight) {
      return res.status(400).json({ 
        error: 'Athlete profile with FTP and weight required' 
      });
    }

    // Use provided power or default to FTP
    const power = req.query.power ? parseInt(req.query.power) : profile.ftp;

    const simulation = simulateClimb(req.params.climbId, power, profile.weight);

    if (simulation.error) {
      return res.status(404).json(simulation);
    }

    res.json({
      athlete: {
        ftp: profile.ftp,
        weight: profile.weight,
        wkg: (profile.ftp / profile.weight).toFixed(2)
      },
      simulation
    });
  } catch (err) {
    console.error('[Climb Simulation] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 🗺️ GET ALL AVAILABLE CLIMBS
 */
router.get('/climbs/catalog', async (req, res) => {
  try {
    const climbs = getAllClimbs();
    res.json({
      totalClimbs: climbs.length,
      climbs
    });
  } catch (err) {
    console.error('[Climbs Catalog] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 💡 RECOMMEND CLIMBS FOR ATHLETE
 */
router.get('/climbs/recommendations', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const profile = await getProfile(athlete_id);
    
    if (!profile || !profile.ftp || !profile.weight) {
      return res.status(400).json({ 
        error: 'Athlete profile with FTP and weight required' 
      });
    }

    const preferredGradient = req.query.gradient ? parseFloat(req.query.gradient) : null;

    const recommendations = recommendClimbs({
      ftp: profile.ftp,
      weight: profile.weight,
      preferredGradient
    });

    res.json({
      athlete: {
        ftp: profile.ftp,
        weight: profile.weight,
        wkg: (profile.ftp / profile.weight).toFixed(2)
      },
      recommendations
    });
  } catch (err) {
    console.error('[Climb Recommendations] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
