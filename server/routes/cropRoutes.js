const express = require('express');
const router = express.Router();
const pool = require('../db');
const { validateToken } = require('./authRoutes');

// Get all plots with crops for a user
router.get('/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    
    // First get the user
    const userResult = await pool.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get all plots with crops planted
    const plotsResult = await pool.query(
      'SELECT * FROM plots WHERE user_id = $1 AND current_crops > 0 ORDER BY plot_type, id',
      [user.id]
    );
    
    // Process plots to add readable time information
    const currentTime = new Date();
    const plots = plotsResult.rows.map(plot => {
      const harvestTime = plot.harvest_time ? new Date(plot.harvest_time) : null;
      const isReady = harvestTime ? currentTime >= harvestTime : false;
      
      // Calculate remaining time in minutes and seconds
      let timeRemaining = null;
      if (harvestTime && !isReady) {
        const remainingMs = harvestTime - currentTime;
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);
        timeRemaining = { minutes, seconds };
      }
      
      return {
        ...plot,
        isReady,
        timeRemaining
      };
    });
    
    res.json(plots);
  } catch (error) {
    console.error('Error fetching crops:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available crop types
router.get('/types', async (req, res) => {
  try {
    // These are the crop types available in the game
    const cropTypes = ['wheat', 'corn', 'carrot'];
    res.json({ cropTypes });
  } catch (error) {
    console.error('Error fetching crop types:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Plant crops
router.post('/plant', validateToken, async (req, res) => {
  const { plotId, cropType, amount } = req.body;
  const userId = req.user.id;

  // Validate input
  if (!plotId || !cropType || !amount) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Make sure amount is a number
  const cropAmount = parseInt(amount, 10);
  if (isNaN(cropAmount) || cropAmount <= 0) {
    return res.status(400).json({ message: 'Invalid crop amount' });
  }

  // Validate crop type
  const validCropTypes = ['wheat', 'corn', 'carrot'];
  if (!validCropTypes.includes(cropType)) {
    return res.status(400).json({ message: 'Invalid crop type' });
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

    // Check if plot already has crops of a different type
    if (plot.plot_type !== 'empty' && plot.plot_type !== cropType) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Plot already has ${plot.plot_type} planted` });
    }

    // Check if plot has enough space
    const availableSpace = plot.capacity - plot.current_crops;
    if (cropAmount > availableSpace) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Not enough space. Can only plant ${availableSpace} crops` });
    }

    // Calculate harvest time (40 seconds per crop)
    const now = new Date();
    const harvestTime = new Date(now.getTime() + (cropAmount * 40 * 1000));

    // Update plot with new crops
    await client.query(
      'UPDATE plots SET plot_type = $1, current_crops = current_crops + $2, planted_at = $3, harvest_time = $4 WHERE id = $5',
      [cropType, cropAmount, now, harvestTime, plotId]
    );

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: `Successfully planted ${cropAmount} ${cropType} in plot #${plotId}`,
      harvestTime
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error planting crops:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// Harvest crops
router.post('/harvest', validateToken, async (req, res) => {
  const { plotId } = req.body;
  const userId = req.user.id;

  // Validate input
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

    // Check if plot has crops to harvest
    if (plot.current_crops <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No crops to harvest' });
    }

    // Check if crops are ready for harvest
    const now = new Date();
    if (now < plot.harvest_time) {
      const remainingTime = Math.ceil((plot.harvest_time - now) / 1000);
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: `Crops are not ready to harvest. Ready in ${remainingTime} seconds`,
        remainingTime
      });
    }

    // Calculate coins based on crop type and amount
    let coinsPerCrop = 10; // Default value
    if (plot.plot_type === 'corn') {
      coinsPerCrop = 15;
    } else if (plot.plot_type === 'carrot') {
      coinsPerCrop = 20;
    }

    const harvestedCoins = plot.current_crops * coinsPerCrop;

    // Update user's coins
    await client.query(
      'UPDATE users SET coins = coins + $1 WHERE id = $2',
      [harvestedCoins, userId]
    );

    // Reset plot
    await client.query(
      'UPDATE plots SET plot_type = $1, current_crops = 0, planted_at = NULL, harvest_time = NULL WHERE id = $2',
      ['empty', plotId]
    );

    // Get updated user data
    const userResult = await client.query('SELECT coins FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: `Successfully harvested ${plot.current_crops} ${plot.plot_type} for ${harvestedCoins} coins!`,
      coins: harvestedCoins,
      totalCoins: userResult.rows[0].coins
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error harvesting crops:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;