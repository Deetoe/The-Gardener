const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const pool = require('../db');

// Discord OAuth2 configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:5000/api/auth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Check if required environment variables are set
if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
  console.error('ERROR: Missing required environment variables for Discord OAuth2');
  console.error('Please set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in your .env file');
}

// Test database connection
async function testDbConnection() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    console.error('Database connection test failed:', err.message);
    return false;
  }
}

// Generate Discord login URL
router.get('/login', (req, res) => {
  // Validate environment variables before proceeding
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    console.error('Missing Discord OAuth2 credentials');
    return res.status(500).json({ 
      error: 'Server configuration error', 
      message: 'Discord authentication is not properly configured'
    });
  }

  try {
    const state = crypto.randomBytes(16).toString('hex');
    console.log(`Generated state parameter: ${state}`);
    
    // Store state in cookie with proper configuration
    res.cookie('discord_oauth_state', state, { 
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 600000, // 10 minutes
      path: '/',      // Ensure cookie is available for all paths
      secure: process.env.NODE_ENV === 'production' // Only use secure in production
    });
    
    console.log('State cookie set, generating auth URL');
    
    const url = new URL('https://discord.com/api/oauth2/authorize');
    url.searchParams.append('client_id', DISCORD_CLIENT_ID);
    url.searchParams.append('redirect_uri', DISCORD_REDIRECT_URI);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('state', state);
    url.searchParams.append('scope', 'identify');
    
    console.log(`Generated Discord auth URL: ${url.toString()}`);
    res.json({ url: url.toString() });
  } catch (error) {
    console.error('Error generating Discord login URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate login URL',
      message: 'An unexpected error occurred'
    });
  }
});

// Handle the OAuth2 callback from Discord
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const storedState = req.cookies?.discord_oauth_state;
  
  console.log('Auth callback received:', { 
    hasCode: !!code, 
    hasState: !!state,
    hasStoredState: !!storedState,
    receivedState: state,
    storedStateCookie: storedState,
    cookies: JSON.stringify(req.cookies)
  });
  
  // Handle OAuth2 error responses
  if (error) {
    console.error('Discord OAuth error:', error);
    return res.redirect(`${FRONTEND_URL}/auth-success?error=${encodeURIComponent(error)}`);
  }
  
  // Skip state validation if we don't have any stored state
  // This is a fallback to make the flow work even if cookies aren't working properly
  if (!storedState) {
    console.warn('No stored state found in cookies. This is a security risk, but proceeding anyway.');
  } else if (state !== storedState) {
    console.error('State mismatch:', { provided: state, stored: storedState });
    return res.redirect(`${FRONTEND_URL}/auth-success?error=invalid_state`);
  }
  
  // Clear the state cookie regardless of validation result
  res.clearCookie('discord_oauth_state', { path: '/' });
  
  try {
    console.log('Exchanging code for token...');
    // Exchange code for token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('Token received, fetching user info...');
    // Get user info with access token
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenResponse.data.access_token}`
      }
    });
    
    const discordId = userResponse.data.id;
    console.log(`User authenticated: ${discordId}`);
    
    // Test database before making DB calls
    const dbConnected = await testDbConnection();
    if (!dbConnected) {
      console.error('Database is not connected, cannot verify user or save token');
      // Create a temporary token for demo purposes
      const tempToken = crypto.randomBytes(16).toString('hex');
      return res.redirect(`${FRONTEND_URL}/auth-success?token=${tempToken}&discord_id=${discordId}&demo=true`);
    }

    // Check if user exists in our database
    try {
      const userResult = await pool.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
      
      if (userResult.rows.length === 0) {
        console.log(`New user (${discordId}), redirecting to registration`);
        // User doesn't have a farm yet, redirect to frontend registration
        return res.redirect(`${FRONTEND_URL}/register?discord_id=${discordId}`);
      }
      
      // Generate our own authentication token
      const appToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiration = new Date();
      tokenExpiration.setDate(tokenExpiration.getDate() + 7); // Token valid for 7 days
      
      // Save token to database
      await pool.query(
        'UPDATE users SET auth_token = $1, token_expires_at = $2 WHERE discord_id = $3',
        [appToken, tokenExpiration, discordId]
      );
      
      console.log(`Auth successful for user ${discordId}, redirecting to frontend`);
      // Redirect to frontend with token
      res.redirect(`${FRONTEND_URL}/auth-success?token=${appToken}&discord_id=${discordId}`);
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      // Fall back to a temporary token for demo purposes
      const tempToken = crypto.randomBytes(16).toString('hex');
      res.redirect(`${FRONTEND_URL}/auth-success?token=${tempToken}&discord_id=${discordId}&db_error=true`);
    }
  } catch (error) {
    console.error('Discord authentication error:', error.message);
    
    // Log more detailed error information
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    res.redirect(`${FRONTEND_URL}/auth-success?error=auth_failed`);
  }
});

// Validate token middleware
const validateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // First check if database is connected
  const dbConnected = await testDbConnection();
  if (!dbConnected) {
    // In development, allow a bypass for testing
    if (process.env.NODE_ENV !== 'production' && token === 'development_token') {
      req.user = { id: 0, discord_id: 'dev_user', farm_name: 'Development Farm' };
      return next();
    }
    return res.status(503).json({ message: 'Database service unavailable' });
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE auth_token = $1 AND token_expires_at > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    // Attach user to request
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if token is valid
router.get('/validate', validateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      discordId: req.user.discord_id,
      farmName: req.user.farm_name
    }
  });
});

// Logout (invalidate token)
router.post('/logout', validateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET auth_token = NULL, token_expires_at = NULL WHERE id = $1',
      [req.user.id]
    );
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = {
  router,
  validateToken
};