const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testOuraTokenRefresh() {
  console.log("🔍 Testing Oura token refresh...\n");

  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // 1. Get current tokens
    console.log("1. Getting current tokens...");
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
    console.log(
      "   Access token (first 20 chars):",
      token.access_token.substring(0, 20) + "..."
    );
    console.log(
      "   Refresh token (first 20 chars):",
      token.refresh_token.substring(0, 20) + "..."
    );

    // 2. Test token refresh
    console.log("\n2. Testing token refresh...");
    try {
      const refreshRes = await fetch("https://api.ouraring.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: process.env.OURA_CLIENT_ID,
          client_secret: process.env.OURA_CLIENT_SECRET,
          refresh_token: token.refresh_token,
        }),
      });

      if (!refreshRes.ok) {
        console.log(
          `❌ Token refresh failed: ${refreshRes.status} ${refreshRes.statusText}`
        );
        const errorText = await refreshRes.text();
        console.log(`Error details: ${errorText}`);
      } else {
        const refreshData = await refreshRes.json();
        console.log("✅ Token refresh successful!");
        console.log(
          "   New access token (first 20 chars):",
          refreshData.access_token.substring(0, 20) + "..."
        );
        console.log(
          "   New refresh token (first 20 chars):",
          refreshData.refresh_token.substring(0, 20) + "..."
        );
        console.log("   Expires in:", refreshData.expires_in, "seconds");

        // 3. Update tokens in database
        console.log("\n3. Updating tokens in database...");
        const { error: updateError } = await supabase
          .from("oura_tokens")
          .upsert({
            user_id: testUserId,
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token,
            expires_at: new Date(
              Date.now() + (refreshData.expires_in || 3600) * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (updateError) {
          console.error("❌ Error updating tokens:", updateError);
        } else {
          console.log("✅ Tokens updated in database");
        }

        // 4. Test the new token
        console.log("\n4. Testing new token...");
        const testUrl =
          "https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=2025-07-18&end_date=2025-07-19";
        const testResponse = await fetch(testUrl, {
          headers: { Authorization: `Bearer ${refreshData.access_token}` },
        });

        if (!testResponse.ok) {
          console.log(
            `❌ New token test failed: ${testResponse.status} ${testResponse.statusText}`
          );
        } else {
          const testData = await testResponse.json();
          console.log(
            `✅ New token works! Found ${
              testData.data?.length || 0
            } sleep records`
          );
        }
      }
    } catch (error) {
      console.log(`❌ Token refresh request failed: ${error.message}`);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testOuraTokenRefresh();
