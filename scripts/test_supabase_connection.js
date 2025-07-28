import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

console.log('🔍 Testing Supabase Connection...\n');

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Environment Variables Check:');
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ SET' : '❌ NOT SET'}`);
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ SET' : '❌ NOT SET'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ SET' : '❌ NOT SET'}`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('\n❌ Missing required environment variables!');
  console.log('Please update your .env.local file with your Supabase credentials.');
  process.exit(1);
}

// Test 1: Network connectivity
console.log('\n🌐 Test 1: Network Connectivity');
try {
  const response = await fetch(supabaseUrl);
  console.log(`✅ Network connectivity confirmed (${response.status})`);
} catch (error) {
  console.log(`❌ Network connectivity failed: ${error.message}`);
}

// Test 2: Supabase URL accessibility
console.log('\n🔗 Test 2: Supabase URL Check');
try {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  });
  
  if (response.status === 401) {
    console.log('❌ HTTP 401 - Authentication failed');
    console.log('This usually means the anon key is incorrect or expired');
  } else if (response.status === 200) {
    console.log('✅ Supabase URL accessible');
  } else {
    console.log(`⚠️ Unexpected status: ${response.status}`);
  }
} catch (error) {
  console.log(`❌ Supabase URL check failed: ${error.message}`);
}

// Test 3: Auth session (simulate timeout)
console.log('\n🔐 Test 3: Auth Session Check');
console.log('⏰ Checking auth session (this may timeout)...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

try {
  const { data: { session }, error } = await Promise.race([
    supabase.auth.getSession(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout after 8 seconds')), 8000)
    )
  ]);

  if (error) {
    console.log(`❌ Auth session error: ${error.message}`);
  } else if (session) {
    console.log('✅ Auth session found');
  } else {
    console.log('ℹ️ No active auth session (this is normal if not logged in)');
  }
} catch (error) {
  console.log(`⏰ ${error.message}`);
}

// Test 4: Auth user check
console.log('\n👤 Test 4: Auth User Check');
console.log('🔧 Checking auth user (this often hangs)...');

try {
  const { data: { user }, error } = await Promise.race([
    supabase.auth.getUser(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout after 5 seconds')), 5000)
    )
  ]);

  if (error) {
    console.log(`❌ Auth user error: ${error.message}`);
  } else if (user) {
    console.log(`✅ Auth user found: ${user.email}`);
  } else {
    console.log('ℹ️ No authenticated user (this is normal if not logged in)');
  }
} catch (error) {
  console.log(`⏰ ${error.message}`);
}

console.log('\n📝 Summary:');
console.log('• Network connectivity: Check if your internet connection is working');
console.log('• HTTP 401: Update your Supabase anon key in .env.local');
console.log('• Auth timeouts: This is often normal for unauthenticated requests');
console.log('• Auth user hangs: This can happen with certain network configurations');

console.log('\n🔧 To fix the issues:');
console.log('1. Go to https://supabase.com/dashboard');
console.log('2. Select your project');
console.log('3. Go to Settings → API');
console.log('4. Copy the Project URL and anon key');
console.log('5. Update your .env.local file');
console.log('6. Restart your development server: npm run dev'); 