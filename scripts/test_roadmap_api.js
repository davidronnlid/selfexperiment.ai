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

async function testRoadmapAPI() {
  log("🧪 Testing roadmap API functionality...");

  try {
    // Test 1: Check if we can read from roadmap_posts
    log("Test 1: Reading from roadmap_posts...");
    const { data: posts, error: readError } = await supabaseAdmin
      .from("roadmap_posts")
      .select("*")
      .limit(5);

    if (readError) {
      log(`❌ Failed to read posts: ${readError.message}`, "error");
      return;
    }

    log(`✅ Successfully read ${posts.length} posts`, "success");

    // Test 2: Try to create a test post
    log("Test 2: Creating a test post...");
    const testPost = {
      title: "Test Post - API Test",
      description: "This is a test post to verify API functionality",
      tag: "Analytics",
      created_by: "00000000-0000-0000-0000-000000000000", // Test UUID
      last_edited_by: "00000000-0000-0000-0000-000000000000",
    };

    const { data: newPost, error: createError } = await supabaseAdmin
      .from("roadmap_posts")
      .insert(testPost)
      .select("*")
      .single();

    if (createError) {
      log(`❌ Failed to create post: ${createError.message}`, "error");
      log(`Error code: ${createError.code}`, "error");
      log(`Error details: ${JSON.stringify(createError)}`, "error");
      return;
    }

    log(`✅ Successfully created test post with ID: ${newPost.id}`, "success");

    // Test 3: Clean up test post
    log("Test 3: Cleaning up test post...");
    const { error: deleteError } = await supabaseAdmin
      .from("roadmap_posts")
      .delete()
      .eq("id", newPost.id);

    if (deleteError) {
      log(`⚠️ Failed to delete test post: ${deleteError.message}`, "warning");
    } else {
      log("✅ Successfully deleted test post", "success");
    }

    log("🎉 All API tests passed!", "success");
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, "error");
    log(`Stack trace: ${error.stack}`, "error");
  }
}

async function checkEnvironmentVariables() {
  log("🔍 Checking environment variables...");

  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      log(`❌ Missing environment variable: ${varName}`, "error");
    } else {
      log(`✅ ${varName} is set (${value.substring(0, 10)}...)`, "success");
    }
  }
}

async function main() {
  try {
    await checkEnvironmentVariables();
    await testRoadmapAPI();
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
