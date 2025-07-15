const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  console.error(
    "Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupRoadmapSchema() {
  try {
    console.log("Setting up roadmap database schema...");

    // Read the SQL schema file
    const schemaPath = path.join(
      __dirname,
      "..",
      "database",
      "roadmap_schema.sql"
    );
    const schema = fs.readFileSync(schemaPath, "utf8");

    // Split the schema into individual statements
    const statements = schema
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ";";
      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      try {
        const { error } = await supabase.rpc("exec_sql", {
          sql_query: statement,
        });

        if (error) {
          console.warn(`Warning on statement ${i + 1}:`, error.message);
          // Continue with other statements
        }
      } catch (err) {
        console.warn(`Warning on statement ${i + 1}:`, err.message);
        // Continue with other statements
      }
    }

    console.log("✅ Roadmap schema setup completed!");
    console.log("You can now use the roadmap feature on the /community page");
  } catch (error) {
    console.error("❌ Error setting up roadmap schema:", error);
    process.exit(1);
  }
}

setupRoadmapSchema();
