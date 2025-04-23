CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  discord_id TEXT UNIQUE NOT NULL,
  farm_name TEXT,
  coins INTEGER DEFAULT 0,
  auth_token TEXT,
  token_expires_at TIMESTAMP,
  last_business_collection TIMESTAMP
);

CREATE TABLE plots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  plot_type TEXT,
  planted_at TIMESTAMP,
  harvest_time TIMESTAMP,
  capacity INTEGER DEFAULT 1,
  level INTEGER DEFAULT 1,
  current_crops INTEGER DEFAULT 0
);

CREATE TABLE businesses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  income INTEGER DEFAULT 0
);