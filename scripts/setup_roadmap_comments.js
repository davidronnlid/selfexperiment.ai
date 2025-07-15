const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

async function setupRoadmapComments() {
  // Create service role client (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log("Setting up roadmap comments schema...");

    // Read the SQL file
    const sqlPath = path.join(
      __dirname,
      "..",
      "database",
      "roadmap_comments_schema.sql"
    );
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);

      const { error } = await supabase.rpc("exec_sql", {
        sql_query: statement + ";",
      });

      if (error) {
        console.error(`Error executing statement: ${error.message}`);
        // Continue with other statements
      } else {
        console.log("✓ Statement executed successfully");
      }
    }

    console.log("Roadmap comments schema setup completed!");

    // Test the setup by checking if the table exists
    const { data, error } = await supabase
      .from("roadmap_comments")
      .select("count", { count: "exact", head: true });

    if (error) {
      console.error("Error testing table:", error.message);
    } else {
      console.log("✓ Table created successfully and is accessible");
    }
  } catch (error) {
    console.error("Error setting up roadmap comments:", error);
  }
}

// Run if called directly
if (require.main === module) {
  setupRoadmapComments()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { setupRoadmapComments };
