-- Add authentication columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;

-- Check if columns were added successfully
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('auth_token', 'token_expires_at');