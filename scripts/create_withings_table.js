const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables:");
  console.error("NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
  console.error("SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createWithingsTable() {
  console.log("🔧 Creating withings_variable_data_points table...");

  try {
    // Check if table already exists
    const { data: existingTables, error: checkError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "withings_variable_data_points");

    if (checkError) {
      console.log(
        "Could not check existing tables, proceeding with creation..."
      );
    } else if (existingTables && existingTables.length > 0) {
      console.log("✅ Table withings_variable_data_points already exists!");
      return;
    }

    // Create the table using raw SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS withings_variable_data_points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        variable TEXT NOT NULL,
        value DECIMAL(10,4) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints
        UNIQUE(user_id, date, variable),
        CONSTRAINT withings_variable_data_points_value_check CHECK (value > 0),
        CONSTRAINT withings_variable_data_points_date_check CHECK (date IS NOT NULL),
        CONSTRAINT withings_variable_data_points_variable_check CHECK (variable IS NOT NULL AND variable != '')
      );
    `;

    const { error: createError } = await supabase.rpc("exec_sql", {
      sql: createTableSQL,
    });

    if (createError) {
      console.log("❌ Error creating table with exec_sql:", createError);
      console.log(
        "⚠️  You may need to create the table manually in the Supabase dashboard."
      );
      console.log("📋 SQL to run:");
      console.log(createTableSQL);
      return;
    }

    // Create indexes
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_user_id ON withings_variable_data_points(user_id);",
      "CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_date ON withings_variable_data_points(date);",
      "CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_variable ON withings_variable_data_points(variable);",
      "CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_user_date ON withings_variable_data_points(user_id, date);",
    ];

    for (const indexSQL of indexes) {
      const { error: indexError } = await supabase.rpc("exec_sql", {
        sql: indexSQL,
      });
      if (indexError) {
        console.log(
          `⚠️  Warning: Could not create index: ${indexError.message}`
        );
      }
    }

    // Enable RLS
    const { error: rlsError } = await supabase.rpc("exec_sql", {
      sql: "ALTER TABLE withings_variable_data_points ENABLE ROW LEVEL SECURITY;",
    });

    if (rlsError) {
      console.log("⚠️  Warning: Could not enable RLS:", rlsError.message);
    }

    // Create RLS policies
    const policies = [
      `CREATE POLICY "Users can view their own Withings variable data points" ON withings_variable_data_points FOR SELECT USING (auth.uid() = user_id);`,
      `CREATE POLICY "Users can insert their own Withings variable data points" ON withings_variable_data_points FOR INSERT WITH CHECK (auth.uid() = user_id);`,
      `CREATE POLICY "Users can update their own Withings variable data points" ON withings_variable_data_points FOR UPDATE USING (auth.uid() = user_id);`,
      `CREATE POLICY "Users can delete their own Withings variable data points" ON withings_variable_data_points FOR DELETE USING (auth.uid() = user_id);`,
    ];

    for (const policySQL of policies) {
      const { error: policyError } = await supabase.rpc("exec_sql", {
        sql: policySQL,
      });
      if (policyError) {
        console.log(
          `⚠️  Warning: Could not create policy: ${policyError.message}`
        );
      }
    }

    console.log("✅ withings_variable_data_points table created successfully!");
  } catch (error) {
    console.error("❌ Error creating table:", error);
    console.log(
      "📋 Please create the table manually in the Supabase dashboard using the SQL from database/create_withings_variable_data_points.sql"
    );
  }
}

createWithingsTable();
