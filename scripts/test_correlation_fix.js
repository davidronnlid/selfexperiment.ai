// Test script to verify the logs-variables relationship fix
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  console.log(
    "Make sure you have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCorrelationFix() {
  console.log("🧪 Testing correlation analysis fix...");

  try {
    // Test the fixed approach: fetch logs and variables separately
    console.log("\n1. Testing separate fetch approach...");

    const [logsResponse, variablesResponse] = await Promise.all([
      supabase.from("logs").select("*").limit(5),
      supabase.from("variables").select("id, label").limit(10),
    ]);

    const { data: logs, error: logsError } = logsResponse;
    const { data: variables, error: variablesError } = variablesResponse;

    if (logsError) {
      console.error("❌ Logs query failed:", logsError.message);
      return;
    }

    if (variablesError) {
      console.error("❌ Variables query failed:", variablesError.message);
      return;
    }

    console.log("✅ Successfully fetched data:");
    console.log(`  - Logs: ${logs?.length || 0} records`);
    console.log(`  - Variables: ${variables?.length || 0} records`);

    if (logs && variables && logs.length > 0 && variables.length > 0) {
      // Test the JavaScript join approach
      console.log("\n2. Testing JavaScript join...");

      const varsMap = variables.reduce((acc, v) => ({ ...acc, [v.id]: v }), {});
      const joinedLogs = logs
        .map((log) => ({
          ...log,
          variables: varsMap[log.variable_id]
            ? { label: varsMap[log.variable_id].label }
            : null,
        }))
        .filter((log) => log.variables); // Only logs with valid variables

      console.log(
        `✅ Successfully joined ${joinedLogs.length} logs with variables`
      );

      if (joinedLogs.length > 0) {
        console.log("📊 Sample joined data:");
        console.log(`  - Log ID: ${joinedLogs[0].id}`);
        console.log(`  - Variable: ${joinedLogs[0].variables?.label}`);
        console.log(`  - Value: ${joinedLogs[0].value}`);
        console.log(`  - Date: ${joinedLogs[0].date}`);
      }

      // Test the old problematic join approach for comparison
      console.log("\n3. Testing old join approach (should fail)...");

      const { data: joinedData, error: joinError } = await supabase
        .from("logs")
        .select("*, variables(label)")
        .limit(2);

      if (joinError) {
        console.log(
          "⚠️  Old join approach failed as expected:",
          joinError.message
        );
        console.log(
          "   This confirms the relationship issue exists and our fix is needed."
        );
      } else {
        console.log(
          "🤔 Old join approach worked - relationship might be fixed at DB level"
        );
        console.log(`   Got ${joinedData?.length || 0} records with join`);
      }
    } else {
      console.log("⚠️  No data to test joins with");
    }

    console.log("\n✅ Correlation analysis fix test complete!");
    console.log("   The JavaScript join approach should work reliably now.");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

async function main() {
  await testCorrelationFix();
  process.exit(0);
}

main().catch(console.error);
