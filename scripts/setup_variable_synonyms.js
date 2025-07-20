// Setup Variable Synonyms Script
// Adds initial synonyms to common variables to demonstrate the synonym system

const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Common variable synonyms mapping
const variableSynonyms = {
  // Weight-related variables
  weight: [
    { label: "Body Weight", type: "system", weight: 8 },
    { label: "Mass", type: "system", weight: 6 },
    { label: "Scale Weight", type: "common", weight: 5 },
    { label: "Body Mass", type: "common", weight: 4 },
  ],

  // Sleep-related variables
  sleep_duration: [
    { label: "Sleep Time", type: "system", weight: 8 },
    { label: "Hours of Sleep", type: "common", weight: 6 },
    { label: "Sleep Hours", type: "common", weight: 5 },
    { label: "Total Sleep", type: "common", weight: 4 },
  ],

  sleep_quality: [
    { label: "Sleep Score", type: "system", weight: 8 },
    { label: "Sleep Rating", type: "common", weight: 6 },
    { label: "Sleep Satisfaction", type: "common", weight: 5 },
    { label: "Sleep Feel", type: "user", weight: 3 },
  ],

  // Exercise-related variables
  exercise_duration: [
    { label: "Workout Time", type: "system", weight: 8 },
    { label: "Exercise Time", type: "common", weight: 6 },
    { label: "Training Duration", type: "common", weight: 5 },
    { label: "Activity Time", type: "common", weight: 4 },
  ],

  exercise_intensity: [
    { label: "Workout Intensity", type: "system", weight: 8 },
    { label: "Exercise Level", type: "common", weight: 6 },
    { label: "Training Intensity", type: "common", weight: 5 },
    { label: "Activity Level", type: "common", weight: 4 },
  ],

  // Mood and mental health
  mood: [
    { label: "Happiness", type: "system", weight: 8 },
    { label: "Emotional State", type: "common", weight: 6 },
    { label: "Feeling", type: "common", weight: 5 },
    { label: "Mental State", type: "common", weight: 4 },
  ],

  stress: [
    { label: "Stress Level", type: "system", weight: 8 },
    { label: "Anxiety", type: "common", weight: 6 },
    { label: "Tension", type: "common", weight: 5 },
    { label: "Mental Load", type: "user", weight: 3 },
  ],

  // Nutrition-related
  calories: [
    { label: "Calorie Intake", type: "system", weight: 8 },
    { label: "Energy Intake", type: "common", weight: 6 },
    { label: "Food Calories", type: "common", weight: 5 },
    { label: "Daily Calories", type: "common", weight: 4 },
  ],

  water_intake: [
    { label: "Water Consumption", type: "system", weight: 8 },
    { label: "Hydration", type: "common", weight: 6 },
    { label: "Fluid Intake", type: "common", weight: 5 },
    { label: "Daily Water", type: "common", weight: 4 },
  ],

  // Health metrics
  heart_rate: [
    { label: "Heart Rate", type: "system", weight: 8 },
    { label: "Pulse", type: "common", weight: 6 },
    { label: "HR", type: "common", weight: 5 },
    { label: "BPM", type: "common", weight: 4 },
  ],

  blood_pressure: [
    { label: "Blood Pressure", type: "system", weight: 8 },
    { label: "BP", type: "common", weight: 6 },
    { label: "Systolic/Diastolic", type: "common", weight: 5 },
  ],

  // Body composition
  body_fat: [
    { label: "Body Fat Percentage", type: "system", weight: 8 },
    { label: "Fat Percentage", type: "common", weight: 6 },
    { label: "Body Fat %", type: "common", weight: 5 },
    { label: "Fat Ratio", type: "common", weight: 4 },
  ],

  muscle_mass: [
    { label: "Muscle Mass", type: "system", weight: 8 },
    { label: "Lean Mass", type: "common", weight: 6 },
    { label: "Muscle Weight", type: "common", weight: 5 },
  ],

  // Productivity and focus
  productivity: [
    { label: "Productivity Level", type: "system", weight: 8 },
    { label: "Work Efficiency", type: "common", weight: 6 },
    { label: "Focus Level", type: "common", weight: 5 },
    { label: "Work Output", type: "common", weight: 4 },
  ],

  focus: [
    { label: "Focus Level", type: "system", weight: 8 },
    { label: "Concentration", type: "common", weight: 6 },
    { label: "Mental Focus", type: "common", weight: 5 },
    { label: "Attention Span", type: "user", weight: 3 },
  ],

  // Social and relationships
  social_interactions: [
    { label: "Social Interactions", type: "system", weight: 8 },
    { label: "Social Time", type: "common", weight: 6 },
    { label: "Social Contact", type: "common", weight: 5 },
    { label: "People Time", type: "user", weight: 3 },
  ],

  // Environment
  temperature: [
    { label: "Temperature", type: "system", weight: 8 },
    { label: "Weather Temperature", type: "common", weight: 6 },
    { label: "Ambient Temperature", type: "common", weight: 5 },
    { label: "Room Temperature", type: "common", weight: 4 },
  ],

  humidity: [
    { label: "Humidity", type: "system", weight: 8 },
    { label: "Air Humidity", type: "common", weight: 6 },
    { label: "Moisture Level", type: "common", weight: 5 },
  ],
};

