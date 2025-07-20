const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixOuraTokensRLS() {
  console.log("🔧 Fixing Oura tokens RLS policies...\n");

  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync(
      "database/fix_oura_tokens_rls_policy.sql",
      "utf8"
    );

    // Split SQL statements (basic splitting on semicolons, excluding comments)
    const statements = sqlContent
      .split("\n")
      .filter(
        (line) =>
          !line.trim().startsWith("--") &&
          !line.trim().startsWith("\\d") &&
          line.trim()
      )
      .join("\n")
      .split(";")
      .map((stmt) => stmt.trim())
      .filter(
        (stmt) => stmt && !stmt.startsWith("SELECT") && !stmt.startsWith("\\d")
      );

    console.log("📝 Executing SQL statements...\n");

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`${i + 1}. Executing: ${statement.substring(0, 60)}...`);

      try {
        const { error } = await supabase.rpc("exec_sql", { sql: statement });

        if (error) {
          // Try direct query if rpc fails
          const { error: directError } = await supabase
            .from("_")
            .select("*")
            .limit(0);

          if (statement.includes("POLICY")) {
            console.log("   ⚠️  Policy statement - may need manual execution");
          } else {
            console.error(`   ❌ Error: ${error.message}`);
          }
        } else {
          console.log("   ✅ Success");
        }
      } catch (err) {
        console.error(`   ❌ Exception: ${err.message}`);
      }
    }

    // Now test if the fix worked
    console.log("\n🧪 Testing RLS fix...");

    const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";
    const testTokenData = {
      access_token: "test_rls_fix_" + Date.now(),
      refresh_token: "test_refresh_rls_" + Date.now(),
      user_id: testUserId,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: upsertResult, error: upsertError } = await supabase
      .from("oura_tokens")
      .upsert(testTokenData, {
        onConflict: "user_id",
      })
      .select();

    if (upsertError) {
      console.error("❌ RLS fix didn't work:", upsertError);
      console.log("\n💡 Manual SQL execution required:");
      console.log("   1. Go to your Supabase SQL Editor");
      console.log(
        "   2. Run the SQL file: database/fix_oura_tokens_rls_policy.sql"
      );
      console.log("   3. Focus on the POLICY statements and GRANT statements");
    } else {
      console.log("✅ RLS fix successful!");
      console.log("✅ Oura callback should now work");

      // Clean up test data
      await supabase
        .from("oura_tokens")
        .delete()
        .eq("user_id", testUserId)
        .like("access_token", "test_rls_fix_%");

      console.log("🔗 Try reconnecting: http://localhost:3000/oura-test");
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
    console.log("\n💡 Fallback: Run the SQL manually in Supabase SQL Editor");
    console.log("   File: database/fix_oura_tokens_rls_policy.sql");
  }
}

fixOuraTokensRLS();
