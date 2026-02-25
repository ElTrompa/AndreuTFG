/**
 * ⛰️ TERRAIN ANALYSIS SERVICE
 * Climb detection, gradient analysis, W/kg in ascents
 */

/**
 * Detect climbs from activity streams
 * @param {Array} altitudeData - Altitude in meters
 * @param {Array} distanceData - Distance in meters
 * @param {Object} options - { minGain: 50, minGradient: 3 }
 * @returns {Array} Climb segments
 */
function detectClimbs(altitudeData, distanceData, options = {}) {
  const { minGain = 50, minGradient = 3 } = options;

  if (!altitudeData || !distanceData || altitudeData.length < 10) {
    return [];
  }

  const climbs = [];
  let climbStart = null;
  let startAlt = null;
  let startDist = null;

  for (let i = 1; i < altitudeData.length; i++) {
    const altGain = altitudeData[i] - altitudeData[i - 1];
    const distGain = distanceData[i] - distanceData[i - 1];
    const gradient = distGain > 0 ? (altGain / distGain) * 100 : 0;

    if (gradient >= minGradient) {
      if (climbStart === null) {
        climbStart = i - 1;
        startAlt = altitudeData[i - 1];
        startDist = distanceData[i - 1];
      }
    } else {
      if (climbStart !== null) {
        const endAlt = altitudeData[i - 1];
        const endDist = distanceData[i - 1];
        const gain = endAlt - startAlt;
        const distance = endDist - startDist;
        const avgGradient = (gain / distance) * 100;

        if (gain >= minGain) {
          climbs.push({
            startIndex: climbStart,
            endIndex: i - 1,
            elevationGain: Math.round(gain),
            distance: Math.round(distance),
            avgGradient: avgGradient.toFixed(1),
            startElevation: Math.round(startAlt),
            endElevation: Math.round(endAlt)
          });
        }

        climbStart = null;
      }
    }
  }

  // Handle climb that goes to end of activity
  if (climbStart !== null) {
    const endAlt = altitudeData[altitudeData.length - 1];
    const endDist = distanceData[distanceData.length - 1];
    const gain = endAlt - startAlt;
    const distance = endDist - startDist;

    if (gain >= minGain) {
      climbs.push({
        startIndex: climbStart,
        endIndex: altitudeData.length - 1,
        elevationGain: Math.round(gain),
        distance: Math.round(distance),
        avgGradient: ((gain / distance) * 100).toFixed(1),
        startElevation: Math.round(startAlt),
        endElevation: Math.round(endAlt)
      });
    }
  }

  return climbs;
}

/**
 * Calculate W/kg for a climb segment
 * @param {Object} climb - Climb object from detectClimbs
 * @param {Array} powerData - Power in watts
 * @param {Array} timeData - Time in seconds
 * @param {number} weight - Athlete weight in kg
 * @returns {Object}
 */
function calculateClimbPower(climb, powerData, timeData, weight) {
  if (!climb || !powerData || !timeData || !weight) {
    return null;
  }

  const segment = powerData.slice(climb.startIndex, climb.endIndex + 1);
  const timeSegment = timeData.slice(climb.startIndex, climb.endIndex + 1);

  if (segment.length === 0) return null;

  const avgPower = segment.reduce((sum, p) => sum + p, 0) / segment.length;
  const maxPower = Math.max(...segment);
  const duration = timeSegment[timeSegment.length - 1] - timeSegment[0];
  const wPerKg = avgPower / weight;

  // Calculate VAM (Vertical Ascent in Meters per hour)
  const vam = (climb.elevationGain / (duration / 3600)).toFixed(0);

  return {
    avgPower: Math.round(avgPower),
    maxPower: Math.round(maxPower),
    wPerKg: wPerKg.toFixed(2),
    duration: Math.round(duration),
    durationLabel: formatDuration(duration),
    vam: parseInt(vam),
    category: categorizeClimb(climb.elevationGain, climb.distance, parseFloat(climb.avgGradient))
  };
}

/**
 * Categorize climb difficulty
 */
