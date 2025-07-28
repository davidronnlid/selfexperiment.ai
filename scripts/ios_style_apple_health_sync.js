const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generate realistic Apple Health data like an iOS app would
function generateiOSStyleAppleHealthData(userId, targetCount = 353) {
  const data = [];
  const today = new Date();
  const startDate = new Date(today.getTime() - (60 * 24 * 60 * 60 * 1000)); // 60 days ago
  
  // iOS app typically sends these types of data
  const healthTypes = [
    { type: 'step_count', min: 1000, max: 20000, unit: 'steps', frequency: 'daily' },
    { type: 'heart_rate', min: 55, max: 160, unit: 'bpm', frequency: 'multiple_daily' },
    { type: 'body_mass', min: 70, max: 85, unit: 'kg', frequency: 'weekly' },
    { type: 'active_energy_burned', min: 100, max: 900, unit: 'kcal', frequency: 'daily' }
  ];

  console.log(`📅 Generating iOS-style data for 60 days`);
  
  const totalDays = 60;
  
  for (let day = 0; day < totalDays; day++) {
    const currentDate = new Date(startDate.getTime() + (day * 24 * 60 * 60 * 1000));
    
    // For each health type, decide if we should have data today
    healthTypes.forEach(healthType => {
      let dataPointsToday = 0;
      
      if (healthType.frequency === 'daily') {
        dataPointsToday = 1;
      } else if (healthType.frequency === 'multiple_daily') {
        dataPointsToday = Math.floor(Math.random() * 5) + 1; // 1-5 readings per day
      } else if (healthType.frequency === 'weekly') {
        dataPointsToday = Math.random() < 0.14 ? 1 : 0; // About once per week
      }
      
      for (let i = 0; i < dataPointsToday && data.length < targetCount; i++) {
        // Generate realistic values
        let value = healthType.min + (Math.random() * (healthType.max - healthType.min));
        
        // Add realistic variations
        if (healthType.type === 'step_count') {
          // Steps vary more on weekends
          const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
          if (isWeekend) value *= (0.7 + Math.random() * 0.6); // Weekend variation
        } else if (healthType.type === 'heart_rate') {
          // Heart rate varies throughout the day
          const hour = Math.random() * 24;
          if (hour < 6 || hour > 22) value *= 0.8; // Lower at night
          if (hour > 12 && hour < 18) value *= 1.1; // Higher in afternoon
        } else if (healthType.type === 'body_mass') {
          // Weight changes slowly over time
          const trend = Math.sin((day / 30) * Math.PI) * 2; // Slow variation
          value += trend;
        }
        
        value = Math.round(value * 100) / 100; // Round to 2 decimal places
        
        // Create realistic timestamp
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);
        const timestamp = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate(),
          hour,
          minute,
          second
        );
        
        data.push({
          user_id: userId,
          type: healthType.type,
          value: value,
          timestamp: timestamp.toISOString(),
          raw_data: {
            from_ios_app: true,
            ios_sync_simulation: true,
            health_kit_type: healthType.type,
            unit: healthType.unit,
            device_info: "iPhone 14 Pro",
            app_version: "ModularHealth-iOS-1.0",
            source: "HealthKit",
            sync_session: Date.now(),
            day_number: day,
            reading_number: i
          }
        });
      }
    });
  }

  return data.slice(0, targetCount);
}

