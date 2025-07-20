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

async function testWithingsEdgeFunction() {
  log("🧪 Testing Withings Edge Function...");

  try {
    // Step 1: Get a user with Withings tokens
    log("Step 1: Finding users with Withings tokens...");
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from("withings_tokens")
      .select("user_id, access_token, refresh_token, expires_at")
      .limit(1);

    if (tokensError || !tokens || tokens.length === 0) {
      log("❌ No users with Withings tokens found", "error");
      return;
    }

    const testUser = tokens[0];
    log(`✅ Found test user: ${testUser.user_id}`, "success");

    // Step 2: Test the edge function
    log("Step 2: Testing edge function...");

    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/withings-sync`;

    // Test with last 30 days of data
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - 30 * 24 * 60 * 60; // 30 days ago

    const requestBody = {
      userId: testUser.user_id,
      startdate: startDate,
      enddate: endDate,
      meastype: [1, 5, 6, 8, 76, 77, 88], // Common measurements
    };

    log(`📡 Calling edge function for user ${testUser.user_id}...`);
    log(
      `📅 Date range: ${new Date(startDate * 1000).toISOString()} to ${new Date(
        endDate * 1000
      ).toISOString()}`
    );

    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (response.ok) {
      log("✅ Edge function call successful!", "success");
      log(`📊 Result: ${JSON.stringify(result, null, 2)}`, "info");
    } else {
      log("❌ Edge function call failed", "error");
      log(`📊 Error: ${JSON.stringify(result, null, 2)}`, "error");
    }

    // Step 3: Verify data in database
    log("Step 3: Verifying data in database...");

    // Check withings_variable_data_points table
    const { data: dataPoints, error: dataPointsError } = await supabaseAdmin
      .from("withings_variable_data_points")
      .select("*")
      .eq("user_id", testUser.user_id)
      .order("date", { ascending: false })
      .limit(10);

    if (dataPointsError) {
      log(`❌ Error reading data points: ${dataPointsError.message}`, "error");
    } else {
      log(
        `✅ Found ${dataPoints.length} data points for user ${testUser.user_id}`,
        "success"
      );

      // Group by variable type
      const variableCounts = {};
      dataPoints.forEach((point) => {
        variableCounts[point.variable] =
          (variableCounts[point.variable] || 0) + 1;
      });

      log("📊 Data breakdown:", "info");
      Object.entries(variableCounts).forEach(([variable, count]) => {
        log(`  - ${variable}: ${count} records`, "info");
      });
    }

    // Step 4: Check total data count
    log("Step 4: Checking total data count...");

    const { count: totalCount, error: countError } = await supabaseAdmin
      .from("withings_variable_data_points")
      .select("*", { count: "exact", head: true })
      .eq("user_id", testUser.user_id);

    if (countError) {
      log(`❌ Error counting data: ${countError.message}`, "error");
    } else {
      log(
        `✅ Total data points for user ${testUser.user_id}: ${totalCount}`,
        "success"
      );
    }

    // Step 5: Check data freshness
    log("Step 5: Checking data freshness...");

    const { data: latestData, error: latestError } = await supabaseAdmin
      .from("withings_variable_data_points")
      .select("date, variable, value")
      .eq("user_id", testUser.user_id)
      .order("date", { ascending: false })
      .limit(1);

    if (latestError) {
      log(`❌ Error getting latest data: ${latestError.message}`, "error");
    } else if (latestData && latestData.length > 0) {
      const latest = latestData[0];
      const daysAgo = Math.floor(
        (Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24)
      );
      log(
        `✅ Latest data point: ${latest.date} (${daysAgo} days ago)`,
        "success"
      );
      log(`   Variable: ${latest.variable}, Value: ${latest.value}`, "info");
    }

    log("🎉 Edge function testing completed!", "success");
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, "error");
    log(`Stack trace: ${error.stack}`, "error");
  }
}

async function verifyAllUsersData() {
  log("🔍 Verifying all users' Withings data...");

  try {
    // Get all users with Withings tokens
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from("withings_tokens")
      .select("user_id");

    if (tokensError) {
      log(`❌ Error reading tokens: ${tokensError.message}`, "error");
      return;
    }

    log(`📊 Found ${tokens.length} users with Withings tokens`, "info");

    // Check data for each user
    for (const token of tokens) {
      const { count: dataCount, error: countError } = await supabaseAdmin
        .from("withings_variable_data_points")
        .select("*", { count: "exact", head: true })
        .eq("user_id", token.user_id);

      if (countError) {
        log(
          `❌ Error counting data for user ${token.user_id}: ${countError.message}`,
          "error"
        );
      } else {
        log(
          `✅ User ${token.user_id}: ${dataCount} data points`,
          dataCount > 0 ? "success" : "warning"
        );
      }
    }

    // Get overall statistics
    const { count: totalDataPoints, error: totalError } = await supabaseAdmin
      .from("withings_variable_data_points")
      .select("*", { count: "exact", head: true });

    if (totalError) {
      log(`❌ Error getting total count: ${totalError.message}`, "error");
    } else {
      log(
        `📊 Total Withings data points across all users: ${totalDataPoints}`,
        "success"
      );
    }

    // Get variable distribution
    const { data: variableStats, error: statsError } = await supabaseAdmin
      .from("withings_variable_data_points")
      .select("variable")
      .limit(1000);

    if (statsError) {
      log(`❌ Error getting variable stats: ${statsError.message}`, "error");
    } else {
      const variableCounts = {};
      variableStats.forEach((point) => {
        variableCounts[point.variable] =
          (variableCounts[point.variable] || 0) + 1;
      });

      log("📊 Variable distribution (sample):", "info");
      Object.entries(variableCounts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([variable, count]) => {
          log(`  - ${variable}: ${count} records`, "info");
        });
    }
  } catch (error) {
    log(`❌ Verification failed: ${error.message}`, "error");
  }
}

async function main() {
  try {
    await testWithingsEdgeFunction();
    console.log("\n" + "=".repeat(50) + "\n");
    await verifyAllUsersData();
  } catch (error) {
    log(`❌ Main test failed: ${error.message}`, "error");
  }
}

if (require.main === module) {
  main()
    .then(() => {
      log("\n🏁 Testing complete!", "info");
      process.exit(0);
    })
    .catch((error) => {
      log(`Testing failed: ${error.message}`, "error");
      process.exit(1);
    });
}
