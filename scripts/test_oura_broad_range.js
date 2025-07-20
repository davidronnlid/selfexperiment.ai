const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testOuraBroadRange() {
  console.log("🔍 Testing Oura API with broader date range...\n");

  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // 1. Get original tokens (before my test overwrote them)
    console.log("1. Getting original tokens...");
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

    // 2. Test with broader date range
    console.log("\n2. Testing with broader date range...");

    // Test different date ranges
    const dateRanges = [
      { start: "2025-07-01", end: "2025-07-19", label: "July 2025" },
      { start: "2025-06-01", end: "2025-06-30", label: "June 2025" },
      { start: "2025-01-01", end: "2025-01-31", label: "January 2025" },
      { start: "2024-12-01", end: "2024-12-31", label: "December 2024" },
      { start: "2024-01-01", end: "2024-01-31", label: "January 2024" },
      { start: "2023-01-01", end: "2023-01-31", label: "January 2023" },
    ];

    const endpoints = [
      "daily_sleep",
      "daily_readiness",
      "daily_activity",
      "heartrate",
    ];

    for (const range of dateRanges) {
      console.log(
        `\n📅 Testing ${range.label} (${range.start} to ${range.end})...`
      );

      for (const endpoint of endpoints) {
        try {
          const url = `https://api.ouraring.com/v2/usercollection/${endpoint}?start_date=${range.start}&end_date=${range.end}`;

          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token.access_token}` },
          });

          if (!response.ok) {
            if (response.status === 401) {
              console.log(`   ❌ ${endpoint}: Token expired`);
              break; // Stop testing this range if token is expired
            } else {
              console.log(
                `   ❌ ${endpoint}: ${response.status} ${response.statusText}`
              );
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
    }

    // 3. Test the edge function with a specific range that has data
    console.log("\n3. Testing edge function with specific range...");
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
            startYear: 2024, // Test with 2024 data
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

    // 4. Check if any data was inserted
    console.log("\n4. Checking if data was inserted...");
    const { data: dataPoints, error: dataError } = await supabase
      .from("oura_variable_data_points")
      .select("id, date, variable_id, value")
      .eq("user_id", testUserId)
      .order("date", { ascending: false })
      .limit(10);

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

testOuraBroadRange();
