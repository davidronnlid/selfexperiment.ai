const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// LOG_LABELS data from the existing system
const LOG_LABELS = [
  // Substances Consumed
  {
    label: "Caffeine (mg)",
    type: "number",
    description: "Total caffeine consumed and timing.",
    icon: "☕",
    constraints: {
      min: 0,
      max: 1000,
      unit: "mg",
      required: true,
    },
  },
  {
    label: "Alcohol (units)",
    type: "number",
    description: "Alcohol intake and timing.",
    icon: "🍷",
    constraints: {
      min: 0,
      max: 20,
      unit: "units",
      required: true,
    },
  },
  {
    label: "Nicotine",
    type: "yesno",
    description: "Nicotine use.",
    icon: "🚬",
    constraints: {
      required: true,
    },
  },
  {
    label: "Cannabis/THC",
    type: "yesno",
    description: "Cannabis or THC use.",
    icon: "🌿",
    constraints: {
      required: true,
    },
  },
  {
    label: "Medications/Supplements",
    type: "text",
    description: "Any medications or supplements taken.",
    icon: "💊",
    constraints: {
      maxLength: 500,
      required: false,
    },
  },

  // Mental & Emotional State
  {
    label: "Stress",
    type: "scale",
    description: "Stress level (1–10).",
    icon: "😰",
    constraints: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  {
    label: "Cognitive Control",
    type: "scale",
    description:
      "Subjective level of cognitive control and mental clarity (1–10).",
    icon: "🧠",
    constraints: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  {
    label: "Anxiety Before Bed",
    type: "scale",
    description: "Anxiety or racing thoughts before bed (1–10).",
    icon: "😬",
    constraints: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  {
    label: "Mood",
    type: "scale",
    description: "Overall mood (1–10).",
    icon: "🙂",
    constraints: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  {
    label: "Emotional Event",
    type: "text",
    description: "Conflict or emotional event that day.",
    icon: "💔",
    constraints: {
      maxLength: 1000,
      required: false,
    },
  },

  // Sleep Behaviors
  {
    label: "Sleep Time",
    type: "time",
    description: "Time you went to bed.",
    icon: "🛏️",
    constraints: {
      required: true,
    },
  },
  {
    label: "Fell Asleep Time",
    type: "time",
    description: "Time you fell asleep.",
    icon: "😴",
    constraints: {
      required: true,
    },
  },
  {
    label: "Sleep Duration",
    type: "number",
    description: "Total sleep duration (hours).",
    icon: "⏰",
    constraints: {
      min: 0,
      max: 24,
      unit: "hours",
      required: true,
    },
  },
  {
    label: "Sleep Quality",
    type: "scale",
    description: "Subjective sleep quality (1–10).",
    icon: "⭐",
    constraints: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  {
    label: "Naps",
    type: "number",
    description: "Number of naps during the day.",
    icon: "🛌",
    constraints: {
      min: 0,
      max: 10,
      unit: "naps",
      required: true,
    },
  },

  // Physical Factors
  {
    label: "Exercise",
    type: "text",
    description: "Type and timing of exercise.",
    icon: "🏋️",
    constraints: {
      maxLength: 500,
      required: false,
    },
  },
  {
    label: "Illness/Symptoms",
    type: "text",
    description: "Any illness or symptoms.",
    icon: "🤒",
    constraints: {
      maxLength: 500,
      required: false,
    },
  },
  {
    label: "Body Temp (subjective)",
    type: "dropdown",
    description: "Subjective body temperature.",
    icon: "🌡️",
    options: ["Very Cold", "Cold", "Normal", "Warm", "Hot"],
    constraints: {
      required: false,
    },
  },
  {
    label: "Menstrual Phase",
    type: "dropdown",
    description: "Phase of menstrual cycle.",
    icon: "🌸",
    options: ["Menstrual", "Follicular", "Ovulatory", "Luteal"],
    constraints: {
      required: false,
    },
  },

  // Diet & Nutrition
  {
    label: "Big Meal Late",
    type: "yesno",
    description: "Large meal within 3 hours of bedtime.",
    icon: "🍽️",
    constraints: {
      required: true,
    },
  },
  {
    label: "Late Sugar Intake",
    type: "yesno",
    description: "High sugar intake in the evening.",
    icon: "🍭",
    constraints: {
      required: true,
    },
  },
  {
    label: "Intermittent Fasting",
    type: "yesno",
    description: "Following intermittent fasting schedule.",
    icon: "⏰",
    constraints: {
      required: false,
    },
  },
  {
    label: "Hydration",
    type: "scale",
    description: "Hydration level (1–10).",
    icon: "💧",
    constraints: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },

  // Environmental Factors
  {
    label: "Room Temp",
    type: "number",
    description: "Room temperature (°C).",
    icon: "🌡️",
    constraints: {
      min: 10,
      max: 35,
      unit: "°C",
      required: false,
    },
  },
  {
    label: "Light Exposure",
    type: "text",
    description: "Light exposure patterns.",
    icon: "💡",
    constraints: {
      maxLength: 500,
      required: false,
    },
  },
  {
    label: "Noise Disturbances",
    type: "scale",
    description: "Level of noise disturbances (1–10).",
    icon: "🔊",
    constraints: {
      scaleMin: 1,
      scaleMax: 10,
      required: false,
    },
  },
  {
    label: "Travel/Jet Lag",
    type: "yesno",
    description: "Travel or jet lag effects.",
    icon: "✈️",
    constraints: {
      required: false,
    },
  },
  {
    label: "Altitude Change",
    type: "yesno",
    description: "Significant altitude change.",
    icon: "🏔️",
    constraints: {
      required: false,
    },
  },
];

// Category mapping
const categoryMapping = {
  "Caffeine (mg)": "Substances & Diet",
  "Alcohol (units)": "Substances & Diet",
  Nicotine: "Substances & Diet",
  "Cannabis/THC": "Substances & Diet",
  "Medications/Supplements": "Substances & Diet",
  "Big Meal Late": "Substances & Diet",
  "Late Sugar Intake": "Substances & Diet",
  "Intermittent Fasting": "Substances & Diet",
  Hydration: "Substances & Diet",

  Stress: "Mental & Emotional",
  "Cognitive Control": "Mental & Emotional",
  "Anxiety Before Bed": "Mental & Emotional",
  Mood: "Mental & Emotional",
  "Emotional Event": "Mental & Emotional",

  "Sleep Time": "Sleep & Recovery",
  "Fell Asleep Time": "Sleep & Recovery",
  "Sleep Duration": "Sleep & Recovery",
  "Sleep Quality": "Sleep & Recovery",
  Naps: "Sleep & Recovery",

  Exercise: "Physical Health",
  "Illness/Symptoms": "Physical Health",
  "Body Temp (subjective)": "Physical Health",
  "Menstrual Phase": "Physical Health",

  "Room Temp": "Environment",
  "Light Exposure": "Environment",
  "Noise Disturbances": "Environment",
  "Travel/Jet Lag": "Environment",
  "Altitude Change": "Environment",
};

// Convert LOG_LABELS type to universal variables data type
function convertDataType(type) {
  switch (type) {
    case "number":
      return "continuous";
    case "scale":
      return "continuous";
    case "text":
      return "text";
    case "time":
      return "time";
    case "yesno":
      return "boolean";
    case "dropdown":
      return "categorical";
    default:
      return "text";
  }
}

// Convert constraints to validation rules
function convertValidationRules(constraints, type, options) {
  const rules = {};

  if (constraints.required !== undefined) {
    rules.required = constraints.required;
  }

  if (constraints.min !== undefined) {
    rules.min = constraints.min;
  }

  if (constraints.max !== undefined) {
    rules.max = constraints.max;
  }

  if (constraints.scaleMin !== undefined) {
    rules.min = constraints.scaleMin;
  }

  if (constraints.scaleMax !== undefined) {
    rules.max = constraints.scaleMax;
  }

  if (constraints.minLength !== undefined) {
    rules.minLength = constraints.minLength;
  }

  if (constraints.maxLength !== undefined) {
    rules.maxLength = constraints.maxLength;
  }

  if (constraints.pattern !== undefined) {
    rules.pattern = constraints.pattern;
  }

  if (constraints.unit !== undefined) {
    rules.unit = constraints.unit;
  }

  if (options && options.length > 0) {
    rules.options = options;
  }

  return rules;
}

// Generate a URL-friendly name from label
function generateName(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "");
}

async function migrateLogLabelsToVariables() {
  console.log("Starting migration of LOG_LABELS to variables table...");

  try {
    // Convert LOG_LABELS to variable records
    const variableRecords = LOG_LABELS.map((logLabel) => ({
      name: generateName(logLabel.label),
      label: logLabel.label,
      description: logLabel.description,
      data_type: convertDataType(logLabel.type),
      category: categoryMapping[logLabel.label] || "Other",
      icon: logLabel.icon,
      canonical_unit: logLabel.constraints?.unit || null,
      convertible_units: logLabel.constraints?.unit
        ? [logLabel.constraints.unit]
        : [],
      validation_rules: convertValidationRules(
        logLabel.constraints,
        logLabel.type,
        logLabel.options
      ),
      is_system_variable: true,
      source_type: "system",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    console.log(`Inserting ${variableRecords.length} variables...`);

    // Insert variables in batches to avoid conflicts
    for (let i = 0; i < variableRecords.length; i += 10) {
      const batch = variableRecords.slice(i, i + 10);

      const { data, error } = await supabase
        .from("variables")
        .upsert(batch, {
          onConflict: "name",
          ignoreDuplicates: false,
        })
        .select();

      if (error) {
        console.error(`Error inserting batch ${i / 10 + 1}:`, error);
        // Continue with other batches
      } else {
        console.log(`Inserted batch ${i / 10 + 1} (${batch.length} variables)`);
      }
    }

    console.log("Migration completed successfully!");

    // Verify the migration
    const { data: insertedVars, error: countError } = await supabase
      .from("variables")
      .select("id, name, label, category")
      .eq("is_system_variable", true);

    if (countError) {
      console.error("Error verifying migration:", countError);
    } else {
      console.log(
        `\nVerification: ${insertedVars.length} system variables found in database`
      );

      // Group by category for summary
      const categoryCount = insertedVars.reduce((acc, variable) => {
        acc[variable.category] = (acc[variable.category] || 0) + 1;
        return acc;
      }, {});

      console.log("\nVariables by category:");
      Object.entries(categoryCount).forEach(([category, count]) => {
        console.log(`  ${category}: ${count} variables`);
      });
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  migrateLogLabelsToVariables()
    .then(() => {
      console.log("\nMigration script completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateLogLabelsToVariables };
