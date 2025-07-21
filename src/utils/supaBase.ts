import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check for missing environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('📝 Create a .env.local file with:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here');
  
  // Show user-friendly error on client-side
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      alert('Missing Supabase configuration. Check console for setup instructions.');
    }, 1000);
  }
}

// Create Supabase client with fallback values for development
const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    // This will help Supabase determine the correct redirect URL
    flowType: 'pkce'
  }
});
