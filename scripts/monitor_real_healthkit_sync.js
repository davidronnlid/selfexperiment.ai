const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

let lastCount = 0;
let startTime = Date.now();

async function checkRealHealthKitData() {
  const { count: currentCount } = await supabase
    .from('apple_health_variable_data_points')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', 'bb0ac2ff-72c5-4776-a83a-01855bff4df0');

  // Show progress if data is increasing
  if (currentCount > lastCount) {
    const newDataPoints = currentCount - lastCount;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`📊 +${newDataPoints} new data points (Total: ${currentCount}) [${elapsed}s]`);
    
    // Show sample of latest data
    const { data: latestData } = await supabase
      .from('apple_health_variable_data_points')
      .select('date, variable_id, value, raw')
      .eq('user_id', 'bb0ac2ff-72c5-4776-a83a-01855bff4df0')
      .order('created_at', { ascending: false })
      .limit(3);

    if (latestData && latestData.length > 0) {
      console.log('   📋 Latest synced data:');
      latestData.forEach(point => {
        const isReal = point.raw?.real_healthkit_data === true;
        const source = point.raw?.source_name || 'unknown';
        const realMarker = isReal ? '✅ REAL' : '⚠️  test';
        console.log(`      ${point.date}: ${point.variable_id} = ${point.value} (${realMarker}, ${source})`);
      });
    }

    lastCount = currentCount;
  }

  return currentCount;
}

async function monitorRealTimeSync() {
  console.log('🔄 Real-Time HealthKit Sync Monitor');
  console.log('====================================');
  console.log('Watching for real HealthKit data from your iOS app...\n');

  const initialCount = await checkRealHealthKitData();
  lastCount = initialCount;
  
  if (initialCount === 0) {
    console.log('📱 Waiting for iOS app sync...');
    console.log('   1. Open your iOS app');
    console.log('   2. Tap "Configure HealthKit Access" if needed');
    console.log('   3. Tap "Start Comprehensive Sync (Last 90 Days)"');
    console.log('   4. Watch this monitor for real-time progress!\n');
  } else {
    console.log(`📊 Starting with ${initialCount} existing data points`);
  }

  // Monitor every 2 seconds
  const interval = setInterval(async () => {
    try {
      const currentCount = await checkRealHealthKitData();
      
      // Check if we've reached the expected amount
      if (currentCount >= 300) {
        console.log('\n🎉 SUCCESS! You\'ve synced 300+ real HealthKit data points!');
        console.log('📱 Your real health data should now appear in the web app.');
        console.log('🌐 Go to your Modular Health web app to see your actual data.');
        clearInterval(interval);
      }
    } catch (error) {
      console.error('❌ Monitor error:', error.message);
    }
  }, 2000);

  // Stop monitoring after 5 minutes
  setTimeout(() => {
    clearInterval(interval);
    console.log('\n⏰ Monitor stopped after 5 minutes');
    console.log('📊 Final check in progress...');
    
    checkRealHealthKitData().then(finalCount => {
      console.log(`\n📋 Final Status:`);
      console.log(`   • Total synced: ${finalCount} data points`);
      if (finalCount >= 300) {
        console.log(`   ✅ SUCCESS! Your real HealthKit data is synced!`);
      } else if (finalCount > 0) {
        console.log(`   📈 Progress made! ${finalCount} data points synced.`);
        console.log(`   💡 Try running the sync again if you expected more data.`);
      } else {
        console.log(`   ❌ No data synced. Check iOS app permissions and connectivity.`);
      }
    });
  }, 300000); // 5 minutes
}

// Start monitoring
monitorRealTimeSync().catch(console.error);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Monitoring stopped by user');
  process.exit(0);
}); 