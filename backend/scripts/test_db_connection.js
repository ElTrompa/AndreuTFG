#!/usr/bin/env node
const path = require('path');
const dotenv = require('dotenv');

// Load .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  try {
    console.log('Testing database connection...');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_NAME:', process.env.DB_NAME);
    
    const { getPool } = require('../src/db');
    const pool = await getPool();
    
    console.log('\n✓ Database connection successful!');
    
    // Test query
    const [rows] = await pool.query('SELECT athlete_id FROM athletes LIMIT 5');
    console.log(`\nFound ${rows.length} athlete(s):`);
    rows.forEach(r => {
      console.log(`  - Athlete ID: ${r.athlete_id}`);
    });
    
    // Check power_curves table
    const [pcRows] = await pool.query('SELECT athlete_id, computed_at FROM power_curves');
    console.log(`\nPower curves computed: ${pcRows.length}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('\nFull error:', err);
    process.exit(1);
  }
}

main();
