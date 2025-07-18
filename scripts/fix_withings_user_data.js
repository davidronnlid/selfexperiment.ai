const { createClient } = require("@supabase/supabase-js");

// Load environment variables
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixWithingsUserData() {
  try {
    console.log("Fixing Withings user data...");

    // Get the current user ID from command line argument or use a default
    const targetUserId =
      process.argv[2] || "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

    console.log("Target user ID:", targetUserId);

    // First, let's see what data we have
    const { data: existingData, error: fetchError } = await supabase
      .from("withings_variable_data_points")
      .select("*")
      .limit(10);

    if (fetchError) {
      console.error("Error fetching existing data:", fetchError);
      return;
    }

    console.log("Existing data count:", existingData?.length || 0);
    if (existingData && existingData.length > 0) {
      console.log("Sample existing data:", existingData[0]);
    }

    // Update all Withings data to belong to the target user
    const { data: updateResult, error: updateError } = await supabase
      .from("withings_variable_data_points")
      .update({ user_id: targetUserId })
      .neq("user_id", targetUserId); // Only update records that don't already belong to target user

    if (updateError) {
      console.error("Error updating user data:", updateError);
      return;
    }

    console.log("Update result:", updateResult);

    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from("withings_variable_data_points")
      .select("user_id, date, variable, value")
      .eq("user_id", targetUserId)
      .limit(5);

    if (verifyError) {
      console.error("Error verifying update:", verifyError);
      return;
    }

    console.log("✅ Data updated successfully!");
    console.log("Data for target user:", verifyData?.length || 0, "records");
    if (verifyData && verifyData.length > 0) {
      console.log("Sample updated data:", verifyData[0]);
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

fixWithingsUserData();
