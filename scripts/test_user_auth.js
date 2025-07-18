const { createClient } = require("@supabase/supabase-js");

// Load environment variables
require("dotenv").config();

// Initialize Supabase client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

async function testUserAuth() {
  log("🧪 Testing user authentication and profiles...");

  try {
    // Test 1: Check if we can read from profiles table
    log("Test 1: Reading from profiles table...");
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, username, name")
      .limit(5);

    if (profilesError) {
      log(`❌ Failed to read profiles: ${profilesError.message}`, "error");
      return;
    }

    log(`✅ Successfully read ${profiles.length} profiles`, "success");
    profiles.forEach((profile) => {
      log(`  - ${profile.username || "No username"} (${profile.id})`, "info");
    });

    // Test 2: Check if we can read from auth.users (if accessible)
    log("Test 2: Reading from auth.users table...");
    const { data: authUsers, error: authError } = await supabaseAdmin
      .from("auth.users")
      .select("id, email")
      .limit(5);

    if (authError) {
      log(`⚠️ Cannot access auth.users: ${authError.message}`, "warning");
      log(
        "This is normal - auth.users is typically not accessible via service role",
        "info"
      );
    } else {
      log(`✅ Successfully read ${authUsers.length} auth users`, "success");
      authUsers.forEach((user) => {
        log(`  - ${user.email} (${user.id})`, "info");
      });
    }

    // Test 3: Try to create a test profile
    log("Test 3: Creating a test profile...");
    const testProfile = {
      id: "00000000-0000-0000-0000-000000000000",
      username: "testuser",
      name: "Test User",
      avatar_url: null,
    };

    const { data: newProfile, error: createProfileError } = await supabaseAdmin
      .from("profiles")
      .insert(testProfile)
      .select("*")
      .single();

    if (createProfileError) {
      log(
        `❌ Failed to create profile: ${createProfileError.message}`,
        "error"
      );
      log(`Error code: ${createProfileError.code}`, "error");
    } else {
      log(
        `✅ Successfully created test profile with ID: ${newProfile.id}`,
        "success"
      );

      // Clean up test profile
      const { error: deleteProfileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", newProfile.id);

      if (deleteProfileError) {
        log(
          `⚠️ Failed to delete test profile: ${deleteProfileError.message}`,
          "warning"
        );
      } else {
        log("✅ Successfully deleted test profile", "success");
      }
    }

    log("🎉 User authentication tests completed!", "success");
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, "error");
    log(`Stack trace: ${error.stack}`, "error");
  }
}

async function main() {
  try {
    await testUserAuth();
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
