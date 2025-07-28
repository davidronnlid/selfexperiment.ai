const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceAppleHealthResync() {
  console.log('🔄 Force Apple Health Resync Analysis\n');

  // Check current state
  const { data: appleHealthData, error: fetchError } = await supabase
    .from('apple_health_variable_data_points')
    .select('*')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching Apple Health data:', fetchError);
    return;
  }

  console.log(`📊 Current Apple Health data points in database: ${appleHealthData.length}`);

  // Analyze data by date and variable
  const dataByDate = {};
  const dataByVariable = {};
  
  appleHealthData.forEach(point => {
    // Group by date
    if (!dataByDate[point.date]) {
      dataByDate[point.date] = [];
    }
    dataByDate[point.date].push(point);
    
    // Group by variable
    if (!dataByVariable[point.variable_id]) {
      dataByVariable[point.variable_id] = [];
    }
    dataByVariable[point.variable_id].push(point);
  });

  console.log('\n📅 Data by date:');
  Object.keys(dataByDate).sort().forEach(date => {
    console.log(`   ${date}: ${dataByDate[date].length} data points`);
  });

  console.log('\n📈 Data by variable:');
  Object.entries(dataByVariable).forEach(([variable, points]) => {
    const sortedPoints = points.sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstDate = sortedPoints[0]?.date;
    const lastDate = sortedPoints[sortedPoints.length - 1]?.date;
    console.log(`   ${variable}: ${points.length} points (${firstDate} → ${lastDate})`);
  });

  // Check if data is in main data_points table
  const variableMappings = {
    'ah_steps': 'bb4b56d6-02f3-47fe-97fe-b1f1b44e6017',
    'ah_heart_rate': '89a8bf8c-2b64-4967-8600-d1e2c63670fb', 
    'ah_weight': '4db5c85b-0f41-4eb9-81de-3b57b5dfa198'
  };

  const { count: mainTableCount } = await supabase
    .from('data_points')
    .select('*', { count: 'exact', head: true })
    .in('variable_id', Object.values(variableMappings));

  console.log(`\n📊 Data points in main web app table: ${mainTableCount || 0}`);

  // Provide instructions for re-sync
  console.log('\n🔄 RESYNC INSTRUCTIONS:');
  console.log('');
  console.log('Since you only have 62/353 data points, the iOS sync failed partway through.');
  console.log('Here\'s how to fix this:');
  console.log('');
  console.log('📱 **Method 1: iOS App Re-sync (Recommended)**');
  console.log('   1. Open your iOS app');
  console.log('   2. Go to Apple Health integration section');
  console.log('   3. Disconnect and reconnect Apple Health');
  console.log('   4. Trigger a full sync (not incremental)');
  console.log('   5. Monitor the sync progress - it should sync 300+ data points');
  console.log('');
  console.log('🌐 **Method 2: Test if sync endpoint is working**');
  console.log(`   Test the Apple Health sync endpoint at:`);
  console.log(`   POST ${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/applehealth/sync`);
  console.log(`   Body: { "user_id": "your-user-id", "sync_mode": "status" }`);
  console.log('');
  console.log('🔧 **Method 3: Manual data import (if iOS fails)**');
  console.log('   1. Export your Apple Health data as XML');
  console.log('   2. We can create a parser to import the missing data');
  console.log('');

  // Show what data gaps exist
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  console.log(`📊 **Data Gap Analysis (Last 30 days)**:`);
  console.log(`   Expected: Daily data from ${thirtyDaysAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
  console.log(`   Missing approximately: ${30 - Object.keys(dataByDate).length} days of data`);
  
  if (Object.keys(dataByDate).length < 30) {
    console.log('   ⚠️  This suggests the iOS sync is not running regularly or failed');
  }

  // Test the Apple Health receive endpoint
  console.log('\n🧪 **Testing Apple Health receive endpoint...**');
  try {
    const testResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/applehealth/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: appleHealthData[0]?.user_id,
        test_type: 'sample'
      })
    });

    if (testResponse.ok) {
      const testResult = await testResponse.json();
      console.log('   ✅ Apple Health endpoint is working');
      console.log(`   📊 Test added ${testResult.summary?.successful_tests || 0} sample data points`);
    } else {
      console.log('   ❌ Apple Health endpoint has issues');
    }
  } catch (error) {
    console.log('   ❌ Could not test Apple Health endpoint:', error.message);
  }

  return {
    currentDataPoints: appleHealthData.length,
    expectedDataPoints: 353,
    missingDataPoints: 353 - appleHealthData.length,
    dataByVariable,
    mainTableSynced: mainTableCount || 0
  };
}

// Run the analysis
forceAppleHealthResync()
  .then(result => {
    if (result) {
      console.log('\n🎯 **SUMMARY**:');
      console.log(`   📱 iOS claimed: 353 data points`);
      console.log(`   💾 Database has: ${result.currentDataPoints} data points`);
      console.log(`   🌐 Web app shows: ${result.mainTableSynced} data points`);
      console.log(`   ❌ Missing: ${result.missingDataPoints} data points`);
      console.log('');
      console.log('🚀 **NEXT STEP**: Trigger a full re-sync from your iOS app to get the missing data!');
    }
  })
  .catch(console.error); 