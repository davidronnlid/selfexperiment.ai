const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  console.log("Please set SUPABASE_SERVICE_ROLE_KEY in your environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupOuraTables() {
  console.log("🔧 Setting up Oura tables...");

  try {
    // Create oura_tokens table
    console.log("📋 Creating oura_tokens table...");
    const { error: tokensError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS oura_tokens (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, access_token)
        );
      `,
    });

    if (tokensError) {
      console.error("Error creating oura_tokens table:", tokensError);
    } else {
      console.log("✅ oura_tokens table created/verified");
    }

    // Create oura_variable_logs table (this is what the integration actually uses)
    console.log("📋 Creating oura_variable_logs table...");
    const { error: logsError } = await supabase.rpc("exec_sql", {
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

    if (logsError) {
      console.error("Error creating oura_variable_logs table:", logsError);
    } else {
      console.log("✅ oura_variable_logs table created/verified");
    }

    // Create indexes
    console.log("📋 Creating indexes...");
    const { error: indexesError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_oura_tokens_user_id ON oura_tokens(user_id);
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
        -- Enable RLS on oura_tokens
        ALTER TABLE oura_tokens ENABLE ROW LEVEL SECURITY;

        -- Users can only access their own tokens
        DROP POLICY IF EXISTS "Users can view own oura tokens" ON oura_tokens;
        CREATE POLICY "Users can view own oura tokens" ON oura_tokens
          FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert own oura tokens" ON oura_tokens;
        CREATE POLICY "Users can insert own oura tokens" ON oura_tokens
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update own oura tokens" ON oura_tokens;
        CREATE POLICY "Users can update own oura tokens" ON oura_tokens
          FOR UPDATE USING (auth.uid() = user_id);

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

    console.log("✅ Oura tables setup completed!");
    console.log("📊 Tables created:");
    console.log("  - oura_tokens (for storing OAuth tokens)");
    console.log("  - oura_variable_logs (for storing Oura data)");
  } catch (error) {
    console.error("❌ Error setting up Oura tables:", error);
  }
}

setupOuraTables();
