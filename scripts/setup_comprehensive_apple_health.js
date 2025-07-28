const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupComprehensiveAppleHealth() {
  console.log('🔄 Setting up comprehensive Apple Health variables...');

  // Define all Apple Health variables
  const appleHealthVariables = [
    // Activity & Fitness Variables
    { id: 'ah_steps', name: 'Steps (Apple Health)', data_type: 'numeric', category: 'activity' },
    { id: 'ah_distance_walking_running', name: 'Walking + Running Distance (Apple Health)', data_type: 'numeric', category: 'activity' },
    { id: 'ah_distance_cycling', name: 'Cycling Distance (Apple Health)', data_type: 'numeric', category: 'activity' },
    { id: 'ah_active_calories', name: 'Active Calories Burned (Apple Health)', data_type: 'numeric', category: 'activity' },
    { id: 'ah_basal_calories', name: 'Basal Calories Burned (Apple Health)', data_type: 'numeric', category: 'activity' },
    { id: 'ah_flights_climbed', name: 'Flights Climbed (Apple Health)', data_type: 'numeric', category: 'activity' },
    { id: 'ah_exercise_time', name: 'Exercise Time (Apple Health)', data_type: 'numeric', category: 'activity' },
    { id: 'ah_stand_time', name: 'Stand Time (Apple Health)', data_type: 'numeric', category: 'activity' },

    // Heart & Circulatory Variables
    { id: 'ah_heart_rate', name: 'Heart Rate (Apple Health)', data_type: 'numeric', category: 'vitals' },
    { id: 'ah_resting_heart_rate', name: 'Resting Heart Rate (Apple Health)', data_type: 'numeric', category: 'vitals' },
    { id: 'ah_heart_rate_variability', name: 'Heart Rate Variability (Apple Health)', data_type: 'numeric', category: 'vitals' },
    { id: 'ah_blood_pressure_systolic', name: 'Blood Pressure Systolic (Apple Health)', data_type: 'numeric', category: 'vitals' },
    { id: 'ah_blood_pressure_diastolic', name: 'Blood Pressure Diastolic (Apple Health)', data_type: 'numeric', category: 'vitals' },
    { id: 'ah_vo2_max', name: 'VO2 Max (Apple Health)', data_type: 'numeric', category: 'vitals' },

    // Body Measurements Variables
    { id: 'ah_weight', name: 'Weight (Apple Health)', data_type: 'numeric', category: 'body' },
    { id: 'ah_bmi', name: 'Body Mass Index (Apple Health)', data_type: 'numeric', category: 'body' },
    { id: 'ah_body_fat_percentage', name: 'Body Fat Percentage (Apple Health)', data_type: 'numeric', category: 'body' },
    { id: 'ah_lean_body_mass', name: 'Lean Body Mass (Apple Health)', data_type: 'numeric', category: 'body' },
    { id: 'ah_height', name: 'Height (Apple Health)', data_type: 'numeric', category: 'body' },
    { id: 'ah_waist_circumference', name: 'Waist Circumference (Apple Health)', data_type: 'numeric', category: 'body' },

    // Nutrition Variables
    { id: 'ah_dietary_calories', name: 'Dietary Calories (Apple Health)', data_type: 'numeric', category: 'nutrition' },
    { id: 'ah_water_intake', name: 'Water Intake (Apple Health)', data_type: 'numeric', category: 'nutrition' },
    { id: 'ah_protein', name: 'Protein (Apple Health)', data_type: 'numeric', category: 'nutrition' },
    { id: 'ah_carbohydrates', name: 'Carbohydrates (Apple Health)', data_type: 'numeric', category: 'nutrition' },
    { id: 'ah_total_fat', name: 'Total Fat (Apple Health)', data_type: 'numeric', category: 'nutrition' },
    { id: 'ah_sugar', name: 'Sugar (Apple Health)', data_type: 'numeric', category: 'nutrition' },
    { id: 'ah_fiber', name: 'Fiber (Apple Health)', data_type: 'numeric', category: 'nutrition' },
    { id: 'ah_sodium', name: 'Sodium (Apple Health)', data_type: 'numeric', category: 'nutrition' },
    { id: 'ah_caffeine', name: 'Caffeine (Apple Health)', data_type: 'numeric', category: 'nutrition' },

    // Sleep & Mindfulness Variables
    { id: 'ah_sleep_duration', name: 'Sleep Duration (Apple Health)', data_type: 'numeric', category: 'sleep' },
    { id: 'ah_mindfulness', name: 'Mindfulness Sessions (Apple Health)', data_type: 'numeric', category: 'mental_health' },

    // Health Vitals Variables
    { id: 'ah_respiratory_rate', name: 'Respiratory Rate (Apple Health)', data_type: 'numeric', category: 'vitals' },
    { id: 'ah_oxygen_saturation', name: 'Oxygen Saturation (Apple Health)', data_type: 'numeric', category: 'vitals' },
    { id: 'ah_body_temperature', name: 'Body Temperature (Apple Health)', data_type: 'numeric', category: 'vitals' },
    { id: 'ah_blood_glucose', name: 'Blood Glucose (Apple Health)', data_type: 'numeric', category: 'vitals' }
  ];

  // Insert variables
  console.log('📝 Adding Apple Health variables...');
  for (const variable of appleHealthVariables) {
    const { data, error } = await supabase
      .from('variables')
      .upsert({
        ...variable,
        created_at: new Date().toISOString()
      }, { onConflict: 'id', ignoreDuplicates: false })
      .select();

    if (error) {
      console.log(`⚠️  Variable ${variable.id}: ${error.message}`);
    } else {
      console.log(`✅ Added/Updated variable: ${variable.id}`);
    }
  }

  // Define variable units
  const variableUnits = [
    // Activity & Fitness Units
    { variable_id: 'ah_steps', unit_id: 'steps', is_default: true },
    { variable_id: 'ah_distance_walking_running', unit_id: 'meters', is_default: true },
    { variable_id: 'ah_distance_cycling', unit_id: 'meters', is_default: true },
    { variable_id: 'ah_active_calories', unit_id: 'kcal', is_default: true },
    { variable_id: 'ah_basal_calories', unit_id: 'kcal', is_default: true },
    { variable_id: 'ah_flights_climbed', unit_id: 'flights', is_default: true },
    { variable_id: 'ah_exercise_time', unit_id: 'minutes', is_default: true },
    { variable_id: 'ah_stand_time', unit_id: 'minutes', is_default: true },

    // Heart & Circulatory Units
    { variable_id: 'ah_heart_rate', unit_id: 'bpm', is_default: true },
    { variable_id: 'ah_resting_heart_rate', unit_id: 'bpm', is_default: true },
    { variable_id: 'ah_heart_rate_variability', unit_id: 'ms', is_default: true },
    { variable_id: 'ah_blood_pressure_systolic', unit_id: 'mmHg', is_default: true },
    { variable_id: 'ah_blood_pressure_diastolic', unit_id: 'mmHg', is_default: true },
    { variable_id: 'ah_vo2_max', unit_id: 'ml/kg/min', is_default: true },

    // Body Measurements Units
    { variable_id: 'ah_weight', unit_id: 'kg', is_default: true },
    { variable_id: 'ah_bmi', unit_id: 'kg/m²', is_default: true },
    { variable_id: 'ah_body_fat_percentage', unit_id: '%', is_default: true },
    { variable_id: 'ah_lean_body_mass', unit_id: 'kg', is_default: true },
    { variable_id: 'ah_height', unit_id: 'meters', is_default: true },
    { variable_id: 'ah_waist_circumference', unit_id: 'meters', is_default: true },

    // Nutrition Units
    { variable_id: 'ah_dietary_calories', unit_id: 'kcal', is_default: true },
    { variable_id: 'ah_water_intake', unit_id: 'liters', is_default: true },
    { variable_id: 'ah_protein', unit_id: 'grams', is_default: true },
    { variable_id: 'ah_carbohydrates', unit_id: 'grams', is_default: true },
    { variable_id: 'ah_total_fat', unit_id: 'grams', is_default: true },
    { variable_id: 'ah_sugar', unit_id: 'grams', is_default: true },
    { variable_id: 'ah_fiber', unit_id: 'grams', is_default: true },
    { variable_id: 'ah_sodium', unit_id: 'grams', is_default: true },
    { variable_id: 'ah_caffeine', unit_id: 'grams', is_default: true },

    // Sleep & Mindfulness Units
    { variable_id: 'ah_sleep_duration', unit_id: 'hours', is_default: true },
    { variable_id: 'ah_mindfulness', unit_id: 'minutes', is_default: true },

    // Health Vitals Units
    { variable_id: 'ah_respiratory_rate', unit_id: 'breaths/min', is_default: true },
    { variable_id: 'ah_oxygen_saturation', unit_id: '%', is_default: true },
    { variable_id: 'ah_body_temperature', unit_id: '°C', is_default: true },
    { variable_id: 'ah_blood_glucose', unit_id: 'mg/dL', is_default: true }
  ];

  // Add variable units
  console.log('🔗 Adding variable units...');
  for (const varUnit of variableUnits) {
    const { error } = await supabase
      .from('variable_units')
      .upsert(varUnit, { onConflict: 'variable_id,unit_id', ignoreDuplicates: true });

    if (error) {
      console.log(`⚠️  Unit ${varUnit.variable_id} -> ${varUnit.unit_id}: ${error.message}`);
    } else {
      console.log(`✅ Added unit: ${varUnit.variable_id} -> ${varUnit.unit_id}`);
    }
  }

  // Check variable counts
  const { data: variableCount, error: countError } = await supabase
    .from('variables')
    .select('id')
    .like('id', 'ah_%');

  if (countError) {
    console.error('❌ Error counting variables:', countError);
  } else {
    console.log(`\n🎉 Setup complete! ${variableCount.length} Apple Health variables are now available.`);
    console.log('\n📊 Variable Categories:');
    console.log('   🏃‍♂️ Activity & Fitness: 8 variables');
    console.log('   ❤️  Heart & Circulatory: 6 variables');
    console.log('   ⚖️  Body Measurements: 6 variables');
    console.log('   🥗 Nutrition: 9 variables');
    console.log('   😴 Sleep & Mindfulness: 2 variables');
    console.log('   🌡️  Health Vitals: 4 variables');
    console.log('\n🚀 Your iOS app can now sync ALL these data types!');
  }
}

setupComprehensiveAppleHealth().catch(console.error); 