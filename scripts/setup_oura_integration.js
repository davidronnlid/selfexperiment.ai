const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupOuraIntegration() {
  console.log("🔧 Setting up Oura integration...");

  try {
    // Step 1: Create oura_tokens table
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
      return;
    }

    // Step 2: Create oura_measurements table
    console.log("📋 Creating oura_measurements table...");
    const { error: measurementsError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS oura_measurements (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          source TEXT NOT NULL DEFAULT 'oura',
          metric TEXT NOT NULL,
          date DATE NOT NULL,
          value NUMERIC,
          raw JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, metric, date),
          CONSTRAINT oura_measurements_metric_check CHECK (metric IN (
            'readiness_score',
            'sleep_score', 
            'total_sleep_duration',
            'rem_sleep_duration',
            'deep_sleep_duration',
            'efficiency',
            'sleep_latency',
            'temperature_deviation',
            'temperature_trend_deviation',
            'hr_lowest_true',
            'hr_average_true',
            'hr_raw_data'
          ))
        );
      `,
    });

    if (measurementsError) {
      console.error(
        "Error creating oura_measurements table:",
        measurementsError
      );
      return;
    }

    // Step 3: Create indexes
    console.log("📋 Creating indexes...");
    const { error: indexesError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Oura tokens indexes
        CREATE INDEX IF NOT EXISTS idx_oura_tokens_user_id ON oura_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_oura_tokens_created_at ON oura_tokens(created_at);

        -- Oura measurements indexes
        CREATE INDEX IF NOT EXISTS idx_oura_measurements_user_id ON oura_measurements(user_id);
        CREATE INDEX IF NOT EXISTS idx_oura_measurements_metric ON oura_measurements(metric);
        CREATE INDEX IF NOT EXISTS idx_oura_measurements_date ON oura_measurements(date);
        CREATE INDEX IF NOT EXISTS idx_oura_measurements_user_metric_date ON oura_measurements(user_id, metric, date);
      `,
    });

    if (indexesError) {
      console.error("Error creating indexes:", indexesError);
      return;
    }

    // Step 4: Enable RLS and create policies
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

        -- Enable RLS on oura_measurements
        ALTER TABLE oura_measurements ENABLE ROW LEVEL SECURITY;

        -- Users can only access their own measurements
        DROP POLICY IF EXISTS "Users can view own oura measurements" ON oura_measurements;
        CREATE POLICY "Users can view own oura measurements" ON oura_measurements
          FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert own oura measurements" ON oura_measurements;
        CREATE POLICY "Users can insert own oura measurements" ON oura_measurements
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update own oura measurements" ON oura_measurements;
        CREATE POLICY "Users can update own oura measurements" ON oura_measurements
          FOR UPDATE USING (auth.uid() = user_id);
      `,
    });

    if (rlsError) {
      console.error("Error setting up RLS policies:", rlsError);
      return;
    }

    // Step 5: Create utility functions
    console.log("📋 Creating utility functions...");
    const { error: functionsError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Function to clean up old Oura data
        CREATE OR REPLACE FUNCTION cleanup_old_oura_data(days_to_keep INTEGER DEFAULT 90)
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM oura_measurements 
          WHERE date < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
          
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;

        -- Function to get Oura data summary
        CREATE OR REPLACE FUNCTION get_oura_summary(target_user_id UUID, days_back INTEGER DEFAULT 14)
        RETURNS TABLE(
          metric TEXT,
          avg_value NUMERIC,
          min_value NUMERIC,
          max_value NUMERIC,
          latest_value NUMERIC,
          data_points INTEGER
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            om.metric,
            AVG(om.value) as avg_value,
            MIN(om.value) as min_value,
            MAX(om.value) as max_value,
            (SELECT value FROM oura_measurements 
             WHERE user_id = target_user_id 
             AND metric = om.metric 
             ORDER BY date DESC 
             LIMIT 1) as latest_value,
            COUNT(*) as data_points
          FROM oura_measurements om
          WHERE om.user_id = target_user_id
          AND om.date >= CURRENT_DATE - INTERVAL '1 day' * days_back
          GROUP BY om.metric;
        END;
        $$ LANGUAGE plpgsql;
      `,
    });

    if (functionsError) {
      console.error("Error creating utility functions:", functionsError);
      return;
    }

    console.log("✅ Oura integration setup completed successfully!");
    console.log("📊 Tables created:");
    console.log("  - oura_tokens (for storing OAuth tokens)");
    console.log("  - oura_measurements (for storing Oura data)");
    console.log("🔒 RLS policies configured for data security");
    console.log("📈 Indexes created for optimal performance");
    console.log("⚙️ Utility functions created for data management");

    // Step 6: Check if environment variables are set
    console.log("\n🔍 Checking environment variables...");
    const requiredEnvVars = [
      "NEXT_PUBLIC_OURA_CLIENT_ID",
      "OURA_CLIENT_ID",
      "OURA_CLIENT_SECRET",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      console.warn("⚠️ Missing environment variables:");
      missingVars.forEach((varName) => console.warn(`  - ${varName}`));
      console.log("\n📝 Please add these to your .env file:");
      console.log("NEXT_PUBLIC_OURA_CLIENT_ID=your_oura_client_id");
      console.log("OURA_CLIENT_ID=your_oura_client_id");
      console.log("OURA_CLIENT_SECRET=your_oura_client_secret");
    } else {
      console.log("✅ All required environment variables are set");
    }

    console.log("\n🎉 Oura integration is ready to use!");
    console.log(
      "📱 Users can now connect their Oura Ring from the analytics page"
    );
  } catch (error) {
    console.error("❌ Error setting up Oura integration:", error);
  }
}

// Run the setup
setupOuraIntegration()
  .then(() => {
    console.log("\n🏁 Setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
