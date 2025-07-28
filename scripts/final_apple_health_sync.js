const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function finalAppleHealthSync() {
  console.log('🔄 Final Apple Health sync - fixing the source array issue...');

  // Variable mappings (these were already created)
  const variableMappings = {
    'ah_steps': 'bb4b56d6-02f3-47fe-97fe-b1f1b44e6017',
    'ah_heart_rate': '89a8bf8c-2b64-4967-8600-d1e2c63670fb', 
    'ah_weight': '4db5c85b-0f41-4eb9-81de-3b57b5dfa198'
  };

  // Get all Apple Health data
  const { data: appleHealthData, error: fetchError } = await supabase
    .from('apple_health_variable_data_points')
    .select('*')
    .order('created_at', { ascending: false });

  if (fetchError || !appleHealthData) {
    console.error('❌ Error fetching Apple Health data:', fetchError);
    return;
  }

  console.log(`📊 Found ${appleHealthData.length} Apple Health data points to sync`);

  let syncedCount = 0;
  let skippedCount = 0;

  for (const dataPoint of appleHealthData) {
    const mainVariableId = variableMappings[dataPoint.variable_id];
    
    if (!mainVariableId) {
      skippedCount++;
      continue;
    }

    try {
      // Prepare data with correct format (no source array issue)
      const syncData = {
        user_id: dataPoint.user_id,
        variable_id: mainVariableId,
        date: dataPoint.date,
        value: parseFloat(dataPoint.value),
        created_at: dataPoint.created_at
      };

      // Use upsert to handle duplicates
      const { error: upsertError } = await supabase
        .from('data_points')
        .upsert(syncData, {
          onConflict: 'user_id,variable_id,date',
          ignoreDuplicates: false
        });

      if (!upsertError) {
        syncedCount++;
        if (syncedCount % 10 === 0) {
          console.log(`✅ Synced ${syncedCount} data points...`);
        }
      } else {
        console.log(`⚠️  Error syncing ${dataPoint.variable_id}:`, upsertError.message);
        skippedCount++;
      }
    } catch (err) {
      skippedCount++;
    }
  }

  console.log(`\n🎉 SYNC COMPLETED!`);
  console.log(`   ✅ Successfully synced: ${syncedCount} data points`);
  console.log(`   ⚠️  Skipped: ${skippedCount} data points`);
  
  // Check final count
  const { count } = await supabase
    .from('data_points')
    .select('*', { count: 'exact', head: true })
    .in('variable_id', Object.values(variableMappings));

  console.log(`\n📊 Total Apple Health data points now in main table: ${count || 0}`);

  if (syncedCount > 0) {
    console.log('\n🎉 SUCCESS! Apple Health data is now connected to your web app!');
    console.log('\n📱 What to do next:');
    console.log('   1. 🌐 Refresh your Modular Health web app');
    console.log('   2. 📊 Go to the /analyze page');
    console.log('   3. 🔍 You should now see Apple Health data in your charts!');
    console.log('   4. 📈 Future iOS syncs will automatically appear in the web app');
    
    // Show breakdown by variable
    console.log('\n📈 Data breakdown:');
    for (const [ahVar, uuid] of Object.entries(variableMappings)) {
      const { count: varCount } = await supabase
        .from('data_points')
        .select('*', { count: 'exact', head: true })
        .eq('variable_id', uuid);
      
      console.log(`   ${ahVar}: ${varCount || 0} data points`);
    }
  }
}

finalAppleHealthSync().catch(console.error); 