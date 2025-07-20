const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testOuraDataDisplay() {
  console.log("🔍 Testing Oura data display...\n");

  // Test user ID from the images
  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // 1. Check if variables exist
    console.log("1. Checking Oura variables in variables table...");
    const { data: variables, error: variablesError } = await supabase
      .from("variables")
      .select("id, slug, label, source_type")
      .eq("source_type", "oura")
      .order("slug");

    if (variablesError) {
      console.error("❌ Error fetching variables:", variablesError);
    } else {
      console.log(`✅ Found ${variables.length} Oura variables:`);
      variables.forEach((v) => {
        console.log(`   - ${v.slug}: ${v.label} (ID: ${v.id})`);
      });
    }

    // 2. Check if data points exist
    console.log("\n2. Checking Oura data points...");
    const { data: dataPoints, error: dataError } = await supabase
      .from("oura_variable_data_points")
      .select(
        `
        id, 
        user_id, 
        date, 
        variable_id, 
        value, 
        created_at,
        variables!inner(slug, label)
      `
      )
      .eq("user_id", testUserId)
      .order("date", { ascending: false })
      .limit(10);

    if (dataError) {
      console.error("❌ Error fetching data points:", dataError);
    } else {
      console.log(`✅ Found ${dataPoints.length} Oura data points:`);
      dataPoints.forEach((dp) => {
        console.log(
          `   - ${dp.date}: ${dp.variables?.label} = ${dp.value} (Variable ID: ${dp.variable_id})`
        );
      });
    }

    // 3. Test the specific query that was failing
    console.log("\n3. Testing the specific query that was failing...");

    // Get the sleep_score variable ID
    const { data: sleepVariable, error: sleepVarError } = await supabase
      .from("variables")
      .select("id, slug, label")
      .eq("slug", "sleep_score")
      .single();

    if (sleepVarError) {
      console.error("❌ Error fetching sleep_score variable:", sleepVarError);
    } else {
      console.log(
        `✅ Found sleep_score variable: ${sleepVariable.label} (ID: ${sleepVariable.id})`
      );

      // Test query using the UUID
      const { data: sleepData, error: sleepDataError } = await supabase
        .from("oura_variable_data_points")
        .select("id, date, value, created_at")
        .eq("user_id", testUserId)
        .eq("variable_id", sleepVariable.id)
        .order("date", { ascending: false })
        .limit(5);

      if (sleepDataError) {
        console.error("❌ Error fetching sleep data:", sleepDataError);
      } else {
        console.log(`✅ Found ${sleepData.length} sleep_score data points:`);
        sleepData.forEach((dp) => {
          console.log(`   - ${dp.date}: ${dp.value}`);
        });
      }
    }

    // 4. Test the old query (using slug) to confirm it doesn't work
    console.log(
      "\n4. Testing the old query (using slug) to confirm it doesn't work..."
    );
    const { data: oldQueryData, error: oldQueryError } = await supabase
      .from("oura_variable_data_points")
      .select("id, date, value, created_at")
      .eq("user_id", testUserId)
      .eq("variable_id", "sleep_score") // This should return no results
      .order("date", { ascending: false })
      .limit(5);

    if (oldQueryError) {
      console.error("❌ Error with old query:", oldQueryError);
    } else {
      console.log(
        `✅ Old query returned ${oldQueryData.length} results (should be 0):`
      );
      oldQueryData.forEach((dp) => {
        console.log(`   - ${dp.date}: ${dp.value}`);
      });
    }

    console.log("\n🎯 Summary:");
    if (dataPoints && dataPoints.length > 0) {
      console.log("✅ Oura data exists in the database");
      console.log(
        "✅ The fix should work - data is stored with UUID variable_id"
      );
    } else {
      console.log(
        "❌ No Oura data found - the edge function may not have completed successfully"
      );
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testOuraDataDisplay();
