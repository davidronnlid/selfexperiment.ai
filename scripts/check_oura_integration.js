const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOuraIntegration() {
  console.log("🔍 Checking Oura Integration Status...");
  console.log("=====================================\n");

  try {
    // Check if oura_tokens table exists and has data
    console.log("📋 Checking oura_tokens table...");
    const { data: tokens, error: tokensError } = await supabase
      .from("oura_tokens")
      .select("id, user_id, access_token, created_at")
      .limit(5);

    if (tokensError) {
      console.log("❌ oura_tokens table error:", tokensError.message);
      console.log("   This table might not exist or have different structure");
    } else {
      console.log(
        `✅ oura_tokens table exists with ${tokens?.length || 0} entries`
      );
      if (tokens && tokens.length > 0) {
        console.log("   Sample token entry:", {
          id: tokens[0].id,
          has_user_id: !!tokens[0].user_id,
          has_access_token: !!tokens[0].access_token,
          created_at: tokens[0].created_at,
        });
      }
    }

    // Check if oura_variable_logs table exists and has data
    console.log("\n📋 Checking oura_variable_logs table...");
    const { data: logs, error: logsError } = await supabase
      .from("oura_variable_logs")
      .select("id, user_id, variable_id, date, value, source")
      .limit(5);

    if (logsError) {
      console.log("❌ oura_variable_logs table error:", logsError.message);
      console.log("   This table might not exist or have different structure");
    } else {
      console.log(
        `✅ oura_variable_logs table exists with ${logs?.length || 0} entries`
      );
      if (logs && logs.length > 0) {
        console.log("   Sample log entry:", {
          id: logs[0].id,
          variable_id: logs[0].variable_id,
          date: logs[0].date,
          value: logs[0].value,
          source: logs[0].source,
        });
      }
    }

    // Check environment variables
    console.log("\n🔍 Checking environment variables...");
    const requiredEnvVars = [
      "NEXT_PUBLIC_OURA_CLIENT_ID",
      "OURA_CLIENT_ID",
      "OURA_CLIENT_SECRET",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      console.log("⚠️ Missing environment variables:");
      missingVars.forEach((varName) => console.log(`   - ${varName}`));
    } else {
      console.log("✅ All required environment variables are set");
    }

    // Check if variables table has Oura-related variables
    console.log("\n📋 Checking for Oura variables in variables table...");
    const { data: ouraVariables, error: varsError } = await supabase
      .from("variables")
      .select("id, slug, label, source_type")
      .eq("source_type", "oura")
      .limit(10);

    if (varsError) {
      console.log("❌ Error checking variables table:", varsError.message);
    } else {
      console.log(
        `✅ Found ${
          ouraVariables?.length || 0
        } Oura variables in variables table`
      );
      if (ouraVariables && ouraVariables.length > 0) {
        console.log("   Sample Oura variables:");
        ouraVariables.slice(0, 3).forEach((v) => {
          console.log(`     - ${v.label} (${v.slug})`);
        });
      } else {
        console.log("   ⚠️ No Oura variables found in variables table");
        console.log("   You may need to create Oura variables manually");
      }
    }

    // Summary and recommendations
    console.log("\n📊 Integration Status Summary:");
    console.log("===============================");

    const hasTokens = !tokensError && tokens && tokens.length > 0;
    const hasLogs = !logsError && logs && logs.length > 0;
    const hasEnvVars = missingVars.length === 0;
    const hasVariables =
      !varsError && ouraVariables && ouraVariables.length > 0;

    console.log(`✅ oura_tokens table: ${hasTokens ? "OK" : "Missing/Empty"}`);
    console.log(
      `✅ oura_variable_logs table: ${hasLogs ? "OK" : "Missing/Empty"}`
    );
    console.log(`✅ Environment variables: ${hasEnvVars ? "OK" : "Missing"}`);
    console.log(`✅ Oura variables: ${hasVariables ? "OK" : "Missing"}`);

    if (hasTokens && hasLogs && hasEnvVars && hasVariables) {
      console.log("\n🎉 Oura integration appears to be fully functional!");
      console.log(
        "📱 Users should be able to connect their Oura Ring and see data"
      );
    } else {
      console.log("\n⚠️ Oura integration needs attention:");

      if (!hasTokens) {
        console.log("   - oura_tokens table is missing or empty");
        console.log("   - Users need to connect their Oura Ring first");
      }

      if (!hasLogs) {
        console.log("   - oura_variable_logs table is missing or empty");
        console.log("   - No Oura data has been synced yet");
      }

      if (!hasEnvVars) {
        console.log("   - Missing environment variables");
        console.log("   - Add Oura API credentials to your .env file");
      }

      if (!hasVariables) {
        console.log("   - No Oura variables in variables table");
        console.log("   - Create Oura variables manually or via migration");
      }
    }

    console.log("\n📝 Next Steps:");
    console.log("1. Ensure all environment variables are set");
    console.log("2. Create Oura variables in the variables table if missing");
    console.log("3. Test the Oura connection flow in the app");
    console.log("4. Check the analytics page for Oura integration");
  } catch (error) {
    console.error("❌ Error checking Oura integration:", error);
  }
}

// Run the check
checkOuraIntegration()
  .then(() => {
    console.log("\n🏁 Check complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Check failed:", error);
    process.exit(1);
  });
