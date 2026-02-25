/**
 * Intelligent Coaching Service
 * Daily recommendations, training plans, overtraining detection
 */

/**
 * 1️⃣ RECOMENDACIONES DIARIAS (COACH VIRTUAL)
 */

/**
 * Genera recomendación de entrenamiento diaria
 * @param {object} pmcStatus - {CTL, ATL, TSB}
 * @param {object} profile - Perfil del atleta
 * @param {Array} recentActivities - Actividades últimos 7 días
 * @returns {object} Recomendación
 */
function getDailyRecommendation(pmcStatus, profile, recentActivities = []) {
  const { TSB, ATL, CTL } = pmcStatus;
  const recommendation = {
    status: '',
    emoji: '',
    message: '',
    workout: {},
    reasoning: ''
  };

  // Análisis de fatiga
  if (TSB < -30) {
    recommendation.status = 'overreached';
    recommendation.emoji = '🔴';
    recommendation.message = `TSB muy negativo (${Math.round(TSB)}). Riesgo de sobreentrenamiento.`;
    recommendation.workout = {
      type: 'rest',
      duration: 0,
      zones: [],
      description: 'Descanso completo o actividad muy suave (paseo)'
    };
    recommendation.reasoning = 'Necesitas recuperación urgente para evitar lesiones.';
  } else if (TSB < -20) {
    recommendation.status = 'fatigued';
    recommendation.emoji = '🟠';
    recommendation.message = `Fatiga alta (TSB ${Math.round(TSB)}). Recuperación activa recomendada.`;
    recommendation.workout = {
      type: 'recovery',
      duration: 45,
      zones: ['Z1', 'Z2'],
      description: 'Rodaje suave 45-60 min en Z1-Z2 (< 65% FTP)',
      intensity: 'Muy baja'
    };
    recommendation.reasoning = 'La recuperación activa ayuda a eliminar fatiga sin añadir estrés.';
  } else if (TSB < -10) {
    recommendation.status = 'tired';
    recommendation.emoji = '🟡';
    recommendation.message = `Fatiga moderada (TSB ${Math.round(TSB)}). Sesión ligera o Z2.`;
    recommendation.workout = {
      type: 'endurance',
      duration: 60,
      zones: ['Z2'],
      description: 'Rodaje Z2 60-90 min (65-75% FTP)',
      intensity: 'Moderada'
    };
    recommendation.reasoning = 'Mantén la carga pero sin intensidad para seguir adaptando.';
  } else if (TSB > 20) {
    recommendation.status = 'fresh';
    recommendation.emoji = '🟢';
    recommendation.message = `Muy fresco (TSB ${Math.round(TSB)}). ¡Perfecto para sesión de calidad!`;
    recommendation.workout = {
      type: 'high_intensity',
      duration: 90,
      zones: ['Z3', 'Z4', 'Z5'],
      description: 'Intervalos VO2max o Sweet Spot: 5x5min Z5 (105-120% FTP) o 3x20min Z4 (88-95% FTP)',
      intensity: 'Alta'
    };
    recommendation.reasoning = 'Estás descansado, aprovecha para entrenar duraciones clave.';
  } else if (TSB > 5) {
    recommendation.status = 'optimal';
    recommendation.emoji = '🔵';
    recommendation.message = `Forma óptima (TSB ${Math.round(TSB)}). Día ideal para calidad moderada.`;
    recommendation.workout = {
      type: 'tempo',
      duration: 75,
      zones: ['Z3', 'Z4'],
      description: 'Tempo o Threshold: 2x20min Z4 (90-105% FTP)',
      intensity: 'Media-Alta'
    };
    recommendation.reasoning = 'TSB equilibrado: puedes trabajar intensidad sostenible.';
  } else {
    recommendation.status = 'balanced';
    recommendation.emoji = '⚪';
    recommendation.message = `TSB neutro (${Math.round(TSB)}). Balance entre carga y recuperación.`;
    recommendation.workout = {
      type: 'mixed',
      duration: 60,
      zones: ['Z2', 'Z3'],
      description: 'Rodaje Z2 con sprints cortos o Z3 progresivo',
      intensity: 'Moderada'
    };
    recommendation.reasoning = 'Puedes entrenar normalmente, escucha a tu cuerpo.';
  }

  return recommendation;
}

/**
 * 2️⃣ DETECCIÓN DE SOBREENTRENAMIENTO
 */

