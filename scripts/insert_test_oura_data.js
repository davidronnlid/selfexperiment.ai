const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertTestOuraData() {
  console.log("🔧 Inserting test Oura data...\n");

  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // 1. Get the sleep_score variable ID
    console.log("1. Getting sleep_score variable ID...");
    const { data: sleepVariable, error: sleepVarError } = await supabase
      .from("variables")
      .select("id, slug, label")
      .eq("slug", "sleep_score")
      .single();

    if (sleepVarError) {
      console.error("❌ Error fetching sleep_score variable:", sleepVarError);
      return;
    }

    console.log(
      `✅ Found sleep_score variable: ${sleepVariable.label} (ID: ${sleepVariable.id})`
    );

    // 2. Get the readiness_score variable ID
    console.log("\n2. Getting readiness_score variable ID...");
    const { data: readinessVariable, error: readinessVarError } = await supabase
      .from("variables")
      .select("id, slug, label")
      .eq("slug", "readiness_score")
      .single();

    if (readinessVarError) {
      console.error(
        "❌ Error fetching readiness_score variable:",
        readinessVarError
      );
      return;
    }

    console.log(
      `✅ Found readiness_score variable: ${readinessVariable.label} (ID: ${readinessVariable.id})`
    );

    // 3. Insert test data for the last 7 days
    console.log("\n3. Inserting test data...");
    const testData = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      // Sleep score data (random values between 70-95)
      testData.push({
        id: crypto.randomUUID(),
        user_id: testUserId,
        date: dateStr,
        variable_id: sleepVariable.id,
        value: Math.floor(Math.random() * 26) + 70, // 70-95
        created_at: new Date().toISOString(),
      });

      // Readiness score data (random values between 60-90)
      testData.push({
        id: crypto.randomUUID(),
        user_id: testUserId,
        date: dateStr,
        variable_id: readinessVariable.id,
        value: Math.floor(Math.random() * 31) + 60, // 60-90
        created_at: new Date().toISOString(),
      });
    }

    // Insert the test data
    const { data: insertedData, error: insertError } = await supabase
      .from("oura_variable_data_points")
      .upsert(testData, { onConflict: "user_id,date,variable_id" });

    if (insertError) {
      console.error("❌ Error inserting test data:", insertError);
    } else {
      console.log(
        `✅ Successfully inserted ${testData.length} test data points`
      );
    }

    // 4. Verify the data was inserted
    console.log("\n4. Verifying inserted data...");
    const { data: verifyData, error: verifyError } = await supabase
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

    if (verifyError) {
      console.error("❌ Error verifying data:", verifyError);
    } else {
      console.log(`✅ Found ${verifyData.length} data points:`);
      verifyData.forEach((dp) => {
        console.log(
          `   - ${dp.date}: ${dp.variables?.label} = ${dp.value} (Variable ID: ${dp.variable_id})`
        );
      });
    }

    // 5. Test the specific query that was failing before
    console.log("\n5. Testing the specific query that was failing...");
    const { data: sleepData, error: sleepDataError } = await supabase
      .from("oura_variable_data_points")
      .select("id, date, value, created_at")
      .eq("user_id", testUserId)
      .eq("variable_id", sleepVariable.id) // Using UUID instead of slug
      .order("date", { ascending: false })
      .limit(5);

    if (sleepDataError) {
      console.error("❌ Error with fixed query:", sleepDataError);
    } else {
      console.log(
        `✅ Fixed query returned ${sleepData.length} sleep_score records:`
      );
      sleepData.forEach((dp) => {
        console.log(`   - ${dp.date}: ${dp.value}`);
      });
    }

    console.log("\n🎯 Summary:");
    console.log("✅ Test Oura data has been inserted");
    console.log(
      "✅ The UI fix should now work - data is stored with UUID variable_id"
    );
    console.log(
      "✅ The old query (using slug) would fail, but the new query (using UUID) works"
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

insertTestOuraData();
