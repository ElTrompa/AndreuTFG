const express = require('express');
const router = express.Router();
const { 
  estimateFTPFromPowerCurve, 
  analyzeFTPTrend,
  calculateCriticalPower,
  calculateWPrimeBalance,
  timeToExhaustion,
  forecastPMC,
  generateTrainingScenarios
} = require('../services/predictions');
const { 
  getDailyRecommendation,
  detectOvertraining,
  generateWeeklyPlan
} = require('../services/coaching');
const {
  calculateVariabilityIndex,
  interpretVI,
  analyzePacing,
  detectPowerRecords,
  analyzeEfficiencyTrend,
  analyzeDecouplingTrend
} = require('../services/advancedMetrics');
const {
  classifySession,
  analyzeTrainingDistribution,
  batchClassify
} = require('../services/classifier');
const {
  checkAchievements,
  calculateAthleteStats,
  detectNewAchievements,
  getLeaderboard
} = require('../services/gamification');
const { getPowerCurve } = require('../models/powerCurves');
const { getProfile } = require('../models/profiles');
const strava = require('../services/strava');
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
 * 🔮 FTP PREDICTION
 */
router.get('/ftp-prediction', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const powerCurve = await getPowerCurve(athlete_id);
    const profile = await getProfile(athlete_id);
    
    if (!powerCurve) {
      return res.status(404).json({ error: 'No power curve data found' });
    }

    const ftpPrediction = estimateFTPFromPowerCurve(powerCurve);
    
    // Get recent activities for trend
    const activities = await strava.getActivities(athlete_id, { per_page: 100 });
    const trend = analyzeFTPTrend(activities, profile?.ftp);

    res.json({
      currentFTP: profile?.ftp || null,
      prediction: ftpPrediction,
      trend,
      recommendation: ftpPrediction.ftpEstimated && profile?.ftp
        ? (ftpPrediction.ftpEstimated > profile.ftp * 1.05
          ? '💡 Considera actualizar tu FTP con un test formal'
          : 'Tu FTP actual parece correcto')
        : 'Configura tu FTP en tu perfil'
    });
  } catch (err) {
    console.error('[FTP Prediction] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ⚡ CRITICAL POWER
 */
router.get('/critical-power', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const powerCurve = await getPowerCurve(athlete_id);
    
    if (!powerCurve) {
      return res.status(404).json({ error: 'No power curve data found' });
    }

    const cp = calculateCriticalPower(powerCurve);

    // Calcular ejemplos de tiempo hasta agotamiento
    const examples = [300, 350, 400, 450, 500].map(power => ({
      power,
      timeToExhaustion: timeToExhaustion(power, cp.CP, cp.Wprime),
      timeLabel: formatTime(timeToExhaustion(power, cp.CP, cp.Wprime))
    }));

    res.json({
      ...cp,
      examples,
      interpretation: {
        CP: `${cp.CP}W es tu potencia sostenible teóricamente infinita`,
        Wprime: `${Math.round(cp.Wprime / 1000)}kJ es tu capacidad anaeróbica disponible`
      }
    });
  } catch (err) {
    console.error('[Critical Power] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

function formatTime(seconds) {
  if (seconds === Infinity) return '∞ (indefinido)';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

/**
 * 📈 PMC FORECAST
 */
router.post('/pmc-forecast', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const { plannedTSS } = req.body;
    
    if (!plannedTSS || !Array.isArray(plannedTSS)) {
      return res.status(400).json({ error: 'plannedTSS array required' });
    }

    // Get current PMC
    const activities = await strava.getActivities(athlete_id, { per_page: 100 });
    const profile = await getProfile(athlete_id);
    const pmc = calculatePMC(activities, profile);
    
    const currentPMC = pmc && pmc.length > 0 ? pmc[pmc.length - 1] : { CTL: 0, ATL: 0, TSB: 0 };

    const forecast = forecastPMC(currentPMC, plannedTSS);

    res.json({
      current: currentPMC,
      forecast
    });
  } catch (err) {
    console.error('[PMC Forecast] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 🎯 TRAINING SCENARIOS
 */
router.get('/training-scenarios', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const days = parseInt(req.query.days) || 14;
    
    const activities = await strava.getActivities(athlete_id, { per_page: 100 });
    const profile = await getProfile(athlete_id);
    const pmc = calculatePMC(activities, profile);
    
    const currentPMC = pmc && pmc.length > 0 ? pmc[pmc.length - 1] : { CTL: 0, ATL: 0, TSB: 0 };

    const scenarios = generateTrainingScenarios(currentPMC, days);

    res.json({
      current: currentPMC,
      scenarios
    });
  } catch (err) {
    console.error('[Training Scenarios] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 🤖 DAILY RECOMMENDATION (COACH)
 */
router.get('/daily-recommendation', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const activities = await strava.getActivities(athlete_id, { per_page: 100 });
    const profile = await getProfile(athlete_id);
    const pmc = calculatePMC(activities, profile);
    
    const currentPMC = pmc && pmc.length > 0 ? pmc[pmc.length - 1] : { CTL: 0, ATL: 0, TSB: 0 };
    
    // Get last 7 days activities
    const now = Date.now();
    const week = now - (7 * 24 * 60 * 60 * 1000);
    const recentActivities = activities.filter(a => new Date(a.start_date).getTime() > week);

    const recommendation = getDailyRecommendation(currentPMC, profile, recentActivities);

    res.json({
      date: new Date().toISOString().split('T')[0],
      pmc: currentPMC,
      recommendation
    });
  } catch (err) {
    console.error('[Daily Recommendation] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ⚠️ OVERTRAINING DETECTION
 */
router.get('/overtraining-check', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const activities = await strava.getActivities(athlete_id, { per_page: 100 });
    const profile = await getProfile(athlete_id);
    const pmc = calculatePMC(activities, profile);
    
    const currentPMC = pmc && pmc.length > 0 ? pmc[pmc.length - 1] : { CTL: 0, ATL: 0, TSB: 0 };
    
    // Get last 14 days with analytics
    const now = Date.now();
    const twoWeeks = now - (14 * 24 * 60 * 60 * 1000);
    const recentActivities = activities.filter(a => new Date(a.start_date).getTime() > twoWeeks);

    // HRV opcional desde query
    const hrv = req.query.hrv ? parseFloat(req.query.hrv) : null;

    const analysis = detectOvertraining(currentPMC, recentActivities, hrv);

    res.json({
      pmc: currentPMC,
      analysis
    });
  } catch (err) {
    console.error('[Overtraining Check] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 📅 WEEKLY TRAINING PLAN
 */
router.get('/weekly-plan', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const goal = req.query.goal || 'ftp'; // ftp | vo2max | endurance | sprint
    
    const activities = await strava.getActivities(athlete_id, { per_page: 100 });
    const profile = await getProfile(athlete_id);
    const pmc = calculatePMC(activities, profile);
    
    const currentPMC = pmc && pmc.length > 0 ? pmc[pmc.length - 1] : { CTL: 0, ATL: 0, TSB: 0 };
    const cyclistProfile = profile?.cyclist_profile || 'allrounder';

    const plan = generateWeeklyPlan(goal, currentPMC, cyclistProfile);

    res.json({
      goal,
      profile: cyclistProfile,
      currentPMC,
      plan
    });
  } catch (err) {
    console.error('[Weekly Plan] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 📊 ADVANCED METRICS FOR ACTIVITY
 */
router.get('/activity/:id/advanced-metrics', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const activity = await strava.getActivityById(athlete_id, req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const metrics = {};

    // Variability Index
    if (activity.weighted_average_watts && activity.average_watts) {
      const vi = calculateVariabilityIndex(activity.weighted_average_watts, activity.average_watts);
      metrics.variabilityIndex = {
        value: vi,
        ...interpretVI(vi)
      };
    }

    // Pacing Score (requiere stream)
    const streams = await strava.getActivityStreams(athlete_id, req.params.id, ['watts']).catch(() => null);
    if (streams && streams.watts) {
      metrics.pacing = analyzePacing(streams.watts.data, activity.moving_time);
    }

    // Check for power records
    const powerCurve = await getPowerCurve(athlete_id);
    if (activity.power_curve && powerCurve) {
      metrics.records = detectPowerRecords(activity.power_curve, powerCurve);
    }

    res.json({
      activity_id: activity.id,
      activity_name: activity.name,
      metrics
    });
  } catch (err) {
    console.error('[Advanced Metrics] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 📈 EFFICIENCY TRENDS
 */
router.get('/efficiency-trends', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const days = parseInt(req.query.days) || 90;
    const activities = await strava.getActivities(athlete_id, { per_page: 200 });

    const efTrend = analyzeEfficiencyTrend(activities, days);
    const decouplingTrend = analyzeDecouplingTrend(activities, days);

    res.json({
      period: `${days} days`,
      efficiencyFactor: efTrend,
      aerobicDecoupling: decouplingTrend
    });
  } catch (err) {
    console.error('[Efficiency Trends] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 🤖 CLASSIFY SESSION TYPE
 */
router.get('/activity/:id/classify', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const activity = await strava.getActivityById(athlete_id, req.params.id);
    const profile = await getProfile(athlete_id);

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const classification = classifySession(activity, profile);

    res.json({
      activity_id: activity.id,
      activity_name: activity.name,
      classification
    });
  } catch (err) {
    console.error('[Classify Session] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 📊 TRAINING DISTRIBUTION ANALYSIS
 */
router.get('/training-distribution', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const days = parseInt(req.query.days) || 30;
    const activities = await strava.getActivities(athlete_id, { per_page: 200 });
    const profile = await getProfile(athlete_id);

    // Classify all activities
    const classified = await batchClassify(activities, profile);
    
    // Add classifications to activities
    const activitiesWithTypes = activities.map(a => {
      const c = classified.find(cl => cl.id === a.id);
      return {
        ...a,
        session_type: c?.classification.type
      };
    });

    const distribution = analyzeTrainingDistribution(activitiesWithTypes, days);

    res.json(distribution);
  } catch (err) {
    console.error('[Training Distribution] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 🏆 GET ACHIEVEMENTS
 */
router.get('/achievements', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const activities = await strava.getActivities(athlete_id, { per_page: 500 });
    const profile = await getProfile(athlete_id);
    const powerCurve = await getPowerCurve(athlete_id);
    const pmc = calculatePMC(activities, profile);
    
    // Calculate comprehensive stats
    const currentPMC = pmc && pmc.length > 0 ? pmc[pmc.length - 1] : { CTL: 0 };
    const stats = calculateAthleteStats(activities, profile, powerCurve);
    stats.ctl = currentPMC.CTL;

    const achievements = checkAchievements(stats, activities);

    res.json({
      athlete_id,
      achievements,
      stats
    });
  } catch (err) {
    console.error('[Achievements] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 🎖️ ACHIEVEMENT PROGRESS
 */
router.get('/achievements/progress', async (req, res) => {
  const athlete_id = extractAthleteId(req);
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  try {
    const activities = await strava.getActivities(athlete_id, { per_page: 500 });
    const profile = await getProfile(athlete_id);
    const powerCurve = await getPowerCurve(athlete_id);
    const pmc = calculatePMC(activities, profile);
    
    const currentPMC = pmc && pmc.length > 0 ? pmc[pmc.length - 1] : { CTL: 0 };
    const stats = calculateAthleteStats(activities, profile, powerCurve);
    stats.ctl = currentPMC.CTL;

    const achievements = checkAchievements(stats, activities);

    // Return only progress towards locked achievements
    res.json({
      progress: achievements.progress,
      nearCompletion: achievements.progress.filter(p => p.percentage >= 75),
      summary: {
        totalLocked: achievements.locked.length,
        inProgress: achievements.progress.length
      }
    });
  } catch (err) {
    console.error('[Achievement Progress] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * 📜 ACHIEVEMENT LEADERBOARD
 */
router.get('/achievements/leaderboard', async (req, res) => {
  const category = req.query.category || null;

  try {
    const leaderboard = getLeaderboard(category);
    res.json(leaderboard);
  } catch (err) {
    console.error('[Leaderboard] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
