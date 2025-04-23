const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  console.log('Running database migration...');
  
  try {
    // Read the migration SQL
    const sqlPath = path.join(__dirname, 'add_auth_columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const result = await pool.query(sql);
    
    // Check the results
    if (result.length > 0 && result[1].rows.length > 0) {
      console.log('Migration successful! Added columns:');
      result[1].rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('Migration completed, but couldn\'t verify the columns. Please check your database manually.');
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the migration
runMigration();