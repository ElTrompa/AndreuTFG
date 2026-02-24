/**
 * Advanced Analytics Service
 * Cálculos avanzados de rendimiento deportivo más allá de lo que Strava proporciona
 */

/**
 * 1️⃣ GASTO ENERGÉTICO AVANZADO
 */

/**
 * Calcula calorías metabólicas reales basadas en kJ y eficiencia mecánica
 * @param {number} kilojoules - Trabajo mecánico en kJ
 * @param {number} efficiency - Eficiencia mecánica (default 0.23)
 * @returns {number} Calorías metabólicas totales
 */
function calculateMetabolicCalories(kilojoules, efficiency = 0.23) {
  if (!kilojoules || kilojoules <= 0) return 0;
  return Math.round(kilojoules / efficiency);
}

/**
 * 2️⃣ SUSTRATO ENERGÉTICO (grasas vs carbohidratos)
 */

/**
 * Calcula intensidad basada en FC reserva (método Karvonen)
 * @param {number} avgHR - FC media de la actividad
 * @param {number} hrRest - FC en reposo
 * @param {number} hrMax - FC máxima
 * @returns {number} % intensidad (0-1)
 */
function calculateHRIntensity(avgHR, hrRest, hrMax) {
  if (!avgHR || !hrRest || !hrMax || hrMax <= hrRest) return 0;
  const reserve = hrMax - hrRest;
  return Math.max(0, Math.min(1, (avgHR - hrRest) / reserve));
}

/**
 * Calcula Intensity Factor (IF) basado en FTP
 * @param {number} normalizedPower - NP o weighted average watts
 * @param {number} ftp - Functional Threshold Power
 * @returns {number} IF (0-1+)
 */
function calculateIntensityFactor(normalizedPower, ftp) {
  if (!normalizedPower || !ftp || ftp <= 0) return 0;
  return normalizedPower / ftp;
}

/**
 * Estima % de grasas y carbohidratos basado en intensidad por FC
 * @param {number} hrIntensity - % intensidad HR (0-1)
 * @returns {{fatPercent: number, choPercent: number}}
 */
function estimateSubstrateByHR(hrIntensity) {
  // Tabla fisiológica aproximada
  const table = [
    { intensity: 0.50, fat: 70, cho: 30 },
    { intensity: 0.60, fat: 60, cho: 40 },
    { intensity: 0.70, fat: 45, cho: 55 },
    { intensity: 0.80, fat: 30, cho: 70 },
    { intensity: 0.90, fat: 10, cho: 90 },
    { intensity: 1.00, fat: 5, cho: 95 }
  ];

  // Interpolación lineal
  for (let i = 0; i < table.length - 1; i++) {
    if (hrIntensity <= table[i + 1].intensity) {
      const t1 = table[i];
      const t2 = table[i + 1];
      const ratio = (hrIntensity - t1.intensity) / (t2.intensity - t1.intensity);
      const fatPercent = t1.fat + ratio * (t2.fat - t1.fat);
      const choPercent = t1.cho + ratio * (t2.cho - t1.cho);
      return { fatPercent, choPercent };
    }
  }

  return { fatPercent: 5, choPercent: 95 }; // Por defecto alta intensidad
}

/**
 * Estima % de grasas y carbohidratos basado en IF (más preciso para ciclismo)
 * @param {number} intensityFactor - IF (NP/FTP)
 * @returns {{fatPercent: number, choPercent: number}}
 */
function estimateSubstrateByIF(intensityFactor) {
  // Tabla basada en % FTP
  const table = [
    { if: 0.50, fat: 70, cho: 30 },
    { if: 0.55, fat: 65, cho: 35 },
    { if: 0.65, fat: 50, cho: 50 },
    { if: 0.75, fat: 35, cho: 65 },
    { if: 0.85, fat: 20, cho: 80 },
    { if: 0.95, fat: 10, cho: 90 },
    { if: 1.05, fat: 5, cho: 95 }
  ];

  for (let i = 0; i < table.length - 1; i++) {
    if (intensityFactor <= table[i + 1].if) {
      const t1 = table[i];
      const t2 = table[i + 1];
      const ratio = (intensityFactor - t1.if) / (t2.if - t1.if);
      const fatPercent = t1.fat + ratio * (t2.fat - t1.fat);
      const choPercent = t1.cho + ratio * (t2.cho - t1.cho);
      return { fatPercent, choPercent };
    }
  }

  return { fatPercent: 5, choPercent: 95 };
}

