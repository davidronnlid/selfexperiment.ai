const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugOuraTokens() {
  console.log("🔍 Debugging Oura tokens...");

  try {
    // Get all tokens
    const { data: allTokens, error: allError } = await supabase
      .from("oura_tokens")
      .select("*")
      .order("created_at", { ascending: false });

    if (allError) {
      console.error("❌ Error fetching all tokens:", allError);
      return;
    }

    console.log(`\n📊 Found ${allTokens?.length || 0} total tokens:`);
    allTokens?.forEach((token, index) => {
      console.log(`  ${index + 1}. ID: ${token.id}`);
      console.log(`     User ID: ${token.user_id || "NULL"}`);
      console.log(`     Has Access Token: ${!!token.access_token}`);
      console.log(`     Created: ${token.created_at || "NULL"}`);
      console.log();
    });

    // Check for the specific user we need
    const targetUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";
    console.log(`\n🎯 Checking tokens for target user: ${targetUserId}`);

    const { data: userTokens, error: userError } = await supabase
      .from("oura_tokens")
      .select("*")
      .eq("user_id", targetUserId);

    if (userError) {
      console.error("❌ Error fetching user tokens:", userError);
    } else {
      console.log(`✅ Found ${userTokens?.length || 0} tokens for target user`);
    }

    // Check for tokens with null user_id
    const { data: nullTokens, error: nullError } = await supabase
      .from("oura_tokens")
      .select("*")
      .is("user_id", null);

    if (nullError) {
      console.error("❌ Error fetching null tokens:", nullError);
    } else {
      console.log(
        `\n🔍 Found ${nullTokens?.length || 0} tokens with NULL user_id`
      );
    }

    // Suggest fix if needed
    if (
      allTokens &&
      allTokens.length > 0 &&
      (!userTokens || userTokens.length === 0)
    ) {
      console.log(`\n💡 SUGGESTION: Update tokens to use correct user_id`);
      console.log(
        `   Run this to fix: UPDATE oura_tokens SET user_id = '${targetUserId}' WHERE user_id IS NULL OR user_id != '${targetUserId}';`
      );
    }
  } catch (error) {
    console.error("❌ Debug error:", error);
  }
}

debugOuraTokens();
