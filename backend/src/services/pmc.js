/**
 * Performance Management Chart (PMC) Service
 * Calcula ATL, CTL y TSB para seguimiento de forma, fatiga y frescura
 */

/**
 * ATL (Acute Training Load) - Fatiga a corto plazo
 * Promedio exponencial de TSS de los últimos 7 días
 * 
 * CTL (Chronic Training Load) - Forma/Fitness a largo plazo
 * Promedio exponencial de TSS de los últimos 42 días
 * 
 * TSB (Training Stress Balance) - Frescura
 * TSB = CTL - ATL (yesterday)
 * Positivo = fresco, Negativo = fatigado
 */

/**
 * Calcula el promedio exponencial móvil (EMA)
 * @param {number} previousEMA - EMA del día anterior
 * @param {number} todayTSS - TSS del día actual
 * @param {number} period - Período (7 para ATL, 42 para CTL)
 * @returns {number} Nuevo EMA
 */
function calculateEMA(previousEMA, todayTSS, period) {
  const k = 2 / (period + 1);
  return previousEMA + k * (todayTSS - previousEMA);
}

/**
 * Calcula ATL, CTL y TSB para un rango de fechas
 * @param {Array} activities - Array de actividades con TSS y fecha
 * @param {Object} options - Opciones de cálculo
 * @returns {Array} Array de objetos {date, atl, ctl, tsb, tss}
 */
