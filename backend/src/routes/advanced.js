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
    const powerCurveRecord = await getPowerCurve(athlete_id);
    const profile = await getProfile(athlete_id);
    
    if (!powerCurveRecord) {
      return res.status(404).json({ error: 'No power curve data found' });
    }

    const powerCurve = powerCurveRecord.data;
    const ftpPrediction = estimateFTPFromPowerCurve(powerCurve);
    
    // Get recent activities for trend
    const activities = await strava.getActivities(athlete_id, { per_page: 100 });
    const trendData = analyzeFTPTrend(activities, profile?.ftp);

    // Reshape trend data for frontend compatibility
    const trend = {
      recentAvg: trendData.avgRecentNP || null,
      trend: trendData.trend,
      recommendation: trendData.recommendation,
      change: trendData.change,
      estimatedNewFTP: trendData.estimatedNewFTP
    };

    res.json({
      currentFTP: profile?.ftp || null,
      prediction: {
        ftpEstimated: ftpPrediction.ftpEstimated,
        method: ftpPrediction.method,
        confidence: ftpPrediction.confidence ? ftpPrediction.confidence.toFixed(2) : '0.0',
        basedOn: ftpPrediction.basedOn
      },
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
    const powerCurveRecord = await getPowerCurve(athlete_id);
    
    if (!powerCurveRecord) {
      return res.status(404).json({ error: 'No power curve data found' });
    }

    const powerCurve = powerCurveRecord.data;
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
    
    const defaultTSS = Array.isArray(plannedTSS) ? plannedTSS : [100, 80, 120, 0, 90, 110, 150];

    // Get current PMC
    const activities = await strava.getActivities(athlete_id, { per_page: 100 });
    const profile = await getProfile(athlete_id);
    const pmc = calculatePMC(activities, profile);
    
    const lastPMC = pmc && pmc.length > 0 ? pmc[pmc.length - 1] : null;
    const currentPMC = lastPMC ? {
      CTL: lastPMC.ctl || 0,
      ATL: lastPMC.atl || 0,
      TSB: lastPMC.tsb || 0
    } : { CTL: 0, ATL: 0, TSB: 0 };

    const forecast = forecastPMC(currentPMC, defaultTSS);

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

    const rec = getDailyRecommendation(currentPMC, profile, recentActivities);

    res.json({
      date: new Date().toISOString().split('T')[0],
      pmc: currentPMC,
      // Flat structure for frontend compatibility
      recommendation: `${rec.emoji} ${rec.message}`,
      intensity: rec.workout?.intensity || rec.status || 'Moderada',
      duration: rec.workout?.duration ? `${rec.workout.duration} min` : '60 min',
      reason: rec.reasoning || rec.workout?.description || '',
      full: rec
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

    const result = {
      activityId: activity.id,
      activityName: activity.name,
      variabilityIndex: {
        value: 0,
        np: activity.weighted_average_watts || 0,
        avgPower: activity.average_watts || 0,
        rating: 'unknown'
      },
      pacingAnalysis: {
        strategy: 'unknown',
        firstThirdPower: 0,
        lastThirdPower: 0,
        improvement: 0,
        advice: 'Sin datos de ritmo disponibles'
      },
      peakPowerRecords: [],
      efficiencyTrend: {
        efficiency: 0,
        aerobicDecoupling: 0,
        previousWeek: 0,
        trend: 'neutral'
      }
    };

    // Variability Index
    if (activity.weighted_average_watts && activity.average_watts) {
      const vi = calculateVariabilityIndex(activity.weighted_average_watts, activity.average_watts);
      const viInfo = interpretVI(vi);
      result.variabilityIndex = {
        value: vi,
        np: activity.weighted_average_watts,
        avgPower: activity.average_watts,
        rating: viInfo.rating || 'unknown'
      };
    }

    // Pacing Score (requiere stream)
    try {
      const streams = await strava.getActivityStreams(athlete_id, req.params.id, ['watts']).catch(() => null);
      if (streams && streams.watts && streams.watts.data && streams.watts.data.length > 0) {
        const pacingInfo = analyzePacing(streams.watts.data, activity.moving_time);
        result.pacingAnalysis = {
          strategy: pacingInfo.strategy || 'Desconocida',
          firstThirdPower: pacingInfo.firstThirdPower || 0,
          lastThirdPower: pacingInfo.lastThirdPower || 0,
          improvement: pacingInfo.improvement || 0,
          advice: pacingInfo.advice || 'Sin recomendaciones'
        };
      }
    } catch (e) {
      console.log('[Advanced Metrics] No pacing data:', e.message);
    }

    // Check for power records
    try {
      const powerCurve = await getPowerCurve(athlete_id);
      if (powerCurve && powerCurve.data) {
        const records = detectPowerRecords(activity, powerCurve.data);
        if (records && records.length > 0) {
          result.peakPowerRecords = records.map(r => ({
            duration: r.duration || 'unknown',
            power: r.power || 0,
            isRecord: r.isRecord || false
          }));
        }
      }
    } catch (e) {
      console.log('[Advanced Metrics] No power records:', e.message);
    }

    res.json(result);
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
      activityId: activity.id,
      activityName: activity.name,
      sessionType: classification.type || 'Desconocido',
      confidence: classification.confidence || 0,
      features: {
        IF: classification.intensityFactor || 0,
        VI: classification.variabilityIndex || 0,
        timeInZ5: classification.timeInZ5 || 0,
        timeInZ4: classification.timeInZ4 || 0,
        timeInZ3: classification.timeInZ3 || 0,
        avgPower: activity.average_watts || 0,
        normPower: activity.weighted_average_watts || 0
      },
      interpretation: classification.interpretation || 'Sin interpretación',
      trainingBenefit: classification.benefit || 'Desconocido',
      recommendations: classification.recommendations || []
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

    // Simple distribution analysis
    const result = {
      sweetSpot: 0,
      VO2max: 0,
      easy: 0,
      anaerobic: 0,
      endurance: 0,
      other: 0,
      polarization: {
        isPolarized: false,
        intensity: 'balanced',
        assessment: 'Sin clasificación suficiente'
      }
    };

    if (activities && activities.length > 0) {
      activities.slice(0, Math.min(days, activities.length)).forEach(activity => {
        const avgWatts = activity.average_watts || 0;
        const movingTime = activity.moving_time || 0;
        
        // Simple classification based on power
        if (avgWatts > 250 && movingTime > 300) {
          result.endurance += 1;
        } else if (avgWatts < 150) {
          result.easy += 1;
        } else if (avgWatts > 300) {
          result.VO2max += 1;
        } else {
          result.sweetSpot += 1;
        }
      });

      result.polarization.isPolarized = result.easy > result.sweetSpot;
      result.polarization.assessment = result.polarization.isPolarized 
        ? 'Entrenamiento polarizado detectado' 
        : 'Distribución equilibrada';
    }

    res.json(result);
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
