// bot/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Set up the PostgreSQL connection pool (same connection settings as server)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // The connection string from .env
});

// Export the pool for use in the bot commands
module.exports = pool;