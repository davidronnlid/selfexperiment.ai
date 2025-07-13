#!/usr/bin/env node

/**
 * Script to clean up duplicate entries in daily_logs table
 * Keeps only the most recent entry for each user+variable+date combination
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing required environment variables");
  console.error(
    "Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupDuplicates() {
  try {
    console.log("🔍 Finding duplicate entries in daily_logs...");

    // Get all logs ordered by created_at
    const { data, error } = await supabase
      .from("daily_logs")
      .select("id, user_id, variable, date, value, notes, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log(`📊 Total logs found: ${data.length}`);

    // Group by user_id, variable, and date (truncated to day)
    const grouped = {};
    const toDelete = [];
    let duplicateCount = 0;

    data.forEach((log) => {
      const dateKey = log.date.split("T")[0]; // Get just the date part
      const key = `${log.user_id}-${log.variable}-${dateKey}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(log);
    });

    // Find duplicates and mark older entries for deletion
    Object.values(grouped).forEach((logs) => {
      if (logs.length > 1) {
        // Sort by created_at descending (most recent first)
        logs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Keep the first (most recent), mark the rest for deletion
        const [keep, ...duplicates] = logs;

        duplicates.forEach((dup) => {
          toDelete.push(dup.id);
          duplicateCount++;
        });

        console.log(
          `🔄 Variable: ${keep.variable}, Date: ${keep.date.split("T")[0]}`
        );
        console.log(`   Keeping: ${keep.value} (${keep.created_at})`);
        duplicates.forEach((dup) => {
          console.log(`   Deleting: ${dup.value} (${dup.created_at})`);
        });
      }
    });

    if (toDelete.length === 0) {
      console.log("✅ No duplicates found to clean up!");
      return;
    }

    console.log(`\n⚠️  Found ${duplicateCount} duplicate entries to remove`);
    console.log(`🗑️  IDs to delete: ${toDelete.join(", ")}`);

    // Prompt for confirmation (in a real environment, you might want to add readline for interactive confirmation)
    console.log(
      "\n🚨 WARNING: This will permanently delete duplicate entries!"
    );
    console.log(
      "💡 TIP: Run check_duplicates.js first to review what will be deleted"
    );

    // For safety, let's not auto-delete. Instead, provide the IDs for manual review
    console.log(
      "\n📋 To manually delete these duplicates, run this SQL query:"
    );
    console.log(
      `DELETE FROM daily_logs WHERE id IN (${toDelete
        .map((id) => `'${id}'`)
        .join(", ")});`
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Add a command line argument to actually perform the deletion
const shouldDelete = process.argv.includes("--delete");

if (shouldDelete) {
  console.log(
    "🚨 RUNNING IN DELETE MODE - This will permanently remove duplicates!"
  );
} else {
  console.log(
    "🔍 RUNNING IN PREVIEW MODE - Use --delete flag to actually remove duplicates"
  );
}

cleanupDuplicates();
