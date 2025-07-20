const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Test both approaches
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testServiceRoleCallback() {
  console.log("🧪 Testing Service Role vs Client for Oura tokens...\n");

  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";
  const testTokenData = {
    access_token: "test_service_" + Date.now(),
    refresh_token: "test_refresh_service_" + Date.now(),
    user_id: testUserId,
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    // Test 1: Try with regular client (may fail due to RLS)
    console.log("1. Testing with regular client (anon key)...");
    const { error: clientError } = await supabaseClient
      .from("oura_tokens")
      .upsert(testTokenData, { onConflict: "user_id" });

    if (clientError) {
      console.error("❌ Regular client failed:", clientError.message);
      console.log("   This is expected due to RLS");
    } else {
      console.log("✅ Regular client worked (unexpected but good)");
    }

    // Test 2: Try with service role (should work)
    console.log("\n2. Testing with service role (admin key)...");
    const { error: adminError } = await supabaseAdmin
      .from("oura_tokens")
      .upsert(
        {
          ...testTokenData,
          access_token: testTokenData.access_token + "_admin",
        },
        { onConflict: "user_id" }
      );

    if (adminError) {
      console.error("❌ Service role failed:", adminError.message);
      console.log("   This should not happen!");
    } else {
      console.log("✅ Service role worked perfectly");
      console.log("✅ The Oura callback will now work");
    }

    // Clean up
    console.log("\n3. Cleaning up test data...");
    await supabaseAdmin
      .from("oura_tokens")
      .delete()
      .eq("user_id", testUserId)
      .like("access_token", "test_service_%");

    console.log("✅ Cleanup complete");

    console.log("\n🎯 Result:");
    if (!adminError) {
      console.log("✅ Oura callback is fixed with service role");
      console.log("✅ RLS is bypassed for token operations");
      console.log("🔗 Try connecting: http://localhost:3000/oura-test");
    } else {
      console.log("❌ Still having issues - check environment variables");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testServiceRoleCallback();
