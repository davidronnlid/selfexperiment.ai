const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

async function checkAndCreateCommentsTable() {
  // Create service role client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log("Checking if roadmap_comments table exists...");

    // Try to query the table
    const { data, error } = await supabase
      .from("roadmap_comments")
      .select("id")
      .limit(1);

    if (error && error.code === "PGRST200") {
      console.log("Table does not exist. Creating it now...");

      // Create the table using raw SQL
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS roadmap_comments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          post_id UUID NOT NULL REFERENCES roadmap_posts(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      const { error: createError } = await supabase.rpc("exec_sql", {
        sql_query: createTableSQL,
      });

      if (createError) {
        console.error("Error creating table:", createError);
        console.log(
          "\nPlease run this SQL manually in your Supabase SQL Editor:"
        );
        console.log(createTableSQL);
        return;
      }

      // Create indexes
      const indexSQL = `
        CREATE INDEX IF NOT EXISTS idx_roadmap_comments_post_id ON roadmap_comments(post_id);
        CREATE INDEX IF NOT EXISTS idx_roadmap_comments_user_id ON roadmap_comments(user_id);
        CREATE INDEX IF NOT EXISTS idx_roadmap_comments_created_at ON roadmap_comments(created_at);
      `;

      const { error: indexError } = await supabase.rpc("exec_sql", {
        sql_query: indexSQL,
      });

      if (indexError) {
        console.error("Error creating indexes:", indexError);
      }

      // Enable RLS
      const rlsSQL = `
        ALTER TABLE roadmap_comments ENABLE ROW LEVEL SECURITY;
      `;

      const { error: rlsError } = await supabase.rpc("exec_sql", {
        sql_query: rlsSQL,
      });

      if (rlsError) {
        console.error("Error enabling RLS:", rlsError);
      }

      // Create policies
      const policiesSQL = `
        DROP POLICY IF EXISTS "roadmap_comments_select_policy" ON roadmap_comments;
        DROP POLICY IF EXISTS "roadmap_comments_insert_policy" ON roadmap_comments;
        DROP POLICY IF EXISTS "roadmap_comments_update_policy" ON roadmap_comments;
        DROP POLICY IF EXISTS "roadmap_comments_delete_policy" ON roadmap_comments;

        CREATE POLICY "roadmap_comments_select_policy" ON roadmap_comments
          FOR SELECT USING (true);

        CREATE POLICY "roadmap_comments_insert_policy" ON roadmap_comments
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "roadmap_comments_update_policy" ON roadmap_comments
          FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "roadmap_comments_delete_policy" ON roadmap_comments
          FOR DELETE USING (auth.uid() = user_id);
      `;

      const { error: policiesError } = await supabase.rpc("exec_sql", {
        sql_query: policiesSQL,
      });

      if (policiesError) {
        console.error("Error creating policies:", policiesError);
      }

      console.log("✅ Table created successfully!");
    } else if (error) {
      console.error("Error checking table:", error);
    } else {
      console.log("✅ Table already exists!");
    }

    // Test the table
    console.log("\nTesting table access...");
    const { data: testData, error: testError } = await supabase
      .from("roadmap_comments")
      .select("count", { count: "exact", head: true });

    if (testError) {
      console.error("❌ Error testing table:", testError);
    } else {
      console.log("✅ Table is accessible and working!");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run if called directly
if (require.main === module) {
  checkAndCreateCommentsTable()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { checkAndCreateCommentsTable };
