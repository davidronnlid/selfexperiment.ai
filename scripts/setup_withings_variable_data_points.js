const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupWithingsVariableDataPoints() {
  try {
    console.log("Setting up withings_variable_data_points table...");

    // Read the SQL file
    const sqlPath = path.join(
      __dirname,
      "../database/create_withings_variable_data_points.sql"
    );
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    // Execute the SQL
    const { error } = await supabase.rpc("exec_sql", { sql: sqlContent });

    if (error) {
      console.error("Error executing SQL:", error);

      // Fallback: try to create the table manually
      console.log("Trying manual table creation...");

      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS withings_variable_data_points (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          variable TEXT NOT NULL,
          value DECIMAL(10,4) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
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
        console.error("Error creating table manually:", createError);
        return;
      }

      // Create indexes
      const indexSQL = `
        CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_user_id ON withings_variable_data_points(user_id);
        CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_date ON withings_variable_data_points(date);
        CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_variable ON withings_variable_data_points(variable);
        CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_user_date ON withings_variable_data_points(user_id, date);
      `;

      const { error: indexError } = await supabase.rpc("exec_sql", {
        sql: indexSQL,
      });

      if (indexError) {
        console.error("Error creating indexes:", indexError);
      }

      // Enable RLS
      const rlsSQL = `
        ALTER TABLE withings_variable_data_points ENABLE ROW LEVEL SECURITY;
      `;

      const { error: rlsError } = await supabase.rpc("exec_sql", {
        sql: rlsSQL,
      });

      if (rlsError) {
        console.error("Error enabling RLS:", rlsError);
      }

      // Create policies
      const policiesSQL = `
        CREATE POLICY "Users can view their own Withings variable data points" ON withings_variable_data_points
          FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert their own Withings variable data points" ON withings_variable_data_points
          FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own Withings variable data points" ON withings_variable_data_points
          FOR UPDATE USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete their own Withings variable data points" ON withings_variable_data_points
          FOR DELETE USING (auth.uid() = user_id);
      `;

      const { error: policiesError } = await supabase.rpc("exec_sql", {
        sql: policiesSQL,
      });

      if (policiesError) {
        console.error("Error creating policies:", policiesError);
      }
    }

    console.log("✅ withings_variable_data_points table setup complete!");

    // Verify the table exists
    const { data: tables, error: listError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "withings_variable_data_points");

    if (listError) {
      console.error("Error checking table existence:", listError);
    } else if (tables && tables.length > 0) {
      console.log("✅ Table verified successfully");
    } else {
      console.log("⚠️  Table may not have been created properly");
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

setupWithingsVariableDataPoints();
