#!/usr/bin/env node

/**
 * Fix Oura Variables in Privacy Settings
 *
 * This script ensures Oura variables are properly created and linked
 * so they show up in the privacy settings on /account
 */

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  console.error(
    "   NEXT_PUBLIC_SUPABASE_URL:",
    supabaseUrl ? "SET" : "NOT SET"
  );
  console.error(
    "   SUPABASE_SERVICE_ROLE_KEY:",
    supabaseServiceKey ? "SET" : "NOT SET"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Oura variable definitions (clean naming without oura_ prefix)
const OURA_VARIABLES = [
  {
    slug: "sleep_score",
    label: "Sleep Score",
    description: "Sleep Score measured by Oura Ring",
    unit: "score",
    category: "Sleep",
  },
  {
    slug: "total_sleep_duration",
    label: "Total Sleep Duration",
    description: "Total Sleep Duration measured by Oura Ring",
    unit: "seconds",
    category: "Sleep",
  },
  {
    slug: "rem_sleep_duration",
    label: "REM Sleep Duration",
    description: "REM Sleep Duration measured by Oura Ring",
    unit: "seconds",
    category: "Sleep",
  },
  {
    slug: "deep_sleep_duration",
    label: "Deep Sleep Duration",
    description: "Deep Sleep Duration measured by Oura Ring",
    unit: "seconds",
    category: "Sleep",
  },
  {
    slug: "light_sleep_duration",
    label: "Light Sleep Duration",
    description: "Light Sleep Duration measured by Oura Ring",
    unit: "seconds",
    category: "Sleep",
  },
  {
    slug: "efficiency",
    label: "Sleep Efficiency",
    description: "Sleep Efficiency measured by Oura Ring",
    unit: "%",
    category: "Sleep",
  },
  {
    slug: "sleep_latency",
    label: "Sleep Latency",
    description: "Sleep Latency measured by Oura Ring",
    unit: "seconds",
    category: "Sleep",
  },
  {
    slug: "readiness_score",
    label: "Readiness Score",
    description: "Readiness Score measured by Oura Ring",
    unit: "score",
    category: "Recovery",
  },
  {
    slug: "temperature_deviation",
    label: "Temperature Deviation",
    description: "Temperature Deviation measured by Oura Ring",
    unit: "°C",
    category: "Recovery",
  },
  {
    slug: "temperature_trend_deviation",
    label: "Temperature Trend Deviation",
    description: "Temperature Trend Deviation measured by Oura Ring",
    unit: "°C",
    category: "Recovery",
  },
  {
    slug: "hr_lowest",
    label: "Lowest Heart Rate",
    description: "Lowest Heart Rate measured by Oura Ring",
    unit: "bpm",
    category: "Heart Rate",
  },
  {
    slug: "hr_average",
    label: "Average Heart Rate",
    description: "Average Heart Rate measured by Oura Ring",
    unit: "bpm",
    category: "Heart Rate",
  },
  {
    slug: "activity_score",
    label: "Activity Score",
    description: "Activity Score measured by Oura Ring",
    unit: "score",
    category: "Activity",
  },
  {
    slug: "steps",
    label: "Steps",
    description: "Steps measured by Oura Ring",
    unit: "steps",
    category: "Activity",
  },
  {
    slug: "calories_active",
    label: "Active Calories",
    description: "Active Calories measured by Oura Ring",
    unit: "kcal",
    category: "Activity",
  },
  {
    slug: "calories_total",
    label: "Total Calories",
    description: "Total Calories measured by Oura Ring",
    unit: "kcal",
    category: "Activity",
  },
];

async function analyzeCurrentState() {
  console.log("🔍 Analyzing current Oura variable state...\n");

  // Check existing Oura variables
  const { data: existingVars, error: varsError } = await supabase
    .from("variables")
    .select("slug, label, id")
    .eq("source_type", "oura")
    .order("slug");

  if (varsError) {
    console.error("❌ Error fetching existing variables:", varsError);
    return { existingVars: [], dataPoints: [] };
  }

  console.log(`📊 Found ${existingVars.length} existing Oura variables:`);
  existingVars.forEach((v) => console.log(`   - ${v.slug} (${v.label})`));

  // Check data points with variable relationships
  const { data: dataPoints, error: dataError } = await supabase
    .from("oura_variable_data_points")
    .select(
      `
      variable_id,
      variables!inner (
        slug,
        label
      )
    `
    )
    .limit(1000);

  if (dataError) {
    console.error("❌ Error fetching data points:", dataError);
  } else {
    const groupedData = dataPoints.reduce((acc, dp) => {
      const key = dp.variables.slug;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log(`\n📈 Data points by linked variable:`);
    Object.entries(groupedData).forEach(([slug, count]) => {
      console.log(`   - ${slug}: ${count} data points`);
    });
  }

  // Check orphaned data points
  const { data: orphanedCount, error: orphanError } = await supabase.rpc(
    "count_orphaned_oura_data_points"
  );

  if (!orphanError && orphanedCount) {
    console.log(
      `\n⚠️  Found ${orphanedCount} orphaned data points (variable_id not in variables table)`
    );
  }

  return { existingVars, dataPoints: dataPoints || [] };
}

async function createMissingVariables() {
  console.log("\n🛠️  Creating missing Oura variables...\n");

  let created = 0;
  let updated = 0;

  for (const varDef of OURA_VARIABLES) {
    try {
      const variableData = {
        slug: varDef.slug,
        label: varDef.label,
        description: varDef.description,
        data_type: "continuous",
        canonical_unit: varDef.unit,
        unit_group: getUnitGroup(varDef.unit),
        convertible_units: getConvertibleUnits(varDef.unit),
        default_display_unit: getDefaultDisplayUnit(varDef.unit),
        source_type: "oura",
        category: varDef.category,
        is_active: true,
      };

      const { data, error } = await supabase
        .from("variables")
        .upsert(variableData, {
          onConflict: "slug",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        console.error(`   ❌ Error upserting ${varDef.slug}:`, error.message);
      } else {
        console.log(`   ✅ ${varDef.slug} (${varDef.label})`);
        created++;
      }
    } catch (err) {
      console.error(`   ❌ Exception for ${varDef.slug}:`, err.message);
    }
  }

  console.log(`\n📊 Created/updated ${created} Oura variables`);
}

function getUnitGroup(unit) {
  switch (unit) {
    case "%":
      return "percentage";
    case "°C":
      return "temperature";
    case "bpm":
      return "heart_rate";
    case "seconds":
      return "time";
    case "kcal":
      return "energy";
    case "score":
      return "score";
    case "steps":
      return "count";
    default:
      return "count";
  }
}

function getConvertibleUnits(unit) {
  switch (unit) {
    case "seconds":
      return ["seconds", "minutes", "hours"];
    case "°C":
      return ["°C", "°F"];
    case "kcal":
      return ["kcal", "kJ"];
    default:
      return [unit];
  }
}

function getDefaultDisplayUnit(unit) {
  switch (unit) {
    case "seconds":
      return "hours";
    default:
      return unit;
  }
}

async function fixOrphanedDataPoints() {
  console.log("\n🔧 Checking for orphaned data points...\n");

  // Get orphaned data point analysis
  const { data: orphanedAnalysis, error } = await supabase.rpc(
    "analyze_orphaned_oura_data"
  );

  if (error) {
    console.log(
      "⚠️  Could not analyze orphaned data (function might not exist)"
    );
    console.log(
      "   This is OK - orphaned data will not be shown in privacy settings anyway"
    );
    return;
  }

  if (orphanedAnalysis && orphanedAnalysis.length > 0) {
    console.log("📊 Found orphaned data points:");
    orphanedAnalysis.forEach((item) => {
      console.log(
        `   - ${item.variable_id}: ${item.count} data points (avg value: ${item.avg_value})`
      );
    });

    console.log(
      "\n💡 To see these variables in privacy settings, you would need to:"
    );
    console.log("   1. Identify which variable each UUID represents");
    console.log("   2. Update the variable_id in oura_variable_data_points");
    console.log(
      "   3. Or re-sync your Oura data with the latest Edge Function"
    );
  } else {
    console.log("✅ No orphaned data points found");
  }
}

async function testPrivacySettingsQuery() {
  console.log("\n🧪 Testing privacy settings query...\n");

  // Test the exact query that SimpleVariableSharing uses
  const { data: testData, error: testError } = await supabase
    .from("oura_variable_data_points")
    .select("variable_id")
    .not("variable_id", "is", null)
    .limit(10);

  if (testError) {
    console.error("❌ Error testing oura data query:", testError);
    return;
  }

  const uniqueVariableIds = [...new Set(testData.map((d) => d.variable_id))];

  console.log(
    `📊 Found ${uniqueVariableIds.length} unique variable IDs in oura_variable_data_points`
  );

  // Check how many of these exist in variables table
  const { data: linkedVars, error: linkedError } = await supabase
    .from("variables")
    .select("id, slug, label")
    .in("id", uniqueVariableIds);

  if (linkedError) {
    console.error("❌ Error checking linked variables:", linkedError);
    return;
  }

  console.log(
    `✅ ${linkedVars.length} of those are properly linked to variables table:`
  );
  linkedVars.forEach((v) => console.log(`   - ${v.slug} (${v.label})`));

  const orphanedCount = uniqueVariableIds.length - linkedVars.length;
  if (orphanedCount > 0) {
    console.log(
      `⚠️  ${orphanedCount} variable IDs are orphaned (not in variables table)`
    );
  }
}

async function main() {
  console.log("🚀 Fix Oura Variables in Privacy Settings\n");

  try {
    // Step 1: Analyze current state
    await analyzeCurrentState();

    // Step 2: Create missing variables
    await createMissingVariables();

    // Step 3: Check for orphaned data
    await fixOrphanedDataPoints();

    // Step 4: Test privacy settings query
    await testPrivacySettingsQuery();

    console.log("\n✅ Analysis and fixes completed!");
    console.log("\n📋 Next steps:");
    console.log(
      "   1. Check your /account page - Oura variables with valid data should now appear"
    );
    console.log(
      "   2. If some variables are still missing, you may need to re-sync Oura data"
    );
    console.log(
      "   3. Use the latest Oura sync Edge Function to ensure proper variable linking"
    );
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Create helper SQL functions for analysis
async function createHelperFunctions() {
  // This is optional - creates some helper functions for analysis
  const functions = [
    `
    CREATE OR REPLACE FUNCTION count_orphaned_oura_data_points()
    RETURNS INTEGER AS $$
    BEGIN
      RETURN (
        SELECT COUNT(*)
        FROM oura_variable_data_points ovdp
        LEFT JOIN variables v ON ovdp.variable_id = v.id
        WHERE v.id IS NULL
      );
    END;
    $$ LANGUAGE plpgsql;
    `,
    `
    CREATE OR REPLACE FUNCTION analyze_orphaned_oura_data()
    RETURNS TABLE(variable_id UUID, count BIGINT, avg_value NUMERIC) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        ovdp.variable_id,
        COUNT(*) as count,
        AVG(ovdp.value) as avg_value
      FROM oura_variable_data_points ovdp
      LEFT JOIN variables v ON ovdp.variable_id = v.id
      WHERE v.id IS NULL
      GROUP BY ovdp.variable_id
      ORDER BY count DESC;
    END;
    $$ LANGUAGE plpgsql;
    `,
  ];

  for (const func of functions) {
    try {
      await supabase.rpc("exec_sql", { sql: func });
    } catch (err) {
      // Ignore errors - these are just helper functions
    }
  }
}

if (require.main === module) {
  createHelperFunctions().then(() => main());
}
