const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAppleHealthData() {
  console.log('🔍 Checking Apple Health data state...\n');

  // Check apple_health_variable_data_points table
  const { data: appleHealthData, error: fetchError } = await supabase
    .from('apple_health_variable_data_points')
    .select('*')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching Apple Health data:', fetchError);
    return;
  }

  console.log(`📊 Found ${appleHealthData.length} Apple Health data points total`);

  // Group by variable_id to see what types of data we have
  const variableGroups = appleHealthData.reduce((acc, point) => {
    acc[point.variable_id] = (acc[point.variable_id] || 0) + 1;
    return acc;
  }, {});

  console.log('\n📈 Data breakdown by variable:');
  Object.entries(variableGroups).forEach(([variable, count]) => {
    console.log(`   ${variable}: ${count} data points`);
  });

  // Check what variables exist in the main variables table for Apple Health
  const { data: variables } = await supabase
    .from('variables')
    .select('id, slug, label, source')
    .ilike('source', '%apple%');

  console.log('\n🔗 Available Apple Health variables in main system:');
  const variableMap = {};
  variables?.forEach(variable => {
    console.log(`   ${variable.slug} (${variable.id}): ${variable.label}`);
    variableMap[variable.slug] = variable.id;
  });

  // Check how much data is already in main data_points table
  const { count: mainTableCount } = await supabase
    .from('data_points')
    .select('*', { count: 'exact', head: true })
    .in('variable_id', Object.values(variableMap));

  console.log(`\n📊 Data points in main table: ${mainTableCount || 0}`);

  // Current mappings from the receive.ts file
  const currentMappings = {
    'ah_steps': 'bb4b56d6-02f3-47fe-97fe-b1f1b44e6017',
    'ah_heart_rate': '89a8bf8c-2b64-4967-8600-d1e2c63670fb', 
    'ah_weight': '4db5c85b-0f41-4eb9-81de-3b57b5dfa198'
  };

  console.log('\n🔄 Current sync mappings:');
  Object.entries(currentMappings).forEach(([ahVar, uuid]) => {
    const count = variableGroups[ahVar] || 0;
    console.log(`   ${ahVar} → ${uuid}: ${count} data points available`);
  });

  return {
    totalAppleHealthPoints: appleHealthData.length,
    variableGroups,
    variableMap,
    mainTableCount: mainTableCount || 0,
    unmappedVariables: Object.keys(variableGroups).filter(v => !currentMappings[v])
  };
}

async function syncAllAppleHealthData() {
  console.log('\n🔄 Starting comprehensive Apple Health sync...\n');

  const result = await checkAppleHealthData();
  
  if (!result) return;

  // Extended variable mappings - we need to create more mappings
  const extendedMappings = {
    'ah_steps': 'bb4b56d6-02f3-47fe-97fe-b1f1b44e6017',
    'ah_heart_rate': '89a8bf8c-2b64-4967-8600-d1e2c63670fb', 
    'ah_weight': '4db5c85b-0f41-4eb9-81de-3b57b5dfa198'
    // We'll add more as we find them in variables table
  };

  // Add any existing Apple Health variables from the main table
  Object.entries(result.variableMap).forEach(([slug, id]) => {
    if (slug.startsWith('ah_')) {
      extendedMappings[slug] = id;
    }
  });

  console.log('🔗 Using extended mappings:');
  Object.entries(extendedMappings).forEach(([ahVar, uuid]) => {
    console.log(`   ${ahVar} → ${uuid}`);
  });

  // Get all Apple Health data
  const { data: appleHealthData } = await supabase
    .from('apple_health_variable_data_points')
    .select('*')
    .order('created_at', { ascending: false });

  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  console.log(`\n📊 Processing ${appleHealthData.length} Apple Health data points...\n`);

  for (const dataPoint of appleHealthData) {
    const mainVariableId = extendedMappings[dataPoint.variable_id];
    
    if (!mainVariableId) {
      skippedCount++;
      if (skippedCount <= 5) { // Only log first few unmapped variables
        console.log(`⚠️  No mapping for variable: ${dataPoint.variable_id}`);
      }
      continue;
    }

    try {
      // Check if this data point already exists
      const { data: existing } = await supabase
        .from('data_points')
        .select('id')
        .eq('user_id', dataPoint.user_id)
        .eq('variable_id', mainVariableId)
        .eq('date', dataPoint.date)
        .single();

      if (existing) {
        skippedCount++; // Already exists
        continue;
      }

      // Insert new data point
      const { error: insertError } = await supabase
        .from('data_points')
        .insert({
          user_id: dataPoint.user_id,
          variable_id: mainVariableId,
          date: dataPoint.date,
          value: parseFloat(dataPoint.value),
          created_at: dataPoint.created_at
        });

      if (!insertError) {
        syncedCount++;
        if (syncedCount % 25 === 0) {
          console.log(`✅ Synced ${syncedCount} data points...`);
        }
      } else {
        errorCount++;
        if (errorCount <= 3) { // Only log first few errors
          console.error(`❌ Error syncing data point:`, insertError.message);
        }
      }
    } catch (err) {
      errorCount++;
    }
  }

  console.log(`\n🎉 SYNC COMPLETED!`);
  console.log(`   ✅ Successfully synced: ${syncedCount} data points`);
  console.log(`   ⚠️  Skipped: ${skippedCount} data points`);
  console.log(`   ❌ Errors: ${errorCount} data points`);
  
  // Check final count
  const { count } = await supabase
    .from('data_points')
    .select('*', { count: 'exact', head: true })
    .in('variable_id', Object.values(extendedMappings));

  console.log(`\n📊 Total Apple Health data points now in main table: ${count || 0}`);

  if (syncedCount > 0) {
    console.log('\n🎉 SUCCESS! More Apple Health data is now connected to your web app!');
    console.log('\n📱 Next steps:');
    console.log('   1. 🌐 Refresh your Modular Health web app');
    console.log('   2. 📊 Go to /analyze page');
    console.log('   3. 🔍 Look for Apple Health variables in your data');
    console.log('   4. 📈 Your iOS sync data should now appear in charts and graphs!');
  }

  // Show unmapped variables that need attention
  if (result.unmappedVariables.length > 0) {
    console.log('\n⚠️  Variables that need mapping in the main system:');
    result.unmappedVariables.forEach(variable => {
      const count = result.variableGroups[variable];
      console.log(`   ${variable}: ${count} data points (not synced)`);
    });
    console.log('\n💡 To sync these, they need to be added to the variables table and mapping updated.');
  }
}

// Run the sync
syncAllAppleHealthData().catch(console.error); 