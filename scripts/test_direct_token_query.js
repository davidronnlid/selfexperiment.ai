const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Use the same supabase client as the API
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Environment check:");
console.log("SUPABASE_URL:", supabaseUrl);
console.log("ANON_KEY:", supabaseAnonKey ? "SET" : "NOT SET");

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTokenQuery() {
  console.log("🔍 Testing exact API query...");

  const user_id = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // This is the EXACT same query as in the API
    const { data: tokens, error: tokenFetchError } = await supabase
      .from("oura_tokens")
      .select("access_token, refresh_token, id")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1);

    console.log("Query result:");
    console.log("Error:", tokenFetchError);
    console.log("Tokens:", tokens);
    console.log("Tokens length:", tokens?.length);

    if (tokenFetchError) {
      console.error("❌ Query error details:", tokenFetchError);
    }

    if (!tokens || tokens.length === 0) {
      console.log("❌ No tokens found with API query");

      // Try a simpler query
      console.log("\n🔍 Trying simpler query...");
      const { data: simpleTokens, error: simpleError } = await supabase
        .from("oura_tokens")
        .select("*")
        .eq("user_id", user_id);

      console.log("Simple query result:");
      console.log("Error:", simpleError);
      console.log("Tokens count:", simpleTokens?.length);

      if (simpleError) {
        console.error("❌ Simple query error:", simpleError);
        console.error("   Code:", simpleError.code);
        console.error("   Message:", simpleError.message);
        console.error("   Details:", simpleError.details);
      }
    } else {
      console.log("✅ Found tokens with API query");
    }
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

testTokenQuery();
