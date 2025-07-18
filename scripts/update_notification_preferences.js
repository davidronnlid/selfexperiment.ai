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

async function updateNotificationPreferences() {
  console.log("🔧 Updating notification_preferences table schema...");

  try {
    console.log("📋 Step 1: Checking current table structure...");
    const { data: currentData, error: checkError } = await supabase
      .from("notification_preferences")
      .select("*")
      .limit(1);

    if (checkError) {
      console.log("❌ Error checking table:", checkError.message);
      return;
    }

    console.log("✅ Table exists and is accessible");

    console.log(
      "\n📋 Step 2: Please run this SQL in your Supabase SQL Editor to update the table:"
    );
    console.log("\n" + "=".repeat(60));
    console.log(`
-- Update notification_preferences table schema
-- This will add missing columns and ensure proper structure

-- Add missing columns if they don't exist
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS routine_reminder_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS routine_reminder_minutes INTEGER DEFAULT 15;

ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS test_notification_enabled BOOLEAN DEFAULT false;

ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS test_notification_time TIMESTAMP WITH TIME ZONE;

-- Add constraints if they don't exist
ALTER TABLE notification_preferences 
ADD CONSTRAINT IF NOT EXISTS notification_preferences_minutes_check 
CHECK (routine_reminder_minutes >= 1 AND routine_reminder_minutes <= 1440);

-- Ensure unique constraint on user_id
ALTER TABLE notification_preferences 
ADD CONSTRAINT IF NOT EXISTS notification_preferences_user_id_unique 
UNIQUE (user_id);

-- Enable RLS if not already enabled
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can delete own notification preferences" ON notification_preferences;

-- Create policies
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification preferences" ON notification_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_updated_at ON notification_preferences(updated_at);
    `);
    console.log("=".repeat(60));

    console.log("\n⏳ Waiting for table to be updated...");
    await waitForTableUpdate();

    console.log("\n📋 Step 3: Testing updated table...");
    await testUpdatedTable();

    console.log("\n🎉 Notification preferences table updated successfully!");
  } catch (error) {
    console.error("❌ Error updating table:", error);
  }
}

async function waitForTableUpdate() {
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds

  while (attempts < maxAttempts) {
    try {
      // Test if we can query the table with the expected columns
      const { data, error } = await supabase
        .from("notification_preferences")
        .select(
          "user_id, routine_reminder_enabled, routine_reminder_minutes, test_notification_enabled"
        )
        .limit(1);

      if (!error) {
        console.log("✅ Table updated successfully!");
        return;
      }
    } catch (error) {
      // Table might still be updating
    }

    attempts++;
    process.stdout.write(
      `\r⏳ Waiting for table update... (${attempts}/${maxAttempts})`
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(
    "\n⚠️ Table update timeout. Please check your Supabase SQL editor."
  );
}

async function testUpdatedTable() {
  try {
    // Test a simple query with the expected columns
    const { data, error } = await supabase
      .from("notification_preferences")
      .select(
        "user_id, routine_reminder_enabled, routine_reminder_minutes, test_notification_enabled"
      )
      .limit(1);

    if (error) {
      console.error("❌ Error testing updated table:", error);
      throw error;
    }

    console.log("✅ Updated table is accessible!");
    console.log(`📊 Sample data: ${data ? data.length : 0} records found`);

    if (data && data.length > 0) {
      console.log("📋 Sample record structure:", Object.keys(data[0]));
    }
  } catch (error) {
    console.error("❌ Updated table test failed:", error);
    throw error;
  }
}

updateNotificationPreferences();
