const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRoutineFunctions() {
  console.log("🔍 Checking routine database functions...");

  try {
    // Check if get_user_routines function exists
    const { data: functions, error: functionsError } = await supabase.rpc(
      "exec_sql",
      {
        sql: `
        SELECT 
          proname as function_name,
          prosrc as function_source
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND proname IN ('get_user_routines', 'create_routine', 'update_routine', 'delete_routine')
        ORDER BY proname;
      `,
      }
    );

    if (functionsError) {
      console.error("❌ Error checking functions:", functionsError);
      return;
    }

    console.log("📋 Found functions:", functions);

    // Check if routine tables exist
    const { data: tables, error: tablesError } = await supabase.rpc(
      "exec_sql",
      {
        sql: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('daily_routines', 'routine_times', 'routine_time_variables')
        ORDER BY table_name;
      `,
      }
    );

    if (tablesError) {
      console.error("❌ Error checking tables:", tablesError);
      return;
    }

    console.log("📊 Found tables:", tables);

    // Try to test the get_user_routines function
    console.log("🧪 Testing get_user_routines function...");

    const { data: testResult, error: testError } = await supabase.rpc(
      "get_user_routines",
      {
        p_user_id: "00000000-0000-0000-0000-000000000000", // dummy UUID
      }
    );

    if (testError) {
      console.error("❌ Error testing get_user_routines:", testError);
      if (testError.message.includes("does not exist")) {
        console.log(
          "💡 The get_user_routines function does not exist in the database"
        );
        console.log("💡 You need to run the database schema setup");
      }
    } else {
      console.log("✅ get_user_routines function works correctly");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkRoutineFunctions();
