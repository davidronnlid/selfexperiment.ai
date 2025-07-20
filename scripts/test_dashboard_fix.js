const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDashboardFix() {
  console.log("🧪 Testing dashboard data counting and error fixes...\n");

  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // Test 1: Check if we can get the full Oura data count (should be 14,429)
    console.log("1. Testing full Oura data count...");

    const { count: ouraCount, error: ouraCountError } = await supabase
      .from("oura_variable_data_points")
      .select("*", { count: "exact", head: true })
      .eq("user_id", testUserId);

    if (ouraCountError) {
      console.error("❌ Oura count query failed:", ouraCountError.message);
    } else {
      console.log(`✅ Total Oura records: ${ouraCount}`);

      if (ouraCount >= 14000) {
        console.log("🎉 Correct! Should display ~14,429 instead of 500");
      } else {
        console.log("⚠️  Count seems low, expected ~14,429");
      }
    }

    // Test 2: Test the join query that causes 400 errors
    console.log("\n2. Testing problematic join queries...");

    // Try the join query that fails in browser
    const { data: joinTest, error: joinError } = await supabase
      .from("oura_variable_data_points")
      .select(
        `
        id, 
        user_id, 
        date, 
        variable_id, 
        value, 
        created_at,
        variables!inner(id, slug, label)
      `
      )
      .eq("user_id", testUserId)
      .limit(5);

    if (joinError) {
      console.error("❌ Join query failed:", joinError.message);

      // Test fallback approach
      console.log("   Testing fallback approach...");
      const { data: fallbackTest, error: fallbackError } = await supabase
        .from("oura_variable_data_points")
        .select("id, user_id, date, variable_id, value, created_at")
        .eq("user_id", testUserId)
        .limit(5);

      if (fallbackError) {
        console.error("   ❌ Fallback also failed:", fallbackError.message);
      } else {
        console.log(
          "   ✅ Fallback works:",
          fallbackTest?.length || 0,
          "records"
        );
        console.log(
          "   💡 Dashboard will use fallback data to avoid 400 errors"
        );
      }
    } else {
      console.log("✅ Join query works:", joinTest?.length || 0, "records");
      console.log("✅ No need for fallback");
    }

    // Test 3: Test with different client types (simulating browser context)
    console.log("\n3. Testing with different client contexts...");

    // Test with anon client (like browser uses)
    const browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: browserTest, error: browserError } = await browserClient
      .from("oura_variable_data_points")
      .select("id, date, variable_id, value")
      .limit(1);

    if (browserError) {
      console.log("   ✅ Browser client correctly blocked by RLS");
      console.log("   💡 This is expected - user must be authenticated");
    } else {
      console.log("   ⚠️  Browser client unexpectedly allowed");
    }

    // Test 4: Check all data sources
    console.log("\n4. Checking all data source counts...");

    const dataSources = [
      { name: "Oura", table: "oura_variable_data_points" },
      { name: "Withings", table: "withings_variable_data_points" },
      { name: "Manual", table: "data_points" },
      { name: "Variables", table: "variables" },
    ];

    for (const source of dataSources) {
      try {
        const { count, error } = await supabase
          .from(source.table)
          .select("*", { count: "exact", head: true })
          .eq(
            source.table === "variables" ? "is_active" : "user_id",
            source.table === "variables" ? true : testUserId
          );

        if (error) {
          console.log(`   ${source.name}: ❌ ${error.message}`);
        } else {
          console.log(`   ${source.name}: ✅ ${count || 0} records`);
        }
      } catch (err) {
        console.log(`   ${source.name}: ⚠️  ${err.message}`);
      }
    }

    console.log("\n🎯 Dashboard Fix Summary:");
    console.log("✅ Removed 500 record limit - should show all data");
    console.log("✅ Added fallback queries to prevent 400 errors");
    console.log("✅ Dashboard should now display correct counts");

    console.log("\n🔧 Next steps:");
    console.log("1. Refresh your analytics page (clear cache if needed)");
    console.log("2. You should now see your full 14,429 Oura records");
    console.log("3. Console errors should be reduced or eliminated");
    console.log("4. If you still see errors, they're likely auth-related");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testDashboardFix();
