const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testOuraSync() {
  const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  console.log("🔄 Testing Oura sync...\n");

  // Make the API call
  try {
    const response = await fetch(
      `http://localhost:3000/api/oura/fetch?user_id=${testUserId}`
    );
    const result = await response.json();

    console.log("✅ Sync response:", result);

    // Check what data was added
    console.log("\n📊 Checking latest data...");
    const { data: latestData, error } = await supabase
      .from("oura_variable_logs")
      .select("*")
      .eq("user_id", testUserId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ Error fetching latest data:", error);
    } else {
      console.log(`Found ${latestData.length} recent records:`);
      latestData.forEach((record, i) => {
        console.log(
          `  ${i + 1}. ${record.date}: ${record.variable_id} = ${record.value}`
        );
      });

      // Check specifically for sleep data
      const sleepData = latestData.filter(
        (r) =>
          r.variable_id.includes("sleep") ||
          r.variable_id.includes("rem") ||
          r.variable_id.includes("deep") ||
          r.variable_id.includes("efficiency") ||
          r.variable_id.includes("latency")
      );

      console.log(`\n😴 Sleep-related data: ${sleepData.length} records`);
      sleepData.forEach((record) => {
        console.log(
          `  - ${record.date}: ${record.variable_id} = ${record.value}`
        );
      });

      if (sleepData.length === 0) {
        console.log("❌ No sleep data found. This suggests:");
        console.log("   1. The Oura API is not returning sleep data");
        console.log(
          "   2. Sleep values are null/undefined and being filtered out"
        );
        console.log("   3. The user may not be wearing the ring during sleep");
      }
    }
  } catch (error) {
    console.error("❌ Sync failed:", error);
  }

  process.exit(0);
}

// Wait a moment for dev server to start
setTimeout(() => {
  testOuraSync().catch(console.error);
}, 3000);