async function iOSStyleAppleHealthSync() {
  console.log('📱 iOS-Style Apple Health Sync (353 data points)\n');

  // Get user ID from existing data
  const { data: existingData } = await supabase
    .from('apple_health_variable_data_points')
    .select('user_id')
    .limit(1);

  if (!existingData || existingData.length === 0) {
    console.error('❌ No existing Apple Health data found. Cannot determine user ID.');
    return;
  }

  const userId = existingData[0].user_id;
  console.log(`👤 Using user ID: ${userId}`);

  // Check current data count
  const { count: currentCount } = await supabase
    .from('apple_health_variable_data_points')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  console.log(`📊 Current data points in database: ${currentCount || 0}`);

  // Generate 353 realistic data points
  console.log('📊 Generating 353 iOS-style Apple Health data points...');
  const iosData = generateiOSStyleAppleHealthData(userId, 353);
  
  console.log(`✅ Generated ${iosData.length} data points`);
  console.log(`📅 Date range: ${iosData[0].timestamp.split('T')[0]} to ${iosData[iosData.length-1].timestamp.split('T')[0]}`);

  // Group by type
  const typeGroups = iosData.reduce((acc, point) => {
    acc[point.type] = (acc[point.type] || 0) + 1;
    return acc;
  }, {});

  console.log('\n📈 Data breakdown by type (iOS-style):');
  Object.entries(typeGroups).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} data points`);
  });

  console.log('\n🚀 Starting iOS-style sync (batch processing)...');
  
  const batchSize = 25; // iOS would send smaller batches
  const batches = [];
  
  for (let i = 0; i < iosData.length; i += batchSize) {
    batches.push(iosData.slice(i, i + batchSize));
  }
  
  console.log(`📦 Split into ${batches.length} batches of ${batchSize} items each`);

  let totalSuccessful = 0;
  let totalErrors = 0;
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    let batchSuccessful = 0;
    let batchErrors = 0;

    console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)...`);

    // Send each data point in the batch to the receive endpoint (like iOS would)
    for (const dataPoint of batch) {
      try {
        const response = await fetch(`${baseUrl}/api/applehealth/receive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataPoint)
        });

        if (response.ok) {
          batchSuccessful++;
          totalSuccessful++;
        } else {
          batchErrors++;
          totalErrors++;
          if (batchErrors === 1) { // Log first error in batch
            const errorData = await response.text();
            console.log(`   ⚠️  First error in batch: ${response.status} - ${errorData.substring(0, 100)}`);
          }
        }
      } catch (error) {
        batchErrors++;
        totalErrors++;
        if (batchErrors === 1) { // Log first error in batch
          console.log(`   ⚠️  Network error: ${error.message}`);
        }
      }
    }

    console.log(`   ✅ Batch ${batchIndex + 1} completed: ${batchSuccessful}/${batch.length} successful`);
    
    // Small delay between batches (like iOS would have)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n🎉 iOS-STYLE SYNC COMPLETED!');
  console.log(`\n📊 Final Results:`);
  console.log(`   📥 Total attempted: ${iosData.length}`);
  console.log(`   ✅ Successful: ${totalSuccessful}`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log(`   📈 Success rate: ${((totalSuccessful / iosData.length) * 100).toFixed(1)}%`);

  // Verify the results
  console.log('\n🔍 Verifying sync results...');
  
  const { count: finalCount } = await supabase
    .from('apple_health_variable_data_points')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { data: recentData } = await supabase
    .from('apple_health_variable_data_points')
    .select('variable_id, date, value, raw')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`✅ Final verification: ${finalCount} total data points in database`);
  console.log(`📈 Increase from previous: +${(finalCount || 0) - (currentCount || 0)} data points`);
  
  if (recentData && recentData.length > 0) {
    console.log('\n📋 Most recent data points:');
    recentData.forEach((point, index) => {
      const isSimulated = point.raw?.ios_sync_simulation ? ' (simulated)' : '';
      console.log(`   ${index + 1}. ${point.date}: ${point.variable_id} = ${point.value}${isSimulated}`);
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

  if (totalSuccessful >= 300) {
    console.log('\n🎉 MASSIVE SUCCESS! iOS-style sync worked perfectly!');
    console.log('\n📱 This proves your Apple Health integration can handle large data sets!');
    console.log('\n📱 Next steps:');
    console.log('   1. 🌐 Refresh your Modular Health web app');
    console.log('   2. 📊 Go to your dashboard or /analyze page');
    console.log('   3. 🔍 Look for Apple Health data in charts');
    console.log('   4. 📈 You should see 300+ data points across multiple variables!');
    console.log('   5. 🎯 Your iOS app should use the /api/applehealth/receive endpoint');
    console.log('   6. ✨ Send data in small batches of ~25 items for best results');
  } else if (totalSuccessful >= 200) {
    console.log('\n✅ Great success! Significant improvement in Apple Health data.');
    console.log('   🔄 The iOS-style approach works well.');
  } else if (totalSuccessful >= 100) {
    console.log('\n👍 Good progress! Some data was successfully synced.');
    console.log('   🔧 May need to troubleshoot some issues.');
  } else {
    console.log('\n⚠️  Limited success. Check error logs for issues.');
  }
}

// Run the iOS-style sync
iOSStyleAppleHealthSync().catch(console.error); 