const { createClient } = require("@supabase/supabase-js");

// Load environment variables
require("dotenv").config();

// Initialize Supabase client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

async function testWithingsIntegration() {
  log("🧪 Testing Withings integration...");

  try {
    // Test 1: Check if we can read from withings_tokens table
    log("Test 1: Reading from withings_tokens table...");
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from("withings_tokens")
      .select("user_id, access_token, refresh_token, expires_at")
      .limit(5);

    if (tokensError) {
      log(`❌ Failed to read tokens: ${tokensError.message}`, "error");
      return;
    }

    log(`✅ Successfully read ${tokens.length} token records`, "success");
    tokens.forEach((token) => {
      log(`  - User: ${token.user_id}, Expires: ${token.expires_at}`, "info");
    });

    // Test 2: Check if we can read from withings_variable_logs table
    log("Test 2: Reading from withings_variable_logs table...");
    const { data: logs, error: logsError } = await supabaseAdmin
      .from("withings_variable_logs")
      .select("user_id, date, variable, value")
      .limit(5);

    if (logsError) {
      log(`❌ Failed to read logs: ${logsError.message}`, "error");
    } else {
      log(`✅ Successfully read ${logs.length} log records`, "success");
      logs.forEach((log) => {
        log(
          `  - User: ${log.user_id}, Date: ${log.date}, Variable: ${log.variable}, Value: ${log.value}`,
          "info"
        );
      });
    }

    // Test 3: Check if we can read from withings_weights table
    log("Test 3: Reading from withings_weights table...");
    const { data: weights, error: weightsError } = await supabaseAdmin
      .from("withings_weights")
      .select("user_id, date, weight_kg, fat_ratio")
      .limit(5);

    if (weightsError) {
      log(`❌ Failed to read weights: ${weightsError.message}`, "error");
    } else {
      log(`✅ Successfully read ${weights.length} weight records`, "success");
      weights.forEach((weight) => {
        log(
          `  - User: ${weight.user_id}, Date: ${weight.date}, Weight: ${weight.weight_kg}kg, Fat: ${weight.fat_ratio}%`,
          "info"
        );
      });
    }

    // Test 4: Test API endpoints (if server is running)
    log("Test 4: Testing API endpoints...");

    // Test fetch endpoint
    try {
      const response = await fetch(
        "http://localhost:3000/api/withings/fetch?startdate=1751559322&enddate=1752768922&meastype=1,5,6,8,76,77,88"
      );
      log(
        `Fetch API status: ${response.status}`,
        response.ok ? "success" : "error"
      );

      if (!response.ok) {
        const errorData = await response.json();
        log(`Fetch API error: ${JSON.stringify(errorData)}`, "error");
      }
    } catch (error) {
      log(`❌ Fetch API test failed: ${error.message}`, "error");
    }

    log("🎉 Withings integration tests completed!", "success");
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, "error");
    log(`Stack trace: ${error.stack}`, "error");
  }
}

async function main() {
  try {
    await testWithingsIntegration();
  } catch (error) {
    log(`❌ Diagnostic failed: ${error.message}`, "error");
  }
}

if (require.main === module) {
  main()
    .then(() => {
      log("\n🏁 Diagnostic complete!", "info");
      process.exit(0);
    })
    .catch((error) => {
      log(`Diagnostic failed: ${error.message}`, "error");
      process.exit(1);
    });
}
