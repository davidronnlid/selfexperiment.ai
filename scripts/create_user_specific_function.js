const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
