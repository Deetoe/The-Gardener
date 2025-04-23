// Database utility for bot commands
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Export the query method directly
module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
};