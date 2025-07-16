// Import Supabase using the ES module approach
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const fs = require("fs");
const path = require("path");

async function fixLogsVariablesRelationship() {
  console.log("🔧 Fixing logs-variables relationship...");

  try {
    // Read the SQL file
    const sqlPath = path.join(
      __dirname,
      "../database/fix_logs_variables_relationship.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Execute the SQL
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      console.error("❌ Error executing SQL:", error);
      return;
    }

    console.log("✅ Successfully executed relationship fix SQL");

    // Test the relationship by running a simple join query
    console.log("\n🧪 Testing the relationship...");

    const { data: testData, error: testError } = await supabase
      .from("logs")
      .select(
        `
        id,
        variable_id,
        value,
        date,
        variables!inner(
          id,
          label
        )
      `
      )
      .limit(5);

    if (testError) {
      console.error("❌ Test query failed:", testError.message);

      // Fallback: try without the inner join to see what's happening
      console.log("\n🔍 Trying fallback query...");
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("logs")
        .select("id, variable_id, value, date")
        .limit(5);

      if (fallbackError) {
        console.error(
          "❌ Even basic logs query failed:",
          fallbackError.message
        );
      } else {
        console.log(
          "✅ Basic logs query works, found",
          fallbackData?.length || 0,
          "logs"
        );

        // Check variables table
        const { data: varData, error: varError } = await supabase
          .from("variables")
          .select("id, label")
          .limit(5);

        if (varError) {
          console.error("❌ Variables query failed:", varError.message);
        } else {
          console.log(
            "✅ Variables query works, found",
            varData?.length || 0,
            "variables"
          );
        }
      }
    } else {
      console.log(
        "✅ Relationship test successful! Found",
        testData?.length || 0,
        "logs with variable data"
      );
      if (testData && testData.length > 0) {
        console.log("📊 Sample data:", testData[0]);
      }
    }
  } catch (error) {
    console.error("❌ Script error:", error);
  }
}

// Alternative approach if the SQL approach doesn't work
async function alternativeApproach() {
  console.log("\n🔄 Trying alternative approach...");

  try {
    // Fetch logs and variables separately, then join in JavaScript
    const { data: logs, error: logsError } = await supabase
      .from("logs")
      .select("*")
      .limit(10);

    const { data: variables, error: varsError } = await supabase
      .from("variables")
      .select("*")
      .limit(10);

    if (logsError) {
      console.error("❌ Logs fetch failed:", logsError.message);
      return;
    }

    if (varsError) {
      console.error("❌ Variables fetch failed:", varsError.message);
      return;
    }

    console.log("✅ Alternative approach working:");
    console.log("  - Logs count:", logs?.length || 0);
    console.log("  - Variables count:", variables?.length || 0);

    // Test joining them in JavaScript
    if (logs && variables && logs.length > 0 && variables.length > 0) {
      const varsMap = variables.reduce((acc, v) => ({ ...acc, [v.id]: v }), {});
      const joinedLogs = logs
        .map((log) => ({
          ...log,
          variable: varsMap[log.variable_id],
        }))
        .filter((log) => log.variable);

      console.log("  - Successfully joined logs:", joinedLogs.length);
      if (joinedLogs.length > 0) {
        console.log("  - Sample joined data:", {
          logId: joinedLogs[0].id,
          variableLabel: joinedLogs[0].variable?.label,
          value: joinedLogs[0].value,
        });
      }
    }
  } catch (error) {
    console.error("❌ Alternative approach failed:", error);
  }
}

async function main() {
  await fixLogsVariablesRelationship();
  await alternativeApproach();
  process.exit(0);
}

main().catch(console.error);
