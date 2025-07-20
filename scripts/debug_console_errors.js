const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Test both service role and anon key clients
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugConsoleErrors() {
  console.log("🔍 Comprehensive console error debugging...\n");

  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // Test 1: Reproduce the exact queries that are failing
    console.log("1. Testing exact problematic queries from console...\n");

    // Test the exact Oura query with joins that's failing
    console.log(
      "   A) Testing Oura query with variables join (the one causing 400s):"
    );
    const { data: ouraJoinData, error: ouraJoinError } = await supabaseAnon
      .from("oura_variable_data_points")
      .select(
        `
        id, 
        user_id, 
        date, 
        variable_id, 
        value, 
        created_at,
        variables!inner(id, slug, label)
      `
      )
      .eq("user_id", testUserId)
      .limit(5);

    if (ouraJoinError) {
      console.error("   ❌ Oura join query failed:", {
        code: ouraJoinError.code,
        message: ouraJoinError.message,
        details: ouraJoinError.details,
        hint: ouraJoinError.hint,
      });
      console.log("   💡 This is likely the source of 400 errors in console");
    } else {
      console.log(
        `   ✅ Oura join query success: ${ouraJoinData?.length || 0} records`
      );
    }

    // Test without join
    console.log("\n   B) Testing Oura query WITHOUT joins:");
    const { data: ouraNoJoinData, error: ouraNoJoinError } = await supabaseAnon
      .from("oura_variable_data_points")
      .select("id, user_id, date, variable_id, value, created_at")
      .eq("user_id", testUserId)
      .limit(5);

    if (ouraNoJoinError) {
      console.error(
        "   ❌ Oura no-join query failed:",
        ouraNoJoinError.message
      );
    } else {
      console.log(
        `   ✅ Oura no-join query success: ${
          ouraNoJoinData?.length || 0
        } records`
      );
    }

    // Test 2: Check authentication status
    console.log("\n2. Testing authentication...");
    const { data: session, error: sessionError } =
      await supabaseAnon.auth.getSession();

    console.log("   Session status:", {
      hasSession: !!session?.session,
      hasUser: !!session?.session?.user,
      userId: session?.session?.user?.id,
      error: sessionError?.message,
    });

    // Test 3: Check RLS policies
    console.log("\n3. Testing RLS policies...");

    // Check what happens with admin client
    const { data: adminOuraData, error: adminOuraError } = await supabaseAdmin
      .from("oura_variable_data_points")
      .select("id, user_id, date, variable_id, value")
      .eq("user_id", testUserId)
      .limit(5);

    console.log("   Admin client:", {
      success: !adminOuraError,
      recordCount: adminOuraData?.length || 0,
      error: adminOuraError?.message,
    });

    // Test 4: Check foreign key relationships
    console.log("\n4. Testing foreign key relationships...");

    // Check if the variables table has the expected records
    const { data: variablesData, error: variablesError } = await supabaseAnon
      .from("variables")
      .select("id, slug, label")
      .eq("is_active", true)
      .limit(5);

    console.log("   Variables query:", {
      success: !variablesError,
      recordCount: variablesData?.length || 0,
      error: variablesError?.message,
    });

    // Test 5: Check pagination
    console.log("\n5. Testing pagination approach...");

    let totalRecords = 0;
    let pageCount = 0;
    let hasMore = true;
    let from = 0;
    const limit = 1000;

    while (hasMore && pageCount < 3) {
      // Only test first 3 pages
      pageCount++;
      const { data: pageData, error: pageError } = await supabaseAdmin
        .from("oura_variable_data_points")
        .select("id")
        .eq("user_id", testUserId)
        .order("date", { ascending: false })
        .range(from, from + limit - 1);

      if (pageError) {
        console.error(`   Page ${pageCount} error:`, pageError.message);
        break;
      }

      const recordCount = pageData?.length || 0;
      totalRecords += recordCount;
      console.log(`   Page ${pageCount}: ${recordCount} records`);

      if (recordCount < limit) {
        hasMore = false;
      } else {
        from += limit;
      }
    }

    console.log(
      `   Pagination test: ${totalRecords} records across ${pageCount} pages`
    );

    // Test 6: Specific error scenarios
    console.log("\n6. Testing specific error scenarios...");

    // Test what happens with invalid user ID
    const { data: invalidData, error: invalidError } = await supabaseAnon
      .from("oura_variable_data_points")
      .select("id")
      .eq("user_id", "invalid-user-id")
      .limit(1);

    console.log("   Invalid user ID test:", {
      success: !invalidError,
      error: invalidError?.message,
    });

    console.log("\n🎯 DEBUGGING SUMMARY:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (ouraJoinError) {
      console.log("❌ PRIMARY ISSUE: Oura join queries are failing");
      console.log(`   Error: ${ouraJoinError.message}`);
      console.log(`   Code: ${ouraJoinError.code}`);
      console.log("   💡 SOLUTION: Use fallback queries without joins");
    }

    if (!session?.session) {
      console.log("❌ AUTHENTICATION ISSUE: No session found");
      console.log("   💡 SOLUTION: Ensure user is properly authenticated");
    }

    console.log("\n🔧 RECOMMENDED FIXES:");
    console.log("1. ✅ Use fallback queries (already implemented)");
    console.log("2. ✅ Add better error handling (already implemented)");
    console.log("3. 🔄 Clear browser cache and refresh");
    console.log("4. 🔄 Ensure user is logged in");
    console.log("5. 🔄 Check if RLS policies are blocking access");
  } catch (error) {
    console.error("❌ Debug script failed:", error);
  }
}

debugConsoleErrors();
