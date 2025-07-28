#!/usr/bin/env node

/**
 * Apple Health Localhost Test Script
 * 
 * This script tests the Apple Health integration specifically for localhost
 * development with the iOS app.
 */

// Node 22 has built-in fetch
const fetch = globalThis.fetch;

// Configuration for localhost testing
const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = process.env.TEST_USER_ID || 'bb0ac2ff-72c5-4776-a83a-01855bff4df0';

console.log('🍎 Apple Health Localhost Integration Test');
console.log(`Testing against: ${BASE_URL}`);
console.log(`Test User ID: ${TEST_USER_ID}`);
console.log('');

async function testEndpoint(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`📡 ${method} ${endpoint}`);
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status})`);
      return { success: true, status: response.status, data };
    } else {
      console.log(`❌ Failed (${response.status}): ${data.error || 'Unknown error'}`);
      return { success: false, status: response.status, data };
    }
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function simulateIOSAppData() {
  console.log('\n--- Simulating iOS App Data ---');
  
  const sampleData = [
    {
      user_id: TEST_USER_ID,
      type: 'step_count',
      value: Math.floor(Math.random() * 15000) + 5000,
      timestamp: new Date().toISOString(),
      raw_data: {
        from_ios_app: true,
        app_version: '1.0.0',
        device_info: 'iPhone 15 Pro',
        health_kit_metadata: {
          source: 'HealthKit',
          device: 'iPhone',
          HKMetadataKeyDeviceName: 'iPhone',
          HKMetadataKeySourceRevision: '16.0'
        }
      }
    },
    {
      user_id: TEST_USER_ID,
      type: 'heart_rate',
      value: Math.floor(Math.random() * 40) + 60,
      timestamp: new Date().toISOString(),
      raw_data: {
        from_ios_app: true,
        app_version: '1.0.0',
        device_info: 'Apple Watch Series 9',
        health_kit_metadata: {
          source: 'HealthKit',
          device: 'Apple Watch',
          HKMetadataKeyDeviceName: 'Apple Watch',
          HKMetadataKeyHeartRateMotionContext: 1
        }
      }
    }
  ];

  for (const data of sampleData) {
    console.log(`\n📊 Sending ${data.type}: ${data.value}`);
    const result = await testEndpoint('/api/applehealth/receive', 'POST', data);
    
    if (result.success) {
      console.log(`   Stored as: ${result.data.data.variable_id}`);
      console.log(`   Unit: ${result.data.data.unit}`);
    }
  }
}

async function checkConnectionStatus() {
  console.log('\n--- Checking Connection Status ---');
  const result = await testEndpoint(`/api/applehealth/status?user_id=${TEST_USER_ID}`);
  
  if (result.success) {
    const data = result.data;
    console.log(`✅ Connected: ${data.connected}`);
    console.log(`📊 Data Points: ${data.dataPoints}`);
    console.log(`🍎 Has Real Data: ${data.hasRealData}`);
    console.log(`🔗 API Endpoint: ${data.iosApp?.endpointUrl}`);
    
    if (data.iosApp?.supportedTypes) {
      console.log(`📱 Supported Types: ${data.iosApp.supportedTypes.slice(0, 5).join(', ')}...`);
    }
  }
}

async function testBatchSync() {
  console.log('\n--- Testing Batch Sync ---');
  
  const batchData = {
    user_id: TEST_USER_ID,
    sync_mode: 'batch',
    data_points: [
      {
        type: 'step_count',
        value: 12543,
        timestamp: new Date(Date.now() - 24*60*60*1000).toISOString(), // Yesterday
        raw_data: { from_ios_app: true, batch_sync: true }
      },
      {
        type: 'body_mass',
        value: 75.2,
        timestamp: new Date(Date.now() - 24*60*60*1000).toISOString(),
        raw_data: { from_ios_app: true, batch_sync: true }
      }
    ]
  };
  
  const result = await testEndpoint('/api/applehealth/sync', 'POST', batchData);
  
  if (result.success) {
    const data = result.data;
    console.log(`✅ Batch sync completed`);
    console.log(`   Processed: ${data.summary.total_processed}`);
    console.log(`   Successful: ${data.summary.successful}`);
    console.log(`   Success Rate: ${data.summary.success_rate}`);
  }
}

async function runLocalhostTests() {
  try {
    // 1. Check if server is running
    console.log('--- Checking Server Status ---');
    const healthCheck = await fetch(`${BASE_URL}/api/hello`).catch(() => null);
    
    if (!healthCheck) {
      console.log('❌ Server not running at localhost:3001');
      console.log('Please start your Next.js server first:');
      console.log('   npm run dev');
      return;
    }
    
    console.log('✅ Server is running');
    
    // 2. Check connection status
    await checkConnectionStatus();
    
    // 3. Simulate iOS app sending data
    await simulateIOSAppData();
    
    // 4. Test batch sync
    await testBatchSync();
    
    // 5. Final status check
    console.log('\n--- Final Status Check ---');
    await checkConnectionStatus();
    
    console.log('\n🎉 Localhost tests completed!');
    console.log('\n📱 iOS App Integration Instructions:');
    console.log('1. Configure your iOS app to send data to: http://localhost:3001/api/applehealth/receive');
    console.log(`2. Use User ID: ${TEST_USER_ID}`);
    console.log('3. Test by clicking "Connect Apple Health" in your web app');
    console.log('4. Open the iOS app after connecting to start syncing real data');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run the tests
runLocalhostTests(); 