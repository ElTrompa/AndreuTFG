/**
 * 🤖 SESSION TYPE CLASSIFIER
 * ML-inspired rule-based classifier for training session types
 * Analyzes power, HR, duration, and intensity to categorize workouts
 */

/**
 * Classify a training session based on multiple features
 * @param {Object} activity - Strava activity with analytics
 * @param {Object} profile - Athlete profile with FTP/zones
 * @returns {Object} Classification with confidence score
 */
function classifySession(activity, profile) {
  if (!activity) {
    return { type: 'unknown', confidence: 0, reason: 'No activity data' };
  }

  const features = extractFeatures(activity, profile);
  const classification = applyClassificationRules(features);

  return {
    type: classification.type,
    subtype: classification.subtype,
    confidence: classification.confidence,
    features,
    description: getTypeDescription(classification.type),
    tags: classification.tags
  };
}

/**
 * Extract relevant features for classification
 */
function extractFeatures(activity, profile) {
  const features = {
    duration: activity.moving_time || 0,
    distance: activity.distance || 0,
    elevationGain: activity.total_elevation_gain || 0,
    avgPower: activity.average_watts || 0,
    maxPower: activity.max_watts || 0,
    normalizedPower: activity.weighted_average_watts || 0,
    avgHR: activity.average_heartrate || 0,
    maxHR: activity.max_heartrate || 0,
    avgCadence: activity.average_cadence || 0,
    avgSpeed: activity.average_speed || 0,
    maxSpeed: activity.max_speed || 0,
    hasIntervals: false,
    intensityFactor: 0,
    variabilityIndex: 0,
    tss: activity.tss || 0
  };

  // Calculate derived features
  if (profile?.ftp && features.normalizedPower) {
    features.intensityFactor = features.normalizedPower / profile.ftp;
  }

  if (features.normalizedPower && features.avgPower) {
    features.variabilityIndex = features.normalizedPower / features.avgPower;
  }

  // Detect intervals (high VI suggests structured workout)
  features.hasIntervals = features.variabilityIndex > 1.1;

  // Duration in minutes
  features.durationMinutes = features.duration / 60;

  // Intensity level (relative to FTP)
  if (profile?.ftp && features.avgPower) {
    features.intensityLevel = features.avgPower / profile.ftp;
  } else {
    features.intensityLevel = 0;
  }

  // Climbing ratio (m/km)
  features.climbingRatio = features.distance > 0 
    ? (features.elevationGain / (features.distance / 1000))
    : 0;

  return features;
}

/**
 * Apply classification rules
 */
