const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// All Oura variables from the edge function
const OURA_VARIABLES = [
  "sleep_score",
  "total_sleep_duration",
  "rem_sleep_duration",
  "deep_sleep_duration",
  "light_sleep_duration",
  "efficiency",
  "sleep_latency",
  "readiness_score",
  "temperature_deviation",
  "temperature_trend_deviation",
  "hr_lowest",
  "hr_average",
  "activity_score",
  "steps",
  "calories_active",
  "calories_total",
];

async function syncAllOuraVariables() {
  console.log("🔄 Syncing all Oura variables...\n");

  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // 1. Check connection status
    console.log("1. Checking Oura connection...");
    const { data: tokens, error: tokenError } = await supabase
      .from("oura_tokens")
      .select("access_token, refresh_token, created_at")
      .eq("user_id", testUserId)
      .single();

    if (tokenError || !tokens) {
      console.log("❌ No Oura connection found");
      console.log("🔗 Please reconnect your Oura account:");
      console.log("   1. Go to http://localhost:3000/oura-test");
      console.log("   2. Click 'Connect to Oura'");
      console.log("   3. Complete the OAuth flow");
      console.log("   4. Run this script again");
      return;
    }

    console.log("✅ Oura connection found");

    // 2. Test the token
    console.log("\n2. Testing Oura token...");
    const testResponse = await fetch(
      "https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=2025-07-18&end_date=2025-07-19",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (testResponse.status === 401) {
      console.log("❌ Token expired, please reconnect your Oura account");
      console.log(
        "🔗 Go to http://localhost:3000/oura-test and click 'Connect to Oura'"
      );
      return;
    } else if (testResponse.ok) {
      console.log("✅ Token is working");
    } else {
      console.log(
        `⚠️  Token test returned: ${testResponse.status} ${testResponse.statusText}`
      );
    }

    // 3. Sync all data using the edge function
    console.log("\n3. Syncing all Oura data...");
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
          startYear: 2023, // Get more historical data
        }),
      }
    );

    if (!response.ok) {
      console.log(
        `❌ Edge function error: ${response.status} ${response.statusText}`
      );
      const errorText = await response.text();
      console.log(`Error details: ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log("✅ Edge function response:", JSON.stringify(result, null, 2));

    if (result.data.totalUpserted === 0) {
      console.log("⚠️  No data was synced. This could mean:");
      console.log("   - No recent Oura data available");
      console.log("   - You haven't worn your Oura ring recently");
      console.log("   - Try a different date range");
    } else {
      console.log(
        `🎉 Successfully synced ${result.data.totalUpserted} data points!`
      );
    }

    // 4. Check what variables have data
    console.log("\n4. Checking which variables have data...");
    const { data: variableData, error: varError } = await supabase
      .from("oura_variable_data_points")
      .select(
        `
        variable_id,
        variables!inner(slug, label),
        date,
        value
      `
      )
      .eq("user_id", testUserId)
      .order("date", { ascending: false })
      .limit(100);

    if (varError) {
      console.error("❌ Error checking variables:", varError);
    } else {
      // Group by variable
      const groupedByVariable = {};
      variableData.forEach((dp) => {
        const slug = dp.variables?.slug;
        if (!groupedByVariable[slug]) {
          groupedByVariable[slug] = {
            label: dp.variables?.label,
            count: 0,
            latestDate: null,
            latestValue: null,
          };
        }
        groupedByVariable[slug].count++;
        if (
          !groupedByVariable[slug].latestDate ||
          dp.date > groupedByVariable[slug].latestDate
        ) {
          groupedByVariable[slug].latestDate = dp.date;
          groupedByVariable[slug].latestValue = dp.value;
        }
      });

      console.log(
        `✅ Found data for ${Object.keys(groupedByVariable).length} variables:`
      );

      // Show which variables from our list have data
      OURA_VARIABLES.forEach((varSlug) => {
        const data = groupedByVariable[varSlug];
        if (data) {
          console.log(
            `   ✅ ${data.label}: ${data.count} data points (latest: ${data.latestDate} = ${data.latestValue})`
          );
        } else {
          console.log(`   ❌ ${varSlug}: No data found`);
        }
      });
    }

    // 5. Test specific variable pages
    console.log("\n5. Testing variable-specific queries...");
    for (const varSlug of ["sleep_score", "readiness_score", "steps"]) {
      const { data: variable, error: varError } = await supabase
        .from("variables")
        .select("id, slug, label")
        .eq("slug", varSlug)
        .single();

      if (varError) {
        console.log(`   ❌ ${varSlug}: Variable not found in database`);
        continue;
      }

      const { data: dataPoints, error: dataError } = await supabase
        .from("oura_variable_data_points")
        .select("id, date, value")
        .eq("user_id", testUserId)
        .eq("variable_id", variable.id) // Using UUID as fixed
        .order("date", { ascending: false })
        .limit(5);

      if (dataError) {
        console.log(`   ❌ ${varSlug}: Query error - ${dataError.message}`);
      } else {
        console.log(
          `   ✅ ${variable.label}: ${dataPoints.length} recent data points`
        );
        dataPoints.slice(0, 2).forEach((dp) => {
          console.log(`      - ${dp.date}: ${dp.value}`);
        });
      }
    }

    console.log("\n🎯 Summary:");
    if (result.data.totalUpserted > 0) {
      console.log("✅ Real Oura data has been synced");
      console.log("✅ All Oura variables should now work in the UI");
      console.log("✅ Test the following URLs:");
      console.log("   - http://localhost:3000/oura-test");
      console.log("   - http://localhost:3000/variable/sleep_score");
      console.log("   - http://localhost:3000/variable/readiness_score");
      console.log("   - http://localhost:3000/variable/steps");
    } else {
      console.log("❌ No data was synced - check your Oura ring usage");
    }
  } catch (error) {
    console.error("❌ Process failed:", error);
  }
}

syncAllOuraVariables();
