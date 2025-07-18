const { createClient } = require("@supabase/supabase-js");

// Load environment variables
require("dotenv").config();

// Initialize Supabase client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to log with colors
function log(message, type = "info") {
  const colors = {
    info: "\x1b[36m", // Cyan
    success: "\x1b[32m", // Green
    error: "\x1b[31m", // Red
    warning: "\x1b[33m", // Yellow
  };
  const reset = "\x1b[0m";
  console.log(`${colors[type]}${message}${reset}`);
}

async function createWithingsVariableLogsTable() {
  log("🔧 Creating withings_variable_logs table...");

  try {
    // First check if the table already exists
    const { data: existingTable, error: checkError } = await supabaseAdmin
      .from("withings_variable_logs")
      .select("id")
      .limit(1);

    if (!checkError) {
      log("✅ Table withings_variable_logs already exists", "success");
      return;
    }

    log("Table doesn't exist, creating it...", "info");

    // Create the table using raw SQL
    const { error: createError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS withings_variable_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          date TIMESTAMP WITH TIME ZONE NOT NULL,
          variable TEXT NOT NULL,
          value DECIMAL(10,3) NOT NULL,
          unit TEXT DEFAULT 'kg',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Constraints
          UNIQUE(user_id, date, variable),
          CONSTRAINT withings_variable_logs_value_check CHECK (value > 0),
          CONSTRAINT withings_variable_logs_date_check CHECK (date IS NOT NULL)
        );
      `,
    });

    if (createError) {
      log(`❌ Error creating table: ${createError.message}`, "error");
      log(
        "This might be because the exec_sql function doesn't exist",
        "warning"
      );
      log("Please run the SQL manually in your Supabase dashboard:", "info");
      log("1. Go to Supabase Dashboard → SQL Editor", "info");
      log(
        "2. Copy the content from database/fix_withings_variable_logs.sql",
        "info"
      );
      log("3. Click 'Run' to execute", "info");
      return;
    }

    // Create indexes
    const { error: indexError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_user_id ON withings_variable_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_date ON withings_variable_logs(date);
        CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_variable ON withings_variable_logs(variable);
        CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_user_date ON withings_variable_logs(user_id, date);
      `,
    });

    if (indexError) {
      log(`⚠️ Error creating indexes: ${indexError.message}`, "warning");
    }

    // Enable RLS
    const { error: rlsError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        ALTER TABLE withings_variable_logs ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own Withings variable logs" ON withings_variable_logs
          FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert their own Withings variable logs" ON withings_variable_logs
          FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own Withings variable logs" ON withings_variable_logs
          FOR UPDATE USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete their own Withings variable logs" ON withings_variable_logs
          FOR DELETE USING (auth.uid() = user_id);
      `,
    });

    if (rlsError) {
      log(`⚠️ Error enabling RLS: ${rlsError.message}`, "warning");
    }

    log("✅ withings_variable_logs table created successfully!", "success");
  } catch (error) {
    log(`❌ Error: ${error.message}`, "error");
    log("Please create the table manually in Supabase dashboard", "info");
  }
}

async function main() {
  try {
    await createWithingsVariableLogsTable();
  } catch (error) {
    log(`❌ Failed: ${error.message}`, "error");
  }
}

if (require.main === module) {
  main()
    .then(() => {
      log("\n🏁 Complete!", "info");
      process.exit(0);
    })
    .catch((error) => {
      log(`Failed: ${error.message}`, "error");
      process.exit(1);
    });
}
