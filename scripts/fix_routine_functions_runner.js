const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRoutineFunctions() {
  console.log("🔧 Fixing routine functions...");

  const sql = fs.readFileSync(
    "scripts/fix_routine_functions_with_weekdays.sql",
    "utf8"
  );

  const { error } = await supabase.rpc("exec_sql", { sql });

  if (error) {
    console.error("❌ Error fixing routine functions:", error);
    process.exit(1);
  }

  console.log("✅ Routine functions fixed successfully");
}

fixRoutineFunctions().catch(console.error);
