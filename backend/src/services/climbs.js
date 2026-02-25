/**
 * 🏔️ FAMOUS CLIMBS SIMULATOR
 * Simulate performance on iconic climbs based on athlete's power profile
 */

const FAMOUS_CLIMBS = {
  'alpe-dhuez': {
    name: "Alpe d'Huez",
    country: 'France',
    distance: 13800, // meters
    elevationGain: 1120, // meters
    avgGradient: 8.1,
    maxGradient: 13,
    proRecord: {
      name: 'Marco Pantani',
      year: 1997,
      time: 2263, // seconds (37:35)
      avgWatts: 371,
      wPerKg: 6.7
    }
  },
  'mount-ventoux': {
    name: 'Mont Ventoux (Bédoin)',
    country: 'France',
    distance: 21500,
    elevationGain: 1617,
    avgGradient: 7.5,
    maxGradient: 12,
    proRecord: {
      name: 'Iban Mayo',
      year: 2004,
      time: 3360, // 56:00
      avgWatts: 410,
      wPerKg: 6.6
    }
  },
  'angliru': {
    name: 'Alto del Angliru',
    country: 'Spain',
    distance: 12500,
    elevationGain: 1266,
    avgGradient: 10.1,
    maxGradient: 23.5,
    proRecord: {
      name: 'Alberto Contador',
      year: 2017,
      time: 2640, // 44:00
      avgWatts: 380,
      wPerKg: 6.25
    }
  },
  'mortirolo': {
    name: 'Passo Mortirolo (Mazzo)',
    country: 'Italy',
    distance: 12400,
    elevationGain: 1300,
    avgGradient: 10.5,
    maxGradient: 18,
    proRecord: {
      name: 'Marco Pantani',
      year: 1994,
      time: 2388, // 39:48
      avgWatts: 385,
      wPerKg: 6.9
    }
  },
  'tourmalet': {
    name: 'Col du Tourmalet (Sainte-Marie-de-Campan)',
    country: 'France',
    distance: 17200,
    elevationGain: 1268,
    avgGradient: 7.4,
    maxGradient: 13,
    proRecord: {
      name: 'Andy Schleck',
      year: 2010,
      time: 2880, // 48:00
      avgWatts: 405,
      wPerKg: 6.4
    }
  },
  'zoncolan': {
    name: 'Monte Zoncolan (Ovaro)',
    country: 'Italy',
    distance: 10500,
    elevationGain: 1210,
    avgGradient: 11.5,
    maxGradient: 22,
    proRecord: {
      name: 'Gilberto Simoni',
      year: 2003,
      time: 2340, // 39:00
      avgWatts: 380,
      wPerKg: 6.8
    }
  },
  'stelvio': {
    name: 'Passo dello Stelvio (Prato)',
    country: 'Italy',
    distance: 24300,
    elevationGain: 1533,
    avgGradient: 6.3,
    maxGradient: 14,
    proRecord: {
      name: 'Fausto Coppi',
      year: 1953,
      time: 3900, // 65:00 (estimation)
      avgWatts: 360,
      wPerKg: 5.9
    }
  },
  'peyresourde': {
    name: 'Col de Peyresourde',
    country: 'France',
    distance: 13200,
    elevationGain: 980,
    avgGradient: 7.4,
    maxGradient: 10.5,
    proRecord: {
      name: 'Thibaut Pinot',
      year: 2012,
      time: 2220, // 37:00
      avgWatts: 395,
      wPerKg: 6.3
    }
  }
};

/**
 * Calculate estimated time for a climb given athlete's power
 * Uses simplified physics: Power = (m*g*h/t) + air resistance
 * @param {Object} climb - Climb data
 * @param {number} avgPower - Sustained watts
 * @param {number} weight - Athlete + bike weight (kg)
 * @returns {Object}
 */
