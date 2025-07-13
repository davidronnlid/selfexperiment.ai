const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addDisplayOrderColumn() {
  try {
    console.log(
      "Adding display_order column to user_variable_preferences table..."
    );

    // Read the SQL file
    const sqlPath = path.join(
      __dirname,
      "..",
      "database",
      "add_display_order_column.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Execute the SQL
    const { error } = await supabase.rpc("exec_sql", { sql });

    if (error) {
      console.error("Error executing SQL:", error);
      process.exit(1);
    }

    console.log(
      "✅ Successfully added display_order column to user_variable_preferences table"
    );

    // Verify the column was added
    const { data, error: verifyError } = await supabase
      .from("user_variable_preferences")
      .select("display_order")
      .limit(1);

    if (verifyError) {
      console.error("Error verifying column:", verifyError);
    } else {
      console.log("✅ Verified display_order column exists");
    }
  } catch (error) {
    console.error("Failed to add display_order column:", error);
    process.exit(1);
  }
}

// Run the migration
addDisplayOrderColumn();