/**
 * Calcula breakdown de calorías en grasas y carbohidratos
 * @param {number} totalCalories - Calorías totales
 * @param {number} fatPercent - % de grasas (0-100)
 * @param {number} choPercent - % de carbohidratos (0-100)
 * @returns {{fatCalories: number, choCalories: number, fatGrams: number, choGrams: number}}
 */
function calculateSubstrateBreakdown(totalCalories, fatPercent, choPercent) {
  const fatCalories = Math.round(totalCalories * fatPercent / 100);
  const choCalories = Math.round(totalCalories * choPercent / 100);
  const fatGrams = Math.round(fatCalories / 9); // 1g grasa = 9 kcal
  const choGrams = Math.round(choCalories / 4); // 1g CHO = 4 kcal

  return { fatCalories, choCalories, fatGrams, choGrams };
}

/**
 * 3️⃣ CARGA INTERNA (TRIMP y TSS)
 */

/**
 * Calcula TRIMP personalizado (Bannister)
 * @param {number} durationMinutes - Duración en minutos
 * @param {number} avgHR - FC media
 * @param {number} hrRest - FC reposo
 * @param {number} hrMax - FC máxima
 * @returns {number} TRIMP score
 */
function calculateTRIMP(durationMinutes, avgHR, hrRest, hrMax) {
  if (!durationMinutes || !avgHR || !hrRest || !hrMax || hrMax <= hrRest) return 0;
  const deltaHR = (avgHR - hrRest) / (hrMax - hrRest);
  const trimp = durationMinutes * deltaHR * 0.64 * Math.exp(1.92 * deltaHR);
  return Math.round(trimp);
}

/**
 * Calcula TSS (Training Stress Score)
 * @param {number} durationSeconds - Duración en segundos
 * @param {number} normalizedPower - NP
 * @param {number} intensityFactor - IF
 * @param {number} ftp - FTP
 * @returns {number} TSS score
 */
function calculateTSS(durationSeconds, normalizedPower, intensityFactor, ftp) {
  if (!durationSeconds || !normalizedPower || !intensityFactor || !ftp) return 0;
  const tss = (durationSeconds * normalizedPower * intensityFactor) / (ftp * 3600) * 100;
  return Math.round(tss);
}

/**
 * 4️⃣ CONSUMO DE OXÍGENO
 */

/**
 * Estima VO2 durante la sesión basado en potencia
 * @param {number} watts - Potencia promedio
 * @param {number} weightKg - Peso en kg
 * @returns {number} VO2 en ml/kg/min
 */
function estimateVO2FromPower(watts, weightKg) {
  if (!watts || !weightKg || weightKg <= 0) return 0;
  const vo2 = (10.8 * watts / weightKg) + 7;
  return Math.round(vo2 * 10) / 10;
}

/**
 * Calcula % de VO2max usado
 * @param {number} estimatedVO2 - VO2 estimado durante actividad
 * @param {number} vo2max - VO2max del atleta
 * @returns {number} % VO2max
 */
function calculateVO2Percentage(estimatedVO2, vo2max) {
  if (!estimatedVO2 || !vo2max || vo2max <= 0) return 0;
  return Math.round((estimatedVO2 / vo2max) * 100);
}

/**
 * 5️⃣ EFICIENCIA AERÓBICA
 */

/**
 * Calcula Efficiency Factor
 * @param {number} normalizedPower - NP
 * @param {number} avgHR - FC media
 * @returns {number} EF
 */
function calculateEfficiencyFactor(normalizedPower, avgHR) {
  if (!normalizedPower || !avgHR || avgHR <= 0) return 0;
  return Math.round((normalizedPower / avgHR) * 100) / 100;
}

/**
 * Calcula Aerobic Decoupling
 * @param {Array} powerStream - Stream de potencia
 * @param {Array} hrStream - Stream de HR
 * @returns {{firstHalfEF: number, secondHalfEF: number, decoupling: number}}
 */
