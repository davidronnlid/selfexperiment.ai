const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Oura variables to create
const OURA_VARIABLES = [
  {
    slug: "readiness_score",
    label: "Readiness Score",
    description: "Oura Ring readiness score (0-100)",
    data_type: "continuous",
    source_type: "oura",
    category: "Health",
    canonical_unit: "score",
    default_display_unit: "score",
    validation_rules: {
      min: 0,
      max: 100,
      type: "number",
    },
  },
  {
    slug: "sleep_score",
    label: "Sleep Score",
    description: "Oura Ring sleep score (0-100)",
    data_type: "continuous",
    source_type: "oura",
    category: "Health",
    canonical_unit: "score",
    default_display_unit: "score",
    validation_rules: {
      min: 0,
      max: 100,
      type: "number",
    },
  },
  {
    slug: "total_sleep_duration",
    label: "Total Sleep Duration",
    description: "Total sleep duration in minutes",
    data_type: "continuous",
    source_type: "oura",
    category: "Health",
    canonical_unit: "minutes",
    default_display_unit: "minutes",
    validation_rules: {
      min: 0,
      max: 1440,
      type: "number",
    },
  },
  {
    slug: "rem_sleep_duration",
    label: "REM Sleep Duration",
    description: "REM sleep duration in minutes",
    data_type: "continuous",
    source_type: "oura",
    category: "Health",
    canonical_unit: "minutes",
    default_display_unit: "minutes",
    validation_rules: {
      min: 0,
      max: 1440,
      type: "number",
    },
  },
  {
    slug: "deep_sleep_duration",
    label: "Deep Sleep Duration",
    description: "Deep sleep duration in minutes",
    data_type: "continuous",
    source_type: "oura",
    category: "Health",
    canonical_unit: "minutes",
    default_display_unit: "minutes",
    validation_rules: {
      min: 0,
      max: 1440,
      type: "number",
    },
  },
  {
    slug: "efficiency",
    label: "Sleep Efficiency",
    description: "Sleep efficiency percentage",
    data_type: "continuous",
    source_type: "oura",
    category: "Health",
    canonical_unit: "percentage",
    default_display_unit: "percentage",
    validation_rules: {
      min: 0,
      max: 100,
      type: "number",
    },
  },
  {
    slug: "sleep_latency",
    label: "Sleep Latency",
    description: "Time to fall asleep in minutes",
    data_type: "continuous",
    source_type: "oura",
    category: "Health",
    canonical_unit: "minutes",
    default_display_unit: "minutes",
    validation_rules: {
      min: 0,
      max: 180,
      type: "number",
    },
  },
  {
    slug: "temperature_deviation",
    label: "Temperature Deviation",
    description: "Temperature deviation from baseline",
    data_type: "continuous",
    source_type: "oura",
    category: "Health",
    canonical_unit: "celsius",
    default_display_unit: "celsius",
    validation_rules: {
      min: -5,
      max: 5,
      type: "number",
    },
  },
  {
    slug: "temperature_trend_deviation",
    label: "Temperature Trend Deviation",
    description: "Temperature trend deviation from baseline",
    data_type: "continuous",
    source_type: "oura",
    category: "Health",
    canonical_unit: "celsius",
    default_display_unit: "celsius",
    validation_rules: {
      min: -5,
      max: 5,
      type: "number",
    },
  },
  {
    slug: "hr_lowest_true",
    label: "Lowest Heart Rate",
    description: "Lowest heart rate during sleep (bpm)",
    data_type: "continuous",
    source_type: "oura",
    category: "Health",
    canonical_unit: "bpm",
    default_display_unit: "bpm",
    validation_rules: {
      min: 30,
      max: 200,
      type: "number",
    },
  },
  {
    slug: "hr_average_true",
    label: "Average Heart Rate",
    description: "Average heart rate during sleep (bpm)",
    data_type: "continuous",
    source_type: "oura",
    category: "Health",
    canonical_unit: "bpm",
    default_display_unit: "bpm",
    validation_rules: {
      min: 30,
      max: 200,
      type: "number",
    },
  },
];

async function setupOuraVariables() {
  console.log("🔧 Setting up Oura variables...");
  console.log("================================\n");

  try {
    // Check existing Oura variables
    console.log("📋 Checking existing Oura variables...");
    const { data: existingVars, error: checkError } = await supabase
      .from("variables")
      .select("slug, label")
      .eq("source_type", "oura");

    if (checkError) {
      console.error("❌ Error checking existing variables:", checkError);
      return;
    }

    console.log(`Found ${existingVars?.length || 0} existing Oura variables`);

    // Create missing variables
    const variablesToCreate = OURA_VARIABLES.filter(
      (ouraVar) =>
        !existingVars?.some((existing) => existing.slug === ouraVar.slug)
    );

    if (variablesToCreate.length === 0) {
      console.log("✅ All Oura variables already exist!");
      return;
    }

    console.log(
      `📝 Creating ${variablesToCreate.length} new Oura variables...`
    );

    for (const variable of variablesToCreate) {
      console.log(`   Creating: ${variable.label} (${variable.slug})`);

      const { error: insertError } = await supabase.from("variables").insert({
        slug: variable.slug,
        label: variable.label,
        description: variable.description,
        data_type: variable.data_type,
        source_type: variable.source_type,
        category: variable.category,
        canonical_unit: variable.canonical_unit,
        default_display_unit: variable.default_display_unit,
        validation_rules: variable.validation_rules,
        is_active: true,
      });

      if (insertError) {
        console.error(
          `   ❌ Error creating ${variable.slug}:`,
          insertError.message
        );
      } else {
        console.log(`   ✅ Created: ${variable.label}`);
      }
    }

    // Verify creation
    console.log("\n📋 Verifying Oura variables...");
    const { data: finalVars, error: finalCheckError } = await supabase
      .from("variables")
      .select("slug, label, source_type")
      .eq("source_type", "oura");

    if (finalCheckError) {
      console.error("❌ Error verifying variables:", finalCheckError);
    } else {
      console.log(`✅ Total Oura variables: ${finalVars?.length || 0}`);
      if (finalVars && finalVars.length > 0) {
        console.log("   Available Oura variables:");
        finalVars.forEach((v) => {
          console.log(`     - ${v.label} (${v.slug})`);
        });
      }
    }

    console.log("\n🎉 Oura variables setup complete!");
    console.log(
      "📱 Users can now connect their Oura Ring and see data for these variables"
    );
  } catch (error) {
    console.error("❌ Error setting up Oura variables:", error);
  }
}

// Run the setup
setupOuraVariables()
  .then(() => {
    console.log("\n🏁 Setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
