/**
 * Discord OAuth Setup Checker
 * 
 * This script helps diagnose issues with Discord OAuth2 configuration
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('==== Discord OAuth2 Configuration Check ====\n');

// Check required OAuth2 environment variables
const requiredVars = [
  'DISCORD_CLIENT_ID', 
  'DISCORD_CLIENT_SECRET', 
  'DISCORD_REDIRECT_URI'
];

const missingVars = [];
const issues = [];

console.log('Checking required environment variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName} is missing`);
    missingVars.push(varName);
  } else {
    console.log(`✅ ${varName} is set`);
    
    // Additional checks
    if (varName === 'DISCORD_REDIRECT_URI') {
      if (!value.includes('/api/auth/callback')) {
        issues.push('DISCORD_REDIRECT_URI should end with /api/auth/callback');
      }
      
      // Check if URL is properly formatted
      try {
        new URL(value);
      } catch (e) {
        issues.push(`DISCORD_REDIRECT_URI (${value}) is not a valid URL`);
      }
    }
  }
});

// Check database connection string
if (!process.env.DATABASE_URL) {
  console.log('❌ DATABASE_URL is missing');
  missingVars.push('DATABASE_URL');
} else {
  console.log('✅ DATABASE_URL is set');
  
  // Simple format validation
  if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
    issues.push('DATABASE_URL does not appear to be a valid PostgreSQL connection string');
  }
}

// Check frontend URL
if (!process.env.FRONTEND_URL) {
  console.log('❌ FRONTEND_URL is missing (will default to http://localhost:5173)');
} else {
  console.log('✅ FRONTEND_URL is set');
  
  // Check if URL is properly formatted
  try {
    new URL(process.env.FRONTEND_URL);
  } catch (e) {
    issues.push(`FRONTEND_URL (${process.env.FRONTEND_URL}) is not a valid URL`);
  }
}

console.log('\n==== Discord Developer Portal Check ====');
console.log('\nPlease verify these settings in your Discord Developer Portal:');
console.log('1. Go to https://discord.com/developers/applications');
console.log('2. Select your application');
console.log('3. Go to "OAuth2" in the sidebar');
console.log('4. Make sure these settings are correct:');

const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:5000/api/auth/callback';
console.log(`   - Redirect URL: ${redirectUri}`);
console.log('   - Scopes required: "identify"');

if (missingVars.length > 0) {
  console.log('\n⚠️ Please add the following variables to your .env file:');
  missingVars.forEach(varName => {
    console.log(`   ${varName}=your_value_here`);
  });
}

if (issues.length > 0) {
  console.log('\n⚠️ Potential issues detected:');
  issues.forEach(issue => {
    console.log(`   - ${issue}`);
  });
}

console.log('\n==== Next steps ====');
if (missingVars.length === 0 && issues.length === 0) {
  console.log('✅ Configuration looks good! If you\'re still having issues:');
} else {
  console.log('Please fix the issues above, then:');
}

console.log('1. Make sure your server is running: npm run dev (in the server directory)');
console.log('2. Make sure your client is running: npm start (in the client/The-Gardener directory)');
console.log('3. Check the server console logs when attempting to authenticate');
console.log('\nHappy farming! 🌱');