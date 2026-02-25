/**
 * 💓 HRV TRACKING SERVICE
 * Heart Rate Variability tracking and analysis
 * Manual entry support (Strava doesn't provide HRV data)
 */

/**
 * Calculate 7-day rolling average HRV
 * @param {Array} hrvData - [{date, rmssd}]
 * @returns {Object}
 */
function calculateHRVAverage(hrvData, days = 7) {
  if (!hrvData || hrvData.length === 0) {
    return { average: null, trend: 'insufficient_data' };
  }

  // Sort by date descending
  const sorted = [...hrvData].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, days);

  if (recent.length < 3) {
    return { average: null, trend: 'insufficient_data' };
  }

  const sum = recent.reduce((acc, entry) => acc + entry.rmssd, 0);
  const average = sum / recent.length;

  // Calculate trend (linear regression)
  const trend = calculateTrend(recent.map(e => e.rmssd).reverse());

  return {
    average: Math.round(average),
    days: recent.length,
    trend: trend > 2 ? 'improving' : trend < -2 ? 'declining' : 'stable',
    trendValue: trend
  };
}

/**
 * Analyze HRV status relative to baseline
 * @param {number} todayRMSSD - Today's RMSSD value
 * @param {Array} hrvData - Historical data
 * @returns {Object}
 */
function analyzeHRVStatus(todayRMSSD, hrvData) {
  if (!todayRMSSD || !hrvData || hrvData.length < 7) {
    return {
      status: 'unknown',
      message: 'Necesitas al menos 7 días de datos HRV para análisis'
    };
  }

  const { average } = calculateHRVAverage(hrvData, 30);

  if (!average) {
    return {
      status: 'unknown',
      message: 'Datos insuficientes para establecer baseline'
    };
  }

  const deviation = ((todayRMSSD - average) / average) * 100;

  let status, message, recommendation;

  if (deviation > 10) {
    status = 'excellent';
    message = '🟢 HRV excelente - recuperación óptima';
    recommendation = 'Día ideal para entrenamientos intensos';
  } else if (deviation > 5) {
    status = 'good';
    message = '🔵 HRV buena - bien recuperado';
    recommendation = 'Puedes entrenar con normalidad';
  } else if (deviation > -5) {
    status = 'normal';
    message = '⚪ HRV normal - estado estándar';
    recommendation = 'Entreno moderado sin grandes esfuerzos';
  } else if (deviation > -10) {
    status = 'low';
    message = '🟡 HRV baja - recuperación incompleta';
    recommendation = 'Considera entrenar suave o descansar';
  } else {
    status = 'very_low';
    message = '🔴 HRV muy baja - fatiga acumulada';
    recommendation = 'Día de descanso o recuperación activa recomendado';
  }

  return {
    status,
    message,
    recommendation,
    todayRMSSD,
    baseline: average,
    deviation: Math.round(deviation)
  };
}

/**
 * Calculate simple linear trend
 */
function calculateTrend(values) {
  if (values.length < 3) return 0;

  const n = values.length;
  const x = values.map((_, i) => i);
  const y = values;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

/**
 * Detect HRV anomalies (sudden drops)
 * @param {Array} hrvData 
 * @returns {Array} Anomaly dates with severity
 */
function detectHRVAnomalies(hrvData, threshold = -15) {
  if (!hrvData || hrvData.length < 7) return [];

  const anomalies = [];
  const { average } = calculateHRVAverage(hrvData, 30);

  if (!average) return [];

  for (let i = 0; i < hrvData.length; i++) {
    const entry = hrvData[i];
    const deviation = ((entry.rmssd - average) / average) * 100;

    if (deviation < threshold) {
      anomalies.push({
        date: entry.date,
        rmssd: entry.rmssd,
        deviation: Math.round(deviation),
        severity: deviation < -25 ? 'high' : deviation < -20 ? 'medium' : 'low'
      });
    }
  }

  return anomalies.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Training readiness score based on HRV
 * Combines HRV status with TSB
 * @param {Object} hrvStatus - from analyzeHRVStatus
 * @param {number} tsb - Training Stress Balance
 * @returns {Object}
 */
function calculateTrainingReadiness(hrvStatus, tsb) {
  let hrvScore = 50; // Default

  switch (hrvStatus.status) {
    case 'excellent': hrvScore = 100; break;
    case 'good': hrvScore = 80; break;
    case 'normal': hrvScore = 60; break;
    case 'low': hrvScore = 40; break;
    case 'very_low': hrvScore = 20; break;
    default: hrvScore = 50;
  }

  // TSB scoring (-30 to +20 range)
  let tsbScore = 50;
  if (tsb > 10) tsbScore = 90;
  else if (tsb > 0) tsbScore = 70;
  else if (tsb > -10) tsbScore = 50;
  else if (tsb > -20) tsbScore = 30;
  else tsbScore = 10;

  // Weighted average (HRV 60%, TSB 40%)
  const readiness = Math.round(hrvScore * 0.6 + tsbScore * 0.4);

  let level, recommendation;
  if (readiness >= 80) {
    level = 'high';
    recommendation = '✅ Listo para entrenamientos intensos';
  } else if (readiness >= 60) {
    level = 'moderate';
    recommendation = '🔵 Apto para entrenamientos moderados';
  } else if (readiness >= 40) {
    level = 'low';
    recommendation = '⚠️ Solo entrenamientos suaves';
  } else {
    level = 'very_low';
    recommendation = '🛑 Descanso o recuperación activa necesaria';
  }

  return {
    readiness,
    level,
    recommendation,
    components: {
      hrv: { score: hrvScore, status: hrvStatus.status },
      tsb: { score: tsbScore, value: tsb }
    }
  };
}

module.exports = {
  calculateHRVAverage,
  analyzeHRVStatus,
  detectHRVAnomalies,
  calculateTrainingReadiness
};
