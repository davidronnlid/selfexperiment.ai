const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAppleHealthSync() {
  console.log('🔄 Fixing Apple Health sync to main data_points table...');

  // Check what data_type values are allowed
  const { data: sampleVar } = await supabase
    .from('variables')
    .select('data_type')
    .limit(5);

  console.log('📋 Sample data_type values from existing variables:', 
    sampleVar?.map(v => v.data_type).filter((v, i, arr) => arr.indexOf(v) === i)
  );

  // Find or create Apple Health variables using existing patterns
  const appleHealthVariables = [
    { slug: 'apple_health_steps', label: 'Steps (Apple Health)', ah_variable: 'ah_steps' },
    { slug: 'apple_health_heart_rate', label: 'Heart Rate (Apple Health)', ah_variable: 'ah_heart_rate' },
    { slug: 'apple_health_weight', label: 'Weight (Apple Health)', ah_variable: 'ah_weight' },
    { slug: 'apple_health_active_calories', label: 'Active Calories (Apple Health)', ah_variable: 'ah_active_calories' },
    { slug: 'apple_health_distance', label: 'Walking Distance (Apple Health)', ah_variable: 'ah_distance_walking_running' }
  ];

  console.log('\n📝 Creating/finding Apple Health variables...');
  
  const variableMap = new Map(); // Maps ah_variable_id -> UUID

  for (const variable of appleHealthVariables) {
    try {
      // Try to find existing variable by slug
      let { data: existingVar } = await supabase
        .from('variables')
        .select('id, slug')
        .eq('slug', variable.slug)
        .single();

      if (!existingVar) {
        // Try to find by label
        const { data: existingByLabel } = await supabase
          .from('variables')
          .select('id, slug, label')
          .ilike('label', `%${variable.label}%`)
          .single();

        existingVar = existingByLabel;
      }

      if (existingVar) {
        console.log(`✅ Found existing variable: ${variable.ah_variable} -> ${existingVar.id}`);
        variableMap.set(variable.ah_variable, existingVar.id);
      } else {
        // Create new variable with minimal required fields
        const { data: newVar, error: createError } = await supabase
          .from('variables')
          .insert({
            slug: variable.slug,
            label: variable.label,
            category: 'Physical Health',
            is_active: true,
            is_public: false
          })
          .select('id, slug')
          .single();

        if (createError) {
          console.log(`⚠️  Error creating variable ${variable.slug}:`, createError.message);
        } else {
          console.log(`✅ Created new variable: ${variable.ah_variable} -> ${newVar.id}`);
          variableMap.set(variable.ah_variable, newVar.id);
        }
      }
    } catch (err) {
      console.log(`❌ Error processing variable ${variable.slug}:`, err.message);
    }
  }

  // Get Apple Health data
  const { data: appleHealthData, error: fetchError } = await supabase
    .from('apple_health_variable_data_points')
    .select('*')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching Apple Health data:', fetchError);
    return;
  }

  if (!appleHealthData || appleHealthData.length === 0) {
    console.log('ℹ️  No Apple Health data found to sync');
    return;
  }

  console.log(`\n🔄 Syncing ${appleHealthData.length} Apple Health data points...`);

  let syncedCount = 0;
  let skippedCount = 0;

  for (const dataPoint of appleHealthData) {
    const mainVariableId = variableMap.get(dataPoint.variable_id);
    
    if (!mainVariableId) {
      console.log(`⚠️  No mapping found for variable: ${dataPoint.variable_id}`);
      skippedCount++;
      continue;
    }

    try {
      // Check if this data point already exists in main table
      const { data: existingDataPoint } = await supabase
        .from('data_points')
        .select('id')
        .eq('user_id', dataPoint.user_id)
        .eq('variable_id', mainVariableId)
        .eq('date', dataPoint.date)
        .single();

      if (existingDataPoint) {
        // Update existing
        const { error: updateError } = await supabase
          .from('data_points')
          .update({
            value: dataPoint.value,
            source: 'Apple Health',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDataPoint.id);

        if (!updateError) {
          syncedCount++;
        } else {
          skippedCount++;
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('data_points')
          .insert({
            user_id: dataPoint.user_id,
            variable_id: mainVariableId,
            date: dataPoint.date,
            value: dataPoint.value,
            source: 'Apple Health',
            created_at: dataPoint.created_at
          });

        if (!insertError) {
          syncedCount++;
        } else {
          console.log(`⚠️  Insert error for ${dataPoint.variable_id}:`, insertError.message);
          skippedCount++;
        }
      }
    } catch (err) {
      skippedCount++;
    }
  }

  console.log(`\n🎉 Sync completed!`);
  console.log(`   ✅ Synced: ${syncedCount} data points`);
  console.log(`   ⚠️  Skipped: ${skippedCount} data points`);
  
  // Check final counts in main table
  const { count: mainDataCount } = await supabase
    .from('data_points')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'Apple Health');

  console.log(`\n📊 Total Apple Health data points now in main table: ${mainDataCount || 0}`);

  if (syncedCount > 0) {
    console.log('\n🎉 SUCCESS! Apple Health data should now appear in your web app!');
    console.log('   🌐 Refresh your Modular Health web app to see the data');
    console.log('   📱 Your iOS sync is now connected to the web UI');
  }
}

fixAppleHealthSync().catch(console.error); 