const fs = require("fs");
const path = require("path");

console.log("🍎 Setting up Apple Health Integration...\n");

// Check if schema file exists and display it
const appleHealthSchemaPath = path.join(
  __dirname,
  "..",
  "database",
  "apple_health_integration_schema.sql"
);

if (fs.existsSync(appleHealthSchemaPath)) {
  const sqlContent = fs.readFileSync(appleHealthSchemaPath, "utf8");
  console.log("📄 Found Apple Health schema file. Please run this SQL in your Supabase SQL editor:\n");
  console.log("=".repeat(80));
  console.log(sqlContent);
  console.log("=".repeat(80));
} else {
  console.log("❌ Apple Health schema file not found. Here's the SQL to run:\n");

  const sql = `
-- Apple Health Integration Database Schema
-- Run this in your Supabase SQL editor

-- Create Apple Health tokens table
CREATE TABLE IF NOT EXISTS apple_health_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create Apple Health data points table
CREATE TABLE IF NOT EXISTS apple_health_variable_data_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    variable_id TEXT NOT NULL,
    value DECIMAL(10,4) NOT NULL,
    source TEXT DEFAULT 'apple_health',
    raw JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date, variable_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_apple_health_tokens_user_id ON apple_health_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_apple_health_variable_data_points_user_id ON apple_health_variable_data_points(user_id);
CREATE INDEX IF NOT EXISTS idx_apple_health_variable_data_points_variable_id ON apple_health_variable_data_points(variable_id);
CREATE INDEX IF NOT EXISTS idx_apple_health_variable_data_points_date ON apple_health_variable_data_points(date);

-- Enable RLS
ALTER TABLE apple_health_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE apple_health_variable_data_points ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tokens
CREATE POLICY "Users can view own apple health tokens" ON apple_health_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own apple health tokens" ON apple_health_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own apple health tokens" ON apple_health_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own apple health tokens" ON apple_health_tokens FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for data points
CREATE POLICY "Users can view own apple health data points" ON apple_health_variable_data_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own apple health data points" ON apple_health_variable_data_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own apple health data points" ON apple_health_variable_data_points FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own apple health data points" ON apple_health_variable_data_points FOR DELETE USING (auth.uid() = user_id);

-- Insert Apple Health variables
INSERT INTO variables (slug, label, icon, category, unit, constraints, is_active, is_public, source)
VALUES 
    ('ah_steps', 'Steps (Apple Health)', '👣', 'Activity', 'steps', '{"min": 0, "max": 50000}', true, true, 'apple_health'),
    ('ah_heart_rate', 'Heart Rate (Apple Health)', '❤️', 'Vitals', 'bpm', '{"min": 30, "max": 220}', true, true, 'apple_health'),
    ('ah_weight', 'Weight (Apple Health)', '⚖️', 'Body', 'kg', '{"min": 30, "max": 300}', true, true, 'apple_health'),
    ('ah_sleep_duration', 'Sleep Duration (Apple Health)', '😴', 'Sleep', 'hours', '{"min": 0, "max": 24}', true, true, 'apple_health'),
    ('ah_active_calories', 'Active Calories (Apple Health)', '🔥', 'Activity', 'kcal', '{"min": 0, "max": 5000}', true, true, 'apple_health'),
    ('ah_resting_heart_rate', 'Resting Heart Rate (Apple Health)', '💓', 'Vitals', 'bpm', '{"min": 30, "max": 150}', true, true, 'apple_health'),
    ('ah_blood_pressure_systolic', 'Blood Pressure Systolic (Apple Health)', '🩸', 'Vitals', 'mmHg', '{"min": 70, "max": 200}', true, true, 'apple_health'),
    ('ah_blood_pressure_diastolic', 'Blood Pressure Diastolic (Apple Health)', '🩸', 'Vitals', 'mmHg', '{"min": 40, "max": 130}', true, true, 'apple_health'),
    ('ah_body_fat_percentage', 'Body Fat Percentage (Apple Health)', '📊', 'Body', '%', '{"min": 5, "max": 50}', true, true, 'apple_health'),
    ('ah_vo2_max', 'VO2 Max (Apple Health)', '🫁', 'Fitness', 'ml/kg/min', '{"min": 20, "max": 80}', true, true, 'apple_health')
ON CONFLICT (slug) DO NOTHING;
`;

  console.log("=".repeat(80));
  console.log(sql);
  console.log("=".repeat(80));
}

console.log("\n📋 Setup Instructions:");
console.log("1. Copy the SQL above");
console.log("2. Go to your Supabase project dashboard");
console.log("3. Navigate to the SQL Editor");
console.log("4. Paste and run the SQL");
console.log("5. Verify the tables were created successfully");

console.log("\n🔧 Environment Variables:");
console.log("No additional environment variables needed for Apple Health integration.");
console.log("The integration uses session-based authentication for security.");

console.log("\n🚀 Testing:");
console.log("1. Start your development server: npm run dev");
console.log("2. Go to: http://localhost:3000/analyze");
console.log("3. Click 'Connect Apple Health' button");
console.log("4. Follow the integration instructions");
console.log("5. Test the sync functionality");

console.log("\n📱 Next Steps for Production:");
console.log("- Develop iOS companion app with HealthKit integration");
console.log("- Implement Apple Health export file parsing");
console.log("- Add real-time data syncing via iOS app");
console.log("- Consider using Apple Health APIs when available");

console.log("\n✅ Apple Health Integration setup complete!");
console.log("The integration is ready for testing with sample data."); 