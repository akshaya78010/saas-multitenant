const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Starting database migrations...');
    
    // Read migration files in order
    // Try Docker path first (../database/migrations), then local path (../../database/migrations)
    let migrationsDir = path.join(__dirname, '../database/migrations');
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.join(__dirname, '../../database/migrations');
    }
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      try {
        // Try to execute the entire migration file
        await client.query(sql);
        console.log(`✓ Completed: ${file}`);
      } catch (error) {
        // If error is about existing objects (indexes, tables), try to execute statements individually
        if (error.code === '42P07' || error.message.includes('already exists')) {
          console.log(`  Some objects already exist, executing statements individually...`);
          
          // Split SQL into individual statements, handling comments and multi-line
          const statements = sql
            .replace(/--.*$/gm, '') // Remove single-line comments
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);
          
          for (const statement of statements) {
            try {
              if (statement.trim()) {
                await client.query(statement + ';');
              }
            } catch (stmtError) {
              // Ignore errors for existing indexes/tables
              if (stmtError.code === '42P07' || stmtError.message.includes('already exists')) {
                console.log(`  Skipped (already exists): ${statement.substring(0, 60).replace(/\s+/g, ' ')}...`);
              } else {
                console.error(`  Error in statement: ${stmtError.message}`);
                throw stmtError;
              }
            }
          }
          console.log(`✓ Completed: ${file} (with skipped existing objects)`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migrations finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = runMigrations;

