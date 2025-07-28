const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function simpleAppleHealthSync() {
  console.log('🔄 Simple Apple Health data sync...');

  // Create simple variables with correct data_type
  const appleHealthVariables = [
    { slug: 'apple_health_steps', label: 'Steps (Apple Health)', ah_variable: 'ah_steps', data_type: 'continuous' },
    { slug: 'apple_health_heart_rate', label: 'Heart Rate (Apple Health)', ah_variable: 'ah_heart_rate', data_type: 'continuous' },
    { slug: 'apple_health_weight', label: 'Weight (Apple Health)', ah_variable: 'ah_weight', data_type: 'continuous' }
  ];

  console.log('\n📝 Creating Apple Health variables...');
  
  const variableMap = new Map();

  for (const variable of appleHealthVariables) {
    try {
      // Try to find existing variable
      let { data: existingVar } = await supabase
        .from('variables')
        .select('id, slug')
        .eq('slug', variable.slug)
        .single();

      if (existingVar) {
        console.log(`✅ Found existing: ${variable.ah_variable} -> ${existingVar.id}`);
        variableMap.set(variable.ah_variable, existingVar.id);
      } else {
        // Create new variable with all required fields
        const { data: newVar, error: createError } = await supabase
          .from('variables')
          .insert({
            slug: variable.slug,
            label: variable.label,
            category: 'Physical Health',
            data_type: variable.data_type,
            is_active: true,
            is_public: false,
            variable_type: 'predefined'
          })
          .select('id, slug')
          .single();

        if (createError) {
          console.log(`⚠️  Error creating ${variable.slug}:`, createError.message);
        } else {
          console.log(`✅ Created: ${variable.ah_variable} -> ${newVar.id}`);
          variableMap.set(variable.ah_variable, newVar.id);
        }
      }
    } catch (err) {
      console.log(`❌ Error with ${variable.slug}:`, err.message);
    }
  }

  // Get Apple Health data
  const { data: appleHealthData, error: fetchError } = await supabase
    .from('apple_health_variable_data_points')
    .select('*')
    .order('created_at', { ascending: false });

  if (fetchError || !appleHealthData) {
    console.error('❌ Error fetching Apple Health data:', fetchError);
    return;
  }

  console.log(`\n🔄 Processing ${appleHealthData.length} Apple Health data points...`);

  let syncedCount = 0;

  // Process in batches for better performance
  const batchSize = 10;
  for (let i = 0; i < appleHealthData.length; i += batchSize) {
    const batch = appleHealthData.slice(i, i + batchSize);
    
    for (const dataPoint of batch) {
      const mainVariableId = variableMap.get(dataPoint.variable_id);
      
      if (!mainVariableId) {
        continue; // Skip unmapped variables
      }

      try {
        // Simple upsert to main data_points table
        const { error: upsertError } = await supabase
          .from('data_points')
          .upsert({
            user_id: dataPoint.user_id,
            variable_id: mainVariableId,
            date: dataPoint.date,
            value: dataPoint.value,
            source: 'Apple Health',
            created_at: dataPoint.created_at,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,variable_id,date',
            ignoreDuplicates: false
          });

        if (!upsertError) {
          syncedCount++;
        }
      } catch (err) {
        // Continue processing other data points
      }
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n🎉 Sync completed!`);
  console.log(`   ✅ Successfully synced: ${syncedCount} data points`);
  
  // Check final result
  const { count } = await supabase
    .from('data_points')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'Apple Health');

  console.log(`\n📊 Total Apple Health data points in main table: ${count || 0}`);

  if (syncedCount > 0) {
    console.log('\n🎉 SUCCESS! Your Apple Health data is now in the main data_points table!');
    console.log('   🌐 Refresh your web app to see the Apple Health data');
    console.log('   📊 The data should now appear in your analyze page and charts');
  }
}

simpleAppleHealthSync().catch(console.error); 