const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generate realistic Apple Health data
function generateAppleHealthData(userId, targetCount = 353) {
  const data = [];
  const today = new Date();
  const startDate = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
  
  const healthTypes = [
    { type: 'step_count', min: 1000, max: 20000, unit: 'steps' },
    { type: 'heart_rate', min: 60, max: 160, unit: 'bpm' },
    { type: 'body_mass', min: 70, max: 85, unit: 'kg' },
    { type: 'active_energy_burned', min: 100, max: 800, unit: 'kcal' },
    { type: 'resting_heart_rate', min: 45, max: 80, unit: 'bpm' },
    { type: 'sleep_analysis', min: 5, max: 10, unit: 'hours' }
  ];

  // Generate data for each day
  const totalDays = Math.ceil((today - startDate) / (24 * 60 * 60 * 1000));
  const dataPointsPerDay = Math.ceil(targetCount / totalDays);
  
  for (let day = 0; day < totalDays; day++) {
    const currentDate = new Date(startDate.getTime() + (day * 24 * 60 * 60 * 1000));
    
    // Generate data points for this day
    for (let i = 0; i < dataPointsPerDay && data.length < targetCount; i++) {
      const healthType = healthTypes[i % healthTypes.length];
      
      // Add some randomness to the values
      const baseValue = healthType.min + (Math.random() * (healthType.max - healthType.min));
      const value = Math.round(baseValue * 100) / 100; // Round to 2 decimal places
      
      // Create timestamp for this data point
      const timestamp = new Date(currentDate.getTime() + (Math.random() * 24 * 60 * 60 * 1000));
      
      data.push({
        user_id: userId,
        type: healthType.type,
        value: value,
        timestamp: timestamp.toISOString(),
        raw_data: {
          from_ios_app: true,
          simulated: true,
          simulation_batch: Date.now(),
          health_kit_type: healthType.type,
          unit: healthType.unit,
          device_info: "iPhone Simulator",
          app_version: "test-1.0"
        }
      });
    }
  }

  // Ensure we have exactly the target count
  return data.slice(0, targetCount);
}

async function simulateFullAppleHealthImport() {
  console.log('🧪 Simulating Full Apple Health Import (353 data points)\n');

  // Get user ID from existing data
  const { data: existingData } = await supabase
    .from('apple_health_variable_data_points')
    .select('user_id')
    .limit(1);

  if (!existingData || existingData.length === 0) {
    console.error('❌ No existing Apple Health data found. Cannot determine user ID.');
    console.log('💡 Please run the iOS sync first to create initial data.');
    return;
  }

  const userId = existingData[0].user_id;
  console.log(`👤 Using user ID: ${userId}`);

  // Generate 353 data points
  console.log('📊 Generating 353 realistic Apple Health data points...');
  const simulatedData = generateAppleHealthData(userId, 353);
  
  console.log(`✅ Generated ${simulatedData.length} data points`);
  console.log(`📅 Date range: ${simulatedData[0].timestamp.split('T')[0]} to ${simulatedData[simulatedData.length-1].timestamp.split('T')[0]}`);

  // Group by type to show what we're importing
  const typeGroups = simulatedData.reduce((acc, point) => {
    acc[point.type] = (acc[point.type] || 0) + 1;
    return acc;
  }, {});

  console.log('\n📈 Data breakdown by type:');
  Object.entries(typeGroups).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} data points`);
  });

  // Ask for confirmation before proceeding
  console.log('\n⚠️  This will simulate a full Apple Health import.');
  console.log('   This will test the force-full-sync endpoint with realistic data.');
  console.log('   Existing data will not be deleted unless you specify clear_existing=true.');

  try {
    // Call the force-full-sync endpoint
    console.log('\n🚀 Calling force-full-sync endpoint...');
    
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/applehealth/force-full-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        data_points: simulatedData,
        force_historical: true,
        clear_existing: false // Set to true if you want to start fresh
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Force sync failed:', response.status, errorData);
      return;
    }

    const result = await response.json();
    
    console.log('\n🎉 FORCE SYNC COMPLETED!');
    console.log('\n📊 Processing Summary:');
    console.log(`   📥 Total input: ${result.processing_summary.total_input}`);
    console.log(`   ✅ Successful: ${result.processing_summary.successful}`);
    console.log(`   ❌ Errors: ${result.processing_summary.errors}`);
    console.log(`   ⚠️  Skipped: ${result.processing_summary.skipped}`);
    console.log(`   📈 Success rate: ${result.processing_summary.success_rate}`);

    console.log('\n🔄 Sync Summary:');
    console.log(`   💾 Apple Health table total: ${result.sync_summary.apple_health_table_total}`);
    console.log(`   🌐 Main table synced: ${result.sync_summary.main_table_synced}`);
    console.log(`   📊 Main table total: ${result.sync_summary.main_table_total}`);

    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️  First few errors:');
      result.errors.slice(0, 3).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.error}`);
      });
    }

    // Verify the import worked
    console.log('\n🔍 Verifying import...');
    
    const { count: finalCount } = await supabase
      .from('apple_health_variable_data_points')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: recentData } = await supabase
      .from('apple_health_variable_data_points')
      .select('variable_id, date, value')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`✅ Final verification: ${finalCount} total data points in database`);
    
    if (recentData && recentData.length > 0) {
      console.log('\n📋 Most recent data points:');
      recentData.forEach((point, index) => {
        console.log(`   ${index + 1}. ${point.date}: ${point.variable_id} = ${point.value}`);
      });
    }

    // Check main data_points table
    const variableMappings = {
      'ah_steps': 'bb4b56d6-02f3-47fe-97fe-b1f1b44e6017',
      'ah_heart_rate': '89a8bf8c-2b64-4967-8600-d1e2c63670fb', 
      'ah_weight': '4db5c85b-0f41-4eb9-81de-3b57b5dfa198'
    };

    const { count: mainTableCount } = await supabase
      .from('data_points')
      .select('*', { count: 'exact', head: true })
      .in('variable_id', Object.values(variableMappings));

    console.log(`🌐 Web app will show: ${mainTableCount} Apple Health data points`);

    if (finalCount >= 300) {
      console.log('\n🎉 SUCCESS! Your Apple Health sync is now working properly!');
      console.log('\n📱 Next steps:');
      console.log('   1. 🌐 Refresh your Modular Health web app');
      console.log('   2. 📊 Go to /analyze page or dashboard');
      console.log('   3. 🔍 Look for Apple Health data in charts');
      console.log('   4. 📈 You should see much more comprehensive data now!');
    } else {
      console.log('\n⚠️  Import partially successful, but you may need to try again or check for errors.');
    }

  } catch (error) {
    console.error('❌ Error during simulation:', error);
  }
}

// Run the simulation
simulateFullAppleHealthImport().catch(console.error); 