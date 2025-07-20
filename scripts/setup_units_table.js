const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupUnitsTable() {
  console.log("🚀 Setting up units table and updating variables table...\n");

  try {
    // Read the SQL files
    const createUnitsTablePath = path.join(
      __dirname,
      "..",
      "database",
      "create_units_table.sql"
    );
    const updateVariablesPath = path.join(
      __dirname,
      "..",
      "database",
      "update_variables_to_reference_units.sql"
    );

    if (!fs.existsSync(createUnitsTablePath)) {
      console.error("❌ create_units_table.sql not found");
      process.exit(1);
    }

    if (!fs.existsSync(updateVariablesPath)) {
      console.error("❌ update_variables_to_reference_units.sql not found");
      process.exit(1);
    }

    const createUnitsTableSQL = fs.readFileSync(createUnitsTablePath, "utf8");
    const updateVariablesSQL = fs.readFileSync(updateVariablesPath, "utf8");

    console.log("📋 Creating units table...");

    // Split the SQL into individual statements and execute them
    const statements = createUnitsTableSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc("exec_sql", { sql: statement });
        if (error) {
          console.error("❌ Error executing statement:", error);
          console.error("Statement:", statement);
          throw error;
        }
      }
    }

    console.log("✅ Units table created successfully");

    console.log("📋 Updating variables table to reference units...");

    // Split the update SQL into individual statements
    const updateStatements = updateVariablesSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter(
        (stmt) =>
          stmt.length > 0 && !stmt.startsWith("--") && !stmt.startsWith("\\i")
      );

    for (const statement of updateStatements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc("exec_sql", { sql: statement });
        if (error) {
          console.error("❌ Error executing statement:", error);
          console.error("Statement:", statement);
          throw error;
        }
      }
    }

    console.log("✅ Variables table updated successfully");

    // Verify the setup
    console.log("🔍 Verifying setup...");

    // Check if units table exists and has data
    const { data: units, error: unitsError } = await supabase
      .from("units")
      .select("count")
      .limit(1);

    if (unitsError) {
      console.error("❌ Error checking units table:", unitsError);
    } else {
      console.log("✅ Units table is accessible");
    }

    // Check variables with unit references
    const { data: variables, error: variablesError } = await supabase
      .from("variables")
      .select("id, slug, canonical_unit, default_display_unit, unit_group")
      .limit(5);

    if (variablesError) {
      console.error("❌ Error checking variables table:", variablesError);
    } else {
      console.log("✅ Variables table is accessible");
      console.log("📊 Sample variables with unit references:");
      variables?.forEach((variable) => {
        console.log(
          `   - ${variable.slug}: canonical_unit=${variable.canonical_unit}, unit_group=${variable.unit_group}`
        );
      });
    }

    // Get unit groups summary
    const { data: unitGroups, error: groupsError } = await supabase
      .from("units")
      .select("unit_group")
      .order("unit_group");

    if (!groupsError && unitGroups) {
      const uniqueGroups = [...new Set(unitGroups.map((u) => u.unit_group))];
      console.log("📊 Available unit groups:");
      uniqueGroups.forEach((group) => {
        console.log(`   - ${group}`);
      });
    }

    console.log("\n🎉 Units table setup completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("   1. Update your frontend code to use the new units table");
    console.log("   2. Test unit conversions and variable creation");
    console.log("   3. Update any hardcoded unit references in your code");
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

// Run the setup
setupUnitsTable();
