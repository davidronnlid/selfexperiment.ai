const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Fallback values for environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createUserSpecificFunction() {
  try {
    console.log("Creating user-specific auto-logging function...");

    // Read the SQL file
    const sqlContent = fs.readFileSync(
      "./database/user_specific_auto_logs.sql",
      "utf8"
    );

    // Execute the SQL
    const { error } = await supabase.rpc("exec_sql", {
      sql: sqlContent,
    });

    if (error) {
      console.error("Error creating function:", error);
      process.exit(1);
    } else {
      console.log(
        "✅ User-specific auto-logging function created successfully"
      );
    }
  } catch (err) {
    console.error("Script error:", err);
    process.exit(1);
  }
}

createUserSpecificFunction();
