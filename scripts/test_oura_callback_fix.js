const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testOuraCallbackFix() {
  console.log("🔧 Testing Oura callback fix...\n");

  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // 1. Check current table structure
    console.log("1. Checking oura_tokens table structure...");

    // Try to describe the table
    const { data: existingTokens, error: queryError } = await supabase
      .from("oura_tokens")
      .select("*")
      .eq("user_id", testUserId)
      .limit(1);

    if (queryError) {
      console.error("❌ Error querying oura_tokens:", queryError);
      console.log("💡 The table might not exist or have schema issues");
    } else {
      console.log("✅ oura_tokens table is accessible");
      console.log(`   Found ${existingTokens.length} existing tokens for user`);
    }

    // 2. Test upsert operation (simulate what the callback does)
    console.log("\n2. Testing upsert operation...");

    const testTokenData = {
      access_token: "test_token_" + Date.now(),
      refresh_token: "test_refresh_" + Date.now(),
      user_id: testUserId,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: upsertResult, error: upsertError } = await supabase
      .from("oura_tokens")
      .upsert(testTokenData, {
        onConflict: "user_id",
      })
      .select();

    if (upsertError) {
      console.error("❌ Upsert failed:", upsertError);
      console.log("💡 This is the same error the callback would encounter");

      // Try to understand the constraint issue
      if (upsertError.code === "23505") {
        console.log("🔍 Duplicate key constraint violation detected");
        console.log(
          "   This usually means there's a unique constraint conflict"
        );

        // Check what constraints exist
        console.log("\n3. Checking table constraints...");
        // Note: We can't directly query pg_constraint from the client, but we can infer from errors

        // Try a different approach - update instead of upsert
        console.log("4. Trying direct update...");
        const { error: updateError } = await supabase
          .from("oura_tokens")
          .update({
            access_token: testTokenData.access_token,
            refresh_token: testTokenData.refresh_token,
            expires_at: testTokenData.expires_at,
            updated_at: testTokenData.updated_at,
          })
          .eq("user_id", testUserId);

        if (updateError) {
          console.error("❌ Update also failed:", updateError);
        } else {
          console.log("✅ Direct update worked");
          console.log("💡 The callback should use UPDATE instead of UPSERT");
        }
      }
    } else {
      console.log("✅ Upsert operation successful");
      console.log("✅ The callback fix should work");
    }

    // 3. Clean up test data
    console.log("\n5. Cleaning up test data...");
    if (testTokenData.access_token.startsWith("test_token_")) {
      // Only clean up our test tokens, not real ones
      const { error: cleanupError } = await supabase
        .from("oura_tokens")
        .delete()
        .eq("user_id", testUserId)
        .like("access_token", "test_token_%");

      if (cleanupError) {
        console.log("⚠️  Cleanup warning:", cleanupError.message);
      } else {
        console.log("✅ Test data cleaned up");
      }
    }

    console.log("\n🎯 Summary:");
    if (!upsertError) {
      console.log("✅ Oura callback fix should work");
      console.log("✅ You can now try reconnecting your Oura account");
      console.log("🔗 Go to: http://localhost:3000/oura-test");
    } else {
      console.log("❌ There are still issues with the oura_tokens table");
      console.log("💡 You may need to recreate the table or fix constraints");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testOuraCallbackFix();
