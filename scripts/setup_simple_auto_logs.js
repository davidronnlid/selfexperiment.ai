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

async function setupSimpleAutoLogs() {
  try {
    console.log("🔧 Setting up simplified auto-logging function...");

    // Read the SQL file
    const sqlContent = fs.readFileSync(
      "./database/simple_routine_auto_logs.sql",
      "utf8"
    );

    // Try to execute using a custom SQL execution approach
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`📋 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(
        `   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`
      );

      try {
        // For Supabase, we need to use the REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: "POST",
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sql: statement + ";" }),
        });

        if (!response.ok) {
          // If exec_sql doesn't exist, try alternative approach
          console.log(
            `   ⚠️  exec_sql not available, trying direct execution...`
          );

          // For function creation, we might need to use the SQL editor manually
          if (statement.includes("CREATE OR REPLACE FUNCTION")) {
            console.log(
              `   ℹ️  Please run this function creation manually in Supabase SQL Editor:`
            );
            console.log(`   ${statement};`);
          } else if (statement.includes("CREATE INDEX")) {
            console.log(
              `   ℹ️  Please run this index creation manually in Supabase SQL Editor:`
            );
            console.log(`   ${statement};`);
          } else if (statement.includes("GRANT")) {
            console.log(
              `   ℹ️  Please run this grant statement manually in Supabase SQL Editor:`
            );
            console.log(`   ${statement};`);
          }
        } else {
          console.log(`   ✅ Executed successfully`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${error.message}`);
      }
    }

    console.log("\n📝 MANUAL SETUP REQUIRED:");
    console.log("Since automatic execution failed, please:");
    console.log("1. Open your Supabase dashboard");
    console.log("2. Go to SQL Editor");
    console.log(
      "3. Copy and paste the entire contents of database/simple_routine_auto_logs.sql"
    );
    console.log("4. Run the SQL script");
    console.log("");
    console.log(
      "✅ After manual setup, your auto-logging system will be ready!"
    );
  } catch (err) {
    console.error("❌ Script error:", err);
    console.log("\n📝 FALLBACK INSTRUCTIONS:");
    console.log(
      "Please manually run the SQL in database/simple_routine_auto_logs.sql in your Supabase dashboard."
    );
  }
}

setupSimpleAutoLogs();
