const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncOuraIncremental() {
  console.log("🔄 Starting Oura incremental sync...\n");

  const userId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

  try {
    // 1. Check if user has Oura tokens
    console.log("1. Checking Oura connection...");
    const { data: tokenData, error: tokenError } = await supabase
      .from("oura_tokens")
      .select("access_token, refresh_token, updated_at")
      .eq("user_id", userId)
      .single();

    if (tokenError || !tokenData) {
      console.error(
        "❌ No Oura tokens found. Please connect your Oura account first."
      );
      console.log("🔗 Go to: http://localhost:3000/oura-test");
      return;
    }

    console.log("✅ Oura connection found");
    console.log(`   Last token update: ${tokenData.updated_at}`);

    // 2. Check existing data
    console.log("\n2. Checking existing Oura data...");
    const { data: existingData, error: dataError } = await supabase
      .from("oura_variable_data_points")
      .select("date, variable_id")
      .eq("user_id", userId)
      .order("date");

    if (dataError) {
      console.error("❌ Error checking existing data:", dataError);
      return;
    }

    const existingDates = new Set(existingData.map((row) => row.date));
    const dateRange =
      existingDates.size > 0
        ? {
            earliest: Math.min(...Array.from(existingDates)),
            latest: Math.max(...Array.from(existingDates)),
            count: existingDates.size,
          }
        : null;

    if (dateRange) {
      console.log(`✅ Found ${dateRange.count} existing data points`);
      console.log(
        `   Date range: ${dateRange.earliest} to ${dateRange.latest}`
      );
    } else {
      console.log("ℹ️  No existing data found - will perform initial sync");
    }

    // 3. Call the incremental sync edge function
    console.log("\n3. Calling incremental sync edge function...");

    const syncUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL.replace("/rest/v1", "") +
      "/functions/v1/oura-sync-incremental";

    const response = await fetch(syncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: userId,
        clearExisting: false, // Don't clear existing data
        startYear: 2020, // Start from 2020 if no data exists
        forceFullSync: false, // Use incremental sync
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Sync failed with status ${response.status}:`,
        errorText
      );
      return;
    }

    const result = await response.json();

    if (!result.success) {
      console.error("❌ Sync failed:", result.error);
      if (result.details) {
        console.error("   Details:", result.details);
      }
      return;
    }

    // 4. Display results
    console.log("\n🎉 Incremental sync completed successfully!");
    console.log(`   Sync type: ${result.data.syncType}`);
    console.log(`   Records upserted: ${result.data.totalUpserted}`);
    console.log(
      `   Date ranges processed: ${result.data.dateRangesProcessed}/${result.data.totalDateRanges}`
    );

    if (result.data.dateRangesFailed > 0) {
      console.log(`   ⚠️  Failed ranges: ${result.data.dateRangesFailed}`);
    }

    if (result.data.existingDatesCount) {
      console.log(
        `   Existing dates preserved: ${result.data.existingDatesCount}`
      );
    }

    // Show what was synced
    if (result.data.missingRanges && result.data.missingRanges.length > 0) {
      console.log("\n📅 Synced date ranges:");
      for (const range of result.data.missingRanges) {
        console.log(`   - ${range.type}: ${range.start} to ${range.end}`);
      }
    } else if (result.message) {
      console.log(`\nℹ️  ${result.message}`);
    }

    // 5. Verify data is available
    console.log("\n5. Verifying synced data...");
    const { data: newDataCheck, error: checkError } = await supabase
      .from("oura_variable_data_points")
      .select("date, variable_id")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(5);

    if (checkError) {
      console.error("❌ Error verifying data:", checkError);
    } else if (newDataCheck.length > 0) {
      console.log("✅ Data verification successful");
      console.log(`   Latest data points: ${newDataCheck.length} found`);
      console.log(`   Most recent date: ${newDataCheck[0].date}`);
    }

    console.log("\n🚀 Next steps:");
    console.log(
      "   • Test your variables: http://localhost:3000/variable/sleep_score"
    );
    console.log(
      "   • View readiness: http://localhost:3000/variable/readiness_score"
    );
    console.log("   • Check steps: http://localhost:3000/variable/steps");
    console.log("   • Oura test page: http://localhost:3000/oura-test");
  } catch (error) {
    console.error("❌ Sync failed:", error);
  }
}

// Allow forcing full sync with command line argument
const forceFullSync = process.argv.includes("--full");

if (forceFullSync) {
  console.log("🔄 Forcing full sync (--full flag detected)...\n");
  // Modify the function call if needed
}

syncOuraIncremental();
