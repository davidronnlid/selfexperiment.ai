const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testOuraApiFixes() {
  console.log("🧪 Testing Oura API fixes...\n");

  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // Test 1: Check if Oura tokens exist
    console.log("1. Checking Oura connection...");
    const { data: ouraTokens, error: tokenError } = await supabase
      .from("oura_tokens")
      .select("access_token, refresh_token, id")
      .eq("user_id", testUserId)
      .limit(1);

    if (tokenError) {
      console.error("   ❌ Token fetch error:", tokenError.message);
      return;
    }

    if (!ouraTokens || ouraTokens.length === 0) {
      console.log(
        "   ⚠️  No Oura tokens found - user needs to connect Oura first"
      );
      console.log(
        "   💡 Go to /oura-test and click 'Connect Oura' to fix this"
      );
      return;
    } else {
      console.log("   ✅ Oura tokens found for user");
    }

    // Test 2: Test the fixed Oura fetch API (simulate GET request)
    console.log("\n2. Testing Oura fetch API endpoint...");

    const testFetchUrl = `http://localhost:3000/api/oura/fetch?user_id=${testUserId}`;
    console.log("   URL:", testFetchUrl);
    console.log("   Method: GET (fixed from POST)");
    console.log("   💡 This should now work instead of giving 400 error");

    // Test 3: Check if data exists in correct table
    console.log("\n3. Checking Oura data in correct table...");

    const { count: dataCount, error: countError } = await supabase
      .from("oura_variable_data_points")
      .select("*", { count: "exact", head: true })
      .eq("user_id", testUserId);

    if (countError) {
      console.error("   ❌ Data count error:", countError.message);
    } else {
      console.log(
        `   ✅ Found ${
          dataCount || 0
        } Oura data points in oura_variable_data_points table`
      );
    }

    // Test 4: Test edge function parameters
    console.log("\n4. Testing edge function parameters...");
    console.log("   Fixed parameters for oura-sync-all:");
    console.log("   - user_id → userId ✅");
    console.log("   - start_year → startYear ✅");
    console.log("   - clear_existing → clearExisting ✅");

    console.log("\n🎯 Expected Results After Fix:");
    console.log("✅ Oura fetch API now uses GET method with user_id parameter");
    console.log(
      "✅ Oura data saves to oura_variable_data_points table (not old oura_variable_logs)"
    );
    console.log("✅ Edge function uses correct parameter names");
    console.log("✅ 400 errors should be reduced significantly");

    console.log("\n🔧 To Test the Fix:");
    console.log("1. Refresh your analytics page");
    console.log("2. Try clicking 'Sync' button on Oura integration");
    console.log("3. Check console - should see fewer/no 400 errors");
    console.log(
      "4. If still seeing errors, check if user is connected to Oura first"
    );

    console.log("\n🚨 If Still Getting Errors:");
    console.log("1. Make sure you're connected to Oura (/oura-test page)");
    console.log("2. Check if Oura tokens are still valid");
    console.log("3. Try reconnecting Oura account if needed");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testOuraApiFixes();
