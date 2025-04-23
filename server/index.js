// index.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const farmRoutes = require('./routes/farmRoutes');
const cropRoutes = require('./routes/cropRoutes');
const businessRoutes = require('./routes/businessRoutes');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading environment variables from: ${envPath}`);
dotenv.config({ path: envPath });

// Check for required OAuth variables
const missingVars = [];
['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_REDIRECT_URI'].forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

// Only require auth routes if env vars are available
let authRoutes;
if (missingVars.length > 0) {
  console.error(`ERROR: Missing required environment variables for Discord OAuth2: ${missingVars.join(', ')}`);
  console.error('Please set these variables in your .env file');
  console.error('Discord authentication will be disabled');
  
  // Create a placeholder auth router that returns appropriate errors
  const router = express.Router();
  router.get('/login', (req, res) => {
    res.status(503).json({ error: 'Discord authentication is not configured' });
  });
  router.get('/callback', (req, res) => {
    res.status(503).json({ error: 'Discord authentication is not configured' });
  });
  router.get('/validate', (req, res) => {
    res.status(401).json({ valid: false, message: 'Authentication is not configured' });
  });
  
  authRoutes = { router };
} else {
  // Only require auth routes if environment variables are available
  authRoutes = require('./routes/authRoutes');
  console.log('Discord authentication is enabled');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Frontend URL for CORS
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
console.log(`Frontend URL set to: ${frontendUrl}`);

// Middleware
app.use(cors({
  origin: frontendUrl,
  credentials: true // Allow cookies to be sent
}));
app.use(express.json()); // For parsing JSON data
app.use(cookieParser()); // For parsing cookies

// Routes
app.use('/api/auth', authRoutes.router);
app.use('/api/farms', farmRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/businesses', businessRoutes);

// Healthcheck endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    authEnabled: missingVars.length === 0
  });
});

// Test cookie endpoint to diagnose cookie issues
app.get('/api/test-cookie', (req, res) => {
  res.cookie('test_cookie', 'cookie_value', { 
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 300000 // 5 minutes
  });
  
  res.json({
    message: 'Test cookie set',
    cookies: req.cookies
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});