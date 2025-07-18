require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNotificationTable() {
  console.log("🔍 Checking notification_preferences table...");

  try {
    // Check if table exists
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("count")
      .limit(1);

    if (error) {
      console.log("❌ Table does not exist or error:", error.message);
      console.log("\n📋 Please run this SQL in your Supabase SQL Editor:");
      console.log("\n" + "=".repeat(60));
      console.log(`
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    routine_reminder_enabled BOOLEAN DEFAULT true,
    routine_reminder_minutes INTEGER DEFAULT 15 CHECK (routine_reminder_minutes >= 1 AND routine_reminder_minutes <= 1440),
    test_notification_enabled BOOLEAN DEFAULT false,
    test_notification_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification preferences" ON notification_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
      `);
      console.log("=".repeat(60));
    } else {
      console.log("✅ notification_preferences table exists!");

      // Test a simple query
      const { data: testData, error: testError } = await supabase
        .from("notification_preferences")
        .select("*")
        .limit(1);

      if (testError) {
        console.log("⚠️ Table exists but query failed:", testError.message);
      } else {
        console.log("✅ Table is accessible and working!");
      }
    }
  } catch (error) {
    console.error("❌ Error checking table:", error);
  }
}

checkNotificationTable();
