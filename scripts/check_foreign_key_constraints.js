const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkForeignKeyConstraints() {
  console.log(
    "🔍 Checking foreign key constraints and table relationships...\n"
  );

  try {
    // 1. Check if foreign key constraints exist
    console.log("1. Checking existing foreign key constraints...");

    const { data: constraints, error: constraintsError } = await supabase.rpc(
      "exec_sql",
      {
        sql: `
          SELECT 
              tc.constraint_name,
              tc.table_name,
              kcu.column_name,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_name IN ('data_points', 'oura_variable_data_points', 'withings_variable_data_points')
          ORDER BY tc.table_name, kcu.column_name;
        `,
      }
    );

    if (constraintsError) {
      console.log(
        "⚠️  Cannot check constraints directly, will test relationships manually"
      );
    } else {
      console.log("📋 Current foreign key constraints:");
      if (constraints && constraints.length > 0) {
        constraints.forEach((c) => {
          console.log(
            `   ${c.table_name}.${c.column_name} → ${c.foreign_table_name}.${c.foreign_column_name}`
          );
        });
      } else {
        console.log("   ❌ No foreign key constraints found!");
      }
    }

    // 2. Test the specific failing query pattern from the console
    console.log("\n2. Testing the exact failing query pattern...");

    const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

    // This is the exact query pattern that's failing in the console
    const { data: testJoin, error: testJoinError } = await supabase
      .from("data_points")
      .select(
        `
        date, 
        value, 
        notes,
        variable_id,
        variables!inner(slug, label, category)
      `
      )
      .eq("user_id", testUserId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (testJoinError) {
      console.error("❌ Join query still failing:", testJoinError.message);
      console.error("   Error code:", testJoinError.code);
      console.error("   Details:", testJoinError.details);

      // Try a simpler query to isolate the issue
      console.log("\n3. Testing simpler queries to isolate the issue...");

      // Test data_points without join
      const { data: simpleData, error: simpleError } = await supabase
        .from("data_points")
        .select("*")
        .eq("user_id", testUserId)
        .limit(1);

      if (simpleError) {
        console.error(
          "   ❌ Even simple data_points query fails:",
          simpleError.message
        );
      } else {
        console.log(
          "   ✅ Simple data_points query works, found",
          simpleData?.length || 0,
          "records"
        );
        if (simpleData && simpleData.length > 0) {
          console.log("   Sample record:", {
            id: simpleData[0].id,
            variable_id: simpleData[0].variable_id,
            value: simpleData[0].value,
          });
        }
      }

      // Test variables table
      const { data: variablesData, error: variablesError } = await supabase
        .from("variables")
        .select("id, slug, label")
        .limit(1);

      if (variablesError) {
        console.error(
          "   ❌ Variables table query fails:",
          variablesError.message
        );
      } else {
        console.log(
          "   ✅ Variables table works, found",
          variablesData?.length || 0,
          "records"
        );
      }

      // Try manual join to test the relationship
      if (
        simpleData &&
        simpleData.length > 0 &&
        variablesData &&
        variablesData.length > 0
      ) {
        const dataPoint = simpleData[0];
        const { data: manualJoin, error: manualJoinError } = await supabase
          .from("variables")
          .select("slug, label, category")
          .eq("id", dataPoint.variable_id)
          .single();

        if (manualJoinError) {
          console.error("   ❌ Manual join fails:", manualJoinError.message);
          console.error(
            "   This suggests the variable_id doesn't match any variable"
          );
        } else {
          console.log("   ✅ Manual join works:", manualJoin);
        }
      }
    } else {
      console.log(
        "✅ Join query now works! Found",
        testJoin?.length || 0,
        "records"
      );
    }

    // 3. If the constraint is missing, create it
    if (testJoinError && testJoinError.message.includes("relationship")) {
      console.log("\n4. Creating missing foreign key constraint...");

      try {
        await supabase.rpc("exec_sql", {
          sql: `
            -- Add foreign key constraint if it doesn't exist
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'data_points_variable_id_fkey'
                    AND table_name = 'data_points'
                ) THEN
                    ALTER TABLE data_points 
                    ADD CONSTRAINT data_points_variable_id_fkey 
                    FOREIGN KEY (variable_id) REFERENCES variables(id) ON DELETE CASCADE;
                    RAISE NOTICE 'Added foreign key constraint';
                ELSE
                    RAISE NOTICE 'Foreign key constraint already exists';
                END IF;
            END $$;
          `,
        });

        console.log("✅ Foreign key constraint creation attempted");

        // Test again after creating the constraint
        const { data: retestJoin, error: retestJoinError } = await supabase
          .from("data_points")
          .select(
            `
            date, 
            value, 
            notes,
            variable_id,
            variables!inner(slug, label, category)
          `
          )
          .eq("user_id", testUserId)
          .limit(1);

        if (retestJoinError) {
          console.error(
            "❌ Still failing after constraint creation:",
            retestJoinError.message
          );
        } else {
          console.log("✅ Join query now works after constraint creation!");
        }
      } catch (constraintError) {
        console.error(
          "❌ Failed to create constraint:",
          constraintError.message
        );
      }
    }

    // 4. Check table schemas to ensure they match
    console.log("\n5. Checking table schemas...");

    const tables = ["data_points", "variables"];
    for (const table of tables) {
      const { data: schema, error: schemaError } = await supabase.rpc(
        "exec_sql",
        {
          sql: `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = '${table}'
            ORDER BY ordinal_position;
          `,
        }
      );

      if (schemaError) {
        console.log(`   ${table}: ❌ Cannot check schema`);
      } else {
        console.log(`   ${table}: ✅ Schema accessible`);
        if (table === "data_points") {
          const hasVariableId = schema?.some(
            (col) => col.column_name === "variable_id"
          );
          console.log(
            `      - has variable_id column: ${hasVariableId ? "✅" : "❌"}`
          );
        }
      }
    }

    console.log("\n🎯 Summary:");
    if (testJoinError) {
      console.log("❌ Foreign key relationship issue persists");
      console.log("💡 Manual fix needed:");
      console.log("   1. Go to Supabase Dashboard → SQL Editor");
      console.log("   2. Run this SQL:");
      console.log(
        "      ALTER TABLE data_points DROP CONSTRAINT IF EXISTS data_points_variable_id_fkey;"
      );
      console.log(
        "      ALTER TABLE data_points ADD CONSTRAINT data_points_variable_id_fkey"
      );
      console.log(
        "      FOREIGN KEY (variable_id) REFERENCES variables(id) ON DELETE CASCADE;"
      );
    } else {
      console.log("✅ Foreign key relationships are working correctly");
      console.log("✅ Analytics page should now work without errors");
    }
  } catch (error) {
    console.error("❌ Check failed:", error);
  }
}

checkForeignKeyConstraints();
