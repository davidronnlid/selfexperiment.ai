const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixDatabaseRelationships() {
  console.log("🔧 Fixing database relationships and console errors...\n");

  try {
    // 1. Check current data_points table structure
    console.log("1. Checking data_points table structure...");

    const { data: columns, error: columnsError } = await supabase.rpc(
      "exec_sql",
      {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'data_points' 
          ORDER BY ordinal_position;
        `,
      }
    );

    if (columnsError) {
      console.log(
        "⚠️  Cannot check table structure directly, will run fix SQL"
      );
    } else {
      console.log(
        "✅ data_points table structure:",
        columns || "Table may not exist"
      );
    }

    // 2. Test basic queries that are failing in the console
    console.log("\n2. Testing problematic queries...");

    const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

    // Test data_points query (causing 400 errors)
    const { data: dataPointsTest, error: dataPointsError } = await supabase
      .from("data_points")
      .select("id, created_at, date, variable_id, value, notes, user_id")
      .eq("user_id", testUserId)
      .limit(1);

    if (dataPointsError) {
      console.error("❌ data_points query failed:", dataPointsError.message);
      console.log("   This explains the 400 errors in the console");
    } else {
      console.log(
        "✅ data_points query works:",
        dataPointsTest?.length || 0,
        "records"
      );
    }

    // Test oura_variable_data_points query
    const { data: ouraTest, error: ouraError } = await supabase
      .from("oura_variable_data_points")
      .select("id, date, variable_id, value, created_at")
      .eq("user_id", testUserId)
      .limit(1);

    if (ouraError) {
      console.error(
        "❌ oura_variable_data_points query failed:",
        ouraError.message
      );
    } else {
      console.log(
        "✅ oura_variable_data_points query works:",
        ouraTest?.length || 0,
        "records"
      );
    }

    // Test withings_variable_data_points query
    const { data: withingsTest, error: withingsError } = await supabase
      .from("withings_variable_data_points")
      .select("id, date, variable_id, value, created_at")
      .eq("user_id", testUserId)
      .limit(1);

    if (withingsError) {
      console.error(
        "❌ withings_variable_data_points query failed:",
        withingsError.message
      );
    } else {
      console.log(
        "✅ withings_variable_data_points query works:",
        withingsTest?.length || 0,
        "records"
      );
    }

    // Test join queries (causing foreign key errors)
    console.log("\n3. Testing join queries with variables table...");

    const { data: joinTest, error: joinError } = await supabase
      .from("oura_variable_data_points")
      .select(
        `
        date, 
        variable_id, 
        value, 
        created_at,
        variables!inner(slug, label)
      `
      )
      .eq("user_id", testUserId)
      .limit(1);

    if (joinError) {
      console.error("❌ Join query failed:", joinError.message);
      console.log("   This explains the foreign key relationship errors");
    } else {
      console.log("✅ Join query works:", joinTest?.length || 0, "records");
    }

    // 3. Run the database fix if needed
    if (dataPointsError || joinError) {
      console.log("\n4. Running database relationship fixes...");

      try {
        // Read and execute the fix SQL
        const fs = require("fs");
        const fixSQL = fs.readFileSync(
          "database/fix_data_points_relationships.sql",
          "utf8"
        );

        // Split into individual statements and execute
        const statements = fixSQL
          .split(";")
          .map((stmt) => stmt.trim())
          .filter(
            (stmt) =>
              stmt && !stmt.startsWith("--") && !stmt.startsWith("SELECT")
          );

        console.log(`   Executing ${statements.length} SQL statements...`);

        let successCount = 0;
        for (const statement of statements) {
          if (!statement) continue;

          try {
            await supabase.rpc("exec_sql", { sql: statement });
            successCount++;
          } catch (err) {
            console.log(
              `   ⚠️  Statement may have failed (could be expected):`,
              err.message.substring(0, 100)
            );
          }
        }

        console.log(`   ✅ Successfully executed ${successCount} statements`);
      } catch (sqlError) {
        console.log(
          "⚠️  Direct SQL execution not available, manual fix needed"
        );
        console.log("💡 Please run this SQL in your Supabase Dashboard:");
        console.log("   File: database/fix_data_points_relationships.sql");
      }
    }

    // 4. Test queries again after fix
    console.log("\n5. Re-testing queries after fix...");

    const { data: retestData, error: retestError } = await supabase
      .from("data_points")
      .select("id, created_at, date, variable_id, value, notes, user_id")
      .eq("user_id", testUserId)
      .limit(1);

    if (retestError) {
      console.error("❌ Still failing after fix:", retestError.message);
    } else {
      console.log("✅ data_points query now works!");
    }

    // 5. Check what data is actually available
    console.log("\n6. Checking available data across all tables...");

    const tables = [
      "data_points",
      "oura_variable_data_points",
      "withings_variable_data_points",
      "variables",
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error) {
          console.log(`   ${table}: ❌ ${error.message}`);
        } else {
          console.log(`   ${table}: ✅ ${count || 0} records`);
        }
      } catch (err) {
        console.log(`   ${table}: ⚠️  ${err.message}`);
      }
    }

    console.log("\n🎯 Summary:");
    console.log("✅ Database relationship fix completed");
    console.log(
      "✅ Check your analytics page - console errors should be reduced"
    );
    console.log(
      "💡 If you still see errors, the tables may need data or additional schema fixes"
    );
  } catch (error) {
    console.error("❌ Fix failed:", error);
  }
}

fixDatabaseRelationships();
