import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

console.log('🔍 Debugging HTTP 401 Error...\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('📋 Current Configuration:');
console.log(`URL: ${supabaseUrl}`);
console.log(`Anon Key (first 20 chars): ${supabaseAnonKey?.substring(0, 20)}...`);
console.log(`Anon Key length: ${supabaseAnonKey?.length || 0} characters`);

// Test 1: Direct API call with different headers
console.log('\n🔗 Test 1: Testing different authentication methods...');

const testCases = [
  {
    name: 'With apikey header',
    headers: { 'apikey': supabaseAnonKey }
  },
  {
    name: 'With Authorization Bearer',
    headers: { 'Authorization': `Bearer ${supabaseAnonKey}` }
  },
  {
    name: 'With both headers',
    headers: { 
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  },
  {
    name: 'With Content-Type',
    headers: { 
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    }
  }
];

for (const testCase of testCases) {
  try {
    console.log(`\nTesting: ${testCase.name}`);
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: testCase.headers
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
    
    if (response.status === 401) {
      const errorText = await response.text();
      console.log(`Error body: ${errorText.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

// Test 2: Check if the key is valid JWT format
console.log('\n🔐 Test 2: Validating JWT format...');

function parseJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

const jwtPayload = parseJWT(supabaseAnonKey);
if (jwtPayload) {
  console.log('✅ JWT format is valid');
  console.log(`Role: ${jwtPayload.role}`);
  console.log(`Issuer: ${jwtPayload.iss}`);
  console.log(`Expires: ${new Date(jwtPayload.exp * 1000).toISOString()}`);
} else {
  console.log('❌ JWT format is invalid');
}

// Test 3: Test with Supabase client
console.log('\n🔧 Test 3: Testing with Supabase client...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

try {
  const { data, error } = await supabase.from('profiles').select('count').limit(1);
  
  if (error) {
    console.log(`❌ Supabase client error: ${error.message}`);
    console.log(`Error code: ${error.code}`);
    console.log(`Error details: ${JSON.stringify(error)}`);
  } else {
    console.log('✅ Supabase client working');
  }
} catch (error) {
  console.log(`❌ Supabase client exception: ${error.message}`);
}

// Test 4: Check if the project is active
console.log('\n🌐 Test 4: Checking project status...');

try {
  const response = await fetch(supabaseUrl);
  console.log(`Project status: ${response.status}`);
  
  if (response.status === 404) {
    console.log('⚠️ Project might be paused or inactive');
  }
} catch (error) {
  console.log(`Error checking project: ${error.message}`);
}

console.log('\n📝 Troubleshooting steps:');
console.log('1. Check if your Supabase project is active (not paused)');
console.log('2. Verify the anon key is correct in your Supabase dashboard');
console.log('3. Make sure RLS policies are properly configured');
console.log('4. Check if the project has any usage limits exceeded'); 