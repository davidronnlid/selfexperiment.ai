#!/usr/bin/env node

/**
 * Test script for Withings Dev Page
 * Tests various measurement types to see what data is available
 */

const { createClient } = require("@supabase/supabase-js");

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing environment variables");
  console.error(
    "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Extended measurement types for testing
const EXTENDED_MEAS_TYPES = {
  body_composition: [1, 5, 6, 8, 76, 77, 88],
  blood_pressure: [9, 10, 11],
  heart_rate: [12, 13],
  activity: [16, 17, 18, 19],
  sleep: [20, 21, 22, 23, 24],
  temperature: [71, 73],
  spo2: [54],
  ecg: [91],
  other: [14, 15, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
};

async function testWithingsDev() {
  console.log("🔬 Testing Withings Dev Page Functionality\n");

  try {
    // Get a test user
    const { data: users, error: userError } = await supabase
      .from("auth.users")
      .select("id, email")
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error("❌ No users found for testing");
      return;
    }

    const testUser = users[0];
    console.log(`👤 Testing with user: ${testUser.email} (${testUser.id})`);

    // Check if user has Withings connection
    const { data: tokens, error: tokenError } = await supabase
      .from("withings_tokens")
      .select("access_token, created_at")
      .eq("user_id", testUser.id)
      .limit(1);

    if (tokenError || !tokens || tokens.length === 0) {
      console.log("⚠️  User not connected to Withings");
      console.log("   To test, connect a user to Withings first");
      return;
    }

    console.log("✅ User connected to Withings");
    console.log(`   Connected since: ${tokens[0].created_at}`);

    // Test different measurement categories
    console.log("\n📊 Testing Measurement Categories:");

    for (const [category, types] of Object.entries(EXTENDED_MEAS_TYPES)) {
      console.log(`\n🔍 Testing ${category} (types: ${types.join(", ")})`);

      try {
        const now = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Last 30 days

        const startdate = Math.floor(startDate.getTime() / 1000);
        const enddate = Math.floor(now.getTime() / 1000);

        // Test via API endpoint
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/withings-sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              userId: testUser.id,
              startdate,
              enddate,
              meastype: types,
            }),
          }
        );

        const result = await response.json();

        if (response.ok && result.success) {
          console.log(`   ✅ Success: ${result.count || 0} data points found`);
          if (result.count > 0) {
            console.log(
              `   📈 Sample data:`,
              JSON.stringify(result.rows?.[0] || {}, null, 2)
            );
          }
        } else {
          console.log(`   ❌ Error: ${result.error || "Unknown error"}`);
        }
      } catch (error) {
        console.log(`   ❌ Exception: ${error.message}`);
      }
    }

    // Check existing data in database
    console.log("\n📋 Checking Existing Data in Database:");

    const { data: existingData, error: dataError } = await supabase
      .from("withings_variable_data_points")
      .select("variable, count")
      .eq("user_id", testUser.id)
      .select("variable")
      .limit(100);

    if (dataError) {
      console.log(`   ❌ Error fetching data: ${dataError.message}`);
    } else {
      const variableCounts = {};
      existingData?.forEach((item) => {
        variableCounts[item.variable] =
          (variableCounts[item.variable] || 0) + 1;
      });

      console.log(`   📊 Found ${existingData?.length || 0} total records`);
      console.log("   📈 Variables with data:");
      Object.entries(variableCounts).forEach(([variable, count]) => {
        console.log(`      - ${variable}: ${count} records`);
      });
    }

    console.log("\n🎉 Withings Dev Page Test Complete!");
    console.log("\n📝 Next Steps:");
    console.log("   1. Visit /withings-dev in your browser");
    console.log("   2. Test different measurement categories");
    console.log("   3. Use custom measurement types to explore specific data");
    console.log("   4. Check what additional health data is available");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the test
testWithingsDev()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
