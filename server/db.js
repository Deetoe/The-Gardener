const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Make sure connection string is properly defined
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not defined');
  process.exit(1);
}

// Log connection info (without password) for debugging
const dbInfo = new URL(connectionString);
console.log(`Connecting to PostgreSQL at ${dbInfo.hostname}:${dbInfo.port}${dbInfo.pathname} as ${dbInfo.username}`);

// Create the pool
const pool = new Pool({
  connectionString
});

// Test the connection
pool.query('SELECT NOW()')
  .then(() => console.log('PostgreSQL database connection established successfully'))
  .catch(err => {
    console.error('Failed to connect to PostgreSQL:', err.message);
    // Don't exit - let the server try to run anyway, just with DB functionality disabled
  });

module.exports = pool;