/**
 * 🏆 GAMIFICATION SYSTEM
 * Achievement/badge system for training motivation
 * Scientific achievements based on performance metrics
 */

/**
 * Define all available achievements
 */
const ACHIEVEMENTS = {
  // POWER ACHIEVEMENTS
  'ftp_milestone_250': {
    id: 'ftp_milestone_250',
    name: 'Club 250W',
    description: 'Alcanza 250W de FTP',
    category: 'power',
    tier: 'bronze',
    icon: '⚡',
    requirement: { metric: 'ftp', value: 250 }
  },
  'ftp_milestone_300': {
    id: 'ftp_milestone_300',
    name: 'Club 300W',
    description: 'Alcanza 300W de FTP',
    category: 'power',
    tier: 'silver',
    icon: '⚡⚡',
    requirement: { metric: 'ftp', value: 300 }
  },
  'ftp_milestone_350': {
    id: 'ftp_milestone_350',
    name: 'Club 350W',
    description: 'Alcanza 350W de FTP',
    category: 'power',
    tier: 'gold',
    icon: '⚡⚡⚡',
    requirement: { metric: 'ftp', value: 350 }
  },
  'wkg_4': {
    id: 'wkg_4',
    name: 'Escalador Amateur',
    description: '4.0 W/kg durante 20 minutos',
    category: 'power',
    tier: 'bronze',
    icon: '🏔️',
    requirement: { metric: 'wkg_20min', value: 4.0 }
  },
  'wkg_45': {
    id: 'wkg_45',
    name: 'Escalador Avanzado',
    description: '4.5 W/kg durante 20 minutos',
    category: 'power',
    tier: 'silver',
    icon: '⛰️',
    requirement: { metric: 'wkg_20min', value: 4.5 }
  },
  'wkg_5': {
    id: 'wkg_5',
    name: 'Escalador Elite',
    description: '5.0 W/kg durante 20 minutos - nivel profesional',
    category: 'power',
    tier: 'gold',
    icon: '🗻',
    requirement: { metric: 'wkg_20min', value: 5.0 }
  },

  // VOLUME ACHIEVEMENTS
  'distance_1000': {
    id: 'distance_1000',
    name: 'Primer Milenio',
    description: '1,000 km acumulados',
    category: 'volume',
    tier: 'bronze',
    icon: '🚴',
    requirement: { metric: 'total_distance', value: 1000000 }
  },
  'distance_5000': {
    id: 'distance_5000',
    name: 'Vuelta a Europa',
    description: '5,000 km acumulados',
    category: 'volume',
    tier: 'silver',
    icon: '🌍',
    requirement: { metric: 'total_distance', value: 5000000 }
  },
  'distance_10000': {
    id: 'distance_10000',
    name: 'La Vuelta al Mundo',
    description: '10,000 km acumulados',
    category: 'volume',
    tier: 'gold',
    icon: '🌎',
    requirement: { metric: 'total_distance', value: 10000000 }
  },
  'elevation_10k': {
    id: 'elevation_10k',
    name: 'Everest Virtual',
    description: '10,000m de desnivel acumulado',
    category: 'volume',
    tier: 'bronze',
    icon: '🏔️',
    requirement: { metric: 'total_elevation', value: 10000 }
  },
  'elevation_50k': {
    id: 'elevation_50k',
    name: 'Cinco Everests',
    description: '50,000m de desnivel acumulado',
    category: 'volume',
    tier: 'silver',
    icon: '⛰️⛰️',
    requirement: { metric: 'total_elevation', value: 50000 }
  },
  'elevation_100k': {
    id: 'elevation_100k',
    name: 'Señor de las Montañas',
    description: '100,000m de desnivel acumulado',
    category: 'volume',
    tier: 'gold',
    icon: '👑',
    requirement: { metric: 'total_elevation', value: 100000 }
  },

  // CONSISTENCY ACHIEVEMENTS
  'streak_7': {
    id: 'streak_7',
    name: 'Semana Completa',
    description: '7 días consecutivos entrenando',
    category: 'consistency',
    tier: 'bronze',
    icon: '📅',
    requirement: { metric: 'streak_days', value: 7 }
  },
  'streak_30': {
    id: 'streak_30',
    name: 'Mes Ininterrumpido',
    description: '30 días consecutivos entrenando',
    category: 'consistency',
    tier: 'silver',
    icon: '🔥',
    requirement: { metric: 'streak_days', value: 30 }
  },
  'streak_100': {
    id: 'streak_100',
    name: 'Centurión de la Constancia',
    description: '100 días consecutivos entrenando',
    category: 'consistency',
    tier: 'gold',
    icon: '🔥🔥🔥',
    requirement: { metric: 'streak_days', value: 100 }
  },

  // TSS / FITNESS ACHIEVEMENTS
  'tss_weekly_500': {
    id: 'tss_weekly_500',
    name: 'Carga Alta',
    description: '500 TSS en una semana',
    category: 'fitness',
    tier: 'bronze',
    icon: '💪',
    requirement: { metric: 'tss_weekly', value: 500 }
  },
  'tss_weekly_750': {
    id: 'tss_weekly_750',
    name: 'Carga Elite',
    description: '750 TSS en una semana',
    category: 'fitness',
    tier: 'silver',
    icon: '💪💪',
    requirement: { metric: 'tss_weekly', value: 750 }
  },
  'ctl_70': {
    id: 'ctl_70',
    name: 'Forma Sólida',
    description: 'CTL superior a 70',
    category: 'fitness',
    tier: 'silver',
    icon: '📈',
    requirement: { metric: 'ctl', value: 70 }
  },
  'ctl_100': {
    id: 'ctl_100',
    name: 'Forma Profesional',
    description: 'CTL superior a 100',
    category: 'fitness',
    tier: 'gold',
    icon: '📈📈',
    requirement: { metric: 'ctl', value: 100 }
  },

  // SPECIAL ACHIEVEMENTS
  'century_ride': {
    id: 'century_ride',
    name: 'Century Rider',
    description: 'Completa 100km en una sola salida',
    category: 'special',
    tier: 'bronze',
    icon: '💯',
    requirement: { metric: 'single_ride_distance', value: 100000 }
  },
  'double_century': {
    id: 'double_century',
    name: 'Double Century',
    description: 'Completa 200km en una sola salida',
    category: 'special',
    tier: 'gold',
    icon: '💯💯',
    requirement: { metric: 'single_ride_distance', value: 200000 }
  },
  'long_ride_5h': {
    id: 'long_ride_5h',
    name: 'Resistencia Extrema',
    description: '5 horas en movimiento',
    category: 'special',
    tier: 'silver',
    icon: '⏱️',
    requirement: { metric: 'single_ride_duration', value: 18000 }
  },
  'sprint_1000w': {
    id: 'sprint_1000w',
    name: 'Sprinter del Kilo',
    description: '1000W de potencia máxima',
    category: 'special',
    tier: 'gold',
    icon: '🚀',
    requirement: { metric: 'max_power', value: 1000 }
  },

  // PERFORMANCE ACHIEVEMENTS
  'vi_perfect': {
    id: 'vi_perfect',
    name: 'Pacing Perfecto',
    description: 'VI < 1.03 en salida larga (>2h)',
    category: 'performance',
    tier: 'silver',
    icon: '🎯',
    requirement: { metric: 'vi_perfect', condition: 'custom' }
  },
  'negative_split': {
    id: 'negative_split',
    name: 'Maestro del Negative Split',
    description: 'Termina más fuerte que empiezas (3 veces)',
    category: 'performance',
    tier: 'bronze',
    icon: '⚖️',
    requirement: { metric: 'negative_splits', value: 3 }
  },
  'pr_5_durations': {
    id: 'pr_5_durations',
    name: 'Récords Múltiples',
    description: 'Establece 5 récords de potencia en una salida',
    category: 'performance',
    tier: 'gold',
    icon: '🏅',
    requirement: { metric: 'prs_in_one_ride', value: 5 }
  }
};