function calculateAerobicDecoupling(powerStream, hrStream) {
  if (!powerStream || !hrStream || powerStream.length < 10 || hrStream.length < 10) {
    return { firstHalfEF: 0, secondHalfEF: 0, decoupling: 0 };
  }

  const mid = Math.floor(powerStream.length / 2);
  
  // Primera mitad
  const firstPower = powerStream.slice(0, mid);
  const firstHR = hrStream.slice(0, mid);
  const avgPowerFirst = firstPower.reduce((a, b) => a + b, 0) / firstPower.length;
  const avgHRFirst = firstHR.reduce((a, b) => a + b, 0) / firstHR.length;
  const firstHalfEF = avgHRFirst > 0 ? avgPowerFirst / avgHRFirst : 0;

  // Segunda mitad
  const secondPower = powerStream.slice(mid);
  const secondHR = hrStream.slice(mid);
  const avgPowerSecond = secondPower.reduce((a, b) => a + b, 0) / secondPower.length;
  const avgHRSecond = secondHR.reduce((a, b) => a + b, 0) / secondHR.length;
  const secondHalfEF = avgHRSecond > 0 ? avgPowerSecond / avgHRSecond : 0;

  // Decoupling % (negativo = fatiga)
  const decoupling = firstHalfEF > 0 
    ? Math.round(((secondHalfEF - firstHalfEF) / firstHalfEF) * 100 * 10) / 10
    : 0;

  return {
    firstHalfEF: Math.round(firstHalfEF * 100) / 100,
    secondHalfEF: Math.round(secondHalfEF * 100) / 100,
    decoupling
  };
}

/**
 * 6️⃣ FATMAX
 */

/**
 * Estima si el entrenamiento estuvo en zona FatMax (60-65% VO2max)
 * @param {number} vo2Percentage - % VO2max usado
 * @returns {{inFatMaxZone: boolean, fatMaxOptimal: number}}
 */
function analyzeFatMax(vo2Percentage) {
  const inFatMaxZone = vo2Percentage >= 55 && vo2Percentage <= 70;
  const fatMaxOptimal = 62.5; // Punto óptimo típico
  return { inFatMaxZone, fatMaxOptimal };
}

/**
 * 7️⃣ MÉTRICAS RELATIVAS AL PESO
 */

/**
 * Calcula watts/kg
 * @param {number} watts - Potencia
 * @param {number} weightKg - Peso en kg
 * @returns {number} W/kg
 */
function calculateWattsPerKg(watts, weightKg) {
  if (!watts || !weightKg || weightKg <= 0) return 0;
  return Math.round((watts / weightKg) * 100) / 100;
}

/**
 * 8️⃣ ESTIMACIÓN DE CAPACIDAD GLUCOLÍTICA
 */

/**
 * Estima depleción de glucógeno muscular
 * @param {number} choGrams - Gramos de CHO consumidos
 * @param {number} weightKg - Peso del atleta
 * @returns {{depleted: number, muscleGlycogenPercent: number}}
 */
function estimateGlycogenDepletion(choGrams, weightKg) {
  // Glucógeno muscular típico: ~500g para 70kg
  const totalGlycogen = weightKg * 7.14; // ~500g para 70kg
  const depleted = Math.min(choGrams, totalGlycogen);
  const muscleGlycogenPercent = Math.round((depleted / totalGlycogen) * 100);

  return { depleted, muscleGlycogenPercent };
}

/**
 * 🔥 FUNCIÓN PRINCIPAL: Analítica completa de actividad
 */
