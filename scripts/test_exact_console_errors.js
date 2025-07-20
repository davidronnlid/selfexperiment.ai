const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testExactConsoleErrors() {
  console.log("🧪 Testing exact console error patterns from browser...\n");

  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // Test the specific URLs from the console errors
    console.log("1. Testing Oura variable data points queries...");

    // Test basic oura_variable_data_points query
    const { data: ouraBasic, error: ouraBasicError } = await supabase
      .from("oura_variable_data_points")
      .select("*")
      .eq("user_id", testUserId)
      .limit(1);

    if (ouraBasicError) {
      console.error("❌ Basic Oura query failed:", ouraBasicError);
    } else {
      console.log(
        "✅ Basic Oura query works:",
        ouraBasic?.length || 0,
        "records"
      );
    }

    // Test the join query that might be causing issues
    const { data: ouraJoin, error: ouraJoinError } = await supabase
      .from("oura_variable_data_points")
      .select(
        `
        id, 
        date, 
        variable_id, 
        value, 
        created_at,
        variables!inner(slug, label)
      `
      )
      .eq("user_id", testUserId)
      .limit(5);

    if (ouraJoinError) {
      console.error("❌ Oura join query failed:", ouraJoinError);
    } else {
      console.log(
        "✅ Oura join query works:",
        ouraJoin?.length || 0,
        "records"
      );
    }

    console.log("\n2. Testing Withings variable data points queries...");

    // Test withings queries
    const { data: withingsBasic, error: withingsBasicError } = await supabase
      .from("withings_variable_data_points")
      .select("*")
      .eq("user_id", testUserId)
      .limit(1);

    if (withingsBasicError) {
      console.error("❌ Basic Withings query failed:", withingsBasicError);
    } else {
      console.log(
        "✅ Basic Withings query works:",
        withingsBasic?.length || 0,
        "records"
      );
    }

    // Test withings with variables join
    const { data: withingsJoin, error: withingsJoinError } = await supabase
      .from("withings_variable_data_points")
      .select(
        `
        id, 
        date, 
        variable_id, 
        value, 
        created_at,
        variables!inner(slug, label)
      `
      )
      .eq("user_id", testUserId)
      .limit(5);

    if (withingsJoinError) {
      console.error("❌ Withings join query failed:", withingsJoinError);

      // Check if withings_variable_data_points has variable_id column
      console.log("   Checking withings table structure...");
      const { data: withingsCheck, error: withingsCheckError } = await supabase
        .from("withings_variable_data_points")
        .select("variable_id")
        .limit(1);

      if (withingsCheckError) {
        console.error(
          "   ❌ withings_variable_data_points missing variable_id column!"
        );
        console.log(
          "   💡 This table needs migration to add variable_id foreign key"
        );
      }
    } else {
      console.log(
        "✅ Withings join query works:",
        withingsJoin?.length || 0,
        "records"
      );
    }

    console.log("\n3. Testing data_points (manual logs) queries...");

    // Test data_points basic query
    const { data: dataBasic, error: dataBasicError } = await supabase
      .from("data_points")
      .select("*")
      .eq("user_id", testUserId)
      .limit(1);

    if (dataBasicError) {
      console.error("❌ Basic data_points query failed:", dataBasicError);
    } else {
      console.log(
        "✅ Basic data_points query works:",
        dataBasic?.length || 0,
        "records"
      );
    }

    // Test data_points with variables join
    const { data: dataJoin, error: dataJoinError } = await supabase
      .from("data_points")
      .select(
        `
        id, 
        date, 
        variable_id, 
        value, 
        notes,
        variables!inner(slug, label)
      `
      )
      .eq("user_id", testUserId)
      .limit(5);

    if (dataJoinError) {
      console.error("❌ data_points join query failed:", dataJoinError);
    } else {
      console.log(
        "✅ data_points join query works:",
        dataJoin?.length || 0,
        "records"
      );
    }

    console.log("\n4. Testing count queries (for dashboard stats)...");

    // Test the count queries used by the dashboard
    const countQueries = [
      { table: "oura_variable_data_points", name: "Oura" },
      { table: "withings_variable_data_points", name: "Withings" },
      { table: "data_points", name: "Manual" },
      { table: "variables", name: "Variables" },
    ];

    for (const query of countQueries) {
      try {
        const { count, error } = await supabase
          .from(query.table)
          .select("*", { count: "exact", head: true })
          .eq(
            query.table === "variables" ? "is_active" : "user_id",
            query.table === "variables" ? true : testUserId
          );

        if (error) {
          console.error(`   ❌ ${query.name} count failed:`, error.message);
        } else {
          console.log(`   ✅ ${query.name}: ${count || 0} records`);
        }
      } catch (err) {
        console.error(`   ❌ ${query.name} count exception:`, err.message);
      }
    }

    console.log("\n5. Checking RLS policies...");

    // Test with regular client (like the browser would use)
    const browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // This should fail due to RLS since we don't have auth
    const { data: rlsTest, error: rlsError } = await browserClient
      .from("data_points")
      .select("*")
      .limit(1);

    if (rlsError) {
      console.log("   ✅ RLS is working (browser client correctly blocked)");
      console.log("   Error:", rlsError.message);
    } else {
      console.log("   ⚠️  RLS might not be configured correctly");
    }

    console.log("\n🎯 Summary and Next Steps:");

    if (ouraBasicError || withingsBasicError || dataBasicError) {
      console.log("❌ Basic table queries are failing");
      console.log("💡 Database schema issues need to be fixed");
    } else if (ouraJoinError || withingsJoinError || dataJoinError) {
      console.log("❌ Foreign key relationships are missing");
      console.log("💡 Need to add foreign key constraints");
    } else {
      console.log("✅ All queries work with service role");
      console.log("💡 Console errors might be due to:");
      console.log("   1. Authentication issues in browser");
      console.log("   2. RLS policies blocking queries");
      console.log("   3. Stale browser cache");
      console.log("   4. Component making requests before user auth");
    }

    console.log("\n🔧 Recommended fixes:");
    console.log("1. Clear browser cache completely");
    console.log("2. Check if user is properly authenticated");
    console.log("3. Add error handling in React components");
    console.log("4. Verify RLS policies allow authenticated users");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testExactConsoleErrors();
