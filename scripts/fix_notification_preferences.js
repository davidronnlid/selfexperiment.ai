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

async function fixNotificationPreferences() {
  console.log("🔧 Fixing notification_preferences table...");

  try {
    // Drop the existing table if it exists
    console.log("📋 Step 1: Dropping existing table...");
    const { error: dropError } = await supabase.rpc("exec_sql", {
      sql: "DROP TABLE IF EXISTS notification_preferences CASCADE;",
    });

    if (dropError) {
      console.log(
        "⚠️ Could not drop table via RPC, please run this SQL manually:"
      );
      console.log("DROP TABLE IF EXISTS notification_preferences CASCADE;");
    } else {
      console.log("✅ Table dropped successfully");
    }

    console.log("\n📋 Step 2: Creating table with correct schema...");
    console.log("Please run this SQL in your Supabase SQL Editor:");
    console.log("\n" + "=".repeat(60));
    console.log(`
-- Drop existing table if it exists
DROP TABLE IF EXISTS notification_preferences CASCADE;

-- Create notification preferences table with correct schema
CREATE TABLE notification_preferences (
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
CREATE INDEX IF NOT EXISTS idx_notification_preferences_updated_at ON notification_preferences(updated_at);
    `);
    console.log("=".repeat(60));

    console.log("\n⏳ Waiting for table to be created...");
    await waitForTableCreation();

    console.log("\n📋 Step 3: Testing table access...");
    await testTableAccess();

    console.log("\n🎉 Notification preferences table fixed successfully!");
  } catch (error) {
    console.error("❌ Error fixing table:", error);
  }
}

async function waitForTableCreation() {
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds

  while (attempts < maxAttempts) {
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .select("count")
        .limit(1);

      if (!error) {
        console.log("✅ Table created successfully!");
        return;
      }
    } catch (error) {
      // Table doesn't exist yet
    }

    attempts++;
    process.stdout.write(
      `\r⏳ Waiting for table... (${attempts}/${maxAttempts})`
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    "Table creation timeout. Please check your Supabase SQL editor."
  );
}

async function testTableAccess() {
  try {
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .limit(1);

    if (error) {
      console.error("❌ Error testing table access:", error);
      throw error;
    }

    console.log("✅ Table access confirmed!");
    console.log(`📊 Sample data: ${data ? data.length : 0} records found`);
  } catch (error) {
    console.error("❌ Table access test failed:", error);
    throw error;
  }
}

fixNotificationPreferences();
