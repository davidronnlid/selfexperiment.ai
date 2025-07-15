const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("🔍 Testing RLS policies...");

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLS() {
  try {
    // First, check if we can get the current user
    console.log("\n1. Testing auth.getUser()...");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("User error:", userError);
    console.log("User ID:", user?.id);
    console.log("User object:", user ? "EXISTS" : "NULL");

    if (!user) {
      console.log(
        "❌ No authenticated user - this is why RLS is blocking access!"
      );
      console.log("The API needs to be authenticated to use RLS policies.");
      return;
    }

    // Test the token query with authenticated user
    console.log("\n2. Testing token query with authenticated user...");
    const { data: tokens, error: tokenError } = await supabase
      .from("oura_tokens")
      .select("access_token, refresh_token, id")
      .eq("user_id", user.id)
      .limit(1);

    console.log("Token error:", tokenError);
    console.log("Tokens found:", tokens?.length || 0);

    // Test if we can query any oura_tokens at all
    console.log("\n3. Testing general oura_tokens access...");
    const { data: anyTokens, error: anyError } = await supabase
      .from("oura_tokens")
      .select("id")
      .limit(1);

    console.log("Any tokens error:", anyError);
    console.log("Any tokens found:", anyTokens?.length || 0);
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

testRLS();