function calculatePMC(activities, options = {}) {
  const {
    initialATL = 0,
    initialCTL = 0,
    atlPeriod = 7,
    ctlPeriod = 42
  } = options;

  // Ordenar actividades por fecha
  const sorted = [...activities].sort((a, b) => 
    new Date(a.start_date || a.date) - new Date(b.start_date || b.date)
  );

  if (sorted.length === 0) return [];

  // Agrupar TSS por día
  const dailyTSS = {};
  sorted.forEach(act => {
    const date = new Date(act.start_date || act.date);
    const dateKey = date.toISOString().split('T')[0];
    
    if (!dailyTSS[dateKey]) {
      dailyTSS[dateKey] = {
        date: dateKey,
        tss: 0,
        activities: []
      };
    }
    
    dailyTSS[dateKey].tss += act.tss || 0;
    dailyTSS[dateKey].activities.push(act);
  });

  // Generar rango completo de fechas (rellenar días sin actividad)
  const firstDate = new Date(sorted[0].start_date || sorted[0].date);
  const lastDate = new Date(sorted[sorted.length - 1].start_date || sorted[sorted.length - 1].date);
  const today = new Date();
  const endDate = lastDate > today ? today : lastDate;

  const dateRange = [];
  const currentDate = new Date(firstDate);
  
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dateRange.push({
      date: dateKey,
      tss: dailyTSS[dateKey] ? dailyTSS[dateKey].tss : 0,
      activities: dailyTSS[dateKey] ? dailyTSS[dateKey].activities : []
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calcular ATL, CTL, TSB día a día
  let atl = initialATL;
  let ctl = initialCTL;
  let previousATL = initialATL;
  
  const pmcData = dateRange.map((day) => {
    // Calcular nuevo ATL y CTL
    atl = calculateEMA(atl, day.tss, atlPeriod);
    ctl = calculateEMA(ctl, day.tss, ctlPeriod);
    
    // TSB = CTL - ATL (del día anterior para evitar efecto inmediato)
    const tsb = ctl - previousATL;
    previousATL = atl;

    return {
      date: day.date,
      tss: Math.round(day.tss),
      atl: Math.round(atl * 10) / 10,
      ctl: Math.round(ctl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
      activities: day.activities
    };
  });

  return pmcData;
}

/**
 * Obtiene resumen de última semana
 * @param {Array} pmcData - Datos de PMC
 * @returns {Object} Resumen semanal
 */
function getWeeklySummary(pmcData) {
  if (!pmcData || pmcData.length === 0) return null;

  const last7Days = pmcData.slice(-7);
  const lastDay = pmcData[pmcData.length - 1];

  const totalTSS = last7Days.reduce((sum, day) => sum + day.tss, 0);
  const avgTSSPerDay = Math.round(totalTSS / 7);
  const workoutDays = last7Days.filter(d => d.tss > 0).length;

  return {
    current_atl: lastDay.atl,
    current_ctl: lastDay.ctl,
    current_tsb: lastDay.tsb,
    weekly_tss: totalTSS,
    avg_tss_per_day: avgTSSPerDay,
    workout_days: workoutDays,
    status: getFitnessStatus(lastDay)
  };
}

/**
 * Obtiene resumen mensual
 * @param {Array} pmcData - Datos de PMC
 * @returns {Object} Resumen mensual
 */
function getMonthlySummary(pmcData) {
  if (!pmcData || pmcData.length === 0) return null;

  const last30Days = pmcData.slice(-30);
  const lastDay = pmcData[pmcData.length - 1];

  const totalTSS = last30Days.reduce((sum, day) => sum + day.tss, 0);
  const avgTSSPerDay = Math.round(totalTSS / 30);
  const workoutDays = last30Days.filter(d => d.tss > 0).length;
  
  // Calcular tendencia de forma (CTL)
  const ctlStart = last30Days[0].ctl;
  const ctlEnd = lastDay.ctl;
  const ctlChange = Math.round((ctlEnd - ctlStart) * 10) / 10;

  return {
    current_atl: lastDay.atl,
    current_ctl: lastDay.ctl,
    current_tsb: lastDay.tsb,
    monthly_tss: totalTSS,
    avg_tss_per_day: avgTSSPerDay,
    workout_days: workoutDays,
    ctl_change: ctlChange,
    status: getFitnessStatus(lastDay)
  };
}

/**
 * Determina estado de forma basado en TSB
 * @param {Object} day - Día con valores ATL, CTL, TSB
 * @returns {Object} Estado de forma
 */
function getFitnessStatus(day) {
  const { atl, ctl, tsb } = day;

  let fatigueLevel = 'normal';
  let formLevel = 'normal';
  let freshnessLevel = 'normal';
  let recommendation = '';

  // Fatiga (ATL)
  if (atl > 150) {
    fatigueLevel = 'muy-alta';
    recommendation = 'Considera descanso o entrenamiento muy suave';
  } else if (atl > 100) {
    fatigueLevel = 'alta';
    recommendation = 'Reduce intensidad o volumen';
  } else if (atl > 60) {
    fatigueLevel = 'moderada';
  } else {
    fatigueLevel = 'baja';
  }

  // Forma (CTL)
  if (ctl > 150) {
    formLevel = 'excelente';
  } else if (ctl > 100) {
    formLevel = 'muy-buena';
  } else if (ctl > 60) {
    formLevel = 'buena';
  } else if (ctl > 30) {
    formLevel = 'en-desarrollo';
  } else {
    formLevel = 'baja';
  }

  // Frescura (TSB)
  if (tsb > 25) {
    freshnessLevel = 'muy-fresco';
    if (!recommendation) recommendation = 'Buen momento para entrenar duro';
  } else if (tsb > 10) {
    freshnessLevel = 'fresco';
    if (!recommendation) recommendation = 'Listo para entrenamientos intensos';
  } else if (tsb > -10) {
    freshnessLevel = 'equilibrado';
    if (!recommendation) recommendation = 'Mantén el balance actual';
  } else if (tsb > -30) {
    freshnessLevel = 'fatigado';
    if (!recommendation) recommendation = 'Reduce carga o descansa';
  } else {
    freshnessLevel = 'muy-fatigado';
    if (!recommendation) recommendation = 'Descanso obligatorio';
  }

  return {
    fatigue_level: fatigueLevel,
    form_level: formLevel,
    freshness_level: freshnessLevel,
    recommendation
  };
}

/**
 * Agrupa datos por semana para visualización
 * @param {Array} pmcData - Datos diarios
 * @returns {Array} Datos agrupados por semana
 */
function groupByWeek(pmcData) {
  if (!pmcData || pmcData.length === 0) return [];

  const weeks = [];
  let currentWeek = null;

  pmcData.forEach(day => {
    const date = new Date(day.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Domingo
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!currentWeek || currentWeek.week_start !== weekKey) {
      currentWeek = {
        week_start: weekKey,
        tss: 0,
        atl: day.atl,
        ctl: day.ctl,
        tsb: day.tsb,
        days: 0,
        workout_days: 0
      };
      weeks.push(currentWeek);
    }

    currentWeek.tss += day.tss;
    currentWeek.days++;
    if (day.tss > 0) currentWeek.workout_days++;
    currentWeek.atl = day.atl; // Último valor de la semana
    currentWeek.ctl = day.ctl;
    currentWeek.tsb = day.tsb;
  });

  return weeks.map(w => ({
    ...w,
    tss: Math.round(w.tss),
    avg_tss: Math.round(w.tss / 7)
  }));
}

/**
 * Agrupa datos por mes para visualización
 * @param {Array} pmcData - Datos diarios
 * @returns {Array} Datos agrupados por mes
 */
function groupByMonth(pmcData) {
  if (!pmcData || pmcData.length === 0) return [];

  const months = {};

  pmcData.forEach(day => {
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!months[monthKey]) {
      months[monthKey] = {
        month: monthKey,
        tss: 0,
        days: 0,
        workout_days: 0,
        atl_end: day.atl,
        ctl_end: day.ctl,
        tsb_end: day.tsb
      };
    }

    months[monthKey].tss += day.tss;
    months[monthKey].days++;
    if (day.tss > 0) months[monthKey].workout_days++;
    months[monthKey].atl_end = day.atl;
    months[monthKey].ctl_end = day.ctl;
    months[monthKey].tsb_end = day.tsb;
  });

  return Object.values(months).map(m => ({
    ...m,
    tss: Math.round(m.tss),
    avg_tss: Math.round(m.tss / m.days)
  }));
}

module.exports = {
  calculatePMC,
  getWeeklySummary,
  getMonthlySummary,
  getFitnessStatus,
  groupByWeek,
  groupByMonth
};
