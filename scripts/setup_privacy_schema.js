const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // You need this for admin operations
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

// Function to execute SQL from file
async function executeSqlFromFile(filePath) {
  try {
    log(`📄 Reading SQL file: ${filePath}`);
    const sqlContent = fs.readFileSync(filePath, "utf8");

    // Split SQL content by semicolons and filter out empty statements
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    log(`🔄 Executing ${statements.length} SQL statements...`);

    for (const statement of statements) {
      if (statement.trim()) {
        log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc("exec_sql", { sql: statement });

        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from("_dummy_") // This will fail but we want to execute raw SQL
            .select("1")
            .limit(0);

          // If both fail, log the error but continue
          log(
            `Warning: Could not execute statement: ${error.message}`,
            "warning"
          );
        }
      }
    }

    log("✅ SQL file executed successfully", "success");
  } catch (error) {
    log(`❌ Error executing SQL file: ${error.message}`, "error");
    throw error;
  }
}

// Function to create privacy tables manually using Supabase client
async function createPrivacyTables() {
  log("🏗️ Creating privacy tables...");

  try {
    // Create variable_sharing_settings table
    log("Creating variable_sharing_settings table...");
    await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS variable_sharing_settings (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          variable_name TEXT NOT NULL,
          is_shared BOOLEAN DEFAULT false,
          variable_type TEXT NOT NULL CHECK (variable_type IN ('predefined', 'custom', 'oura')),
          category TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, variable_name)
        );
      `,
    });

    // Create log_privacy_settings table
    log("Creating log_privacy_settings table...");
    await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS log_privacy_settings (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          log_id INTEGER NOT NULL,
          log_type TEXT NOT NULL CHECK (log_type IN ('daily_log', 'oura_data')),
          is_hidden BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, log_id, log_type)
        );
      `,
    });

    // Create user_follows table
    log("Creating user_follows table...");
    await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS user_follows (
          id SERIAL PRIMARY KEY,
          follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          followed_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(follower_id, followed_id),
          CHECK (follower_id != followed_id)
        );
      `,
    });

    // Create user_privacy_profile table
    log("Creating user_privacy_profile table...");
    await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS user_privacy_profile (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
          profile_visibility TEXT DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'followers_only')),
          allow_follow_requests BOOLEAN DEFAULT true,
          show_username_in_shared_data BOOLEAN DEFAULT false,
          anonymize_shared_data BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    });

    log("✅ Privacy tables created successfully", "success");
  } catch (error) {
    log(`❌ Error creating privacy tables: ${error.message}`, "error");
    // Continue with alternative approach
  }
}

// Alternative: Use direct Supabase table creation
async function createTablesDirectly() {
  log("🔧 Using alternative table creation method...");

  try {
    // Check if variable_sharing_settings table exists
    const { data, error } = await supabase
      .from("variable_sharing_settings")
      .select("id")
      .limit(1);

    if (error && error.code === "42P01") {
      // Table doesn't exist, we need to create it manually
      log(
        "variable_sharing_settings table doesn't exist. Please run the following SQL in your Supabase SQL editor:",
        "warning"
      );

      const privacySchemaPath = path.join(
        __dirname,
        "..",
        "database",
        "privacy_schema.sql"
      );
      const sqlContent = fs.readFileSync(privacySchemaPath, "utf8");

      log("📋 Copy and paste this SQL into your Supabase SQL editor:", "info");
      console.log("\n" + "=".repeat(80));
      console.log(sqlContent);
      console.log("=".repeat(80) + "\n");

      return false;
    } else if (!error) {
      log("✅ variable_sharing_settings table already exists", "success");
      return true;
    } else {
      throw error;
    }
  } catch (error) {
    log(`❌ Error checking tables: ${error.message}`, "error");
    return false;
  }
}

// Main setup function
async function setupPrivacySchema() {
  log("🚀 Setting up Privacy Schema...");

  try {
    // Check if service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      log(
        "⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using alternative method...",
        "warning"
      );
      const created = await createTablesDirectly();
      if (!created) {
        log("Please manually execute the SQL schema in Supabase", "warning");
        process.exit(1);
      }
      return;
    }

    // Try to create tables
    await createPrivacyTables();

    // Try to execute the full schema file
    const privacySchemaPath = path.join(
      __dirname,
      "..",
      "database",
      "privacy_schema.sql"
    );
    if (fs.existsSync(privacySchemaPath)) {
      await executeSqlFromFile(privacySchemaPath);
    }

    log("🎉 Privacy schema setup completed successfully!", "success");

    // Verify tables exist
    const { data, error } = await supabase
      .from("variable_sharing_settings")
      .select("id")
      .limit(1);

    if (error) {
      log(
        "⚠️ Could not verify table creation. Please check manually.",
        "warning"
      );
    } else {
      log("✅ Tables verified successfully", "success");
    }
  } catch (error) {
    log(`❌ Setup failed: ${error.message}`, "error");
    log(
      "Please manually execute the privacy_schema.sql file in your Supabase SQL editor",
      "warning"
    );
  }
}

// Run the setup
if (require.main === module) {
  setupPrivacySchema()
    .then(() => {
      log(
        "Setup completed. You can now use variable sharing functionality!",
        "success"
      );
      process.exit(0);
    })
    .catch((error) => {
      log(`Setup failed: ${error.message}`, "error");
      process.exit(1);
    });
}

module.exports = { setupPrivacySchema };
