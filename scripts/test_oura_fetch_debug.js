const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugOuraFetch() {
  console.log("🔍 Debugging Oura Fetch API...");

  try {
    // Test 1: Check if oura_variable_logs table exists and has correct structure
    console.log("\n1. Checking oura_variable_logs table structure...");
    const { data: tableInfo, error: tableError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable")
      .eq("table_name", "oura_variable_logs")
      .order("ordinal_position");

    if (tableError) {
      console.error("❌ Error checking table structure:", tableError);
    } else {
      console.log("✅ Table structure:", tableInfo);
    }

    // Test 2: Check if oura_tokens exist
    console.log("\n2. Checking oura_tokens...");
    const { data: tokens, error: tokenError } = await supabase
      .from("oura_tokens")
      .select("*")
      .limit(5);

    if (tokenError) {
      console.error("❌ Error checking tokens:", tokenError);
    } else {
      console.log("✅ Found tokens:", tokens?.length || 0);
      if (tokens && tokens.length > 0) {
        console.log("   Sample token:", {
          id: tokens[0].id,
          user_id: tokens[0].user_id,
          has_access_token: !!tokens[0].access_token,
          created_at: tokens[0].created_at,
        });
      }
    }

    // Test 3: Try to insert a test record into oura_variable_logs
    console.log("\n3. Testing insert into oura_variable_logs...");
    const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0"; // From your logs
    const testInsert = {
      user_id: testUserId,
      variable_id: "test_variable",
      date: "2025-01-15",
      value: 100,
      source: "test",
    };

    const { data: insertData, error: insertError } = await supabase
      .from("oura_variable_logs")
      .insert(testInsert)
      .select();

    if (insertError) {
      console.error("❌ Error inserting test record:", insertError);
      console.error("   Error details:", insertError.details);
      console.error("   Error hint:", insertError.hint);
    } else {
      console.log("✅ Successfully inserted test record:", insertData);

      // Clean up test record
      const { error: deleteError } = await supabase
        .from("oura_variable_logs")
        .delete()
        .eq("variable_id", "test_variable");

      if (deleteError) {
        console.error("❌ Error cleaning up test record:", deleteError);
      } else {
        console.log("✅ Cleaned up test record");
      }
    }
  } catch (error) {
    console.error("❌ Debug error:", error);
  }
}

debugOuraFetch();
