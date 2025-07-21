// Test script for the withings-sync-all edge function
// This script can be run to test the new edge function

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key-here"; // Replace with your actual anon key

async function testWithingsSyncAll() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/withings-sync-all`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          userId: "your-user-id-here", // Replace with actual user ID
          clearExisting: true,
          startYear: 2009,
        }),
      }
    );

    const result = await response.json();
    console.log("Response:", result);

    if (result.success) {
      console.log("✅ Success!");
      console.log(`Total data points upserted: ${result.data.totalUpserted}`);
      console.log(`Date ranges processed: ${result.data.dateRangesProcessed}`);
      console.log(`Date ranges failed: ${result.data.dateRangesFailed}`);
    } else {
      console.log("❌ Error:", result.error);
    }
  } catch (error) {
    console.error("❌ Request failed:", error);
  }
}

// Usage instructions
console.log(`
🚀 Withings Sync All Edge Function Test

This script tests the new withings-sync-all edge function that fetches all Withings data since 2009.

To use this script:

1. Replace 'your-anon-key-here' with your actual Supabase anon key
2. Replace 'your-user-id-here' with the actual user ID you want to sync
3. Run: node test-withings-sync-all.js

The function will:
- Clear existing Withings data for the user (if clearExisting: true)
- Fetch all data from January 2009 to present
- Process data in monthly chunks
- Store data in the withings_variable_data_points table
- Handle token refresh automatically
- Provide detailed progress and results

Expected response format:
{
  "success": true,
  "data": {
    "totalUpserted": 1234,
    "dateRangesProcessed": 180,
    "dateRangesFailed": 0,
    "totalDateRanges": 180,
    "dateRange": {
      "start": "2009-01-01T00:00:00.000Z",
      "end": "2024-12-19T00:00:00.000Z"
    }
  }
}
`);

// Uncomment the line below to run the test
// testWithingsSyncAll()