function simulateClimbTime(climb, avgPower, weight) {
  const totalWeight = weight + 8; // +8kg bike estimate
  const g = 9.81; // gravity
  const verticalSpeed = avgPower / (totalWeight * g); // m/s vertical
  
  // Estimate air resistance (simplified)
  const speed = verticalSpeed / (climb.avgGradient / 100); // m/s actual speed
  const airDrag = 0.3 * Math.pow(speed, 2); // Simplified drag force
  
  // Effective power after drag
  const effectivePower = avgPower - airDrag;
  const effectiveVerticalSpeed = effectivePower > 0 ? effectivePower / (totalWeight * g) : 0;
  
  // Time to climb
  const timeSeconds = effectiveVerticalSpeed > 0 ? climb.elevationGain / effectiveVerticalSpeed : Infinity;
  
  return {
    time: Math.round(timeSeconds),
    timeFormatted: formatTime(timeSeconds),
    speed: (climb.distance / timeSeconds * 3.6).toFixed(1), // km/h
    wPerKg: (avgPower / weight).toFixed(2)
  };
}

function formatTime(seconds) {
  if (!isFinite(seconds)) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Simulate climb based on athlete's FTP or CP
 * @param {string} climbId - Climb identifier
 * @param {number} sustainedPower - Power athlete can sustain (typically FTP or lower)
 * @param {number} weight - Athlete weight in kg
 * @returns {Object}
 */
function simulateClimb(climbId, sustainedPower, weight) {
  const climb = FAMOUS_CLIMBS[climbId];
  
  if (!climb) {
    return { error: 'Unknown climb', availableClimbs: Object.keys(FAMOUS_CLIMBS) };
  }
  
  const simulation = simulateClimbTime(climb, sustainedPower, weight);
  const proTime = climb.proRecord.time;
  const timeDiff = simulation.time - proTime;
  const percentDiff = ((timeDiff / proTime) * 100).toFixed(1);
  
  return {
    climb: {
      name: climb.name,
      country: climb.country,
      distance: climb.distance,
      elevationGain: climb.elevationGain,
      avgGradient: climb.avgGradient
    },
    simulation,
    proRecord: {
      ...climb.proRecord,
      timeFormatted: formatTime(proTime)
    },
    comparison: {
      timeDifference: Math.round(timeDiff),
      timeDifferenceFormatted: formatTime(Math.abs(timeDiff)),
      percentSlower: percentDiff > 0 ? percentDiff : null,
      percentFaster: percentDiff < 0 ? Math.abs(percentDiff) : null
    }
  };
}

/**
 * Find best matching climb for athlete's profile
 * @param {Object} athleteProfile - { ftp, weight, preferredGradient }
 * @returns {Array} Recommended climbs
 */
function recommendClimbs(athleteProfile) {
  const { ftp, weight, preferredGradient } = athleteProfile;
  const wPerKg = ftp / weight;
  
  const recommendations = Object.entries(FAMOUS_CLIMBS).map(([id, climb]) => {
    const sim = simulateClimbTime(climb, ftp, weight);
    const proTime = climb.proRecord.time;
    const competitive = sim.time < proTime * 1.5; // Within 50% of pro time
    
    // Score based on gradient match
    const gradientScore = preferredGradient
      ? 100 - Math.abs(climb.avgGradient - preferredGradient) * 5
      : 100;
    
    return {
      id,
      name: climb.name,
      country: climb.country,
      estimatedTime: sim.timeFormatted,
      difficulty: categorizeClimbDifficulty(climb, wPerKg),
      competitive,
      score: gradientScore,
      gradient: climb.avgGradient
    };
  });
  
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function categorizeClimbDifficulty(climb, athleteWkg) {
  // Based on required W/kg for reasonable time
  const requiredWkg = climb.proRecord.wPerKg * 0.7; // 70% of pro level
  
  if (athleteWkg >= requiredWkg * 1.2) return 'easy';
  if (athleteWkg >= requiredWkg) return 'moderate';
  if (athleteWkg >= requiredWkg * 0.8) return 'hard';
  return 'very_hard';
}

/**
 * Get all available climbs
 */
function getAllClimbs() {
  return Object.entries(FAMOUS_CLIMBS).map(([id, climb]) => ({
    id,
    name: climb.name,
    country: climb.country,
    distance: (climb.distance / 1000).toFixed(1) + ' km',
    elevationGain: climb.elevationGain + ' m',
    avgGradient: climb.avgGradient + '%',
    proRecord: {
      rider: climb.proRecord.name,
      time: formatTime(climb.proRecord.time),
      wPerKg: climb.proRecord.wPerKg
    }
  }));
}

module.exports = {
  simulateClimb,
  recommendClimbs,
  getAllClimbs,
  FAMOUS_CLIMBS
};
