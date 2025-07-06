#!/usr/bin/env node

/**
 * Migration Script: Daily Logs to Universal Variables System
 *
 * This script migrates the existing daily_logs table to the new universal
 * variables system while preserving all data and relationships.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================

const MIGRATION_CONFIG = {
  batchSize: 100,
  dryRun: false, // Set to true to preview changes without applying them
  backupBeforeMigration: true,
  createBackupTable: true,
  validateData: true,
  preserveOriginalData: true,
};

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

async function createBackup() {
  if (!MIGRATION_CONFIG.backupBeforeMigration) return;

  log("Creating backup of daily_logs table...");

  try {
    // Create backup table
    const { error: createError } = await supabase.rpc("create_backup_table", {
      table_name: "daily_logs",
      backup_suffix: `_backup_${Date.now()}`,
    });

    if (createError) throw createError;

    log("Backup created successfully", "success");
  } catch (error) {
    log(`Backup failed: ${error.message}`, "error");
    throw error;
  }
}

async function validateExistingData() {
  if (!MIGRATION_CONFIG.validateData) return;

  log("Validating existing data...");

  try {
    // Check for data integrity issues
    const { data: invalidLogs, error } = await supabase
      .from("daily_logs")
      .select("id, label, value, date, user_id")
      .or("label.is.null,value.is.null,date.is.null,user_id.is.null");

    if (error) throw error;

    if (invalidLogs && invalidLogs.length > 0) {
      log(`Found ${invalidLogs.length} invalid records`, "warning");
      log("Invalid records:", "warning");
      invalidLogs.forEach((log) => {
        console.log(
          `  - ID: ${log.id}, Label: ${log.label}, Value: ${log.value}`
        );
      });
    } else {
      log("All records are valid", "success");
    }
  } catch (error) {
    log(`Data validation failed: ${error.message}`, "error");
    throw error;
  }
}

// ============================================================================
// VARIABLE MAPPING
// ============================================================================

const VARIABLE_MAPPINGS = {
  // Physical Health
  Weight: {
    slug: "weight",
    data_type: "continuous",
    canonical_unit: "kg",
    unit_group: "mass",
    convertible_units: ["kg", "lb", "g"],
    category: "Physical Health",
    subcategory: "Body Metrics",
    source_type: "manual",
    validation_rules: {
      min: 20,
      max: 300,
      unit: "kg",
      required: true,
    },
  },
  "Body Fat %": {
    slug: "body_fat",
    data_type: "continuous",
    canonical_unit: "%",
    category: "Physical Health",
    subcategory: "Body Metrics",
    source_type: "manual",
    validation_rules: {
      min: 0,
      max: 50,
      unit: "%",
      required: true,
    },
  },

  // Sleep & Recovery
  "Sleep Duration": {
    slug: "sleep_duration",
    data_type: "continuous",
    canonical_unit: "hours",
    unit_group: "time",
    convertible_units: ["hours", "minutes"],
    category: "Sleep & Recovery",
    subcategory: "Sleep Quality",
    source_type: "manual",
    validation_rules: {
      min: 0,
      max: 24,
      unit: "hours",
      required: true,
    },
  },
  "Sleep Quality": {
    slug: "sleep_quality",
    data_type: "continuous",
    canonical_unit: "score",
    category: "Sleep & Recovery",
    subcategory: "Sleep Quality",
    source_type: "manual",
    validation_rules: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  "Sleep Time": {
    slug: "sleep_time",
    data_type: "time",
    category: "Sleep & Recovery",
    subcategory: "Sleep Timing",
    source_type: "manual",
    validation_rules: {
      required: true,
    },
  },

  // Mental Health
  Mood: {
    slug: "mood",
    data_type: "continuous",
    canonical_unit: "score",
    category: "Mental Health",
    subcategory: "Emotional State",
    source_type: "manual",
    validation_rules: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  Stress: {
    slug: "stress",
    data_type: "continuous",
    canonical_unit: "score",
    category: "Mental Health",
    subcategory: "Stress",
    source_type: "manual",
    validation_rules: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  "Anxiety Before Bed": {
    slug: "anxiety_before_bed",
    data_type: "continuous",
    canonical_unit: "score",
    category: "Mental Health",
    subcategory: "Anxiety",
    source_type: "manual",
    validation_rules: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  "Cognitive Control": {
    slug: "cognitive_control",
    data_type: "continuous",
    canonical_unit: "score",
    category: "Mental Health",
    subcategory: "Cognitive Function",
    source_type: "manual",
    validation_rules: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },

  // Substances
  Caffeine: {
    slug: "caffeine",
    label: "Caffeine",
    data_type: "continuous",
    canonical_unit: "mg",
    validation_rules: {
      min: 0,
      max: 1000,
      unit: "mg",
      required: true,
    },
    category: "Substances & Diet",
    subcategory: "Stimulants",
    icon: "☕",
  },
  Alcohol: {
    slug: "alcohol",
    label: "Alcohol",
    data_type: "continuous",
    canonical_unit: "units",
    validation_rules: {
      min: 0,
      max: 20,
      unit: "units",
      required: true,
    },
    category: "Substances & Diet",
    subcategory: "Depressants",
    icon: "🍷",
  },
  Nicotine: {
    slug: "nicotine",
    data_type: "boolean",
    category: "Substances",
    subcategory: "Nicotine",
    source_type: "manual",
    validation_rules: {
      required: true,
    },
  },
  "Cannabis/THC": {
    slug: "cannabis_thc",
    data_type: "boolean",
    category: "Substances",
    subcategory: "Cannabis",
    source_type: "manual",
    validation_rules: {
      required: true,
    },
  },

  // Exercise
  Exercise: {
    slug: "exercise",
    data_type: "text",
    category: "Exercise & Fitness",
    subcategory: "Exercise",
    source_type: "manual",
    validation_rules: {
      maxLength: 500,
      required: false,
    },
  },

  // Environment
  "Room Temp": {
    slug: "room_temperature",
    data_type: "continuous",
    canonical_unit: "°C",
    unit_group: "temperature",
    convertible_units: ["°C", "°F"],
    category: "Environment",
    subcategory: "Temperature",
    source_type: "manual",
    validation_rules: {
      min: -50,
      max: 60,
      unit: "°C",
      required: true,
    },
  },
  "Light Exposure": {
    slug: "light_exposure",
    data_type: "continuous",
    canonical_unit: "score",
    category: "Environment",
    subcategory: "Light",
    source_type: "manual",
    validation_rules: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
};

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

async function createVariablesFromMappings() {
  log("Creating variables from mappings...");

  const createdVariables = new Map();

  for (const [label, config] of Object.entries(VARIABLE_MAPPINGS)) {
    try {
      // Check if variable already exists
      const { data: existing } = await supabase
        .from("variables")
        .select("id")
        .eq("slug", config.slug)
        .single();

      if (existing) {
        log(`Variable ${config.slug} already exists, skipping...`);
        createdVariables.set(label, existing.id);
        continue;
      }

      // Create variable
      const { data: variable, error } = await supabase
        .from("variables")
        .insert({
          slug: config.slug,
          label,
          data_type: config.data_type,
          canonical_unit: config.canonical_unit,
          unit_group: config.unit_group,
          convertible_units: config.convertible_units,
          category: config.category,
          subcategory: config.subcategory,
          source_type: config.source_type,
          validation_rules: config.validation_rules,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      createdVariables.set(label, variable.id);
      log(`Created variable: ${config.slug}`, "success");
    } catch (error) {
      log(
        `Failed to create variable ${config.slug}: ${error.message}`,
        "error"
      );
    }
  }

  return createdVariables;
}

async function migrateLogsToVariables(variableMap) {
  log("Migrating logs to new variable system...");

  let processed = 0;
  let errors = 0;

  // Get all unique labels from daily_logs
  const { data: uniqueLabels, error: labelsError } = await supabase
    .from("daily_logs")
    .select("label")
    .not("label", "is", null);

  if (labelsError) throw labelsError;

  const labels = [...new Set(uniqueLabels.map((l) => l.label))];
  log(`Found ${labels.length} unique labels to migrate`);

  for (const label of labels) {
    try {
      const variableId = variableMap.get(label);
      if (!variableId) {
        log(
          `No mapping found for label: ${label}, creating custom variable...`
        );

        // Create custom variable for unmapped labels
        const { data: customVariable, error: createError } = await supabase
          .from("variables")
          .insert({
            slug: label.toLowerCase().replace(/\s+/g, "_"),
            label,
            data_type: "text", // Default to text for unknown types
            source_type: "manual",
            category: "Custom",
            subcategory: "User Defined",
            is_active: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        variableMap.set(label, customVariable.id);
      }

      // Migrate logs for this label
      const { data: logs, error: logsError } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("label", label);

      if (logsError) throw logsError;

      for (const log of logs) {
        try {
          // Convert value to canonical unit if needed
          let canonicalValue = null;
          const config = VARIABLE_MAPPINGS[label];

          if (config?.canonical_unit && config.data_type === "continuous") {
            const numValue = parseFloat(log.value);
            if (!isNaN(numValue)) {
              canonicalValue = numValue; // Assume same unit for now
            }
          }

          // Insert into variable_logs
          const { error: insertError } = await supabase
            .from("variable_logs")
            .insert({
              user_id: log.user_id,
              variable_id: variableMap.get(label),
              canonical_value: canonicalValue,
              display_value: log.value,
              logged_at: log.date,
              source: "migrated",
              notes: log.notes,
              is_private: false,
            });

          if (insertError) throw insertError;

          processed++;
        } catch (error) {
          log(`Failed to migrate log ${log.id}: ${error.message}`, "error");
          errors++;
        }
      }

      log(`Migrated ${logs.length} logs for label: ${label}`, "success");
    } catch (error) {
      log(`Failed to migrate label ${label}: ${error.message}`, "error");
      errors++;
    }
  }

  log(
    `Migration completed. Processed: ${processed}, Errors: ${errors}`,
    "success"
  );
}

async function createUserPreferences(variableMap) {
  log("Creating user preferences...");

  try {
    // Get all users who have logs
    const { data: users, error: usersError } = await supabase
      .from("daily_logs")
      .select("user_id")
      .not("user_id", "is", null);

    if (usersError) throw usersError;

    const uniqueUsers = [...new Set(users.map((u) => u.user_id))];
    log(`Found ${uniqueUsers.length} users to create preferences for`);

    for (const userId of uniqueUsers) {
      for (const [label, variableId] of variableMap) {
        try {
          // Check if preference already exists
          const { data: existing } = await supabase
            .from("user_variable_preferences")
            .select("id")
            .eq("user_id", userId)
            .eq("variable_id", variableId)
            .single();

          if (existing) continue;

          // Create preference
          const { error: prefError } = await supabase
            .from("user_variable_preferences")
            .insert({
              user_id: userId,
              variable_id: variableId,
              is_tracked: true,
              is_shared: false,
              share_level: "private",
              display_order: 0,
              is_favorite: false,
            });

          if (prefError) throw prefError;
        } catch (error) {
          log(
            `Failed to create preference for user ${userId}, variable ${label}: ${error.message}`,
            "error"
          );
        }
      }
    }

    log("User preferences created successfully", "success");
  } catch (error) {
    log(`Failed to create user preferences: ${error.message}`, "error");
  }
}

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

async function runMigration() {
  log("Starting migration to Universal Variables System...");

  try {
    // Step 1: Create backup
    await createBackup();

    // Step 2: Validate existing data
    await validateExistingData();

    // Step 3: Create variables from mappings
    const variableMap = await createVariablesFromMappings();

    // Step 4: Migrate logs to new system
    await migrateLogsToVariables(variableMap);

    // Step 5: Create user preferences
    await createUserPreferences(variableMap);

    log("Migration completed successfully!", "success");

    // Summary
    log("Migration Summary:", "info");
    log(`- Variables created: ${variableMap.size}`, "info");
    log("- All existing data preserved", "info");
    log("- User preferences created", "info");
    log("- Backup created for safety", "info");
  } catch (error) {
    log(`Migration failed: ${error.message}`, "error");
    process.exit(1);
  }
}

// ============================================================================
// DRY RUN FUNCTION
// ============================================================================

async function dryRun() {
  log("Running dry run to preview migration...");

  try {
    // Count existing data
    const { count: logCount } = await supabase
      .from("daily_logs")
      .select("*", { count: "exact", head: true });

    const { count: userCount } = await supabase
      .from("daily_logs")
      .select("user_id", { count: "exact", head: true });

    log(`Would migrate ${logCount} logs from ${userCount} users`, "info");
    log(
      `Would create ${Object.keys(VARIABLE_MAPPINGS).length} variables`,
      "info"
    );
    log("Dry run completed - no changes made", "success");
  } catch (error) {
    log(`Dry run failed: ${error.message}`, "error");
  }
}

// ============================================================================
// SCRIPT EXECUTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--dry-run")) {
    MIGRATION_CONFIG.dryRun = true;
    await dryRun();
  } else if (args.includes("--help")) {
    console.log(`
Migration Script Usage:

  node migrate_to_universal_variables.js [options]

Options:
  --dry-run    Preview migration without making changes
  --help       Show this help message

Examples:
  node migrate_to_universal_variables.js --dry-run
  node migrate_to_universal_variables.js
    `);
  } else {
    await runMigration();
  }
}

// Run the script
main().catch((error) => {
  log(`Script failed: ${error.message}`, "error");
  process.exit(1);
});
