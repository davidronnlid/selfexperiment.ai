const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupWithingsTables() {
  console.log("🔧 Setting up Withings integration tables...");

  try {
    // Read the SQL schema file
    const schemaPath = path.join(
      __dirname,
      "../database/withings_integration_schema.sql"
    );
    const schemaSQL = fs.readFileSync(schemaPath, "utf8");

    console.log("📄 Executing Withings schema...");

    // Execute the schema
    const { error } = await supabase.rpc("exec_sql", { sql: schemaSQL });

    if (error) {
      console.error("❌ Error executing schema:", error);

      // Fallback: try to create tables manually
      console.log("🔄 Trying manual table creation...");

      // Create withings_tokens table
      const { error: tokensError } = await supabase.rpc("exec_sql", {
        sql: `
          CREATE TABLE IF NOT EXISTS withings_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            access_token TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id)
          );
        `,
      });

      if (tokensError) {
        console.error("❌ Error creating withings_tokens table:", tokensError);
      } else {
        console.log("✅ Created withings_tokens table");
      }

      // Create withings_weights table
      const { error: weightsError } = await supabase.rpc("exec_sql", {
        sql: `
          CREATE TABLE IF NOT EXISTS withings_weights (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            weight_kg DECIMAL(5,2),
            fat_free_mass_kg DECIMAL(5,2),
            fat_ratio DECIMAL(4,2),
            fat_mass_weight_kg DECIMAL(5,2),
            muscle_mass_kg DECIMAL(5,2),
            hydration_kg DECIMAL(5,2),
            bone_mass_kg DECIMAL(4,2),
            raw_data JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, date)
          );
        `,
      });

      if (weightsError) {
        console.error(
          "❌ Error creating withings_weights table:",
          weightsError
        );
      } else {
        console.log("✅ Created withings_weights table");
      }

      // Create indexes
      const { error: indexError } = await supabase.rpc("exec_sql", {
        sql: `
          CREATE INDEX IF NOT EXISTS idx_withings_tokens_user_id ON withings_tokens(user_id);
          CREATE INDEX IF NOT EXISTS idx_withings_weights_user_id ON withings_weights(user_id);
          CREATE INDEX IF NOT EXISTS idx_withings_weights_date ON withings_weights(date);
        `,
      });

      if (indexError) {
        console.error("❌ Error creating indexes:", indexError);
      } else {
        console.log("✅ Created indexes");
      }

      // Enable RLS
      const { error: rlsError } = await supabase.rpc("exec_sql", {
        sql: `
          ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;
          ALTER TABLE withings_weights ENABLE ROW LEVEL SECURITY;
        `,
      });

      if (rlsError) {
        console.error("❌ Error enabling RLS:", rlsError);
      } else {
        console.log("✅ Enabled Row Level Security");
      }
    } else {
      console.log("✅ Withings schema executed successfully");
    }

    // Verify tables exist
    console.log("🔍 Verifying tables...");

    const { data: tables, error: tablesError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .in("table_name", ["withings_tokens", "withings_weights"]);

    if (tablesError) {
      console.error("❌ Error checking tables:", tablesError);
    } else {
      const tableNames = tables.map((t) => t.table_name);
      console.log("📋 Found tables:", tableNames);

      if (
        tableNames.includes("withings_tokens") &&
        tableNames.includes("withings_weights")
      ) {
        console.log("✅ All Withings tables are ready!");
      } else {
        console.log("⚠️  Some tables may be missing");
      }
    }
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

// Run the setup
setupWithingsTables()
  .then(() => {
    console.log("🎉 Withings setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Setup failed:", error);
    process.exit(1);
  });
