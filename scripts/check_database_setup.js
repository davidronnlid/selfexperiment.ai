const { createClient } = require("@supabase/supabase-js");

// Load environment variables
require("dotenv").config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Helper function to log with colors
function log(message, type = "info") {
  const colors = {
    info: "\x1b[36m", // Cyan
    success: "\x1b[32m", // Green
    error: "\x1b[31m", // Red
    warning: "\x1b[33m", // Yellow
  };
  const reset = "\x1b[0m";
  console.log(`${colors[type]}${message}${reset}`);
}

async function checkDatabaseSetup() {
  log("🔍 Checking database setup for variable sharing...");

  const requiredTables = [
    "variable_sharing_settings",
    "log_privacy_settings",
    "user_follows",
    "user_privacy_profile",
  ];

  let allTablesExist = true;

  for (const tableName of requiredTables) {
    try {
      log(`Checking table: ${tableName}...`);

      const { data, error } = await supabase
        .from(tableName)
        .select("id")
        .limit(1);

      if (error) {
        if (error.code === "42P01") {
          log(`❌ Table '${tableName}' does not exist`, "error");
          allTablesExist = false;
        } else if (error.code === "42501") {
          log(
            `⚠️ Table '${tableName}' exists but has permission issues`,
            "warning"
          );
        } else {
          log(
            `⚠️ Table '${tableName}' - unexpected error: ${error.message}`,
            "warning"
          );
        }
      } else {
        log(`✅ Table '${tableName}' exists and is accessible`, "success");
      }
    } catch (err) {
      log(`❌ Error checking table '${tableName}': ${err.message}`, "error");
      allTablesExist = false;
    }
  }

  log("\n" + "=".repeat(60));

  if (allTablesExist) {
    log(
      "🎉 All required tables exist! Variable sharing should work.",
      "success"
    );
  } else {
    log("❌ Some tables are missing. Variable sharing will not work.", "error");
    log(
      "\n📋 To fix this, execute the following SQL in your Supabase SQL Editor:",
      "info"
    );
    log("👉 Go to: Supabase Dashboard → SQL Editor", "info");
    log(
      "👉 Copy and paste the content from: database/privacy_schema.sql",
      "info"
    );
    log("👉 Click 'Run' to execute the schema", "info");

    log(
      "\nAlternatively, check the console output for specific missing tables.",
      "info"
    );
  }

  log("=".repeat(60));
}

// Test variable sharing functionality
async function testVariableSharing() {
  log("\n🧪 Testing variable sharing functionality...");

  try {
    // Try to get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      log(
        "⚠️ No authenticated user found. Please log in to test variable sharing.",
        "warning"
      );
      return;
    }

    log(`Testing with user: ${user.email}`, "info");

    // Try to read from variable_sharing_settings
    const { data, error } = await supabase
      .from("variable_sharing_settings")
      .select("*")
      .eq("user_id", user.id)
      .limit(5);

    if (error) {
      log(`❌ Failed to read sharing settings: ${error.message}`, "error");
      if (error.code === "42P01") {
        log("💡 Solution: Execute the privacy schema SQL in Supabase", "info");
      }
    } else {
      log(
        `✅ Successfully read sharing settings (${data.length} entries)`,
        "success"
      );

      // Try a test upsert
      log("Testing upsert functionality...");
      const { error: upsertError } = await supabase
        .from("variable_sharing_settings")
        .upsert({
          user_id: user.id,
          variable_name: "Test Variable",
          is_shared: false,
          variable_type: "predefined",
        });

      if (upsertError) {
        log(`❌ Upsert test failed: ${upsertError.message}`, "error");
      } else {
        log("✅ Upsert test successful", "success");

        // Clean up test data
        await supabase
          .from("variable_sharing_settings")
          .delete()
          .eq("user_id", user.id)
          .eq("variable_name", "Test Variable");

        log("✅ Test data cleaned up", "success");
      }
    }
  } catch (err) {
    log(`❌ Test failed: ${err.message}`, "error");
  }
}

async function main() {
  try {
    await checkDatabaseSetup();
    await testVariableSharing();
  } catch (error) {
    log(`❌ Diagnostic failed: ${error.message}`, "error");
  }
}

if (require.main === module) {
  main()
    .then(() => {
      log("\n🏁 Diagnostic complete!", "info");
      process.exit(0);
    })
    .catch((error) => {
      log(`Diagnostic failed: ${error.message}`, "error");
      process.exit(1);
    });
}

module.exports = { checkDatabaseSetup, testVariableSharing };
