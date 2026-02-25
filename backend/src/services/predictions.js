/**
 * Advanced Predictions Service
 * FTP Prediction, Critical Power Model, Performance Forecasting
 */

/**
 * 1️⃣ PREDICCIÓN AUTOMÁTICA DE FTP
 */

/**
 * Estima FTP basado en mejor esfuerzo de 20 minutos
 * @param {number} power20min - Mejor potencia de 20 minutos (watts)
 * @returns {number} FTP estimado
 */
function estimateFTPFrom20min(power20min) {
  if (!power20min || power20min <= 0) return 0;
  // FTP = 95% del mejor 20 min
  return Math.round(power20min * 0.95);
}

/**
 * Estima FTP basado en mejor esfuerzo de 60 minutos
 * @param {number} power60min - Mejor potencia de 60 minutos (watts)
 * @returns {number} FTP estimado
 */
function estimateFTPFrom60min(power60min) {
  if (!power60min || power60min <= 0) return 0;
  // FTP ≈ 95% del mejor 60 min
  return Math.round(power60min * 0.95);
}

/**
 * Calcula FTP estimado desde curva de potencia
 * @param {object} powerCurve - Curva de potencia {duration_seconds: watts}
 * @returns {object} {ftpEstimated, method, confidence}
 */
function estimateFTPFromPowerCurve(powerCurve) {
  if (!powerCurve) return { ftpEstimated: 0, method: 'none', confidence: 0 };

  const p20min = powerCurve[1200]; // 20 minutos
  const p60min = powerCurve[3600]; // 60 minutos

  if (p20min && p20min > 0) {
    return {
      ftpEstimated: estimateFTPFrom20min(p20min),
      method: '20min',
      confidence: 0.95,
      basedOn: `Mejor 20 min: ${p20min}W`
    };
  }

  if (p60min && p60min > 0) {
    return {
      ftpEstimated: estimateFTPFrom60min(p60min),
      method: '60min',
      confidence: 0.90,
      basedOn: `Mejor 60 min: ${p60min}W`
    };
  }

  return { ftpEstimated: 0, method: 'insufficient_data', confidence: 0 };
}

/**
 * Analiza tendencia de FTP en los últimos 90 días
 * @param {Array} activities - Array de actividades con fecha y potencia
 * @param {number} currentFTP - FTP actual del usuario
 * @returns {object} Análisis de tendencia
 */
function analyzeFTPTrend(activities, currentFTP) {
  if (!activities || activities.length === 0) {
    return { trend: 'sin_datos', change: 0, recommendation: 'Registra más actividades' };
  }

  const now = Date.now();
  const days90Ago = now - (90 * 24 * 60 * 60 * 1000);

  // Filtrar actividades de los últimos 90 días con potencia
  const recent = activities.filter(a => {
    const date = new Date(a.start_date || a.date);
    return date.getTime() > days90Ago && a.weighted_average_watts > 0;
  });

  if (recent.length < 5) {
    return { trend: 'datos_insuficientes', change: 0, recommendation: 'Necesitas más actividades' };
  }

  // Calcular promedio de NP de última semana vs hace 8-12 semanas
  const week1 = now - (7 * 24 * 60 * 60 * 1000);
  const week8 = now - (8 * 7 * 24 * 60 * 60 * 1000);
  const week12 = now - (12 * 7 * 24 * 60 * 60 * 1000);

  const lastWeek = recent.filter(a => new Date(a.start_date).getTime() > week1);
  const oldWeeks = recent.filter(a => {
    const t = new Date(a.start_date).getTime();
    return t < week8 && t > week12;
  });

  if (lastWeek.length === 0 || oldWeeks.length === 0) {
    return { trend: 'neutral', change: 0, recommendation: 'Mantén tu FTP actual' };
  }

  const avgRecent = lastWeek.reduce((sum, a) => sum + a.weighted_average_watts, 0) / lastWeek.length;
  const avgOld = oldWeeks.reduce((sum, a) => sum + a.weighted_average_watts, 0) / oldWeeks.length;

  const changePercent = ((avgRecent - avgOld) / avgOld) * 100;

  let trend, recommendation;
  if (changePercent > 5) {
    trend = 'mejorando';
    recommendation = `Tu potencia ha mejorado ~${Math.round(changePercent)}%. Considera test FTP.`;
  } else if (changePercent < -5) {
    trend = 'declinando';
    recommendation = `Tu potencia ha bajado ~${Math.abs(Math.round(changePercent))}%. Verifica fatiga o sobreentrenamiento.`;
  } else {
    trend = 'estable';
    recommendation = 'Tu rendimiento es consistente.';
  }

  return {
    trend,
    change: Math.round(changePercent),
    avgRecentNP: Math.round(avgRecent),
    avgOldNP: Math.round(avgOld),
    recommendation,
    estimatedNewFTP: currentFTP ? Math.round(currentFTP * (1 + changePercent / 100)) : null
  };
}

/**
 * 2️⃣ CRITICAL POWER MODEL
 */

/**
 * Calcula Critical Power (CP) y W' desde curva de potencia
 * Modelo: Time = W' / (Power - CP)
 * @param {object} powerCurve - {duration_seconds: watts}
 * @returns {object} {CP, Wprime, model}
 */