function categorizeClimb(gain, distance, gradient) {
  const score = gain * gradient / 10; // Simple difficulty score

  if (score > 8000 || gain > 1500) return 'HC'; // Hors Catégorie
  if (score > 4000 || gain > 1000) return '1';
  if (score > 2000 || gain > 500) return '2';
  if (score > 1000 || gain > 300) return '3';
  return '4';
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Analyze all climbs in an activity
 * @param {Object} streams - altitude, distance, watts, time
 * @param {number} weight - Athlete weight in kg
 * @returns {Object}
 */
function analyzeActivityTerrain(streams, weight) {
  if (!streams || !streams.altitude || !streams.distance) {
    return { climbs: [], summary: null };
  }

  const climbs = detectClimbs(streams.altitude.data, streams.distance.data);

  const climbsWithPower = climbs.map((climb, idx) => {
    const powerStats = streams.watts && weight
      ? calculateClimbPower(climb, streams.watts.data, streams.time.data, weight)
      : null;

    return {
      id: idx + 1,
      ...climb,
      power: powerStats
    };
  });

  const totalGain = climbsWithPower.reduce((sum, c) => sum + c.elevationGain, 0);
  const totalDistance = climbsWithPower.reduce((sum, c) => sum + c.distance, 0);
  const avgGradient = totalDistance > 0 ? ((totalGain / totalDistance) * 100).toFixed(1) : 0;

  const hcClimbs = climbsWithPower.filter(c => c.power?.category === 'HC').length;
  const cat1Climbs = climbsWithPower.filter(c => c.power?.category === '1').length;

  return {
    climbs: climbsWithPower,
    summary: {
      totalClimbs: climbsWithPower.length,
      totalElevationGain: totalGain,
      totalClimbingDistance: Math.round(totalDistance),
      avgGradient: parseFloat(avgGradient),
      categorization: {
        HC: hcClimbs,
        Cat1: cat1Climbs,
        Other: climbsWithPower.length - hcClimbs - cat1Climbs
      }
    }
  };
}

/**
 * Compare climb performance to personal bests
 * @param {Object} currentClimb - Today's climb with power
 * @param {Array} historicalClimbs - Past climbs with similar characteristics
 * @returns {Object}
 */
function compareClimbPerformance(currentClimb, historicalClimbs) {
  if (!currentClimb.power || !historicalClimbs || historicalClimbs.length === 0) {
    return { status: 'insufficient_data' };
  }

  // Filter similar climbs (±10% gain and distance)
  const similar = historicalClimbs.filter(h => {
    const gainDiff = Math.abs(h.elevationGain - currentClimb.elevationGain) / currentClimb.elevationGain;
    const distDiff = Math.abs(h.distance - currentClimb.distance) / currentClimb.distance;
    return gainDiff < 0.1 && distDiff < 0.1;
  });

  if (similar.length === 0) {
    return { status: 'no_similar_climbs' };
  }

  const bestWattsPerKg = Math.max(...similar.map(c => parseFloat(c.power?.wPerKg || 0)));
  const avgWattsPerKg = similar.reduce((sum, c) => sum + parseFloat(c.power?.wPerKg || 0), 0) / similar.length;

  const currentWkg = parseFloat(currentClimb.power.wPerKg);
  const vsAvg = ((currentWkg - avgWattsPerKg) / avgWattsPerKg) * 100;
  const vsBest = ((currentWkg - bestWattsPerKg) / bestWattsPerKg) * 100;

  let status;
  if (currentWkg >= bestWattsPerKg) status = 'personal_best';
  else if (vsAvg > 5) status = 'above_average';
  else if (vsAvg > -5) status = 'average';
  else status = 'below_average';

  return {
    status,
    currentWkg,
    bestWkg: bestWattsPerKg.toFixed(2),
    avgWkg: avgWattsPerKg.toFixed(2),
    vsAvg: vsAvg.toFixed(1),
    vsBest: vsBest.toFixed(1),
    attempts: similar.length
  };
}

module.exports = {
  detectClimbs,
  calculateClimbPower,
  analyzeActivityTerrain,
  compareClimbPerformance,
  categorizeClimb
};
