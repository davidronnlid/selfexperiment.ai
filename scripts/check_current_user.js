const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCurrentUser() {
  console.log("🔍 Checking current user and their Withings data...");

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("❌ Error getting user:", userError);
      return;
    }

    if (!user) {
      console.log("❌ No user found - not logged in");
      return;
    }

    console.log("✅ Current user:", user.id);
    console.log("📧 User email:", user.email);

    // Check if this user has any Withings data
    const { data: withingsData, error: withingsError } = await supabase
      .from("withings_variable_data_points")
      .select("user_id, date, variable, value")
      .eq("user_id", user.id)
      .limit(5);

    if (withingsError) {
      console.error("❌ Error fetching Withings data:", withingsError);
      return;
    }

    console.log(
      "📊 Withings data for current user:",
      withingsData?.length || 0,
      "records"
    );

    if (withingsData && withingsData.length > 0) {
      console.log("📈 Sample data:");
      withingsData.forEach((record, i) => {
        console.log(
          `  ${i + 1}. Date: ${record.date}, Variable: ${
            record.variable
          }, Value: ${record.value}`
        );
      });
    } else {
      console.log("❌ No Withings data found for current user");
    }

    // Check if user has Withings tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("withings_tokens")
      .select("user_id, created_at")
      .eq("user_id", user.id);

    if (tokensError) {
      console.error("❌ Error fetching tokens:", tokensError);
    } else {
      console.log(
        "🔑 Withings tokens for current user:",
        tokens?.length || 0,
        "tokens"
      );
      if (tokens && tokens.length > 0) {
        console.log("📅 Last token created:", tokens[0].created_at);
      }
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

checkCurrentUser();