/**
 * Analiza indicadores de sobreentrenamiento
 * @param {object} pmcStatus - {CTL, ATL, TSB}
 * @param {Array} recentActivities - Actividades con analytics
 * @param {number} hrv - HRV promedio (opcional)
 * @returns {object} Análisis de riesgo
 */
function detectOvertraining(pmcStatus, recentActivities, hrv = null) {
  const { TSB, ATL } = pmcStatus;
  const risks = [];
  let riskLevel = 'low';
  let score = 0;

  // Factor 1: TSB muy negativo prolongado
  if (TSB < -30) {
    risks.push('TSB extremadamente negativo (<-30)');
    score += 30;
  } else if (TSB < -20) {
    risks.push('TSB muy negativo (<-20)');
    score += 15;
  }

  // Factor 2: ATL muy alto
  if (ATL > 100) {
    risks.push('Fatiga aguda muy alta (ATL > 100)');
    score += 20;
  }

  // Factor 3: Aerobic Decoupling alto en actividades recientes
  if (recentActivities && recentActivities.length > 0) {
    const withDecoupling = recentActivities
      .filter(a => a.analytics?.efficiency?.aerobic_decoupling?.decoupling)
      .map(a => a.analytics.efficiency.aerobic_decoupling.decoupling);

    if (withDecoupling.length > 0) {
      const avgDecoupling = withDecoupling.reduce((a, b) => a + b, 0) / withDecoupling.length;
      if (avgDecoupling > 7) {
        risks.push(`Decoupling aeróbico alto (${avgDecoupling.toFixed(1)}%)`);
        score += 20;
      }
    }

    // Factor 4: Efficiency Factor decreciente
    const withEF = recentActivities
      .filter(a => a.analytics?.efficiency?.efficiency_factor)
      .map(a => ({ date: a.start_date, ef: a.analytics.efficiency.efficiency_factor }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (withEF.length >= 3) {
      const firstHalf = withEF.slice(0, Math.floor(withEF.length / 2));
      const secondHalf = withEF.slice(Math.floor(withEF.length / 2));
      const avgFirst = firstHalf.reduce((s, a) => s + a.ef, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((s, a) => s + a.ef, 0) / secondHalf.length;

      if (avgSecond < avgFirst * 0.93) {
        risks.push('Efficiency Factor ha caído >7%');
        score += 15;
      }
    }
  }

  // Factor 5: HRV baja (si disponible)
  if (hrv !== null && hrv < 40) {
    risks.push(`HRV muy baja (${hrv}ms)`);
    score += 25;
  }

  // Clasificación de riesgo
  if (score >= 50) {
    riskLevel = 'high';
  } else if (score >= 25) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return {
    riskLevel,
    score,
    risks,
    recommendation: getRiskRecommendation(riskLevel, score)
  };
}

function getRiskRecommendation(level, score) {
  if (level === 'high') {
    return {
      emoji: '🔴',
      message: 'RIESGO ALTO de sobreentrenamiento',
      action: 'Reduce volumen e intensidad inmediatamente. Considera 3-5 días de descanso activo.'
    };
  } else if (level === 'medium') {
    return {
      emoji: '🟠',
      message: 'Riesgo moderado de sobreentrenamiento',
      action: 'Prioriza recuperación esta semana. Solo Z1-Z2 o descanso.'
    };
  } else {
    return {
      emoji: '🟢',
      message: 'Riesgo bajo, recuperación adecuada',
      action: 'Puedes seguir entrenando normalmente.'
    };
  }
}

/**
 * 3️⃣ GENERADOR DE MICROCICLOS
 */

/**
 * Genera plan de entrenamiento semanal
 * @param {string} goal - 'ftp' | 'vo2max' | 'endurance' | 'sprint'
 * @param {object} pmcStatus - Estado PMC actual
 * @param {string} profile - 'sprinter' | 'climber' | 'allrounder'
 * @returns {Array} Semana planificada
 */
function generateWeeklyPlan(goal, pmcStatus, profile) {
  const { TSB } = pmcStatus;
  const plan = [];

  // Ajustar intensidad según TSB
  const canHandleIntensity = TSB > -10;

  switch (goal) {
    case 'ftp':
      plan.push(
        { day: 1, type: 'Sweet Spot', duration: 90, zones: ['Z3', 'Z4'], tss: 85, description: '3x15min @ 88-94% FTP' },
        { day: 2, type: 'Recovery', duration: 45, zones: ['Z1'], tss: 25, description: 'Rodaje suave' },
        { day: 3, type: 'Threshold', duration: 75, zones: ['Z4'], tss: 80, description: '2x20min @ FTP' },
        { day: 4, type: 'Rest', duration: 0, zones: [], tss: 0, description: 'Descanso total' },
        { day: 5, type: 'Endurance', duration: 90, zones: ['Z2'], tss: 60, description: 'Rodaje largo Z2' },
        { day: 6, type: 'Over-Unders', duration: 60, zones: ['Z4', 'Z5'], tss: 70, description: '4x8min (95%/105% FTP)' },
        { day: 7, type: 'Rest', duration: 0, zones: [], tss: 0, description: 'Descanso' }
      );
      break;

    case 'vo2max':
      plan.push(
        { day: 1, type: 'VO2max', duration: 75, zones: ['Z5'], tss: 90, description: '5x5min @ 120% FTP' },
        { day: 2, type: 'Recovery', duration: 45, zones: ['Z1'], tss: 25, description: 'Recuperación activa' },
        { day: 3, type: 'Endurance', duration: 90, zones: ['Z2'], tss: 60, description: 'Fondo aeróbico' },
        { day: 4, type: 'VO2max', duration: 60, zones: ['Z5'], tss: 85, description: '6x3min @ 120% FTP' },
        { day: 5, type: 'Rest', duration: 0, zones: [], tss: 0, description: 'Descanso' },
        { day: 6, type: 'Endurance', duration: 120, zones: ['Z2', 'Z3'], tss: 80, description: 'Rodaje largo progresivo' },
        { day: 7, type: 'Rest', duration: 0, zones: [], tss: 0, description: 'Descanso' }
      );
      break;

    case 'endurance':
      plan.push(
        { day: 1, type: 'Endurance', duration: 90, zones: ['Z2'], tss: 60, description: 'Rodaje Z2' },
        { day: 2, type: 'Tempo', duration: 60, zones: ['Z3'], tss: 55, description: '2x15min Z3' },
        { day: 3, type: 'Endurance', duration: 75, zones: ['Z2'], tss: 50, description: 'Rodaje aeróbico' },
        { day: 4, type: 'Rest', duration: 0, zones: [], tss: 0, description: 'Descanso o yoga' },
        { day: 5, type: 'Endurance', duration: 120, zones: ['Z2'], tss: 80, description: 'Rodaje largo Z2' },
        { day: 6, type: 'Sweet Spot', duration: 75, zones: ['Z3'], tss: 70, description: '3x12min @ 88% FTP' },
        { day: 7, type: 'Endurance', duration: 150, zones: ['Z2'], tss: 100, description: 'Salida larga fin de semana' }
      );
      break;

    case 'sprint':
      plan.push(
        { day: 1, type: 'Sprint Power', duration: 60, zones: ['Z6'], tss: 65, description: '10x15s sprints máximos' },
        { day: 2, type: 'Recovery', duration: 45, zones: ['Z1'], tss: 25, description: 'Recuperación activa' },
        { day: 3, type: 'Neuromuscular', duration: 75, zones: ['Z1', 'Z6'], tss: 50, description: '8x30s @ potencia pico' },
        { day: 4, type: 'Endurance', duration: 60, zones: ['Z2'], tss: 40, description: 'Rodaje aeróbico' },
        { day: 5, type: 'Rest', duration: 0, zones: [], tss: 0, description: 'Descanso' },
        { day: 6, type: 'Sprint Intervals', duration: 90, zones: ['Z4', 'Z6'], tss: 80, description: '6x(10s sprint + 2min Z4)' },
        { day: 7, type: 'Recovery', duration: 60, zones: ['Z1'], tss: 35, description: 'Rodaje muy suave' }
      );
      break;

    default:
      return { error: 'Goal not recognized' };
  }

  // Si TSB es muy negativo, reducir intensidad
  if (!canHandleIntensity) {
    plan.forEach(workout => {
      if (workout.tss > 60) {
        workout.tss = Math.round(workout.tss * 0.7);
        workout.note = '⚠️ Intensidad reducida por TSB negativo';
      }
    });
  }

  const totalTSS = plan.reduce((sum, w) => sum + w.tss, 0);
  const totalDuration = plan.reduce((sum, w) => sum + w.duration, 0);

  return {
    goal,
    plan,
    summary: {
      totalTSS,
      totalDuration,
      trainingDays: plan.filter(d => d.duration > 0).length,
      restDays: plan.filter(d => d.duration === 0).length,
      avgTSSPerDay: Math.round(totalTSS / 7)
    }
  };
}

module.exports = {
  getDailyRecommendation,
  detectOvertraining,
  generateWeeklyPlan
};
