const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanTestDataAndFixTokens() {
  console.log("🧹 Cleaning test data and fixing Oura tokens...\n");

  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // 1. Clean up test data
    console.log("1. Cleaning up test/mockup data...");
    const { error: deleteError } = await supabase
      .from("oura_variable_data_points")
      .delete()
      .eq("user_id", testUserId);

    if (deleteError) {
      console.error("❌ Error deleting test data:", deleteError);
    } else {
      console.log("✅ Test data cleaned up");
    }

    // 2. Refresh the Oura token to get a working one
    console.log("\n2. Refreshing Oura token...");

    // Get current tokens
    const { data: tokens, error: tokenError } = await supabase
      .from("oura_tokens")
      .select("access_token, refresh_token")
      .eq("user_id", testUserId)
      .single();

    if (tokenError) {
      console.error("❌ Error fetching tokens:", tokenError);
      return;
    }

    // Test if current token works
    console.log("3. Testing current token...");
    const testResponse = await fetch(
      "https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=2025-07-18&end_date=2025-07-19",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (testResponse.status === 401) {
      console.log("❌ Current token expired, refreshing...");

      // Refresh token
      const refreshRes = await fetch("https://api.ouraring.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: process.env.OURA_CLIENT_ID,
          client_secret: process.env.OURA_CLIENT_SECRET,
          refresh_token: tokens.refresh_token,
        }),
      });

      if (!refreshRes.ok) {
        const errorText = await refreshRes.text();
        console.log(
          `❌ Token refresh failed: ${refreshRes.status} ${refreshRes.statusText}`
        );
        console.log(`Error details: ${errorText}`);
        console.log("⚠️  You may need to reconnect your Oura account");
        return;
      } else {
        const refreshData = await refreshRes.json();
        console.log("✅ Token refresh successful!");

        // Update tokens in database
        const { error: updateError } = await supabase
          .from("oura_tokens")
          .update({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token,
            expires_at: new Date(
              Date.now() + (refreshData.expires_in || 3600) * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", testUserId);

        if (updateError) {
          console.error("❌ Error updating tokens:", updateError);
        } else {
          console.log("✅ Tokens updated in database");
        }
      }
    } else if (testResponse.ok) {
      console.log("✅ Current token is working");
    } else {
      console.log(
        `❌ Token test failed: ${testResponse.status} ${testResponse.statusText}`
      );
    }

    // 3. Test the edge function with real data sync
    console.log("\n4. Testing edge function with real data sync...");
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
            startYear: 2024, // Start with recent data
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

        if (result.data.totalUpserted > 0) {
          console.log(
            `🎉 Successfully synced ${result.data.totalUpserted} real Oura data points!`
          );
        } else {
          console.log("⚠️  No data was synced. This could mean:");
          console.log(
            "   - No Oura data available for the selected date range"
          );
          console.log("   - The user hasn't worn their Oura ring recently");
          console.log("   - There's an issue with the Oura API response");
        }
      }
    } catch (error) {
      console.log(`❌ Edge function request failed: ${error.message}`);
    }

    // 4. Check what real data was synced
    console.log("\n5. Checking synced real data...");
    const { data: realData, error: realDataError } = await supabase
      .from("oura_variable_data_points")
      .select(
        `
        id, 
        user_id, 
        date, 
        variable_id, 
        value, 
        created_at,
        variables!inner(slug, label)
      `
      )
      .eq("user_id", testUserId)
      .order("date", { ascending: false })
      .limit(20);

    if (realDataError) {
      console.error("❌ Error checking real data:", realDataError);
    } else {
      console.log(`✅ Found ${realData.length} real data points:`);

      // Group by variable for better display
      const groupedData = {};
      realData.forEach((dp) => {
        const varName = dp.variables?.label || "Unknown";
        if (!groupedData[varName]) groupedData[varName] = [];
        groupedData[varName].push({ date: dp.date, value: dp.value });
      });

      Object.entries(groupedData).forEach(([varName, dataPoints]) => {
        console.log(`   📊 ${varName}: ${dataPoints.length} data points`);
        dataPoints.slice(0, 3).forEach((dp) => {
          console.log(`      - ${dp.date}: ${dp.value}`);
        });
      });
    }

    console.log("\n🎯 Summary:");
    if (realData && realData.length > 0) {
      console.log("✅ Real Oura data has been synced successfully");
      console.log("✅ The UI should now display real data from your Oura ring");
      console.log("✅ All Oura variables should be working");
    } else {
      console.log("❌ No real data was synced");
      console.log("💡 Suggestions:");
      console.log("   - Check if you've been wearing your Oura ring recently");
      console.log("   - Try syncing with an earlier start year");
      console.log("   - Verify your Oura account has data");
    }
  } catch (error) {
    console.error("❌ Process failed:", error);
  }
}

cleanTestDataAndFixTokens();
