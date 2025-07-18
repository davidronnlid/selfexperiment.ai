const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWithingsData() {
  console.log("🔍 Checking Withings data in database...");

  try {
    // Check if table exists and has data
    const { data, error } = await supabase
      .from("withings_variable_data_points")
      .select("user_id, date, variable, value")
      .limit(10);

    if (error) {
      console.error("❌ Error fetching data:", error);
      return;
    }

    console.log("✅ Data found:", data?.length || 0, "records");

    if (data && data.length > 0) {
      console.log("📊 Sample data:");
      data.forEach((record, i) => {
        console.log(
          `  ${i + 1}. User: ${record.user_id}, Date: ${
            record.date
          }, Variable: ${record.variable}, Value: ${record.value}`
        );
      });

      // Get unique user IDs
      const userIds = [...new Set(data.map((r) => r.user_id))];
      console.log("👥 Unique user IDs:", userIds);

      // Get unique variables
      const variables = [...new Set(data.map((r) => r.variable))];
      console.log("📈 Variables found:", variables);
    } else {
      console.log("❌ No data found in withings_variable_data_points table");
    }

    // Also check withings_variable_logs table
    const { data: logsData, error: logsError } = await supabase
      .from("withings_variable_logs")
      .select("user_id, date, variable, value")
      .limit(5);

    if (logsError) {
      console.log(
        "ℹ️  withings_variable_logs table error (expected if table doesn't exist):",
        logsError.message
      );
    } else {
      console.log(
        "📋 withings_variable_logs data:",
        logsData?.length || 0,
        "records"
      );
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

checkWithingsData();