function generateAdvancedAnalytics(activity, profile, streams = null) {
  const {
    moving_time,
    average_watts,
    weighted_average_watts,
    kilojoules,
    calories,
    average_heartrate,
    max_heartrate
  } = activity;

  const {
    weight_kg,
    ftp,
    hr_max,
    hr_rest,
    vo2max
  } = profile || {};

  const result = {
    basic: {
      duration_minutes: moving_time ? Math.round(moving_time / 60) : 0,
      avg_watts: average_watts || 0,
      normalized_power: weighted_average_watts || average_watts || 0,
      kilojoules: kilojoules || 0,
      strava_calories: calories || 0,
      avg_hr: average_heartrate || 0,
      max_hr: max_heartrate || 0
    },
    energy: {},
    substrate: {},
    load: {},
    oxygen: {},
    efficiency: {},
    fatMax: {},
    relative: {},
    glycogen: {}
  };

  // 1️⃣ ENERGÍA
  if (kilojoules) {
    result.energy.metabolic_calories = calculateMetabolicCalories(kilojoules, 0.23);
    result.energy.efficiency = 0.23;
  }

  // 2️⃣ SUSTRATO
  const np = weighted_average_watts || average_watts || 0;
  let fatPercent = 50;
  let choPercent = 50;

  if (ftp && np) {
    const intensityFactor = calculateIntensityFactor(np, ftp);
    result.substrate.intensity_factor = Math.round(intensityFactor * 100) / 100;
    const substrate = estimateSubstrateByIF(intensityFactor);
    fatPercent = substrate.fatPercent;
    choPercent = substrate.choPercent;
  } else if (hr_rest && hr_max && average_heartrate) {
    const hrIntensity = calculateHRIntensity(average_heartrate, hr_rest, hr_max);
    result.substrate.hr_intensity = Math.round(hrIntensity * 100);
    const substrate = estimateSubstrateByHR(hrIntensity);
    fatPercent = substrate.fatPercent;
    choPercent = substrate.choPercent;
  }

  const totalCals = result.energy.metabolic_calories || calories || 0;
  const breakdown = calculateSubstrateBreakdown(totalCals, fatPercent, choPercent);
  result.substrate = {
    ...result.substrate,
    fat_percent: Math.round(fatPercent),
    cho_percent: Math.round(choPercent),
    fat_calories: breakdown.fatCalories,
    cho_calories: breakdown.choCalories,
    fat_grams: breakdown.fatGrams,
    cho_grams: breakdown.choGrams
  };

  // 3️⃣ CARGA
  if (hr_rest && hr_max && average_heartrate && moving_time) {
    result.load.trimp = calculateTRIMP(moving_time / 60, average_heartrate, hr_rest, hr_max);
  }

  if (ftp && np && moving_time && result.substrate.intensity_factor) {
    result.load.tss = calculateTSS(moving_time, np, result.substrate.intensity_factor, ftp);
  }

  // 4️⃣ OXÍGENO
  if (average_watts && weight_kg) {
    const estimatedVO2 = estimateVO2FromPower(average_watts, weight_kg);
    result.oxygen.estimated_vo2 = estimatedVO2;
    
    if (vo2max) {
      result.oxygen.vo2max_percent = calculateVO2Percentage(estimatedVO2, vo2max);
    }
  }

  // 5️⃣ EFICIENCIA
  if (np && average_heartrate) {
    result.efficiency.efficiency_factor = calculateEfficiencyFactor(np, average_heartrate);
  }

  if (streams && streams.watts && streams.heartrate) {
    const decoupling = calculateAerobicDecoupling(streams.watts.data, streams.heartrate.data);
    result.efficiency.aerobic_decoupling = decoupling;
  }

  // 6️⃣ FATMAX
  if (result.oxygen.vo2max_percent) {
    result.fatMax = analyzeFatMax(result.oxygen.vo2max_percent);
  }

  // 7️⃣ RELATIVO
  if (weight_kg) {
    if (average_watts) {
      result.relative.avg_watts_per_kg = calculateWattsPerKg(average_watts, weight_kg);
    }
    if (np) {
      result.relative.np_watts_per_kg = calculateWattsPerKg(np, weight_kg);
    }
  }

  // 8️⃣ GLUCÓGENO
  if (breakdown.choGrams && weight_kg) {
    result.glycogen = estimateGlycogenDepletion(breakdown.choGrams, weight_kg);
  }

  return result;
}

module.exports = {
  // Funciones individuales exportadas
  calculateMetabolicCalories,
  calculateHRIntensity,
  calculateIntensityFactor,
  estimateSubstrateByHR,
  estimateSubstrateByIF,
  calculateSubstrateBreakdown,
  calculateTRIMP,
  calculateTSS,
  estimateVO2FromPower,
  calculateVO2Percentage,
  calculateEfficiencyFactor,
  calculateAerobicDecoupling,
  analyzeFatMax,
  calculateWattsPerKg,
  estimateGlycogenDepletion,
  
  // Función principal
  generateAdvancedAnalytics
};
