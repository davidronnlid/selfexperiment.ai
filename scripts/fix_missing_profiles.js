#!/usr/bin/env node

/**
 * Fix Missing Profiles Script
 *
 * This script:
 * 1. Creates missing profile records for existing users
 * 2. Sets up the trigger to automatically create profiles for new users
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Check if we have the required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing environment variables");
  console.error("Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

console.log("🔗 Connecting to Supabase...");
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMissingProfiles() {
  try {
    console.log("📋 Checking for users without profiles...");

    // Get all users from auth.users who don't have profiles
    const { data: usersWithoutProfiles, error: usersError } = await supabase
      .from("profiles")
      .select("id")
      .is("username", null)
      .is("name", null);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return;
    }

    console.log(
      `Found ${usersWithoutProfiles?.length || 0} incomplete profiles`
    );

    // Also check for completely missing profiles by getting auth users
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      return;
    }

    console.log(`Found ${authUsers.users.length} total auth users`);

    // Check each auth user for missing profile
    for (const authUser of authUsers.users) {
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", authUser.id)
        .single();

      if (profileError && profileError.code === "PGRST116") {
        // Profile doesn't exist, create it
        console.log(`🔧 Creating profile for user: ${authUser.id}`);

        const { error: insertError } = await supabase.from("profiles").insert({
          id: authUser.id,
          username: null,
          name: null,
          date_of_birth: null,
          avatar_url: authUser.user_metadata?.avatar_url || null,
        });

        if (insertError) {
          console.error(
            `❌ Failed to create profile for ${authUser.id}:`,
            insertError
          );
        } else {
          console.log(`✅ Created profile for user: ${authUser.id}`);
        }
      } else if (existingProfile) {
        console.log(`✓ Profile exists for user: ${authUser.id}`);
      }
    }

    console.log("✅ Profile fix complete!");
  } catch (error) {
    console.error("❌ Error fixing profiles:", error);
  }
}

async function createTrigger() {
  try {
    console.log("🔧 Setting up automatic profile creation trigger...");

    // Create the trigger function
    const triggerFunction = `
      CREATE OR REPLACE FUNCTION handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.profiles (id, username, name, date_of_birth, avatar_url)
        VALUES (
          NEW.id,
          NULL,
          NULL,
          NULL,
          NEW.raw_user_meta_data->>'avatar_url'
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: functionError } = await supabase.rpc("exec_sql", {
      sql: triggerFunction,
    });

    if (functionError) {
      console.error("❌ Error creating trigger function:", functionError);
      return;
    }

    console.log("✅ Trigger function created");

    // Create the trigger
    const triggerSQL = `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION handle_new_user();
    `;

    const { error: triggerError } = await supabase.rpc("exec_sql", {
      sql: triggerSQL,
    });

    if (triggerError) {
      console.error("❌ Error creating trigger:", triggerError);
      return;
    }

    console.log("✅ Trigger created successfully");
  } catch (error) {
    console.error("❌ Error setting up trigger:", error);
  }
}

async function main() {
  console.log("🚀 Starting profile fix script...");

  await fixMissingProfiles();
  await createTrigger();

  console.log(
    "🎉 All done! Users should now be able to complete their profiles."
  );
}

main().catch(console.error);
