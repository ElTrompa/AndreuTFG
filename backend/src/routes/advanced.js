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
  analyzePacing,
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
      let rating = 'Low';
      if (vi >= 1.15) rating = 'High';
      else if (vi >= 1.05) rating = 'Moderate';
      result.variabilityIndex = {
        value: vi,
        np: activity.weighted_average_watts,
        avgPower: activity.average_watts,
        rating
      };
    }

    // Obtener streams una vez (potencia + FC)
    let wattsData = [];
    let hrData = [];
    try {
      const streams = await strava
        .getActivityStreams(athlete_id, req.params.id, ['watts', 'heartrate'])
        .catch(() => null);

      if (streams && streams.watts && Array.isArray(streams.watts.data)) {
        wattsData = streams.watts.data.filter(v => Number.isFinite(v) && v > 0);
      }
      if (streams && streams.heartrate && Array.isArray(streams.heartrate.data)) {
        hrData = streams.heartrate.data.filter(v => Number.isFinite(v) && v > 0);
      }

      // Pacing Score (requiere potencia)
      if (wattsData.length > 0) {
        const pacingInfo = analyzePacing(wattsData, activity.moving_time);
        const firstThirdPower = pacingInfo?.details?.firstThird || 0;
        const lastThirdPower = pacingInfo?.details?.lastThird || 0;
        const improvement =
          firstThirdPower > 0
            ? ((lastThirdPower - firstThirdPower) / firstThirdPower) * 100
            : 0;

        result.pacingAnalysis = {
          strategy: pacingInfo.strategy || 'Desconocida',
          firstThirdPower,
          lastThirdPower,
          improvement: Math.round(improvement * 10) / 10,
          advice: pacingInfo.description || 'Sin recomendaciones'
        };
      }
    } catch (e) {
      console.log('[Advanced Metrics] No pacing data:', e.message);
    }

    // Peak power por duración (con marca de récord cuando aplica)
    try {
      const powerCurve = await getPowerCurve(athlete_id);
      if (powerCurve && powerCurve.data && wattsData.length > 0) {
        const durations = [5, 15, 30, 60, 120, 180, 300, 600, 900, 1200, 1800, 2700, 3600];

        const rollingBest = (arr, windowSize) => {
          if (!Array.isArray(arr) || arr.length < windowSize) return 0;
          let windowSum = 0;
          for (let i = 0; i < windowSize; i++) windowSum += arr[i];
          let best = windowSum / windowSize;
          for (let i = windowSize; i < arr.length; i++) {
            windowSum += arr[i] - arr[i - windowSize];
            const avg = windowSum / windowSize;
            if (avg > best) best = avg;
          }
          return Math.round(best);
        };

        const formatDurationLabel = (seconds) => {
          if (seconds < 60) return `${seconds}s`;
          if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
          return `${Math.round(seconds / 3600)}h`;
        };

        result.peakPowerRecords = durations
          .map((duration) => {
            const currentPower = rollingBest(wattsData, duration);
            const historicalBest = Number(powerCurve.data[String(duration)] || powerCurve.data[duration] || 0);
            if (!currentPower) return null;
            return {
              duration: formatDurationLabel(duration),
              power: currentPower,
              isRecord: historicalBest > 0 ? currentPower > historicalBest : false,
            };
          })
          .filter(Boolean);
      }
    } catch (e) {
      console.log('[Advanced Metrics] No power records:', e.message);
    }

    // Efficiency (EF + aerobic decoupling)
    try {
      const avgPower = activity.average_watts || 0;
      const avgHr = activity.average_heartrate || 0;
      const currentEf = avgPower > 0 && avgHr > 0 ? avgPower / avgHr : 0;

      let aerobicDecoupling = 0;
      if (wattsData.length > 20 && hrData.length > 20) {
        const len = Math.min(wattsData.length, hrData.length);
        const half = Math.floor(len / 2);

        const firstPower = wattsData.slice(0, half).reduce((a, b) => a + b, 0) / Math.max(1, half);
        const secondPower = wattsData.slice(half, len).reduce((a, b) => a + b, 0) / Math.max(1, len - half);
        const firstHr = hrData.slice(0, half).reduce((a, b) => a + b, 0) / Math.max(1, half);
        const secondHr = hrData.slice(half, len).reduce((a, b) => a + b, 0) / Math.max(1, len - half);

        const efFirst = firstHr > 0 ? firstPower / firstHr : 0;
        const efSecond = secondHr > 0 ? secondPower / secondHr : 0;

        aerobicDecoupling = efFirst > 0 ? ((efFirst - efSecond) / efFirst) * 100 : 0;
      }

      const recentActivities = await strava.getActivities(athlete_id, { per_page: 30 }).catch(() => []);
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const lastWeekEF = (recentActivities || [])
        .filter((a) => (new Date(a.start_date || a.date)).getTime() >= oneWeekAgo)
        .map((a) => {
          const p = a.average_watts || 0;
          const h = a.average_heartrate || 0;
          return p > 0 && h > 0 ? p / h : 0;
        })
        .filter((ef) => ef > 0);

      const previousWeek = lastWeekEF.length
        ? lastWeekEF.reduce((sum, ef) => sum + ef, 0) / lastWeekEF.length
        : 0;

      let trend = 'neutral';
      if (currentEf > 0 && previousWeek > 0) {
        if (currentEf > previousWeek * 1.03) trend = 'improving';
        else if (currentEf < previousWeek * 0.97) trend = 'declining';
        else trend = 'stable';
      }

      result.efficiencyTrend = {
        efficiency: Math.round(currentEf * 100) / 100,
        aerobicDecoupling: Math.round(aerobicDecoupling * 10) / 10,
        previousWeek: Math.round(previousWeek * 100) / 100,
        trend
      };
    } catch (e) {
      console.log('[Advanced Metrics] No efficiency data:', e.message);
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

function buildRecommendations(classification, feat, profile) {
  const recs = [];
  const ifVal = feat.intensityFactor || 0;
  const type = (classification.type || '').toLowerCase();
  if (type === 'recovery') recs.push('Sesión de recuperación: mantén baja la intensidad y prioriza el descanso.');
  if (type === 'vo2max' || type === 'anaerobic') recs.push('Sesión de alta intensidad: asegura 48h de recuperación antes del próximo duro.');
  if (type === 'sweetspot') recs.push('Sweet Spot: muy efectivo para mejorar FTP. No abuses — 2 sesiones/semana máximo.');
  if (type === 'endurance') recs.push('Fondo: mantén el ritmo conversacional para maximizar adaptaciones aeróbicas.');
  if (type === 'threshold') recs.push('Umbral: trabaja bloques de 10-20 min a FTP para aumentar tu potencia sostenida.');
  if (ifVal > 1.0) recs.push(`IF ${ifVal.toFixed(2)} → carga elevada. Considera reducir la intensidad de las próximas sesiones.`);
  if (ifVal < 0.6 && ifVal > 0) recs.push('Sesión muy suave: válida para recuperación activa.');
  if (!profile?.ftp) recs.push('Introduce tu FTP en Perfil para obtener métricas más precisas.');
  return recs;
}

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
    const feat = classification.features || {};

    // Estimate time in zones from IF + duration (no streams available)
    const durationMin = (activity.moving_time || 0) / 60;
    const ifVal = feat.intensityFactor || 0;
    const estimatedZ5 = ifVal > 0.95 ? Math.round(durationMin * 0.20) : ifVal > 0.85 ? Math.round(durationMin * 0.08) : 0;
    const estimatedZ4 = ifVal > 0.90 ? Math.round(durationMin * 0.25) : ifVal > 0.80 ? Math.round(durationMin * 0.15) : Math.round(durationMin * 0.05);
    const estimatedZ3 = ifVal > 0.82 ? Math.round(durationMin * 0.40) : Math.round(durationMin * 0.15);

    res.json({
      activityId: activity.id,
      activityName: activity.name,
      sessionType: classification.type || 'Desconocido',
      confidence: classification.confidence || 0,
      features: {
        IF: feat.intensityFactor || 0,
        VI: feat.variabilityIndex || 0,
        timeInZ5: estimatedZ5,
        timeInZ4: estimatedZ4,
        timeInZ3: estimatedZ3,
        avgPower: activity.average_watts || 0,
        normPower: activity.weighted_average_watts || 0
      },
      interpretation: classification.description || 'Sin interpretación',
      trainingBenefit: (classification.tags || []).join(', ') || 'Desconocido',
      recommendations: classification.tags ? buildRecommendations(classification, feat, profile) : []
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
