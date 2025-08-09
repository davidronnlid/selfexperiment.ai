#!/usr/bin/env node

/**
 * Test Environment Variables
 * 
 * This script checks if environment variables are properly loaded
 * for the Next.js application.
 */

console.log('🔍 Testing Environment Variables...\n');

// Test Supabase variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('📊 Environment Variable Status:');
console.log('================================');

if (supabaseUrl) {
  console.log('✅ NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
} else {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL: Missing');
}

if (supabaseKey) {
  console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey.substring(0, 20) + '...');
} else {
  console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY: Missing');
}

console.log('\n🔧 Debugging Info:');
console.log('==================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PWD:', process.cwd());

// Check if .env.local exists
const fs = require('fs');
const path = require('path');

const envFiles = ['.env.local', '.env', '.env.development.local', '.env.development'];
console.log('\n📁 Environment Files:');
console.log('======================');

envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log('✅', file, 'exists');
  } else {
    console.log('❌', file, 'missing');
  }
});

// Test Supabase connection if variables are available
if (supabaseUrl && supabaseKey) {
  console.log('\n🔗 Testing Supabase Connection...');
  console.log('==================================');
  
  const { createClient } = require('@supabase/supabase-js');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created successfully');
    
    // Test a simple query
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.log('⚠️  Auth session error (this might be normal):', error.message);
      } else {
        console.log('✅ Auth session check completed:', data.session ? 'Session found' : 'No active session');
      }
    }).catch(err => {
      console.log('❌ Auth session test failed:', err.message);
    });
    
  } catch (error) {
    console.log('❌ Failed to create Supabase client:', error.message);
  }
} else {
  console.log('\n❌ Cannot test Supabase connection - missing environment variables');
}

console.log('\n✨ Test complete!');