const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔍 Checking environment variables...");
console.log("SUPABASE_URL:", !!supabaseUrl);
console.log("SERVICE_ROLE_KEY:", !!supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function quickCheck() {
  console.log("🔍 Quick check of Withings data...");

  try {
    // Count total records
    const { count, error: countError } = await supabase
      .from("withings_variable_data_points")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("❌ Error counting records:", countError);
      return;
    }

    console.log(`✅ Total records: ${count || 0}`);

    if (count > 0) {
      // Get sample data
      const { data, error } = await supabase
        .from("withings_variable_data_points")
        .select("user_id, date, variable, value")
        .limit(5);

      if (error) {
        console.error("❌ Error fetching sample data:", error);
        return;
      }

      console.log("📊 Sample data:");
      data.forEach((record, i) => {
        console.log(
          `  ${i + 1}. ${record.date} - ${record.variable}: ${record.value}`
        );
      });

      // Get unique variables
      const { data: variables, error: varError } = await supabase
        .from("withings_variable_data_points")
        .select("variable")
        .limit(1000);

      if (!varError && variables) {
        const uniqueVars = [...new Set(variables.map((v) => v.variable))];
        console.log("📈 Variables found:", uniqueVars);
      }
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

quickCheck();
