import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check for missing environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('📝 Create a .env.local file with:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here');
  console.error('🔄 Restart your development server after adding environment variables');
  
  // Show user-friendly error on client-side
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      alert('❌ Missing Supabase configuration!\n\n' +
            'Please:\n' +
            '1. Create/check .env.local file\n' +
            '2. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
            '3. Restart your development server\n\n' +
            'Check the console for more details.');
    }, 1000);
  }
  
  // Fail fast instead of using placeholder values
  throw new Error('Missing required Supabase environment variables');
}

console.log('✅ Supabase client initialized with:', {
  url: supabaseUrl,
  keyPrefix: supabaseAnonKey.substring(0, 20) + '...'
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // This will help Supabase determine the correct redirect URL
    flowType: 'pkce',
    // Reduce timeout for faster failure detection
    detectSessionInUrl: true,
    persistSession: true
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey
    }
  }
});
