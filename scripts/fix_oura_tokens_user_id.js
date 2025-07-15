const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixOuraTokens() {
  console.log("🔧 Fixing Oura tokens user_id...");

  try {
    // Get all tokens with null user_id
    const { data: tokens, error: fetchError } = await supabase
      .from("oura_tokens")
      .select("*")
      .is("user_id", null);

    if (fetchError) {
      console.error("❌ Error fetching tokens:", fetchError);
      return;
    }

    console.log(`Found ${tokens?.length || 0} tokens with null user_id`);

    if (!tokens || tokens.length === 0) {
      console.log("✅ No tokens to fix");
      return;
    }

    // Update each token with the correct user_id
    const correctUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0"; // From your logs

    for (const token of tokens) {
      console.log(`Updating token ${token.id}...`);

      const { error: updateError } = await supabase
        .from("oura_tokens")
        .update({ user_id: correctUserId })
        .eq("id", token.id);

      if (updateError) {
        console.error(`❌ Error updating token ${token.id}:`, updateError);
      } else {
        console.log(`✅ Updated token ${token.id}`);
      }
    }

    console.log("✅ Token fix completed!");

    // Verify the fix
    const { data: updatedTokens, error: verifyError } = await supabase
      .from("oura_tokens")
      .select("*")
      .eq("user_id", correctUserId);

    if (verifyError) {
      console.error("❌ Error verifying tokens:", verifyError);
    } else {
      console.log(
        `✅ Found ${
          updatedTokens?.length || 0
        } tokens for user ${correctUserId}`
      );
    }
  } catch (error) {
    console.error("❌ Fix error:", error);
  }
}

fixOuraTokens();