function calculateCriticalPower(powerCurve) {
  if (!powerCurve) return { CP: 0, Wprime: 0, model: 'insufficient_data' };

  // Usar 3 puntos: 3min, 10min, 20min para regresión
  const p3min = powerCurve[180];
  const p10min = powerCurve[600];
  const p20min = powerCurve[1200];

  if (!p3min || !p10min || !p20min) {
    return { CP: 0, Wprime: 0, model: 'insufficient_data' };
  }

  // Modelo 2-parameter: P = CP + W'/t
  // Regresión lineal: 1/t vs P
  // P*t = CP*t + W'
  const points = [
    { t: 180, p: p3min },
    { t: 600, p: p10min },
    { t: 1200, p: p20min }
  ];

  // Trabajo total = Power * Time
  const works = points.map(pt => ({ t: pt.t, work: pt.p * pt.t }));

  // Regresión lineal: work = CP*t + W'
  const n = works.length;
  const sumT = works.reduce((s, w) => s + w.t, 0);
  const sumWork = works.reduce((s, w) => s + w.work, 0);
  const sumT2 = works.reduce((s, w) => s + w.t * w.t, 0);
  const sumTWork = works.reduce((s, w) => s + w.t * w.work, 0);

  const CP = (n * sumTWork - sumT * sumWork) / (n * sumT2 - sumT * sumT);
  const Wprime = (sumWork - CP * sumT) / n;

  return {
    CP: Math.round(CP),
    Wprime: Math.round(Wprime),
    model: '2-parameter',
    description: `CP = potencia sostenible teórica, W' = ${Math.round(Wprime / 1000)}kJ de capacidad anaeróbica`
  };
}

/**
 * Calcula balance W' durante una actividad
 * @param {Array} powerStream - Stream de potencia (watts por segundo)
 * @param {number} CP - Critical Power
 * @param {number} Wprime - Capacidad anaeróbica (J)
 * @returns {Array} Balance W' por segundo
 */
function calculateWPrimeBalance(powerStream, CP, Wprime) {
  if (!powerStream || !CP || !Wprime) return [];

  const balance = [];
  let currentBalance = Wprime;

  // Tasa de recuperación: exponencial
  const tau = 546; // constante de tiempo en segundos

  for (let i = 0; i < powerStream.length; i++) {
    const power = powerStream[i];

    if (power > CP) {
      // Gastando W'
      const expenditure = power - CP;
      currentBalance -= expenditure;
    } else {
      // Recuperando W'
      const deficit = Wprime - currentBalance;
      const recovery = deficit * (1 - Math.exp(-1 / tau));
      currentBalance += recovery;
    }

    currentBalance = Math.max(0, Math.min(Wprime, currentBalance));
    balance.push(Math.round(currentBalance));
  }

  return balance;
}

/**
 * Estima tiempo hasta agotamiento a una potencia dada
 * @param {number} power - Potencia objetivo (watts)
 * @param {number} CP - Critical Power
 * @param {number} Wprime - Capacidad anaeróbica (J)
 * @returns {number} Tiempo en segundos
 */
function timeToExhaustion(power, CP, Wprime) {
  if (!power || !CP || !Wprime || power <= CP) {
    return Infinity; // Potencia sostenible indefinidamente
  }

  const timeSeconds = Wprime / (power - CP);
  return Math.round(timeSeconds);
}

/**
 * 3️⃣ PREDICCIÓN DE FORMA FUTURA (PMC Forecast)
 */

/**
 * Simula PMC futuro con diferentes escenarios
 * @param {object} currentPMC - {CTL, ATL, TSB} actual
 * @param {Array} plannedTSS - Array de TSS planificados por día
 * @returns {Array} PMC proyectado día a día
 */
function forecastPMC(currentPMC, plannedTSS) {
  const { CTL, ATL, TSB } = currentPMC;
  const forecast = [];

  let ctl = CTL || 0;
  let atl = ATL || 0;

  for (let day = 0; day < plannedTSS.length; day++) {
    const tss = plannedTSS[day] || 0;

    // Actualizar CTL y ATL
    ctl = ctl + (tss - ctl) / 42;
    atl = atl + (tss - atl) / 7;
    const tsb = ctl - atl;

    forecast.push({
      day: day + 1,
      CTL: Math.round(ctl * 10) / 10,
      ATL: Math.round(atl * 10) / 10,
      TSB: Math.round(tsb * 10) / 10,
      plannedTSS: tss
    });
  }

  return forecast;
}

/**
 * Genera escenarios de entrenamiento
 * @param {object} currentPMC - PMC actual
 * @param {number} days - Días a proyectar
 * @returns {object} Escenarios
 */
function generateTrainingScenarios(currentPMC, days = 14) {
  const scenarios = {};

  // Escenario 1: Descanso total
  scenarios.rest = forecastPMC(currentPMC, Array(days).fill(0));

  // Escenario 2: Mantenimiento (TSS bajo constante)
  scenarios.maintenance = forecastPMC(currentPMC, Array(days).fill(50));

  // Escenario 3: Carga moderada
  const moderate = Array(days).fill(0).map((_, i) => (i % 7 === 6 ? 0 : 80));
  scenarios.moderate = forecastPMC(currentPMC, moderate);

  // Escenario 4: Carga alta
  const intense = Array(days).fill(0).map((_, i) => (i % 7 === 6 ? 0 : 120));
  scenarios.intense = forecastPMC(currentPMC, intense);

  return scenarios;
}

module.exports = {
  // FTP Prediction
  estimateFTPFrom20min,
  estimateFTPFrom60min,
  estimateFTPFromPowerCurve,
  analyzeFTPTrend,

  // Critical Power
  calculateCriticalPower,
  calculateWPrimeBalance,
  timeToExhaustion,

  // PMC Forecast
  forecastPMC,
  generateTrainingScenarios
};
