const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

console.log(`
⚠️  The oura_variable_logs table structure needs to be updated to match the API expectations.

Please run this SQL in your Supabase SQL Editor:

-- First, check if the table has the correct structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'oura_variable_logs' 
ORDER BY ordinal_position;

-- If the id column is uuid instead of serial, we need to recreate the table
-- BACKUP the existing data first (if any):
CREATE TABLE oura_variable_logs_backup AS SELECT * FROM oura_variable_logs;

-- Drop the existing table
DROP TABLE IF EXISTS oura_variable_logs;

-- Create the correct table structure
CREATE TABLE oura_variable_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  variable_id TEXT NOT NULL,
  date DATE NOT NULL,
  value NUMERIC,
  raw JSONB,
  source TEXT DEFAULT 'oura',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, variable_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_oura_variable_logs_user_id ON oura_variable_logs(user_id);
CREATE INDEX idx_oura_variable_logs_variable_id ON oura_variable_logs(variable_id);
CREATE INDEX idx_oura_variable_logs_date ON oura_variable_logs(date);

-- Enable RLS
ALTER TABLE oura_variable_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can insert their own oura logs" ON oura_variable_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own oura logs" ON oura_variable_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own oura logs" ON oura_variable_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- If you had data in the backup, restore it (adjust as needed):
-- INSERT INTO oura_variable_logs (user_id, variable_id, date, value, raw, source, created_at)
-- SELECT user_id, variable_id, date, value, raw, source, created_at FROM oura_variable_logs_backup;

-- Drop the backup table when done:
-- DROP TABLE oura_variable_logs_backup;

✅ After running this SQL, the Oura sync should work properly!
`);
