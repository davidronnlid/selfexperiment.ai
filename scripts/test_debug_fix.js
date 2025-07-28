import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

console.log('🧪 Testing debug page fix...\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('📋 Testing the exact same request as the debug page...');

// Test 1: Without apikey header (the old way that was failing)
console.log('\n1. Testing WITHOUT apikey header (old way):');
try {
  const response1 = await fetch(`${supabaseUrl}/rest/v1/`, { 
    method: 'HEAD',
    mode: 'cors'
  });
  
  console.log(`   Status: ${response1.status} ${response1.statusText}`);
  if (response1.status === 401) {
    console.log('   ❌ This is the old error - HTTP 401');
  } else {
    console.log('   ✅ This should not happen');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 2: With apikey header (the new way that should work)
console.log('\n2. Testing WITH apikey header (new way):');
try {
  const response2 = await fetch(`${supabaseUrl}/rest/v1/`, { 
    method: 'HEAD',
    mode: 'cors',
    headers: {
      'apikey': supabaseAnonKey
    }
  });
  
  console.log(`   Status: ${response2.status} ${response2.statusText}`);
  if (response2.status === 200) {
    console.log('   ✅ This is the fix - HTTP 200');
  } else {
    console.log(`   ❌ Unexpected status: ${response2.status}`);
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

console.log('\n🎯 SUMMARY:');
console.log('The debug page should now show:');
console.log('✅ env-vars: Environment variables configured');
console.log('✅ network: Network connectivity confirmed');
console.log('✅ supabase-url: Supabase URL reachable (instead of HTTP 401)');
console.log('⏰ auth-session: May still timeout (this is normal)');

console.log('\n🔧 The fix was:');
console.log('- Added apikey header to the Supabase URL test');
console.log('- This matches how the Supabase client actually works');
console.log('- The HTTP 401 error should now be resolved'); 