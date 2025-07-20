const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testOuraAPI() {
  console.log("🔍 Testing Oura API and edge function...\n");

  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // 1. Check if user has valid tokens
    console.log("1. Checking Oura tokens...");
    const { data: tokens, error: tokenError } = await supabase
      .from("oura_tokens")
      .select("access_token, refresh_token, created_at")
      .eq("user_id", testUserId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (tokenError) {
      console.error("❌ Error fetching tokens:", tokenError);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log("❌ No Oura tokens found for user");
      return;
    }

    const token = tokens[0];
    console.log("✅ Found Oura token created at:", token.created_at);

    // 2. Test Oura API directly
    console.log("\n2. Testing Oura API directly...");
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]; // 7 days ago

    console.log(`   Fetching data from ${startDate} to ${endDate}`);

    const endpoints = [
      "daily_sleep",
      "daily_readiness",
      "daily_activity",
      "heartrate",
    ];

    for (const endpoint of endpoints) {
      try {
        const url = `https://api.ouraring.com/v2/usercollection/${endpoint}?start_date=${startDate}&end_date=${endDate}`;
        console.log(`   Testing ${endpoint}...`);

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });

        if (!response.ok) {
          console.log(
            `   ❌ ${endpoint}: ${response.status} ${response.statusText}`
          );
          if (response.status === 401) {
            console.log("   ⚠️  Token might be expired");
          }
        } else {
          const data = await response.json();
          console.log(`   ✅ ${endpoint}: ${data.data?.length || 0} records`);

          if (data.data && data.data.length > 0) {
            console.log(
              `   📊 Sample data:`,
              JSON.stringify(data.data[0], null, 2)
            );
          }
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint}: Error - ${error.message}`);
      }
    }

    // 3. Test the edge function
    console.log("\n3. Testing edge function...");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/oura-sync-all`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            userId: testUserId,
            clearExisting: false,
            startYear: 2024, // Just test recent data
          }),
        }
      );

      if (!response.ok) {
        console.log(
          `❌ Edge function error: ${response.status} ${response.statusText}`
        );
        const errorText = await response.text();
        console.log(`Error details: ${errorText}`);
      } else {
        const result = await response.json();
        console.log(
          "✅ Edge function response:",
          JSON.stringify(result, null, 2)
        );
      }
    } catch (error) {
      console.log(`❌ Edge function request failed: ${error.message}`);
    }

    // 4. Check if data was inserted
    console.log("\n4. Checking if data was inserted...");
    const { data: dataPoints, error: dataError } = await supabase
      .from("oura_variable_data_points")
      .select("id, date, variable_id, value")
      .eq("user_id", testUserId)
      .order("date", { ascending: false })
      .limit(5);

    if (dataError) {
      console.error("❌ Error checking data points:", dataError);
    } else {
      console.log(
        `✅ Found ${dataPoints.length} data points after edge function run`
      );
      dataPoints.forEach((dp) => {
        console.log(
          `   - ${dp.date}: ${dp.value} (Variable ID: ${dp.variable_id})`
        );
      });
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testOuraAPI();
