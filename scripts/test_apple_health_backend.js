#!/usr/bin/env node

/**
 * Apple Health Backend Test Script
 * 
 * This script tests the Apple Health backend integration endpoints
 * to ensure they're working correctly before iOS app development.
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const TEST_USER_ID = process.env.TEST_USER_ID || 'bb0ac2ff-72c5-4776-a83a-01855bff4df0';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

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
    const response = await fetch(url, options);
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data,
      url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      url
    };
  }
}

async function testStatusEndpoint() {
  logInfo('Testing Apple Health Status Endpoint...');
  
  const result = await testEndpoint(`/api/applehealth/status?user_id=${TEST_USER_ID}`);
  
  if (result.success) {
    logSuccess('Status endpoint working');
    console.log('Status Response:', JSON.stringify(result.data, null, 2));
  } else {
    logError(`Status endpoint failed: ${result.error || result.status}`);
  }
  
  return result;
}

async function testReceiveEndpoint() {
  logInfo('Testing Apple Health Receive Endpoint...');
  
  const testData = {
    user_id: TEST_USER_ID,
    type: 'step_count',
    value: 8543,
    timestamp: new Date().toISOString(),
    raw_data: {
      from_ios_app: true,
      app_version: 'test-1.0.0',
      device_info: 'test-device',
      health_kit_metadata: {
        source: 'HealthKit',
        device: 'iPhone Test'
      }
    }
  };
  
  const result = await testEndpoint('/api/applehealth/receive', 'POST', testData);
  
  if (result.success) {
    logSuccess('Receive endpoint working');
    console.log('Receive Response:', JSON.stringify(result.data, null, 2));
  } else {
    logError(`Receive endpoint failed: ${result.error || result.status}`);
    if (result.data) {
      console.log('Error details:', JSON.stringify(result.data, null, 2));
    }
  }
  
  return result;
}

async function testValidation() {
  logInfo('Testing Apple Health Validation...');
  
  const validationTests = [
    {
      name: 'Invalid UUID',
      data: {
        user_id: 'invalid-uuid',
        type: 'step_count',
        value: 1000
      }
    },
    {
      name: 'Invalid Type',
      data: {
        user_id: TEST_USER_ID,
        type: 'invalid_type',
        value: 100
      }
    },
    {
      name: 'Invalid Value (too high)',
      data: {
        user_id: TEST_USER_ID,
        type: 'heart_rate',
        value: 300
      }
    },
    {
      name: 'Missing Required Fields',
      data: {
        user_id: TEST_USER_ID,
        type: 'step_count'
        // Missing value
      }
    }
  ];
  
  for (const test of validationTests) {
    logInfo(`Testing: ${test.name}`);
    const result = await testEndpoint('/api/applehealth/receive', 'POST', test.data);
    
    if (!result.success && result.status === 400) {
      logSuccess(`${test.name} - Validation working correctly`);
    } else {
      logError(`${test.name} - Validation failed (expected 400, got ${result.status})`);
    }
  }
}

async function testBatchSync() {
  logInfo('Testing Apple Health Batch Sync...');
  
  const batchData = {
    user_id: TEST_USER_ID,
    sync_mode: 'batch',
    data_points: [
      {
        type: 'step_count',
        value: 8543,
        timestamp: new Date().toISOString(),
        raw_data: { from_ios_app: true }
      },
      {
        type: 'heart_rate',
        value: 72,
        timestamp: new Date().toISOString(),
        raw_data: { from_ios_app: true }
      },
      {
        type: 'body_mass',
        value: 75.2,
        timestamp: new Date().toISOString(),
        raw_data: { from_ios_app: true }
      }
    ]
  };
  
  const result = await testEndpoint('/api/applehealth/sync', 'POST', batchData);
  
  if (result.success) {
    logSuccess('Batch sync endpoint working');
    console.log('Batch Sync Response:', JSON.stringify(result.data, null, 2));
  } else {
    logError(`Batch sync endpoint failed: ${result.error || result.status}`);
  }
  
  return result;
}

async function testSyncStatus() {
  logInfo('Testing Apple Health Sync Status...');
  
  const statusData = {
    user_id: TEST_USER_ID,
    sync_mode: 'status'
  };
  
  const result = await testEndpoint('/api/applehealth/sync', 'POST', statusData);
  
  if (result.success) {
    logSuccess('Sync status endpoint working');
    console.log('Sync Status Response:', JSON.stringify(result.data, null, 2));
  } else {
    logError(`Sync status endpoint failed: ${result.error || result.status}`);
  }
  
  return result;
}

async function testTestEndpoint() {
  logInfo('Testing Apple Health Test Endpoint...');
  
  const testData = {
    user_id: TEST_USER_ID,
    test_type: 'sample'
  };
  
  const result = await testEndpoint('/api/applehealth/test', 'POST', testData);
  
  if (result.success) {
    logSuccess('Test endpoint working');
    console.log('Test Response:', JSON.stringify(result.data, null, 2));
  } else {
    logError(`Test endpoint failed: ${result.error || result.status}`);
  }
  
  return result;
}

async function runAllTests() {
  log('🍎 Apple Health Backend Integration Test', 'bold');
  log(`Testing against: ${BASE_URL}`, 'blue');
  log(`Test User ID: ${TEST_USER_ID}`, 'blue');
  log('', 'reset');
  
  const tests = [
    { name: 'Status Endpoint', fn: testStatusEndpoint },
    { name: 'Receive Endpoint', fn: testReceiveEndpoint },
    { name: 'Validation Tests', fn: testValidation },
    { name: 'Batch Sync', fn: testBatchSync },
    { name: 'Sync Status', fn: testSyncStatus },
    { name: 'Test Endpoint', fn: testTestEndpoint }
  ];
  
  const results = [];
  
  for (const test of tests) {
    log(`\n--- Testing ${test.name} ---`, 'bold');
    try {
      const result = await test.fn();
      results.push({ name: test.name, success: result.success });
    } catch (error) {
      logError(`${test.name} failed with error: ${error.message}`);
      results.push({ name: test.name, success: false });
    }
  }
  
  // Summary
  log('\n--- Test Summary ---', 'bold');
  const successfulTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  results.forEach(result => {
    if (result.success) {
      logSuccess(`${result.name}`);
    } else {
      logError(`${result.name}`);
    }
  });
  
  log(`\n${successfulTests}/${totalTests} tests passed`, successfulTests === totalTests ? 'green' : 'red');
  
  if (successfulTests === totalTests) {
    log('\n🎉 All Apple Health backend tests passed!', 'green');
    log('Your backend is ready for iOS app integration.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the errors above.', 'yellow');
    log('Fix the issues before proceeding with iOS app development.', 'yellow');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    logError(`Test suite failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testEndpoint,
  testStatusEndpoint,
  testReceiveEndpoint,
  testValidation,
  testBatchSync,
  testSyncStatus,
  testTestEndpoint,
  runAllTests
}; 