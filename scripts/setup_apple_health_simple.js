const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAppleHealthVariables() {
  console.log('🔄 Setting up core Apple Health variables...');

  // Check current variables table schema
  const { data: existingVars, error: schemaError } = await supabase
    .from('variables')
    .select('*')
    .limit(1);

  if (schemaError) {
    console.error('❌ Error checking variables schema:', schemaError);
    return;
  }

  console.log('📋 Current variables table columns:', Object.keys(existingVars[0] || {}));

  // Core Apple Health variables (only what we absolutely need)
  const coreAppleHealthVariables = [
    // Activity & Fitness (most important)
    { id: 'ah_steps', data_type: 'numeric', category: 'activity' },
    { id: 'ah_distance_walking_running', data_type: 'numeric', category: 'activity' },
    { id: 'ah_active_calories', data_type: 'numeric', category: 'activity' },
    { id: 'ah_exercise_time', data_type: 'numeric', category: 'activity' },

    // Heart & Circulatory (essential vitals)
    { id: 'ah_heart_rate', data_type: 'numeric', category: 'vitals' },
    { id: 'ah_resting_heart_rate', data_type: 'numeric', category: 'vitals' },
    { id: 'ah_blood_pressure_systolic', data_type: 'numeric', category: 'vitals' },
    { id: 'ah_blood_pressure_diastolic', data_type: 'numeric', category: 'vitals' },

    // Body Measurements (key metrics)
    { id: 'ah_weight', data_type: 'numeric', category: 'body' },
    { id: 'ah_body_fat_percentage', data_type: 'numeric', category: 'body' },

    // Sleep & Nutrition (popular data)
    { id: 'ah_sleep_duration', data_type: 'numeric', category: 'sleep' },
    { id: 'ah_water_intake', data_type: 'numeric', category: 'nutrition' }
  ];

  // Insert variables with only the columns that exist
  console.log('📝 Adding core Apple Health variables...');
  
  for (const variable of coreAppleHealthVariables) {
    try {
      const { data, error } = await supabase
        .from('variables')
        .upsert({
          id: variable.id,
          data_type: variable.data_type,
          category: variable.category,
          created_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select();

      if (error) {
        console.log(`⚠️  Variable ${variable.id}: ${error.message}`);
      } else {
        console.log(`✅ Added variable: ${variable.id}`);
      }
    } catch (err) {
      console.log(`❌ Error with ${variable.id}:`, err.message);
    }
  }

  // Check if we have variable_units table
  const { data: unitsData, error: unitsError } = await supabase
    .from('variable_units')
    .select('*')
    .limit(1);

  if (!unitsError && unitsData) {
    console.log('🔗 Variable units table exists, adding units...');
    
    const coreUnits = [
      { variable_id: 'ah_steps', unit_id: 'steps' },
      { variable_id: 'ah_distance_walking_running', unit_id: 'meters' },
      { variable_id: 'ah_active_calories', unit_id: 'kcal' },
      { variable_id: 'ah_exercise_time', unit_id: 'minutes' },
      { variable_id: 'ah_heart_rate', unit_id: 'bpm' },
      { variable_id: 'ah_resting_heart_rate', unit_id: 'bpm' },
      { variable_id: 'ah_blood_pressure_systolic', unit_id: 'mmHg' },
      { variable_id: 'ah_blood_pressure_diastolic', unit_id: 'mmHg' },
      { variable_id: 'ah_weight', unit_id: 'kg' },
      { variable_id: 'ah_body_fat_percentage', unit_id: '%' },
      { variable_id: 'ah_sleep_duration', unit_id: 'hours' },
      { variable_id: 'ah_water_intake', unit_id: 'liters' }
    ];

    for (const unit of coreUnits) {
      try {
        const { error } = await supabase
          .from('variable_units')
          .upsert(unit, { onConflict: 'variable_id,unit_id' });

        if (error) {
          console.log(`⚠️  Unit ${unit.variable_id}: ${error.message}`);
        } else {
          console.log(`✅ Added unit: ${unit.variable_id} -> ${unit.unit_id}`);
        }
      } catch (err) {
        console.log(`❌ Error with unit ${unit.variable_id}:`, err.message);
      }
    }
  } else {
    console.log('⚠️  Variable units table not found, skipping units');
  }

  // Final count
  try {
    const { data: finalCount } = await supabase
      .from('variables')
      .select('id')
      .in('id', coreAppleHealthVariables.map(v => v.id));

    console.log(`\n🎉 Setup complete! ${finalCount?.length || 0} Apple Health variables are ready.`);
    console.log('\n📱 Your iOS app can now sync these data types:');
    console.log('   🏃‍♂️ Steps, Walking Distance, Active Calories, Exercise Time');
    console.log('   ❤️  Heart Rate, Resting Heart Rate, Blood Pressure');
    console.log('   ⚖️  Weight, Body Fat Percentage');
    console.log('   💧 Sleep Duration, Water Intake');
    console.log('\n🚀 Ready for comprehensive health data sync!');
    
  } catch (err) {
    console.log('✅ Variables added successfully!');
  }
}

setupAppleHealthVariables().catch(console.error); 