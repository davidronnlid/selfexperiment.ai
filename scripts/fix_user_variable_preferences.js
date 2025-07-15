const { createClient } = require("@supabase/supabase-js");

// Supabase credentials should be provided via environment variables for security reasons
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserVariablePreferences() {
  try {
    console.log("Fixing user_variable_preferences table...");

    // First, let's check if the table exists
    const { data: tables, error: tableError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_name", "user_variable_preferences");

    if (tableError) {
      console.error("Error checking tables:", tableError);
      return;
    }

    if (!tables || tables.length === 0) {
      console.log(
        "user_variable_preferences table does not exist. Creating it..."
      );

      // Create the table with all required columns
      const createTableSQL = `
        CREATE TABLE user_variable_preferences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
          preferred_unit TEXT,
          display_name TEXT,
          is_tracked BOOLEAN DEFAULT true,
          tracking_frequency TEXT DEFAULT 'daily',
          is_shared BOOLEAN DEFAULT false,
          share_level TEXT DEFAULT 'private' CHECK (share_level IN ('private', 'friends', 'public')),
          display_order INTEGER DEFAULT 0,
          is_favorite BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, variable_id)
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_user_id ON user_variable_preferences(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_variable_id ON user_variable_preferences(variable_id);
        CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_is_tracked ON user_variable_preferences(is_tracked);
        CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_is_shared ON user_variable_preferences(is_shared);
        CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_display_order ON user_variable_preferences(display_order);
        
        -- Enable RLS
        ALTER TABLE user_variable_preferences ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view own variable preferences" ON user_variable_preferences
          FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can manage own variable preferences" ON user_variable_preferences
          FOR ALL USING (auth.uid() = user_id);
      `;

      const { error: createError } = await supabase.rpc("exec_sql", {
        sql: createTableSQL,
      });

      if (createError) {
        console.error("Error creating table:", createError);
        return;
      }

      console.log("✅ Successfully created user_variable_preferences table");
    } else {
      console.log(
        "user_variable_preferences table exists. Checking for display_order column..."
      );

      // Check if display_order column exists
      const { data: columns, error: columnError } = await supabase
        .from("information_schema.columns")
        .select("column_name")
        .eq("table_name", "user_variable_preferences")
        .eq("column_name", "display_order");

      if (columnError) {
        console.error("Error checking columns:", columnError);
        return;
      }

      if (!columns || columns.length === 0) {
        console.log("display_order column missing. Adding it...");

        const addColumnSQL = `
          ALTER TABLE user_variable_preferences 
          ADD COLUMN display_order INTEGER DEFAULT 0;
          
          CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_display_order 
          ON user_variable_preferences(display_order);
          
          UPDATE user_variable_preferences 
          SET display_order = 0 
          WHERE display_order IS NULL;
        `;

        const { error: addError } = await supabase.rpc("exec_sql", {
          sql: addColumnSQL,
        });

        if (addError) {
          console.error("Error adding column:", addError);
          return;
        }

        console.log("✅ Successfully added display_order column");
      } else {
        console.log("✅ display_order column already exists");
      }
    }

    console.log(
      "✅ user_variable_preferences table is now properly configured"
    );
  } catch (error) {
    console.error("Failed to fix user_variable_preferences table:", error);
  }
}

// Run the fix
fixUserVariablePreferences();
