const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all businesses for a user
router.get('/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    
    // First get the user
    const userResult = await pool.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get all businesses
    const businessResult = await pool.query(
      'SELECT * FROM businesses WHERE user_id = $1 ORDER BY id',
      [user.id]
    );
    
    res.json(businessResult.rows);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Purchase a new business
router.post('/purchase', async (req, res) => {
  try {
    const { discordId, businessName, cost, incomePerHour } = req.body;
    
    if (!discordId || !businessName || !cost) {
      return res.status(400).json({ message: 'Discord ID, business name, and cost are required' });
    }
    
    // Get user
    const userResult = await pool.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Check if user has enough coins
    if (user.coins < cost) {
      return res.status(400).json({ message: 'Insufficient coins' });
    }
    
    await pool.query('BEGIN');
    try {
      // Deduct coins
      await pool.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [cost, user.id]);
      
      // Create business
      const newBusinessResult = await pool.query(
        'INSERT INTO businesses (user_id, business_name, income) VALUES ($1, $2, $3) RETURNING *',
        [user.id, businessName, incomePerHour || 0]
      );
      
      // Get updated coins
      const updatedUser = await pool.query('SELECT coins FROM users WHERE id = $1', [user.id]);
      
      await pool.query('COMMIT');
      
      res.json({
        message: 'Business purchased successfully',
        business: newBusinessResult.rows[0],
        coins: updatedUser.rows[0].coins
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error purchasing business:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Collect income from businesses
router.post('/collect-income', async (req, res) => {
  try {
    const { discordId, lastCollectedAt } = req.body;
    
    if (!discordId) {
      return res.status(400).json({ message: 'Discord ID is required' });
    }
    
    // Get user
    const userResult = await pool.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get all businesses
    const businessResult = await pool.query(
      'SELECT * FROM businesses WHERE user_id = $1',
      [user.id]
    );
    
    const businesses = businessResult.rows;
    
    if (businesses.length === 0) {
      return res.status(400).json({ message: 'You don\'t own any businesses yet' });
    }
    
    // Calculate income based on time passed since last collection
    const now = new Date();
    const lastCollected = lastCollectedAt ? new Date(lastCollectedAt) : new Date(now - 3600000); // Default to 1 hour ago
    
    // Cap at 24 hours to prevent excessive earnings
    const maxHours = 24;
    const hoursPassed = Math.min(maxHours, (now - lastCollected) / 3600000);
    
    if (hoursPassed < 0.1) { // Minimum 6 minutes between collections
      return res.status(400).json({ 
        message: 'You need to wait before collecting again',
        nextCollectionTime: new Date(lastCollected.getTime() + 360000)
      });
    }
    
    // Calculate total income
    let totalIncome = 0;
    const businessIncomes = [];
    
    for (const business of businesses) {
      const income = Math.floor(business.income * hoursPassed);
      totalIncome += income;
      
      businessIncomes.push({
        id: business.id,
        name: business.business_name,
        hourlyRate: business.income,
        collectedIncome: income
      });
    }
    
    totalIncome = Math.floor(totalIncome);
    
    await pool.query('BEGIN');
    try {
      // Add income to user
      await pool.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [totalIncome, user.id]);
      
      // Get updated coins
      const updatedUser = await pool.query('SELECT coins FROM users WHERE id = $1', [user.id]);
      
      await pool.query('COMMIT');
      
      res.json({
        message: 'Income collected successfully',
        totalIncome,
        hoursPassed: parseFloat(hoursPassed.toFixed(2)),
        businesses: businessIncomes,
        coins: updatedUser.rows[0].coins,
        collectionTime: now
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error collecting business income:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;