/**
 * 🏘️ Towns model - Database operations for towns and activity-town relationships
 */

const { getPool } = require('../db');

/**
 * Find or create a town
 */
async function findOrCreateTown(townData) {
  const pool = await getPool();
  const { name, lat, lng, province, country } = townData;
  const normalizedProvince = province || '';
  const normalizedCountry = country || 'España';

  try {
    // Check if town exists
    const [rows] = await pool.query(
      'SELECT id FROM towns WHERE name = ? AND province = ? AND country = ?',
      [name, normalizedProvince, normalizedCountry]
    );

    if (rows.length > 0) {
      return rows[0].id;
    }

    // Create new town
    const [result] = await pool.query(
      'INSERT INTO towns (name, lat, lng, province, country) VALUES (?, ?, ?, ?, ?)',
      [name, lat, lng, province || null, normalizedCountry]
    );

    return result.insertId;
  } catch (err) {
    console.error('[Towns Model] Error finding/creating town:', err);
    throw err;
  }
}

/**
 * Link activity to towns
 */
async function linkActivityToTowns(athlete_id, activity_id, towns) {
  const pool = await getPool();

  try {
    for (const town of towns) {
      const town_id = await findOrCreateTown(town);

      // Calculate distance from activity center (simple estimate)
      const distance = 0; // TODO: calculate actual distance if needed

      await pool.query(
        `INSERT INTO activity_towns (athlete_id, activity_id, town_id, distance_from_center)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE distance_from_center = VALUES(distance_from_center)`,
        [athlete_id, activity_id, town_id, distance]
      );
    }
  } catch (err) {
    console.error('[Towns Model] Error linking activity to towns:', err);
    throw err;
  }
}

/**
 * Get towns for a specific activity
 */
async function getTownsForActivity(activity_id) {
  const pool = await getPool();

  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.name, t.lat, t.lng, t.province, t.country
       FROM towns t
       JOIN activity_towns at ON t.id = at.town_id
       WHERE at.activity_id = ?
       ORDER BY t.name`,
      [activity_id]
    );

    return rows;
  } catch (err) {
    console.error('[Towns Model] Error getting towns for activity:', err);
    throw err;
  }
}

/**
 * Get all activities in a specific town
 */
async function getActivitiesInTown(athlete_id, town_id) {
  const pool = await getPool();

  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT at.activity_id,
               COALESCE(ac.activity_name, CONCAT('Actividad ', at.activity_id)) as activity_name,
               COALESCE(ac.activity_date, at.created_at) as activity_date,
               COALESCE(ac.distance, 0) as distance,
               COALESCE(ac.elapsed_time, 0) as elapsed_time,
               COALESCE(ac.type, 'Activity') as type,
               CASE WHEN ac.activity_id IS NULL THEN 1 ELSE 0 END as cache_missing
       FROM activity_towns at
       LEFT JOIN activities_cache ac ON at.activity_id = ac.activity_id AND ac.athlete_id = at.athlete_id
       WHERE at.athlete_id = ? AND at.town_id = ?
       ORDER BY activity_date DESC`,
      [athlete_id, town_id]
    );

    return rows;
  } catch (err) {
    console.error('[Towns Model] Error getting activities in town:', err);
    throw err;
  }
}

function toMySQLDateTime(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function upsertActivityCache(athlete_id, activity) {
  const pool = await getPool();

  if (!activity || !activity.id) return;

  try {
    await pool.query(
      `INSERT INTO activities_cache (athlete_id, activity_id, activity_name, activity_date, elapsed_time, distance, type, segment_efforts_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       activity_name = VALUES(activity_name),
       activity_date = VALUES(activity_date),
       elapsed_time = VALUES(elapsed_time),
       distance = VALUES(distance),
       type = VALUES(type),
       updated_at = NOW()`,
      [
        athlete_id,
        activity.id,
        activity.name || `Actividad ${activity.id}`,
        toMySQLDateTime(activity.start_date || activity.activity_date),
        activity.elapsed_time || activity.moving_time || 0,
        activity.distance || 0,
        activity.type || 'Activity',
        null
      ]
    );
  } catch (err) {
    console.error('[Towns Model] Error upserting activity cache:', err);
  }
}

/**
 * Get all towns with activities for an athlete
 */
async function getTownsForAthlete(athlete_id) {
  const pool = await getPool();

  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT t.id, t.name, t.lat, t.lng, t.province, t.country,
               COUNT(DISTINCT at.activity_id) as activity_count
       FROM towns t
       JOIN activity_towns at ON t.id = at.town_id
       WHERE at.athlete_id = ?
       GROUP BY t.id
       ORDER BY activity_count DESC, t.name`,
      [athlete_id]
    );

    return rows;
  } catch (err) {
    console.error('[Towns Model] Error getting towns for athlete:', err);
    throw err;
  }
}

/**
 * Search towns by name
 */
async function searchTownsByName(athlete_id, searchTerm) {
  const pool = await getPool();

  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT t.id, t.name, t.lat, t.lng, t.province, t.country,
               COUNT(DISTINCT at.activity_id) as activity_count
       FROM towns t
       JOIN activity_towns at ON t.id = at.town_id
       WHERE at.athlete_id = ? AND t.name LIKE ?
       GROUP BY t.id
       ORDER BY activity_count DESC`,
      [athlete_id, `%${searchTerm}%`]
    );

    return rows;
  } catch (err) {
    console.error('[Towns Model] Error searching towns:', err);
    throw err;
  }
}

module.exports = {
  findOrCreateTown,
  linkActivityToTowns,
  getTownsForActivity,
  getActivitiesInTown,
  getTownsForAthlete,
  searchTownsByName,
  upsertActivityCache
};
