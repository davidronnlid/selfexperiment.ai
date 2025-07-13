#!/usr/bin/env node

/**
 * Script to check for duplicate entries in daily_logs table
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDuplicates() {
  try {
    console.log("🔍 Checking for duplicate entries in daily_logs...");

    // Check for duplicates by counting entries with same user_id, variable, and date
    const { data, error } = await supabase
      .from("daily_logs")
      .select("user_id, variable, date, value, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log(`📊 Total logs found: ${data.length}`);

    // Group by user_id, variable, and date (truncated to day)
    const grouped = {};
    const duplicates = [];

    data.forEach((log) => {
      const dateKey = log.date.split("T")[0]; // Get just the date part
      const key = `${log.user_id}-${log.variable}-${dateKey}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(log);

      if (grouped[key].length > 1) {
        // This is a duplicate
        if (!duplicates.find((d) => d.key === key)) {
          duplicates.push({
            key,
            user_id: log.user_id,
            variable: log.variable,
            date: dateKey,
            entries: grouped[key],
          });
        }
      }
    });

    console.log(`\n🔥 Found ${duplicates.length} sets of duplicates:`);

    duplicates.forEach((dup, index) => {
      console.log(
        `\n${index + 1}. User: ${dup.user_id}, Variable: ${
          dup.variable
        }, Date: ${dup.date}`
      );
      console.log(`   Entries: ${dup.entries.length}`);
      dup.entries.forEach((entry, i) => {
        console.log(
          `   ${i + 1}: Value="${entry.value}", Created: ${entry.created_at}`
        );
      });
    });

    if (duplicates.length === 0) {
      console.log("✅ No duplicates found!");
    } else {
      console.log(
        `\n⚠️  Found ${duplicates.length} duplicate sets that need cleanup`
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkDuplicates();