/**
 * Check which achievements an athlete has unlocked
 * @param {Object} athleteStats - Comprehensive stats
 * @param {Array} activities - Activities for custom checks
 * @returns {Object}
 */
function checkAchievements(athleteStats, activities = []) {
  const unlocked = [];
  const locked = [];
  const progress = [];

  for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
    const status = checkSingleAchievement(achievement, athleteStats, activities);

    if (status.unlocked) {
      unlocked.push({
        ...achievement,
        unlockedAt: status.unlockedAt
      });
    } else {
      locked.push(achievement);
      if (status.progress) {
        progress.push({
          achievement,
          current: status.current,
          required: status.required,
          percentage: Math.min(100, Math.round((status.current / status.required) * 100))
        });
      }
    }
  }

  return {
    unlocked: unlocked.sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt)),
    locked,
    progress: progress.sort((a, b) => b.percentage - a.percentage),
    stats: {
      total: Object.keys(ACHIEVEMENTS).length,
      unlocked: unlocked.length,
      completionRate: ((unlocked.length / Object.keys(ACHIEVEMENTS).length) * 100).toFixed(1)
    }
  };
}

/**
 * Check a single achievement
 */
function checkSingleAchievement(achievement, athleteStats, activities) {
  const { metric, value, condition } = achievement.requirement;

  // Custom conditions
  if (condition === 'custom') {
    return checkCustomAchievement(achievement.id, athleteStats, activities);
  }

  // Standard metric checks
  const currentValue = athleteStats[metric] || 0;

  if (currentValue >= value) {
    return {
      unlocked: true,
      unlockedAt: athleteStats[`${metric}_date`] || new Date().toISOString(),
      current: currentValue,
      required: value
    };
  }

  return {
    unlocked: false,
    progress: true,
    current: currentValue,
    required: value
  };
}