function applyClassificationRules(features) {
  const rules = [
    // RECOVERY RIDE
    {
      type: 'recovery',
      subtype: 'active_recovery',
      test: (f) => f.intensityLevel < 0.6 && f.durationMinutes < 90 && f.variabilityIndex < 1.05,
      confidence: 0.95,
      tags: ['easy', 'recovery', 'z1-z2']
    },

    // VO2MAX INTERVALS
    {
      type: 'vo2max',
      subtype: 'intervals',
      test: (f) => f.intensityFactor > 0.95 && f.variabilityIndex > 1.15 && f.durationMinutes < 90,
      confidence: 0.90,
      tags: ['high_intensity', 'intervals', 'z5', 'anaerobic']
    },

    // THRESHOLD / FTP TEST
    {
      type: 'threshold',
      subtype: 'ftp_test',
      test: (f) => f.intensityFactor > 0.92 && f.intensityFactor < 1.02 && 
                    f.durationMinutes > 15 && f.durationMinutes < 30 && f.variabilityIndex < 1.05,
      confidence: 0.92,
      tags: ['ftp', 'test', 'z4', 'sustained']
    },

    // SWEET SPOT
    {
      type: 'sweetspot',
      subtype: 'sustained',
      test: (f) => f.intensityLevel > 0.83 && f.intensityLevel < 0.95 && 
                    f.durationMinutes > 45 && f.variabilityIndex < 1.08,
      confidence: 0.88,
      tags: ['sweetspot', 'z3-z4', 'tempo']
    },

    // ENDURANCE / LONG RIDE
    {
      type: 'endurance',
      subtype: 'long_ride',
      test: (f) => f.durationMinutes > 120 && f.intensityLevel < 0.8 && f.variabilityIndex < 1.1,
      confidence: 0.90,
      tags: ['endurance', 'long', 'z2', 'base']
    },

    // TEMPO
    {
      type: 'tempo',
      subtype: 'sustained',
      test: (f) => f.intensityLevel > 0.75 && f.intensityLevel < 0.88 && 
                    f.durationMinutes > 30 && f.variabilityIndex < 1.08,
      confidence: 0.85,
      tags: ['tempo', 'z3', 'moderate']
    },

    // CLIMBING / HILL REPEATS
    {
      type: 'climbing',
      subtype: f => f.hasIntervals ? 'hill_repeats' : 'steady_climb',
      test: (f) => f.climbingRatio > 15 && f.durationMinutes > 30,
      confidence: 0.87,
      tags: ['climbing', 'hills', 'elevation']
    },

    // SPRINT INTERVALS
    {
      type: 'sprint',
      subtype: 'intervals',
      test: (f) => f.maxPower > f.avgPower * 2.5 && f.variabilityIndex > 1.2 && f.durationMinutes < 60,
      confidence: 0.89,
      tags: ['sprint', 'anaerobic', 'neuromuscular', 'z7']
    },

    // COMMUTE / EASY
    {
      type: 'easy',
      subtype: 'commute',
      test: (f) => f.durationMinutes < 45 && f.intensityLevel < 0.7 && f.distance < 25000,
      confidence: 0.75,
      tags: ['easy', 'commute', 'light']
    },

    // RACE / ALL-OUT EFFORT
    {
      type: 'race',
      subtype: 'competition',
      test: (f) => f.intensityFactor > 1.0 && f.tss > 150 && f.durationMinutes > 60,
      confidence: 0.93,
      tags: ['race', 'competition', 'max_effort']
    },

    // GROUP RIDE
    {
      type: 'group_ride',
      subtype: 'social',
      test: (f) => f.variabilityIndex > 1.15 && f.intensityLevel > 0.65 && 
                    f.intensityLevel < 0.85 && f.durationMinutes > 60,
      confidence: 0.80,
      tags: ['group', 'social', 'variable']
    }
  ];

  // Test all rules and find best match
  let bestMatch = {
    type: 'unclassified',
    subtype: 'unknown',
    confidence: 0.5,
    tags: ['unclassified']
  };

  for (const rule of rules) {
    if (rule.test(features)) {
      if (rule.confidence > bestMatch.confidence) {
        bestMatch = {
          type: rule.type,
          subtype: typeof rule.subtype === 'function' ? rule.subtype(features) : rule.subtype,
          confidence: rule.confidence,
          tags: rule.tags
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Get human-readable description
 */
function getTypeDescription(type) {
  const descriptions = {
    recovery: 'Salida de recuperación activa para promover circulación sin estrés',
    vo2max: 'Intervalos de alta intensidad para mejorar VO2max y capacidad anaeróbica',
    threshold: 'Entrenamiento en umbral (FTP) para aumentar potencia sostenible',
    sweetspot: 'Trabajo en sweet spot (88-93% FTP) - eficiencia máxima',
    endurance: 'Salida larga de resistencia para construir base aeróbica',
    tempo: 'Ritmo tempo sostenido para mejorar umbral aeróbico',
    climbing: 'Entrenamiento de escalada con desnivel significativo',
    sprint: 'Intervalos de sprint para potencia neuromuscular',
    easy: 'Salida fácil o desplazamiento sin carga de entrenamiento',
    race: 'Competición o esfuerzo máximo simulado',
    group_ride: 'Salida en grupo con intensidad variable',
    unclassified: 'Sesión no clasificada - patrón mixto o inusual'
  };

  return descriptions[type] || 'Tipo de sesión desconocido';
}

/**
 * Analyze training distribution over time
 * @param {Array} activities - Activities with classifications
 * @param {number} days - Period to analyze
 * @returns {Object}
 */
function analyzeTrainingDistribution(activities, days = 30) {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const recent = activities.filter(a => new Date(a.start_date).getTime() > cutoff);

  const distribution = {};
  let totalTime = 0;
  let totalTSS = 0;

  for (const activity of recent) {
    const type = activity.session_type || 'unclassified';
    
    if (!distribution[type]) {
      distribution[type] = {
        count: 0,
        totalTime: 0,
        totalTSS: 0,
        avgIntensity: 0
      };
    }

    distribution[type].count++;
    distribution[type].totalTime += activity.moving_time || 0;
    distribution[type].totalTSS += activity.tss || 0;

    totalTime += activity.moving_time || 0;
    totalTSS += activity.tss || 0;
  }

  // Calculate percentages
  const summary = Object.entries(distribution).map(([type, data]) => ({
    type,
    count: data.count,
    timePercentage: ((data.totalTime / totalTime) * 100).toFixed(1),
    tssPercentage: ((data.totalTSS / totalTSS) * 100).toFixed(1),
    avgDuration: Math.round(data.totalTime / data.count / 60) // minutes
  })).sort((a, b) => b.count - a.count);

  return {
    period: `${days} days`,
    totalActivities: recent.length,
    distribution: summary,
    recommendation: analyzeBalance(summary)
  };
}

/**
 * Analyze if training is balanced
 */
function analyzeBalance(distribution) {
  const typeMap = {};
  distribution.forEach(d => {
    typeMap[d.type] = parseFloat(d.tssPercentage);
  });

  const highIntensity = (typeMap.vo2max || 0) + (typeMap.sprint || 0) + (typeMap.threshold || 0);
  const moderate = (typeMap.sweetspot || 0) + (typeMap.tempo || 0);
  const easy = (typeMap.endurance || 0) + (typeMap.recovery || 0) + (typeMap.easy || 0);

  let recommendation = '';

  if (highIntensity > 30) {
    recommendation = '⚠️ Demasiada intensidad alta - riesgo de sobreentreno. Aumenta el volumen de base.';
  } else if (easy < 60) {
    recommendation = '💡 Aumenta las salidas en Z2 - la base aeróbica es fundamental (regla 80/20).';
  } else if (highIntensity < 10 && easy > 85) {
    recommendation = '🎯 Considera añadir más trabajo de calidad (intervalos, umbral).';
  } else {
    recommendation = '✅ Distribución de entrenamiento equilibrada - sigue así.';
  }

  return {
    highIntensity: highIntensity.toFixed(1) + '%',
    moderate: moderate.toFixed(1) + '%',
    easy: easy.toFixed(1) + '%',
    message: recommendation
  };
}

/**
 * Batch classify multiple activities
 */
async function batchClassify(activities, profile) {
  return activities.map(activity => ({
    id: activity.id,
    name: activity.name,
    date: activity.start_date,
    classification: classifySession(activity, profile)
  }));
}

module.exports = {
  classifySession,
  analyzeTrainingDistribution,
  batchClassify,
  extractFeatures
};
