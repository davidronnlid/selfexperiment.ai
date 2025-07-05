#!/usr/bin/env node

/**
 * Setup Script: Universal Variables System
 *
 * This script initializes the universal variables system in the database.
 * It creates the necessary tables, indexes, and initial data.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables");
  console.error(
    "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌",
  }[type];

  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function executeSqlFile(filename) {
  try {
    const filePath = path.join(process.cwd(), "database", filename);
    const sql = fs.readFileSync(filePath, "utf8");

    log(`Executing ${filename}...`);

    // Split SQL into individual statements
    const statements = sql.split(";").filter((stmt) => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc("exec_sql", {
          sql: statement.trim(),
        });
        if (error) {
          log(`Error executing statement: ${error.message}`, "error");
          throw error;
        }
      }
    }

    log(`${filename} executed successfully`, "success");
  } catch (error) {
    log(`Failed to execute ${filename}: ${error.message}`, "error");
    throw error;
  }
}

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

async function checkDatabaseConnection() {
  log("Checking database connection...");

  try {
    const { data, error } = await supabase
      .from("variables")
      .select("count")
      .limit(1);

    if (error && error.code === "42P01") {
      // Table doesn't exist, which is expected for fresh setup
      log("Database connection successful (tables not yet created)", "success");
      return true;
    } else if (error) {
      throw error;
    } else {
      log("Database connection successful", "success");
      return true;
    }
  } catch (error) {
    log(`Database connection failed: ${error.message}`, "error");
    return false;
  }
}

async function createTables() {
  log("Creating database tables...");

  try {
    // Create the universal variables schema
    await executeSqlFile("universal_variables_schema.sql");
    log("Tables created successfully", "success");
  } catch (error) {
    log(`Failed to create tables: ${error.message}`, "error");
    throw error;
  }
}

async function insertInitialData() {
  log("Inserting initial data...");

  try {
    // Insert common unit conversions
    const unitConversions = [
      // Mass conversions
      {
        from_unit: "kg",
        to_unit: "lb",
        conversion_factor: 2.20462,
        unit_group: "mass",
      },
      {
        from_unit: "lb",
        to_unit: "kg",
        conversion_factor: 0.453592,
        unit_group: "mass",
      },
      {
        from_unit: "kg",
        to_unit: "g",
        conversion_factor: 1000,
        unit_group: "mass",
      },
      {
        from_unit: "g",
        to_unit: "kg",
        conversion_factor: 0.001,
        unit_group: "mass",
      },

      // Distance conversions
      {
        from_unit: "km",
        to_unit: "mi",
        conversion_factor: 0.621371,
        unit_group: "distance",
      },
      {
        from_unit: "mi",
        to_unit: "km",
        conversion_factor: 1.60934,
        unit_group: "distance",
      },
      {
        from_unit: "m",
        to_unit: "ft",
        conversion_factor: 3.28084,
        unit_group: "distance",
      },
      {
        from_unit: "ft",
        to_unit: "m",
        conversion_factor: 0.3048,
        unit_group: "distance",
      },

      // Time conversions
      {
        from_unit: "hours",
        to_unit: "minutes",
        conversion_factor: 60,
        unit_group: "time",
      },
      {
        from_unit: "minutes",
        to_unit: "hours",
        conversion_factor: 0.0166667,
        unit_group: "time",
      },

      // Temperature conversions (using formulas)
      {
        from_unit: "°C",
        to_unit: "°F",
        conversion_factor: 1,
        unit_group: "temperature",
        formula: "($1 * 9/5) + 32",
      },
      {
        from_unit: "°F",
        to_unit: "°C",
        conversion_factor: 1,
        unit_group: "temperature",
        formula: "($1 - 32) * 5/9",
      },
    ];

    for (const conversion of unitConversions) {
      const { error } = await supabase
        .from("unit_conversions")
        .upsert(conversion, { onConflict: "from_unit,to_unit" });

      if (error) throw error;
    }

    // Insert common variables
    const commonVariables = [
      {
        slug: "weight",
        label: "Weight",
        description: "Body weight measurement",
        icon: "⚖️",
        data_type: "continuous",
        canonical_unit: "kg",
        unit_group: "mass",
        convertible_units: ["kg", "lb", "g"],
        default_display_unit: "kg",
        source_type: "manual",
        category: "Physical Health",
        subcategory: "Body Metrics",
        tags: ["health", "fitness"],
        validation_rules: {
          min: 20,
          max: 300,
          unit: "kg",
          required: true,
        },
      },
      {
        slug: "sleep_duration",
        label: "Sleep Duration",
        description: "Total sleep time",
        icon: "😴",
        data_type: "continuous",
        canonical_unit: "hours",
        unit_group: "time",
        convertible_units: ["hours", "minutes"],
        default_display_unit: "hours",
        source_type: "manual",
        category: "Sleep & Recovery",
        subcategory: "Sleep Quality",
        tags: ["sleep", "recovery"],
        validation_rules: {
          min: 0,
          max: 24,
          unit: "hours",
          required: true,
        },
      },
      {
        slug: "mood",
        label: "Mood",
        description: "Overall mood rating",
        icon: "😊",
        data_type: "continuous",
        canonical_unit: "score",
        source_type: "manual",
        category: "Mental Health",
        subcategory: "Emotional State",
        tags: ["mental", "emotion"],
        validation_rules: {
          scaleMin: 1,
          scaleMax: 10,
          required: true,
        },
      },
      {
        slug: "stress",
        label: "Stress Level",
        description: "Perceived stress level",
        icon: "😰",
        data_type: "continuous",
        canonical_unit: "score",
        source_type: "manual",
        category: "Mental Health",
        subcategory: "Stress",
        tags: ["mental", "stress"],
        validation_rules: {
          scaleMin: 1,
          scaleMax: 10,
          required: true,
        },
      },
      {
        slug: "caffeine",
        label: "Caffeine",
        description: "Caffeine intake in mg",
        icon: "☕",
        data_type: "continuous",
        canonical_unit: "mg",
        source_type: "manual",
        category: "Substances",
        subcategory: "Stimulants",
        tags: ["substance", "stimulant"],
        validation_rules: {
          min: 0,
          max: 1000,
          unit: "mg",
          required: true,
        },
      },
      {
        slug: "exercise_duration",
        label: "Exercise Duration",
        description: "Time spent exercising",
        icon: "🏃",
        data_type: "continuous",
        canonical_unit: "minutes",
        unit_group: "time",
        convertible_units: ["minutes", "hours"],
        default_display_unit: "minutes",
        source_type: "manual",
        category: "Physical Health",
        subcategory: "Exercise",
        tags: ["fitness", "exercise"],
        validation_rules: {
          min: 0,
          max: 480,
          unit: "minutes",
          required: true,
        },
      },
    ];

    for (const variable of commonVariables) {
      const { error } = await supabase
        .from("variables")
        .upsert(variable, { onConflict: "slug" });

      if (error) throw error;
    }

    log("Initial data inserted successfully", "success");
  } catch (error) {
    log(`Failed to insert initial data: ${error.message}`, "error");
    throw error;
  }
}

async function createDatabaseFunctions() {
  log("Creating database functions...");

  try {
    // Create the exec_sql function for running dynamic SQL
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
    });

    if (error) throw error;
    log("Database functions created successfully", "success");
  } catch (error) {
    log(`Failed to create database functions: ${error.message}`, "error");
    throw error;
  }
}

async function verifySetup() {
  log("Verifying setup...");

  try {
    // Check if tables exist
    const tables = [
      "variables",
      "variable_logs",
      "user_variable_preferences",
      "unit_conversions",
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("count")
        .limit(1);
      if (error) {
        log(`Table ${table} not found or accessible`, "error");
        return false;
      }
    }

    // Check if initial data exists
    const { data: variables, error: varError } = await supabase
      .from("variables")
      .select("count")
      .eq("is_active", true);

    if (varError) throw varError;

    const { data: conversions, error: convError } = await supabase
      .from("unit_conversions")
      .select("count")
      .eq("is_active", true);

    if (convError) throw convError;

    log(
      `Setup verified successfully:
      - Tables created: ${tables.length}
      - Variables: ${variables?.length || 0}
      - Unit conversions: ${conversions?.length || 0}`,
      "success"
    );

    return true;
  } catch (error) {
    log(`Setup verification failed: ${error.message}`, "error");
    return false;
  }
}

// ============================================================================
// MAIN SETUP FUNCTION
// ============================================================================

async function setupUniversalVariables() {
  log("🚀 Setting up Universal Variables System...");

  try {
    // Step 1: Check database connection
    const connected = await checkDatabaseConnection();
    if (!connected) {
      log("Cannot proceed without database connection", "error");
      process.exit(1);
    }

    // Step 2: Create database functions
    await createDatabaseFunctions();

    // Step 3: Create tables
    await createTables();

    // Step 4: Insert initial data
    await insertInitialData();

    // Step 5: Verify setup
    const verified = await verifySetup();
    if (!verified) {
      log("Setup verification failed", "error");
      process.exit(1);
    }

    log(
      "🎉 Universal Variables System setup completed successfully!",
      "success"
    );

    // Summary
    log("Setup Summary:", "info");
    log("✅ Database connection established", "info");
    log("✅ Tables created with proper indexes", "info");
    log("✅ Unit conversion system initialized", "info");
    log("✅ Common variables created", "info");
    log("✅ Row Level Security enabled", "info");
    log("✅ Database functions created", "info");

    log("Next steps:", "info");
    log("1. Run the migration script to move existing data", "info");
    log("2. Update your frontend components to use the new system", "info");
    log("3. Test the system with the new variables page", "info");
  } catch (error) {
    log(`Setup failed: ${error.message}`, "error");
    process.exit(1);
  }
}

// ============================================================================
// SCRIPT EXECUTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    console.log(`
Universal Variables System Setup

Usage:
  node scripts/setup_universal_variables.js [options]

Options:
  --help       Show this help message
  --verify     Only verify the setup without making changes

Examples:
  node scripts/setup_universal_variables.js
  node scripts/setup_universal_variables.js --verify
    `);
  } else if (args.includes("--verify")) {
    const verified = await verifySetup();
    process.exit(verified ? 0 : 1);
  } else {
    await setupUniversalVariables();
  }
}

// Run the script
main().catch((error) => {
  log(`Script failed: ${error.message}`, "error");
  process.exit(1);
});
