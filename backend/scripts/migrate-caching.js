#!/usr/bin/env node

/**
 * Migration Script: Add caching tables for API optimization
 * Run this once to create the new caching tables
 */

const { getPool } = require('../src/db');

const migrations = [
  {
    name: 'Create activities_cache table',
    sql: `CREATE TABLE IF NOT EXISTS activities_cache (
      id INT AUTO_INCREMENT PRIMARY KEY,
      athlete_id BIGINT NOT NULL,
      activity_id BIGINT NOT NULL,
      activity_name VARCHAR(255),
      activity_date DATETIME,
      elapsed_time INT,
      distance DECIMAL(10,2),
      type VARCHAR(50),
      segment_efforts_data LONGTEXT,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_activity (athlete_id, activity_id),
      INDEX (athlete_id, updated_at),
      INDEX (cached_at)
    )`
  },
  {
    name: 'Create achievements_cache table',
    sql: `CREATE TABLE IF NOT EXISTS achievements_cache (
      id INT AUTO_INCREMENT PRIMARY KEY,
      athlete_id BIGINT NOT NULL,
      koms LONGTEXT,
      top10 LONGTEXT,
      podios LONGTEXT,
      local_legends LONGTEXT,
      total_segments INT DEFAULT 0,
      days_range INT DEFAULT 180,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_achievements (athlete_id, days_range),
      INDEX (athlete_id, cached_at)
    )`
  },
  {
    name: 'Create api_sync_log table',
    sql: `CREATE TABLE IF NOT EXISTS api_sync_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      athlete_id BIGINT NOT NULL,
      endpoint VARCHAR(100),
      last_sync_timestamp INT,
      request_count INT DEFAULT 0,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_sync (athlete_id, endpoint),
      INDEX (athlete_id, endpoint)
    )`
  }
];

async function runMigrations() {
  console.log('🚀 Starting database migrations for API optimization...\n');
  
  let pool;
  try {
    pool = await getPool();
    
    for (const migration of migrations) {
      try {
        await pool.query(migration.sql);
        console.log(`✓ ${migration.name}`);
      } catch (error) {
        console.error(`✗ ${migration.name}`);
        console.error(`  Error:`, error);
        process.exit(1);
      }
    }
    
    console.log('\n✅ All migrations completed successfully!');
    console.log('\n📊 New tables created:');
    console.log('   - activities_cache: Store complete activity details with segment_efforts');
    console.log('   - achievements_cache: Store processed achievements (KOMs, top10, etc)');
    console.log('   - api_sync_log: Track last sync time for incremental updates');
    console.log('\n💡 You can now use the optimized endpoints:');
    console.log('   - GET /strava/achievements (with 24h caching)');
    console.log('   - POST /strava/cache/refresh (to clear cache)');
    console.log('   - GET /strava/cache/stats (to see cache statistics)');
    console.log('\nRestart your server and test with: npm start\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run migrations
runMigrations().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
