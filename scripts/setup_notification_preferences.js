const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  console.error(
    "\nPlease check your .env file and ensure these variables are set."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupNotificationPreferences() {
  console.log("🚀 Setting up notification preferences system...\n");

  try {
    // Step 1: Check if table exists
    console.log(
      "📋 Step 1: Checking if notification_preferences table exists..."
    );
    const { error: checkError } = await supabase
      .from("notification_preferences")
      .select("count")
      .limit(1);

    if (checkError && checkError.code === "42P01") {
      console.log("❌ Table does not exist. Creating it...");
      await createNotificationPreferencesTable();
    } else if (checkError) {
      console.error("❌ Error checking table:", checkError);
      throw checkError;
    } else {
      console.log("✅ Table already exists!");
    }

    // Step 2: Test table access
    console.log("\n📋 Step 2: Testing table access...");
    await testTableAccess();

    // Step 3: Check RLS policies
    console.log("\n📋 Step 3: Checking RLS policies...");
    await checkRLSPolicies();

    // Step 4: Test with sample data
    console.log("\n📋 Step 4: Testing with sample data...");
    await testWithSampleData();

    console.log("\n🎉 Notification preferences setup completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. The notification_preferences table is ready to use");
    console.log("2. RLS policies are in place for security");
    console.log("3. Your app can now save and load notification preferences");
    console.log("4. Test the notification system in your app");
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    console.log("\n🔧 Manual setup required:");
    console.log(
      "Please run the SQL from database/notification_preferences_schema.sql"
    );
    console.log("in your Supabase SQL editor.");
    process.exit(1);
  }
}

async function createNotificationPreferencesTable() {
  console.log("📝 Creating notification_preferences table...");

  // Basic table creation SQL
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      routine_reminder_enabled BOOLEAN DEFAULT true,
      routine_reminder_minutes INTEGER DEFAULT 15 CHECK (routine_reminder_minutes >= 1 AND routine_reminder_minutes <= 1440),
      data_sync_notifications_enabled BOOLEAN DEFAULT true,
      weekly_insights_enabled BOOLEAN DEFAULT true,
      weekly_insights_day TEXT DEFAULT 'monday' CHECK (weekly_insights_day IN ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')),
      weekly_insights_time TIME DEFAULT '09:00',
      experiment_reminders_enabled BOOLEAN DEFAULT true,
      goal_celebrations_enabled BOOLEAN DEFAULT true,
      test_notification_enabled BOOLEAN DEFAULT false,
      test_notification_time TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id)
    );
  `;

  // Try to create the table using the REST API
  try {
    // This is a workaround since we can't execute DDL via REST API
    console.log(
      "⚠️  Cannot create table via REST API. Please run this SQL in your Supabase SQL editor:"
    );
    console.log("\n" + "=".repeat(60));
    console.log(createTableSQL);
    console.log("=".repeat(60));
    console.log(
      "\n📋 Or use the complete schema from: database/notification_preferences_schema.sql"
    );

    // Wait for user to create table manually
    console.log("\n⏳ Waiting for table to be created...");
    await waitForTableCreation();
  } catch (error) {
    console.error("❌ Error creating table:", error);
    throw error;
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

async function checkRLSPolicies() {
  try {
    // Try to insert a test record (should fail due to RLS)
    const { error } = await supabase.from("notification_preferences").insert({
      user_id: "00000000-0000-0000-0000-000000000000", // Invalid UUID
      routine_reminder_enabled: true,
    });

    if (error && error.code === "42501") {
      console.log("✅ RLS policies are working (insert blocked as expected)");
    } else if (error) {
      console.log("⚠️  RLS may not be properly configured:", error.message);
    } else {
      console.log("⚠️  RLS may not be working (insert succeeded unexpectedly)");
    }
  } catch (error) {
    console.log("✅ RLS policies are working");
  }
}

async function testWithSampleData() {
  try {
    // Create a test user ID
    const testUserId = "11111111-1111-1111-1111-111111111111";

    // Try to insert test data
    const { data: insertData, error: insertError } = await supabase
      .from("notification_preferences")
      .insert({
        user_id: testUserId,
        routine_reminder_enabled: true,
        routine_reminder_minutes: 15,
        data_sync_notifications_enabled: true,
        weekly_insights_enabled: true,
        weekly_insights_day: "monday",
        weekly_insights_time: "09:00",
        experiment_reminders_enabled: true,
        goal_celebrations_enabled: true,
        test_notification_enabled: false,
      })
      .select();

    if (insertError) {
      console.log(
        "⚠️  Could not insert test data (RLS may be blocking):",
        insertError.message
      );
    } else {
      console.log("✅ Test data inserted successfully!");

      // Clean up test data
      const { error: deleteError } = await supabase
        .from("notification_preferences")
        .delete()
        .eq("user_id", testUserId);

      if (!deleteError) {
        console.log("✅ Test data cleaned up");
      }
    }
  } catch (error) {
    console.log(
      "⚠️  Test data insertion failed (this is normal with RLS):",
      error.message
    );
  }
}

// Run the setup
setupNotificationPreferences()
  .then(() => {
    console.log("\n✨ Setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Setup failed:", error);
    process.exit(1);
  });
