const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testHighLimitFix() {
  console.log("🧪 Testing high limit fix for dashboard...\n");

  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    console.log("🔍 Testing the exact same query the dashboard will use...\n");

    // Test the exact query from the updated dashboard
    console.log("1. Testing Oura query with .limit(20000):");
    const { data: ouraData, error: ouraError } = await supabase
      .from("oura_variable_data_points")
      .select("id, user_id, date, variable_id, value, created_at")
      .eq("user_id", testUserId)
      .order("date", { ascending: false })
      .limit(20000);

    if (ouraError) {
      console.error("   ❌ Error:", ouraError.message);
    } else {
      console.log(`   ✅ Success: ${ouraData?.length || 0} records fetched`);

      if ((ouraData?.length || 0) >= 14000) {
        console.log("   🎉 PERFECT! This should display all your Oura data!");
      } else {
        console.log("   ⚠️  Still seems limited, but much better than 1000");
      }
    }

    console.log("\n2. Testing Withings query with .limit(5000):");
    const { data: withingsData, error: withingsError } = await supabase
      .from("withings_variable_data_points")
      .select("id, user_id, date, variable_id, value, created_at")
      .eq("user_id", testUserId)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (withingsError) {
      console.error("   ❌ Error:", withingsError.message);
    } else {
      console.log(
        `   ✅ Success: ${withingsData?.length || 0} records fetched`
      );
    }

    console.log("\n3. Testing Manual data query with .limit(1000):");
    const { data: manualData, error: manualError } = await supabase
      .from("data_points")
      .select("id, user_id, date, variable_id, value, created_at")
      .eq("user_id", testUserId)
      .order("date", { ascending: false })
      .limit(1000);

    if (manualError) {
      console.error("   ❌ Error:", manualError.message);
    } else {
      console.log(`   ✅ Success: ${manualData?.length || 0} records fetched`);
    }

    console.log("\n📊 Dashboard Summary (what you should see):");
    console.log(
      `   🔵 Oura Data Points: ${ouraData?.length || 0} (target: ~14,429)`
    );
    console.log(
      `   🟠 Withings Data Points: ${withingsData?.length || 0} (target: ~336)`
    );
    console.log(
      `   🟢 Manual Data Points: ${manualData?.length || 0} (target: ~47)`
    );

    const total =
      (ouraData?.length || 0) +
      (withingsData?.length || 0) +
      (manualData?.length || 0);
    console.log(`   📈 Total: ${total} records`);

    console.log("\n🎯 Expected Result:");
    if ((ouraData?.length || 0) >= 14000) {
      console.log(
        "✅ SUCCESS! Your dashboard should now show the correct 14,429 Oura records!"
      );
      console.log(
        "✅ The 400 errors should also be resolved with the fallback queries!"
      );
    } else {
      console.log(
        "⚠️  Still not getting all records. May need to investigate Supabase row limits further."
      );
    }

    console.log("\n🔧 Next Steps:");
    console.log("1. Refresh your analytics page (hard refresh: Ctrl+Shift+R)");
    console.log("2. Clear browser cache if needed");
    console.log("3. You should see significantly more Oura data points!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testHighLimitFix();
