const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Fallback values for environment variables
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ecstnwwcplbofbwbhbck.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjc3Rud3djcGxib2Zid2JoYmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNzY5NjMsImV4cCI6MjA2Njc1Mjk2M30.iTZ65IW6iEKug6VMdg4zIADF7QF69LCaGpDxh4FORDc";

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
