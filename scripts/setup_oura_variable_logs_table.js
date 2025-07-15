const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  console.log("Current environment variables:");
  console.log("SUPABASE_URL:", supabaseUrl);
  console.log("SERVICE_KEY:", supabaseServiceKey ? "SET" : "NOT SET");

  console.log("\nExecute this SQL in your Supabase dashboard:");
  console.log(`
CREATE TABLE IF NOT EXISTS oura_variable_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  variable_id TEXT NOT NULL,
  date DATE NOT NULL,
  value NUMERIC,
  raw JSONB,
  source TEXT DEFAULT 'oura',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, variable_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_oura_variable_logs_user_id ON oura_variable_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_oura_variable_logs_variable_id ON oura_variable_logs(variable_id);
CREATE INDEX IF NOT EXISTS idx_oura_variable_logs_date ON oura_variable_logs(date);

-- Enable RLS
ALTER TABLE oura_variable_logs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own logs
DROP POLICY IF EXISTS "Users can view own oura variable logs" ON oura_variable_logs;
CREATE POLICY "Users can view own oura variable logs" ON oura_variable_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own oura variable logs" ON oura_variable_logs;
CREATE POLICY "Users can insert own oura variable logs" ON oura_variable_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own oura variable logs" ON oura_variable_logs;
CREATE POLICY "Users can update own oura variable logs" ON oura_variable_logs
  FOR UPDATE USING (auth.uid() = user_id);
  `);

  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupOuraVariableLogsTable() {
  console.log("🔧 Setting up oura_variable_logs table...");

  try {
    // Create oura_variable_logs table
    console.log("📋 Creating oura_variable_logs table...");
    const { error: tableError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS oura_variable_logs (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          variable_id TEXT NOT NULL,
          date DATE NOT NULL,
          value NUMERIC,
          raw JSONB,
          source TEXT DEFAULT 'oura',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, variable_id, date)
        );
      `,
    });

    if (tableError) {
      console.error("Error creating oura_variable_logs table:", tableError);
      return;
    } else {
      console.log("✅ oura_variable_logs table created/verified");
    }

    // Create indexes
    console.log("📋 Creating indexes...");
    const { error: indexesError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_oura_variable_logs_user_id ON oura_variable_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_oura_variable_logs_variable_id ON oura_variable_logs(variable_id);
        CREATE INDEX IF NOT EXISTS idx_oura_variable_logs_date ON oura_variable_logs(date);
      `,
    });

    if (indexesError) {
      console.error("Error creating indexes:", indexesError);
    } else {
      console.log("✅ Indexes created/verified");
    }

    // Enable RLS and create policies
    console.log("📋 Setting up RLS policies...");
    const { error: rlsError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Enable RLS on oura_variable_logs
        ALTER TABLE oura_variable_logs ENABLE ROW LEVEL SECURITY;

        -- Users can only access their own logs
        DROP POLICY IF EXISTS "Users can view own oura variable logs" ON oura_variable_logs;
        CREATE POLICY "Users can view own oura variable logs" ON oura_variable_logs
          FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert own oura variable logs" ON oura_variable_logs;
        CREATE POLICY "Users can insert own oura variable logs" ON oura_variable_logs
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update own oura variable logs" ON oura_variable_logs;
        CREATE POLICY "Users can update own oura variable logs" ON oura_variable_logs
          FOR UPDATE USING (auth.uid() = user_id);
      `,
    });

    if (rlsError) {
      console.error("Error setting up RLS policies:", rlsError);
    } else {
      console.log("✅ RLS policies created/verified");
    }

    console.log("✅ oura_variable_logs table setup completed!");

    // Test the table
    console.log("🧪 Testing table access...");
    const { data, error } = await supabase
      .from("oura_variable_logs")
      .select("count")
      .limit(1);

    if (error) {
      console.log("❌ Table test failed:", error.message);
    } else {
      console.log("✅ Table is accessible and ready for use");
    }
  } catch (error) {
    console.error("❌ Error setting up oura_variable_logs table:", error);
  }
}

setupOuraVariableLogsTable();
