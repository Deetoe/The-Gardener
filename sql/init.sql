CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  discord_id TEXT UNIQUE NOT NULL,
  coins INTEGER DEFAULT 0,
  planted_crop TEXT,
  crop_start_time TIMESTAMP,
  crops_collected JSONB DEFAULT '[]',
  businesses JSONB DEFAULT '[]'
);

CREATE TABLE crops (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  crop_type TEXT NOT NULL,
  planted_at TIMESTAMP,
  harvest_time TIMESTAMP
);

CREATE TABLE businesses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  income INTEGER DEFAULT 0
);