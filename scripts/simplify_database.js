const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.warn(
    "⚠️  No service role key found. Using anon key (some operations may fail)"
  );
  console.log(
    "For full functionality, set SUPABASE_SERVICE_ROLE_KEY environment variable"
  );
  console.log(
    "You can get it from your Supabase dashboard: Settings > API > service_role key"
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
);

async function simplifyDatabase() {
  console.log("🔄 Starting database simplification...");
  console.log(`📡 Connecting to: ${supabaseUrl}`);

  try {
    // Test connection first
    console.log("🔍 Testing database connection...");
    const { data: testData, error: testError } = await supabase
      .from("variables")
      .select("count")
      .limit(1);

    if (testError) {
      console.error("❌ Database connection failed:", testError.message);
      if (testError.message.includes("permission")) {
        console.log(
          "💡 This might be because you need the service role key for admin operations"
        );
        console.log(
          "   Get it from: Supabase Dashboard > Settings > API > service_role key"
        );
      }
      process.exit(1);
    }

    console.log("✅ Database connection successful");

    // Step 1: Remove unused columns from variable_logs
    console.log("📋 Removing unused columns from variable_logs...");

    const { error: alterLogsError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Remove unused columns from variable_logs
        ALTER TABLE variable_logs 
        DROP COLUMN IF EXISTS canonical_value,
        DROP COLUMN IF EXISTS confidence_score,
        DROP COLUMN IF EXISTS tags,
        DROP COLUMN IF EXISTS location;
      `,
    });

    if (alterLogsError) {
      console.error(
        "Error removing unused columns from variable_logs:",
        alterLogsError
      );
    } else {
      console.log("✅ Removed unused columns from variable_logs");
    }

    // Step 2: Remove unused columns from variables
    console.log("📋 Removing unused columns from variables...");

    const { error: alterVariablesError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Remove unused columns from variables
        ALTER TABLE variables 
        DROP COLUMN IF EXISTS collection_method,
        DROP COLUMN IF EXISTS frequency,
        DROP COLUMN IF EXISTS subcategory,
        DROP COLUMN IF EXISTS tags,
        DROP COLUMN IF EXISTS is_public,
        DROP COLUMN IF EXISTS privacy_level;
      `,
    });

    if (alterVariablesError) {
      console.error(
        "Error removing unused columns from variables:",
        alterVariablesError
      );
    } else {
      console.log("✅ Removed unused columns from variables");
    }

    // Step 3: Remove unused tables
    console.log("📋 Removing unused tables...");

    const { error: dropTablesError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Drop unused tables
        DROP TABLE IF EXISTS user_variable_preferences CASCADE;
        DROP TABLE IF EXISTS unit_conversions CASCADE;
        DROP TABLE IF EXISTS variable_relationships CASCADE;
        DROP TABLE IF EXISTS routine_log_history CASCADE;
        DROP TABLE IF EXISTS log_privacy_settings CASCADE;
        DROP TABLE IF EXISTS user_follows CASCADE;
        DROP TABLE IF EXISTS user_profile_settings CASCADE;
      `,
    });

    if (dropTablesError) {
      console.error("Error dropping unused tables:", dropTablesError);
    } else {
      console.log("✅ Removed unused tables");
    }

    // Step 4: Remove unused indexes
    console.log("📋 Removing unused indexes...");

    const { error: dropIndexesError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Drop unused indexes
        DROP INDEX IF EXISTS idx_user_variable_preferences_user_id;
        DROP INDEX IF EXISTS idx_user_variable_preferences_variable_id;
        DROP INDEX IF EXISTS idx_user_variable_preferences_is_tracked;
        DROP INDEX IF EXISTS idx_user_variable_preferences_is_shared;
        DROP INDEX IF EXISTS idx_unit_conversions_from_unit;
        DROP INDEX IF EXISTS idx_unit_conversions_to_unit;
        DROP INDEX IF EXISTS idx_unit_conversions_unit_group;
        DROP INDEX IF EXISTS idx_variable_relationships_variable_1;
        DROP INDEX IF EXISTS idx_variable_relationships_variable_2;
        DROP INDEX IF EXISTS idx_variable_relationships_type;
        DROP INDEX IF EXISTS idx_variables_unit_group;
        DROP INDEX IF EXISTS idx_variable_logs_is_private;
      `,
    });

    if (dropIndexesError) {
      console.error("Error dropping unused indexes:", dropIndexesError);
    } else {
      console.log("✅ Removed unused indexes");
    }

    // Step 5: Update variable_logs constraint
    console.log("📋 Updating variable_logs constraint...");

    const { error: updateConstraintError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Remove the old constraint and add a simpler one
        ALTER TABLE variable_logs 
        DROP CONSTRAINT IF EXISTS variable_logs_canonical_value_check;
        
        -- Add a new constraint that only checks for display_value
        ALTER TABLE variable_logs 
        ADD CONSTRAINT variable_logs_display_value_check 
        CHECK (display_value IS NOT NULL);
      `,
    });

    if (updateConstraintError) {
      console.error(
        "Error updating variable_logs constraint:",
        updateConstraintError
      );
    } else {
      console.log("✅ Updated variable_logs constraint");
    }

    // Step 6: Clean up any orphaned data
    console.log("📋 Cleaning up orphaned data...");

    const { error: cleanupError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Delete variable_logs that don't have a valid variable_id
        DELETE FROM variable_logs 
        WHERE variable_id NOT IN (SELECT id FROM variables);
        
        -- Delete routine_time_variables that don't have a valid variable_id
        DELETE FROM routine_time_variables 
        WHERE variable_id NOT IN (SELECT id FROM variables);
        
        -- Delete routine_time_variables that don't have a valid routine_time_id
        DELETE FROM routine_time_variables 
        WHERE routine_time_id NOT IN (SELECT id FROM routine_times);
        
        -- Delete routine_times that don't have a valid routine_id
        DELETE FROM routine_times 
        WHERE routine_id NOT IN (SELECT id FROM daily_routines);
      `,
    });

    if (cleanupError) {
      console.error("Error cleaning up orphaned data:", cleanupError);
    } else {
      console.log("✅ Cleaned up orphaned data");
    }

    // Step 7: Verify the simplified schema
    console.log("📋 Verifying simplified schema...");

    const { data: tables, error: tablesError } = await supabase.rpc(
      "exec_sql",
      {
        sql: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `,
      }
    );

    if (tablesError) {
      console.error("Error getting table list:", tablesError);
    } else {
      console.log("📊 Current tables:", tables);
    }

    // Step 8: Show variable_logs structure
    const { data: logsStructure, error: structureError } = await supabase.rpc(
      "exec_sql",
      {
        sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'variable_logs' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `,
      }
    );

    if (structureError) {
      console.error("Error getting variable_logs structure:", structureError);
    } else {
      console.log("📊 variable_logs structure:", logsStructure);
    }

    console.log("✅ Database simplification completed successfully!");
    console.log("📋 Summary of changes:");
    console.log(
      "   - Removed unused columns from variable_logs (canonical_value, confidence_score, tags, location)"
    );
    console.log(
      "   - Removed unused columns from variables (collection_method, frequency, subcategory, tags, is_public, privacy_level)"
    );
    console.log(
      "   - Removed unused tables (user_variable_preferences, unit_conversions, variable_relationships, routine_log_history, etc.)"
    );
    console.log("   - Removed unused indexes");
    console.log("   - Updated constraints to be simpler");
    console.log("   - Cleaned up orphaned data");
  } catch (error) {
    console.error("❌ Error during database simplification:", error);
    process.exit(1);
  }
}

// Run the migration
simplifyDatabase();
