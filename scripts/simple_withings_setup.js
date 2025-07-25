console.log(`
🔧 Withings Integration Setup

Copy and paste this SQL into your Supabase SQL Editor:
==================================================

-- Create Withings tables with correct structure
CREATE TABLE IF NOT EXISTS withings_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS withings_variable_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    variable TEXT NOT NULL,
    value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date, variable)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_withings_tokens_user_id ON withings_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_user_id ON withings_variable_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_date ON withings_variable_logs(date);

-- Enable RLS
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE withings_variable_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own Withings tokens" ON withings_tokens
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own Withings logs" ON withings_variable_logs
    FOR ALL USING (auth.uid() = user_id);

==================================================

After running this SQL:
1. Go to http://localhost:3000/withings-test
2. Sign in if needed
3. Click "Connect Withings"
4. Complete the OAuth flow

The integration should now work correctly! ✅
`);
