const express = require('express');
const router = express.Router();
const pool = require('../db');
const { validateToken } = require('./authRoutes');

// Get farm info for a user
router.get('/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    
    const userResult = await pool.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get plot data
    const plotsResult = await pool.query('SELECT * FROM plots WHERE user_id = $1', [user.id]);
    
    return res.json({
      id: user.id,
      discordId: user.discord_id,
      farmName: user.farm_name,
      coins: user.coins,
      plots: plotsResult.rows
    });
  } catch (error) {
    console.error('Error fetching farm info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new farm
router.post('/', async (req, res) => {
  try {
    const { discordId, farmName } = req.body;
    
    if (!discordId || !farmName) {
      return res.status(400).json({ message: 'Discord ID and farm name are required' });
    }
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Farm already exists for this user' });
    }
    
    // Create new user with starting coins
    const startingCoins = 500;
    const newUser = await pool.query(
      'INSERT INTO users (discord_id, farm_name, coins) VALUES ($1, $2, $3) RETURNING *',
      [discordId, farmName, startingCoins]
    );
    
    res.status(201).json({
      message: 'Farm created successfully',
      farm: newUser.rows[0]
    });
  } catch (error) {
    console.error('Error creating farm:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update farm coins
router.put('/:discordId/coins', async (req, res) => {
  try {
    const { discordId } = req.params;
    const { coins, operation } = req.body;
    
    if (!coins || !operation) {
      return res.status(400).json({ message: 'Coins amount and operation type are required' });
    }
    
    const userResult = await pool.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.rows[0];
    let newCoins;
    
    if (operation === 'add') {
      newCoins = user.coins + coins;
    } else if (operation === 'subtract') {
      newCoins = user.coins - coins;
      if (newCoins < 0) {
        return res.status(400).json({ message: 'Insufficient coins' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid operation' });
    }
    
    await pool.query('UPDATE users SET coins = $1 WHERE discord_id = $2', [newCoins, discordId]);
    
    res.json({
      message: 'Coins updated successfully',
      coins: newCoins
    });
  } catch (error) {
    console.error('Error updating coins:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add routes for plots management
router.post('/plots/buy', validateToken, async (req, res) => {
  const userId = req.user.id;

  // Start transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get user info
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userResult.rows[0];

    // Calculate cost based on number of plots already owned
    const plotsResult = await client.query('SELECT COUNT(*) FROM plots WHERE user_id = $1', [userId]);
    const plotCount = parseInt(plotsResult.rows[0].count);
    const plotCost = plotCount * 200;

    // Check if user has enough coins
    if (user.coins < plotCost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Insufficient coins. Plot costs ${plotCost} coins.` });
    }

    // Deduct coins from user
    await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [plotCost, userId]);

    // Create new empty plot
    const newPlotResult = await client.query(
      'INSERT INTO plots (user_id, plot_type, capacity, level, current_crops) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, 'empty', 5, 1, 0]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Plot purchased successfully',
      plot: newPlotResult.rows[0],
      remainingCoins: user.coins - plotCost
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error buying plot:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// Upgrade plot
router.post('/plots/upgrade', validateToken, async (req, res) => {
  const { plotId } = req.body;
  const userId = req.user.id;

  if (!plotId) {
    return res.status(400).json({ message: 'Plot ID is required' });
  }

  // Start transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if plot exists and belongs to user
    const plotResult = await client.query(
      'SELECT * FROM plots WHERE id = $1 AND user_id = $2',
      [plotId, userId]
    );

    if (plotResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Plot not found or does not belong to user' });
    }

    const plot = plotResult.rows[0];
    const upgradeCost = plot.level * 500; // Cost increases with level

    // Get user data to check if they have enough coins
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    if (user.coins < upgradeCost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: `Insufficient coins. Upgrading to level ${plot.level + 1} costs ${upgradeCost} coins.`
      });
    }

    // Deduct coins and upgrade plot
    await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [upgradeCost, userId]);
    
    // Increase level and capacity
    await client.query(
      'UPDATE plots SET level = level + 1, capacity = capacity + 5 WHERE id = $1 RETURNING *',
      [plotId]
    );

    await client.query('COMMIT');

    // Return updated user and plot data
    const updatedUserResult = await pool.query('SELECT coins FROM users WHERE id = $1', [userId]);
    const updatedPlotResult = await pool.query('SELECT * FROM plots WHERE id = $1', [plotId]);

    res.json({
      success: true,
      message: `Plot upgraded to level ${plot.level + 1}`,
      plot: updatedPlotResult.rows[0],
      coins: updatedUserResult.rows[0].coins
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error upgrading plot:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;