// routes/farmRoutes.js
const express = require('express');
const db = require('../db'); // This imports the database connection pool
const router = express.Router();

// Route to get the farm details (e.g., coins)
router.get('/', async (req, res) => {
  const userId = req.query.discord_id;  // We are using discord_id as a query param here
  try {
    const result = await db.query('SELECT coins FROM users WHERE discord_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;