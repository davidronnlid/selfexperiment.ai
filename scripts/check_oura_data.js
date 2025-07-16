const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOuraData() {
  console.log("🔍 Checking Oura integration status...\n");

  // Check tokens
  console.log("1. Checking Oura tokens...");
  const { data: tokens, error: tokenError } = await supabase
    .from("oura_tokens")
    .select("id, user_id, created_at, access_token")
    .order("created_at", { ascending: false });

  if (tokenError) {
    console.error("❌ Token error:", tokenError);
  } else {
    console.log(`✅ Found ${tokens.length} tokens`);
    tokens.forEach((token, i) => {
      if (i < 3) {
        console.log(
          `   ${i + 1}. User: ${token.user_id.substring(0, 8)}... (${
            token.created_at
          })`
        );
      }
    });
  }

  // Check data for a specific user
  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";
  console.log(
    `\n2. Checking Oura data for user: ${testUserId.substring(0, 8)}...`
  );

  const { data: ouraData, error: dataError } = await supabase
    .from("oura_variable_logs")
    .select("*")
    .eq("user_id", testUserId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (dataError) {
    console.error("❌ Data error:", dataError);
  } else {
    console.log(`✅ Found ${ouraData.length} records`);
    if (ouraData.length > 0) {
      console.log("Recent entries:");
      ouraData.forEach((record, i) => {
        if (i < 5) {
          console.log(
            `   ${record.date}: ${record.variable_id} = ${record.value}`
          );
        }
      });
    } else {
      console.log("❌ No Oura data found for this user");
    }
  }

  // Check if user has a valid token
  console.log(`\n3. Checking token for user: ${testUserId.substring(0, 8)}...`);
  const { data: userToken, error: userTokenError } = await supabase
    .from("oura_tokens")
    .select("*")
    .eq("user_id", testUserId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (userTokenError) {
    console.error("❌ User token error:", userTokenError);
  } else if (userToken.length === 0) {
    console.log("❌ No token found for this user - Oura needs to be connected");
  } else {
    console.log("✅ User has token:", {
      id: userToken[0].id,
      created: userToken[0].created_at,
      hasAccessToken: !!userToken[0].access_token,
      hasRefreshToken: !!userToken[0].refresh_token,
    });
  }

  process.exit(0);
}

checkOuraData().catch(console.error);
