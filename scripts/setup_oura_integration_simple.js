require("dotenv").config();
const fs = require("fs");
const path = require("path");

console.log("🔧 Oura Integration Setup");
console.log("========================\n");

console.log(
  "📋 The following SQL needs to be executed in your Supabase SQL Editor:"
);
console.log("(Go to your Supabase dashboard > SQL Editor)\n");

const ouraSchemaPath = path.join(
  __dirname,
  "..",
  "database",
  "oura_integration_schema.sql"
);

if (fs.existsSync(ouraSchemaPath)) {
  const sqlContent = fs.readFileSync(ouraSchemaPath, "utf8");
  console.log("=".repeat(80));
  console.log(sqlContent);
  console.log("=".repeat(80));
} else {
  console.log("❌ Oura schema file not found. Here's the SQL to run:\n");

  const sql = `
-- Oura Integration Database Schema
-- Tables required for Oura Ring integration functionality

-- ============================================================================
-- OURA TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS oura_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, access_token)
);

-- ============================================================================
-- OURA MEASUREMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS oura_measurements (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'oura',
    metric TEXT NOT NULL,
    date DATE NOT NULL,
    value NUMERIC,
    raw JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, metric, date),
    CONSTRAINT oura_measurements_metric_check CHECK (metric IN (
        'readiness_score',
        'sleep_score', 
        'total_sleep_duration',
        'rem_sleep_duration',
        'deep_sleep_duration',
        'efficiency',
        'sleep_latency',
        'temperature_deviation',
        'temperature_trend_deviation',
        'hr_lowest_true',
        'hr_average_true',
        'hr_raw_data'
    ))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Oura tokens indexes
CREATE INDEX IF NOT EXISTS idx_oura_tokens_user_id ON oura_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oura_tokens_created_at ON oura_tokens(created_at);

-- Oura measurements indexes
CREATE INDEX IF NOT EXISTS idx_oura_measurements_user_id ON oura_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_oura_measurements_metric ON oura_measurements(metric);
CREATE INDEX IF NOT EXISTS idx_oura_measurements_date ON oura_measurements(date);
CREATE INDEX IF NOT EXISTS idx_oura_measurements_user_metric_date ON oura_measurements(user_id, metric, date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on oura_tokens
ALTER TABLE oura_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can view own oura tokens" ON oura_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own oura tokens" ON oura_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own oura tokens" ON oura_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Enable RLS on oura_measurements
ALTER TABLE oura_measurements ENABLE ROW LEVEL SECURITY;

-- Users can only access their own measurements
CREATE POLICY "Users can view own oura measurements" ON oura_measurements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own oura measurements" ON oura_measurements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own oura measurements" ON oura_measurements
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS FOR DATA MANAGEMENT
-- ============================================================================

-- Function to clean up old Oura data
CREATE OR REPLACE FUNCTION cleanup_old_oura_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM oura_measurements 
    WHERE date < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get Oura data summary
CREATE OR REPLACE FUNCTION get_oura_summary(target_user_id UUID, days_back INTEGER DEFAULT 14)
RETURNS TABLE(
    metric TEXT,
    avg_value NUMERIC,
    min_value NUMERIC,
    max_value NUMERIC,
    latest_value NUMERIC,
    data_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        om.metric,
        AVG(om.value) as avg_value,
        MIN(om.value) as min_value,
        MAX(om.value) as max_value,
        (SELECT value FROM oura_measurements 
         WHERE user_id = target_user_id 
         AND metric = om.metric 
         ORDER BY date DESC 
         LIMIT 1) as latest_value,
        COUNT(*) as data_points
    FROM oura_measurements om
    WHERE om.user_id = target_user_id
    AND om.date >= CURRENT_DATE - INTERVAL '1 day' * days_back
    GROUP BY om.metric;
END;
$$ LANGUAGE plpgsql;
`;

  console.log("=".repeat(80));
  console.log(sql);
  console.log("=".repeat(80));
}

console.log("\n📝 Instructions:");
console.log("1. Copy the SQL above");
console.log("2. Go to your Supabase dashboard");
console.log("3. Navigate to SQL Editor");
console.log("4. Paste the SQL and click 'Run'");
console.log("5. Verify the tables were created in the Table Editor");

console.log("\n🔍 Environment Variables Check:");
const requiredEnvVars = [
  "NEXT_PUBLIC_OURA_CLIENT_ID",
  "OURA_CLIENT_ID",
  "OURA_CLIENT_SECRET",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.log("⚠️ Missing environment variables:");
  missingVars.forEach((varName) => console.log(`  - ${varName}`));
  console.log("\n📝 Add these to your .env file:");
  console.log("NEXT_PUBLIC_OURA_CLIENT_ID=your_oura_client_id");
  console.log("OURA_CLIENT_ID=your_oura_client_id");
  console.log("OURA_CLIENT_SECRET=your_oura_client_secret");
} else {
  console.log("✅ All required environment variables are set");
}

console.log("\n🎉 After running the SQL, the Oura integration will be ready!");
console.log("📱 Users can connect their Oura Ring from the analytics page");