async function setupVariableSynonyms() {
  console.log("🚀 Starting variable synonyms setup...");

  try {
    // First, check if the synonyms table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from("variable_synonyms")
      .select("id")
      .limit(1);

    if (tableError) {
      console.error(
        "❌ Variable synonyms table not found. Please run the database migration first."
      );
      console.error("Error:", tableError.message);
      return;
    }

    console.log("✅ Variable synonyms table found");

    let totalSynonymsAdded = 0;
    let totalVariablesProcessed = 0;

    // Process each variable
    for (const [slug, synonyms] of Object.entries(variableSynonyms)) {
      console.log(`\n📝 Processing variable: ${slug}`);

      // Get the variable by slug
      const { data: variable, error: variableError } = await supabase
        .from("variables")
        .select("id, label, primary_label")
        .eq("slug", slug)
        .single();

      if (variableError || !variable) {
        console.log(`⚠️  Variable not found: ${slug}`);
        continue;
      }

      console.log(`   Found variable: ${variable.label} (ID: ${variable.id})`);

      // Add synonyms for this variable
      for (const synonym of synonyms) {
        try {
          const { error: insertError } = await supabase
            .from("variable_synonyms")
            .insert({
              variable_id: variable.id,
              synonym_label: synonym.label,
              synonym_type: synonym.type,
              search_weight: synonym.weight,
              language: "en",
              is_primary: false,
            });

          if (insertError) {
            if (insertError.code === "23505") {
              // Unique constraint violation
              console.log(`   ⚠️  Synonym already exists: ${synonym.label}`);
            } else {
              console.error(
                `   ❌ Error adding synonym "${synonym.label}":`,
                insertError.message
              );
            }
          } else {
            console.log(
              `   ✅ Added synonym: ${synonym.label} (${synonym.type}, weight: ${synonym.weight})`
            );
            totalSynonymsAdded++;
          }
        } catch (error) {
          console.error(
            `   ❌ Error adding synonym "${synonym.label}":`,
            error.message
          );
        }
      }

      totalVariablesProcessed++;
    }

    console.log(`\n🎉 Setup completed!`);
    console.log(`   Variables processed: ${totalVariablesProcessed}`);
    console.log(`   Synonyms added: ${totalSynonymsAdded}`);

    // Show some example searches
    console.log(`\n🔍 Example searches you can now try:`);
    console.log(`   - Search for "Body Weight" → will find "weight" variable`);
    console.log(
      `   - Search for "Sleep Time" → will find "sleep_duration" variable`
    );
    console.log(`   - Search for "Happiness" → will find "mood" variable`);
    console.log(
      `   - Search for "Workout Time" → will find "exercise_duration" variable`
    );
  } catch (error) {
    console.error("❌ Setup failed:", error);
  }
}

// Run the setup
setupVariableSynonyms()
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
