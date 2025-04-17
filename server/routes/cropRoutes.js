// routes/cropRoutes.js
const express = require('express');
const db = require('../db');
const router = express.Router();

// Route to get the crops of a user
router.get('/', async (req, res) => {
  const userId = req.query.discord_id;
  try {
    const result = await db.query('SELECT * FROM crops WHERE user_id = $1', [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;