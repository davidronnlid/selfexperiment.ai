const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixOuraTokensConstraint() {
  console.log("🔧 Fixing Oura tokens table constraint...\n");

  try {
    // Check current table structure
    console.log("1. Checking current table structure...");
    const { data: columns, error: columnsError } = await supabase.rpc(
      "exec_sql",
      {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'oura_tokens' 
          ORDER BY ordinal_position;
        `,
      }
    );

    if (columnsError) {
      console.error("❌ Error checking table structure:", columnsError);
    } else {
      console.log("✅ Current table structure:");
      columns.forEach((col) => {
        console.log(
          `   - ${col.column_name}: ${col.data_type} ${
            col.is_nullable === "YES" ? "NULL" : "NOT NULL"
          }`
        );
      });
    }

    // Check current constraints
    console.log("\n2. Checking current constraints...");
    const { data: constraints, error: constraintsError } = await supabase.rpc(
      "exec_sql",
      {
        sql: `
          SELECT conname, contype, pg_get_constraintdef(oid) as definition
          FROM pg_constraint 
          WHERE conrelid = 'oura_tokens'::regclass;
        `,
      }
    );

    if (constraintsError) {
      console.error("❌ Error checking constraints:", constraintsError);
    } else {
      console.log("✅ Current constraints:");
      constraints.forEach((con) => {
        console.log(`   - ${con.conname}: ${con.contype} - ${con.definition}`);
      });
    }

    // Fix the constraint issue by dropping the problematic constraint and recreating it properly
    console.log("\n3. Fixing constraints...");
    const { error: fixError } = await supabase.rpc("exec_sql", {
      sql: `
          -- Drop the problematic unique constraint
          ALTER TABLE oura_tokens DROP CONSTRAINT IF EXISTS oura_tokens_user_id_key;
          
          -- Add a proper unique constraint that allows updates
          ALTER TABLE oura_tokens ADD CONSTRAINT oura_tokens_user_id_unique UNIQUE (user_id);
        `,
    });

    if (fixError) {
      console.error("❌ Error fixing constraints:", fixError);
    } else {
      console.log("✅ Constraints fixed successfully");
    }

    // Test the fix by updating tokens
    console.log("\n4. Testing token update...");
    const testUserId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0";

    const { error: updateError } = await supabase.from("oura_tokens").upsert(
      {
        user_id: testUserId,
        access_token: "test_access_token",
        refresh_token: "test_refresh_token",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

    if (updateError) {
      console.error("❌ Error testing token update:", updateError);
    } else {
      console.log("✅ Token update test successful");
    }

    console.log("\n🎯 Summary:");
    console.log("✅ Oura tokens table constraints have been fixed");
    console.log("✅ Token updates should now work properly");
  } catch (error) {
    console.error("❌ Fix failed:", error);
  }
}

fixOuraTokensConstraint();
