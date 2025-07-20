const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseWithingsData() {
  console.log("🔍 Diagnosing Withings data issues...\n");

  try {
    // 1. Check data counts
    console.log("1. Checking data counts...");
    const { count: dataCount, error: countError } = await supabase
      .from("withings_variable_data_points")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("   ❌ Error counting data:", countError);
    } else {
      console.log(`   📊 Total records: ${dataCount}`);
    }

    // 2. Check variables table
    console.log("\n2. Checking variables table...");
    const { data: variables, error: varsError } = await supabase
      .from("variables")
      .select("id, slug, label, source_type")
      .eq("source_type", "withings");

    if (varsError) {
      console.error("   ❌ Error fetching variables:", varsError);
    } else {
      console.log(`   📋 Found ${variables?.length || 0} Withings variables:`);
      variables?.forEach((v) => {
        console.log(`      - ${v.slug} (${v.label}) - ID: ${v.id}`);
      });
    }

    // 3. Test a simple join query
    console.log("\n3. Testing join query...");
    const { data: joinTest, error: joinError } = await supabase
      .from("withings_variable_data_points")
      .select(
        `
        id,
        user_id,
        date,
        value,
        variable_id,
        variables!inner(slug, label)
      `
      )
      .limit(5);

    if (joinError) {
      console.error("   ❌ Join query failed:", joinError);
      console.log("   💡 This is likely the root cause of your UI issues!");
    } else {
      console.log("   ✅ Join query successful!");
      console.log("   📊 Sample joined data:", joinTest);
    }

    // 4. Check specific user data
    console.log("\n4. Checking specific user data...");
    const { data: userData, error: userError } = await supabase
      .from("withings_variable_data_points")
      .select("user_id, COUNT(*)", { count: "exact" })
      .group("user_id")
      .order("count", { ascending: false })
      .limit(5);

    if (userError) {
      console.error("   ❌ Error checking user data:", userError);
    } else {
      console.log("   👥 User data counts:", userData);
    }

    // 5. Check for NULL variable_ids
    console.log("\n5. Checking for NULL variable_ids...");
    const { count: nullVars, error: nullError } = await supabase
      .from("withings_variable_data_points")
      .select("*", { count: "exact", head: true })
      .is("variable_id", null);

    if (nullError) {
      console.error("   ❌ Error checking NULL variable_ids:", nullError);
    } else {
      console.log(`   📊 Records with NULL variable_id: ${nullVars}`);
    }

    // 6. Check sample data structure
    console.log("\n6. Checking sample data structure...");
    const { data: sampleData, error: sampleError } = await supabase
      .from("withings_variable_data_points")
      .select("*")
      .limit(3);

    if (sampleError) {
      console.error("   ❌ Error fetching sample data:", sampleError);
    } else {
      console.log("   📊 Sample data structure:", sampleData);
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

// Run the diagnosis
diagnoseWithingsData()
  .then(() => {
    console.log("\n🏁 Diagnosis complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Diagnosis failed:", error);
    process.exit(1);
  });
