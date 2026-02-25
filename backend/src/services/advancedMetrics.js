/**
 * Advanced Metrics Service
 * VI, Pacing Score, Peak Power Tracking, Efficiency Trends
 */

/**
 * 1️⃣ VARIABILITY INDEX (VI)
 */

/**
 * Calcula Variability Index
 * @param {number} normalizedPower - NP (watts)
 * @param {number} avgPower - Potencia promedio (watts)
 * @returns {number} VI
 */
function calculateVariabilityIndex(normalizedPower, avgPower) {
  if (!normalizedPower || !avgPower || avgPower <= 0) return 0;
  return Math.round((normalizedPower / avgPower) * 100) / 100;
}

/**
 * Interpreta VI
 * @param {number} vi - Variability Index
 * @returns {object} Interpretación
 */
function interpretVI(vi) {
  if (vi < 1.05) {
    return {
      category: 'steady',
      emoji: '📊',
      description: 'Esfuerzo muy constante (ideal para TT o subidas largas)',
      pacing: 'Excelente'
    };
  } else if (vi < 1.10) {
    return {
      category: 'moderate',
      emoji: '📈',
      description: 'Esfuerzo moderadamente variable (típico de entrenamientos)',
      pacing: 'Bueno'
    };
  } else {
    return {
      category: 'variable',
      emoji: '⚡',
      description: 'Esfuerzo muy variable (criterium, intervalos, terreno irregular)',
      pacing: 'Variable'
    };
  }
}

/**
 * 2️⃣ PACING SCORE
 */

/**
 * Analiza estrategia de pacing
 * @param {Array} powerStream - Stream de potencia
 * @param {number} duration - Duración total en segundos
 * @returns {object} Análisis de pacing
 */
function analyzePacing(powerStream, duration) {
  if (!powerStream || powerStream.length < 60) {
    return { score: 0, strategy: 'insufficient_data' };
  }

  // Dividir en tercios
  const third = Math.floor(powerStream.length / 3);
  const first = powerStream.slice(0, third);
  const middle = powerStream.slice(third, third * 2);
  const last = powerStream.slice(third * 2);

  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgMiddle = middle.reduce((a, b) => a + b, 0) / middle.length;
  const avgLast = last.reduce((a, b) => a + b, 0) / last.length;

  // Calcular desviaciones
  const firstVsMiddle = ((avgFirst - avgMiddle) / avgMiddle) * 100;
  const lastVsMiddle = ((avgLast - avgMiddle) / avgMiddle) * 100;

  let strategy, score, emoji, description;

  if (avgFirst > avgMiddle * 1.15 && avgLast < avgMiddle * 0.85) {
    strategy = 'positive_split';
    score = 60;
    emoji = '⚠️';
    description = 'Saliste demasiado fuerte y colapsaste al final';
  } else if (avgLast > avgMiddle * 1.10) {
    strategy = 'negative_split';
    score = 95;
    emoji = '🏆';
    description = 'Pacing perfecto: último tercio más fuerte (negative split)';
  } else if (Math.abs(avgFirst - avgLast) < avgMiddle * 0.05) {
    strategy = 'even';
    score = 90;
    emoji = '✅';
    description = 'Pacing muy constante, distribución equilibrada';
  } else if (avgFirst > avgMiddle * 1.05) {
    strategy = 'fast_start';
    score = 75;
    emoji = '⚡';
    description = 'Inicio rápido pero no fatal, controlaste la caída';
  } else {
    strategy = 'conservative';
    score = 80;
    emoji = '🔵';
    description = 'Inicio conservador, podrías haber ido más fuerte al principio';
  }

  return {
    score,
    strategy,
    emoji,
    description,
    details: {
      firstThird: Math.round(avgFirst),
      middleThird: Math.round(avgMiddle),
      lastThird: Math.round(avgLast),
      firstVsMiddle: Math.round(firstVsMiddle),
      lastVsMiddle: Math.round(lastVsMiddle)
    }
  };
}

/**
 * 3️⃣ PEAK POWER TRACKING
 */

/**
 * Detecta nuevos récords de potencia
 * @param {object} powerCurve - Curva de potencia actual
 * @param {object} historicalBest - Mejores históricos
 * @returns {Array} Récords batidos
 */
