#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables:");
  console.error("NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
  console.error("SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateWithingsVariables() {
  console.log("🔄 Starting Withings Variables Migration...");

  try {
    // Step 1: Check current withings_variable_data_points structure
    console.log("\n📊 Checking current table structure...");

    const { data: currentData, error: checkError } = await supabase
      .from("withings_variable_data_points")
      .select("*")
      .limit(1);

    if (checkError) {
      console.error("❌ Error checking table structure:", checkError);
      return;
    }

    console.log("✅ Current table structure verified");

    // Step 2: Read and execute migration SQL
    console.log("\n📝 Reading migration SQL...");

    const migrationSqlPath = path.join(
      __dirname,
      "../database/migrate_withings_to_variable_id.sql"
    );

    if (!fs.existsSync(migrationSqlPath)) {
      console.error("❌ Migration SQL file not found:", migrationSqlPath);
      return;
    }

    const migrationSql = fs.readFileSync(migrationSqlPath, "utf8");
    console.log("✅ Migration SQL loaded");

    // Note: Supabase client doesn't support executing raw SQL directly
    console.log("\n⚠️  MANUAL STEP REQUIRED:");
    console.log(
      "You need to run the following SQL in your Supabase dashboard:"
    );
    console.log("1. Go to your Supabase Dashboard → SQL Editor");
    console.log(
      "2. Copy the content from: database/migrate_withings_to_variable_id.sql"
    );
    console.log("3. Paste and execute it");
    console.log("4. Come back and run this script again with --verify flag");

    // Step 3: If --verify flag is passed, verify the migration
    if (process.argv.includes("--verify")) {
      console.log("\n🔍 Verifying migration...");
      await verifyMigration();
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

async function verifyMigration() {
  try {
    // Check if variable_id column exists
    const { data: withVariableId, error: variableIdError } = await supabase
      .from("withings_variable_data_points")
      .select("variable_id")
      .limit(1);

    if (variableIdError) {
      console.error(
        "❌ variable_id column not found. Migration may not be complete."
      );
      return;
    }

    console.log("✅ variable_id column exists");

    // Check if variables are created
    const { data: variables, error: varsError } = await supabase
      .from("variables")
      .select("id, slug, label")
      .eq("source_type", "withings");

    if (varsError || !variables || variables.length === 0) {
      console.error(
        "❌ Withings variables not found. Migration may not be complete."
      );
      return;
    }

    console.log(
      "✅ Withings variables created:",
      variables.map((v) => v.slug).join(", ")
    );

    // Check if data has been migrated
    const { data: migratedData, error: dataError } = await supabase
      .from("withings_variable_data_points")
      .select("variable_id")
      .not("variable_id", "is", null)
      .limit(5);

    if (dataError || !migratedData || migratedData.length === 0) {
      console.error(
        "❌ No data with variable_id found. Data migration may not be complete."
      );
      return;
    }

    console.log("✅ Data migration verified - found records with variable_id");

    // Check total records
    const { count: totalRecords, error: countError } = await supabase
      .from("withings_variable_data_points")
      .select("*", { count: "exact", head: true });

    if (!countError) {
      console.log(
        `✅ Total records in withings_variable_data_points: ${totalRecords}`
      );
    }

    console.log("\n🎉 Migration verification completed successfully!");
    console.log("\n📋 Next steps:");
    console.log(
      "1. Test the updated edge function: supabase functions deploy withings-sync-all"
    );
    console.log("2. Update your frontend components to use the new schema");
    console.log("3. Test the Withings integration in your app");
  } catch (error) {
    console.error("❌ Verification failed:", error);
  }
}

// Run the migration
if (require.main === module) {
  migrateWithingsVariables();
}