/**
 * Custom achievement checks
 */
function checkCustomAchievement(achievementId, athleteStats, activities) {
  switch (achievementId) {
    case 'vi_perfect':
      const perfectPacing = activities.filter(a => 
        a.moving_time > 7200 && a.vi && a.vi < 1.03
      ).length;
      return {
        unlocked: perfectPacing > 0,
        unlockedAt: perfectPacing > 0 ? activities[0]?.start_date : null
      };

    case 'negative_split':
      const negativeSplits = activities.filter(a => a.pacing_strategy === 'negative_split').length;
      return {
        unlocked: negativeSplits >= 3,
        current: negativeSplits,
        required: 3,
        progress: true
      };

    case 'pr_5_durations':
      const multiPRs = activities.filter(a => 
        a.records && a.records.filter(r => r.isNewRecord).length >= 5
      ).length;
      return {
        unlocked: multiPRs > 0,
        unlockedAt: multiPRs > 0 ? activities[0]?.start_date : null
      };

    default:
      return { unlocked: false };
  }
}

/**
 * Calculate comprehensive athlete stats for achievements
 * @param {Array} activities - All athlete activities
 * @param {Object} profile - Athlete profile
 * @param {Object} powerCurve - Power curve data
 * @returns {Object}
 */
function calculateAthleteStats(activities, profile, powerCurve) {
  const stats = {
    ftp: profile?.ftp || 0,
    wkg_20min: 0,
    total_distance: 0,
    total_elevation: 0,
    streak_days: 0,
    tss_weekly: 0,
    ctl: 0,
    single_ride_distance: 0,
    single_ride_duration: 0,
    max_power: 0,
    negative_splits: 0,
    prs_in_one_ride: 0
  };

  // Total distance and elevation
  activities.forEach(a => {
    stats.total_distance += a.distance || 0;
    stats.total_elevation += a.total_elevation_gain || 0;
    stats.single_ride_distance = Math.max(stats.single_ride_distance, a.distance || 0);
    stats.single_ride_duration = Math.max(stats.single_ride_duration, a.moving_time || 0);
    stats.max_power = Math.max(stats.max_power, a.max_watts || 0);
  });

  // W/kg from power curve
  if (powerCurve && powerCurve['1200'] && profile?.weight) {
    stats.wkg_20min = powerCurve['1200'] / profile.weight;
  }

  // Current streak
  stats.streak_days = calculateCurrentStreak(activities);

  // Weekly TSS (last 7 days)
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  stats.tss_weekly = activities
    .filter(a => new Date(a.start_date).getTime() > weekAgo)
    .reduce((sum, a) => sum + (a.tss || 0), 0);

  // Current CTL
  stats.ctl = profile?.current_ctl || 0;

  return stats;
}

/**
 * Calculate current training streak
 */
function calculateCurrentStreak(activities) {
  if (activities.length === 0) return 0;

  const sorted = [...activities].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const activity of sorted) {
    const activityDate = new Date(activity.start_date);
    activityDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((currentDate - activityDate) / (1000 * 60 * 60 * 24));

    if (daysDiff === streak) {
      streak++;
      currentDate = activityDate;
    } else if (daysDiff > streak) {
      break;
    }
  }

  return streak;
}

/**
 * Get newly unlocked achievements from an activity
 * @param {Object} activity - New activity
 * @param {Object} oldStats - Stats before activity
 * @param {Object} newStats - Stats after activity
 * @returns {Array} Newly unlocked achievements
 */
function detectNewAchievements(activity, oldStats, newStats) {
  const oldCheck = checkAchievements(oldStats, []);
  const newCheck = checkAchievements(newStats, [activity]);

  const oldIds = new Set(oldCheck.unlocked.map(a => a.id));
  const newlyUnlocked = newCheck.unlocked.filter(a => !oldIds.has(a.id));

  return newlyUnlocked;
}

/**
 * Get achievement leaderboard by category
 */
function getLeaderboard(category = null) {
  const filtered = category
    ? Object.values(ACHIEVEMENTS).filter(a => a.category === category)
    : Object.values(ACHIEVEMENTS);

  const byTier = {
    gold: filtered.filter(a => a.tier === 'gold').length,
    silver: filtered.filter(a => a.tier === 'silver').length,
    bronze: filtered.filter(a => a.tier === 'bronze').length
  };

  return {
    category: category || 'all',
    totalAchievements: filtered.length,
    byTier,
    achievements: filtered
  };
}

module.exports = {
  ACHIEVEMENTS,
  checkAchievements,
  calculateAthleteStats,
  detectNewAchievements,
  getLeaderboard
};