function detectPowerRecords(powerCurve, historicalBest) {
  const records = [];
  const durations = [5, 15, 30, 60, 120, 180, 300, 600, 900, 1200, 1800, 2700, 3600];

  durations.forEach(duration => {
    const currentPower = powerCurve[duration];
    const bestPower = historicalBest[duration];

    if (currentPower && bestPower && currentPower > bestPower) {
      const improvement = ((currentPower - bestPower) / bestPower) * 100;
      records.push({
        duration,
        durationLabel: formatDuration(duration),
        newRecord: currentPower,
        previousBest: bestPower,
        improvement: Math.round(improvement * 10) / 10,
        emoji: '🏆'
      });
    }
  });

  return records;
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${Math.round(seconds / 3600)}h`;
}

/**
 * 4️⃣ EFFICIENCY TREND TRACKING
 */

/**
 * Analiza tendencia de Efficiency Factor
 * @param {Array} activities - Actividades con EF
 * @param {number} days - Ventana de días
 * @returns {object} Tendencia
 */
function analyzeEfficiencyTrend(activities, days = 90) {
  if (!activities || activities.length < 3) {
    return { trend: 'insufficient_data', slope: 0 };
  }

  const now = Date.now();
  const cutoff = now - (days * 24 * 60 * 60 * 1000);

  const withEF = activities
    .filter(a => {
      const date = new Date(a.start_date || a.date);
      return date.getTime() > cutoff && a.analytics?.efficiency?.efficiency_factor;
    })
    .map(a => ({
      date: new Date(a.start_date || a.date).getTime(),
      ef: a.analytics.efficiency.efficiency_factor
    }))
    .sort((a, b) => a.date - b.date);

  if (withEF.length < 3) {
    return { trend: 'insufficient_data', slope: 0 };
  }

  // Regresión lineal simple
  const n = withEF.length;
  const sumX = withEF.reduce((s, d, i) => s + i, 0);
  const sumY = withEF.reduce((s, d) => s + d.ef, 0);
  const sumXY = withEF.reduce((s, d, i) => s + i * d.ef, 0);
  const sumX2 = withEF.reduce((s, d, i) => s + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calcular R²
  const avgY = sumY / n;
  const ssTotal = withEF.reduce((s, d) => s + Math.pow(d.ef - avgY, 2), 0);
  const ssRes = withEF.reduce((s, d, i) => s + Math.pow(d.ef - (slope * i + intercept), 2), 0);
  const r2 = 1 - (ssRes / ssTotal);

  let trend, emoji, message;
  if (slope > 0.01) {
    trend = 'improving';
    emoji = '📈';
    message = 'Tu eficiencia aeróbica está mejorando';
  } else if (slope < -0.01) {
    trend = 'declining';
    emoji = '📉';
    message = 'Tu eficiencia aeróbica está declinando, verifica fatiga';
  } else {
    trend = 'stable';
    emoji = '📊';
    message = 'Tu eficiencia aeróbica es estable';
  }

  return {
    trend,
    emoji,
    message,
    slope: Math.round(slope * 1000) / 1000,
    r2: Math.round(r2 * 100) / 100,
    dataPoints: withEF.length,
    avgEF: Math.round((sumY / n) * 100) / 100,
    firstEF: Math.round(withEF[0].ef * 100) / 100,
    lastEF: Math.round(withEF[withEF.length - 1].ef * 100) / 100
  };
}

/**
 * Analiza tendencia de Aerobic Decoupling
 * @param {Array} activities - Actividades con decoupling
 * @param {number} days - Ventana de días
 * @returns {object} Tendencia
 */
function analyzeDecouplingTrend(activities, days = 90) {
  if (!activities || activities.length < 3) {
    return { trend: 'insufficient_data' };
  }

  const now = Date.now();
  const cutoff = now - (days * 24 * 60 * 60 * 1000);

  const withDecoupling = activities
    .filter(a => {
      const date = new Date(a.start_date || a.date);
      return date.getTime() > cutoff && a.analytics?.efficiency?.aerobic_decoupling?.decoupling;
    })
    .map(a => ({
      date: new Date(a.start_date || a.date).getTime(),
      decoupling: a.analytics.efficiency.aerobic_decoupling.decoupling
    }))
    .sort((a, b) => a.date - b.date);

  if (withDecoupling.length < 3) {
    return { trend: 'insufficient_data' };
  }

  const avgDecoupling = withDecoupling.reduce((s, d) => s + d.decoupling, 0) / withDecoupling.length;
  const firstDecoupling = withDecoupling[0].decoupling;
  const lastDecoupling = withDecoupling[withDecoupling.length - 1].decoupling;

  let trend, emoji, message;
  if (avgDecoupling < 3) {
    trend = 'excellent';
    emoji = '🟢';
    message = 'Decoupling aeróbico excelente (<3%)';
  } else if (avgDecoupling < 5) {
    trend = 'good';
    emoji = '🔵';
    message = 'Decoupling aeróbico bueno (3-5%)';
  } else if (avgDecoupling < 7) {
    trend = 'moderate';
    emoji = '🟡';
    message = 'Decoupling aeróbico moderado (5-7%)';
  } else {
    trend = 'high';
    emoji = '🔴';
    message = 'Decoupling alto (>7%), verifica fatiga o base aeróbica';
  }

  return {
    trend,
    emoji,
    message,
    avgDecoupling: Math.round(avgDecoupling * 10) / 10,
    firstDecoupling: Math.round(firstDecoupling * 10) / 10,
    lastDecoupling: Math.round(lastDecoupling * 10) / 10,
    dataPoints: withDecoupling.length
  };
}

module.exports = {
  calculateVariabilityIndex,
  interpretVI,
  analyzePacing,
  detectPowerRecords,
  analyzeEfficiencyTrend,
  analyzeDecouplingTrend
};
