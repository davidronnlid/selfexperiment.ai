const { createClient } = require("@supabase/supabase-js");

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

async function createWithingsTables() {
  console.log("🔧 Creating Withings tables manually...");

  try {
    // Check if tables already exist
    console.log("🔍 Checking existing tables...");

    const { data: existingTables, error: checkError } = await supabase
      .from("pg_tables")
      .select("tablename")
      .eq("schemaname", "public")
      .in("tablename", ["withings_tokens", "withings_weights"]);

    if (checkError) {
      console.log(
        "⚠️  Could not check existing tables, proceeding with creation..."
      );
    } else {
      const tableNames = existingTables?.map((t) => t.tablename) || [];
      console.log("📋 Existing tables:", tableNames);

      if (
        tableNames.includes("withings_tokens") &&
        tableNames.includes("withings_weights")
      ) {
        console.log("✅ Withings tables already exist!");
        return;
      }
    }

    console.log("📝 Creating withings_tokens table...");

    // Create withings_tokens table using raw SQL
    const { error: tokensError } = await supabase
      .from("withings_tokens")
      .select("id")
      .limit(1);

    if (tokensError && tokensError.code === "42P01") {
      console.log("❌ withings_tokens table does not exist");
      console.log(
        "💡 Please create the table manually in your Supabase dashboard:"
      );
      console.log(`
CREATE TABLE withings_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
      `);
    } else {
      console.log("✅ withings_tokens table exists");
    }

    console.log("📝 Creating withings_weights table...");

    // Create withings_weights table using raw SQL
    const { error: weightsError } = await supabase
      .from("withings_weights")
      .select("id")
      .limit(1);

    if (weightsError && weightsError.code === "42P01") {
      console.log("❌ withings_weights table does not exist");
      console.log(
        "💡 Please create the table manually in your Supabase dashboard:"
      );
      console.log(`
CREATE TABLE withings_weights (
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
      `);
    } else {
      console.log("✅ withings_weights table exists");
    }

    console.log("🔍 Testing table access...");

    // Test if we can access the tables
    const { data: testTokens, error: testTokensError } = await supabase
      .from("withings_tokens")
      .select("id")
      .limit(1);

    if (testTokensError) {
      console.log("❌ Cannot access withings_tokens:", testTokensError.message);
    } else {
      console.log("✅ withings_tokens table is accessible");
    }

    const { data: testWeights, error: testWeightsError } = await supabase
      .from("withings_weights")
      .select("id")
      .limit(1);

    if (testWeightsError) {
      console.log(
        "❌ Cannot access withings_weights:",
        testWeightsError.message
      );
    } else {
      console.log("✅ withings_weights table is accessible");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the setup
createWithingsTables()
  .then(() => {
    console.log("🎉 Withings table check complete!");
    console.log("📋 Next steps:");
    console.log("1. Go to your Supabase dashboard");
    console.log("2. Navigate to SQL Editor");
    console.log("3. Run the CREATE TABLE statements shown above");
    console.log("4. Test the Withings integration on /analytics");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Setup failed:", error);
    process.exit(1);
  });
