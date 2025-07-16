const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSleepData() {
  const userId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  console.log("🛌 Checking sleep data specifically...\n");

  const { data: sleepData, error } = await supabase
    .from("oura_variable_logs")
    .select("*")
    .eq("user_id", userId)
    .in("variable_id", [
      "sleep_score",
      "total_sleep_duration",
      "rem_sleep_duration",
      "deep_sleep_duration",
      "efficiency",
      "sleep_latency",
    ])
    .order("date", { ascending: false })
    .limit(10);

  if (error) {
    console.error("❌ Error:", error);
  } else {
    console.log(`✅ Found ${sleepData.length} sleep data entries:`);
    sleepData.forEach((record, i) => {
      console.log(
        `  ${i + 1}. ${record.date}: ${record.variable_id} = ${record.value}`
      );
    });

    // Group by date
    const byDate = {};
    sleepData.forEach((record) => {
      if (!byDate[record.date]) byDate[record.date] = {};
      byDate[record.date][record.variable_id] = record.value;
    });

    console.log("\n📅 Sleep data by date:");
    Object.keys(byDate)
      .slice(0, 3)
      .forEach((date) => {
        console.log(`\n  ${date}:`);
        Object.entries(byDate[date]).forEach(([metric, value]) => {
          console.log(`    - ${metric}: ${value}`);
        });
      });
  }

  process.exit(0);
}

checkSleepData().catch(console.error);
