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

async function checkRoadmapTables() {
  log("🔍 Checking roadmap tables...");

  const requiredTables = [
    "roadmap_posts",
    "roadmap_likes",
    "roadmap_edit_history",
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
        } else {
          log(`⚠️ Table '${tableName}' - error: ${error.message}`, "warning");
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
    log("🎉 All roadmap tables exist! Roadmap should work.", "success");
  } else {
    log("❌ Some roadmap tables are missing. Roadmap will not work.", "error");
    log(
      "\n📋 To fix this, execute the following SQL in your Supabase SQL Editor:",
      "info"
    );
    log("👉 Go to: Supabase Dashboard → SQL Editor", "info");
    log(
      "👉 Copy and paste the content from: database/roadmap_schema.sql",
      "info"
    );
    log("👉 Click 'Run' to execute the schema", "info");
  }

  log("=".repeat(60));
}

async function main() {
  try {
    await checkRoadmapTables();
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
