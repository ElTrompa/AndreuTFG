// Migration script to ensure all tables exist
require('dotenv').config();
const { getPool } = require('../src/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
  console.log('Running database migrations...');
  
  try {
    const pool = await getPool();
    
    // Read schema.sql
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolons and execute each CREATE TABLE statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await pool.query(statement);
        const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
        if (tableName) {
          console.log(`✓ Table ${tableName} ready`);
        }
      } catch (err) {
        console.error('Error executing statement:', statement.substring(0, 50) + '...', err.message);
      }
    }
    
    console.log('✓ Migrations completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
