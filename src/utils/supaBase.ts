import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ||
                   "https://ecstnwwcplbofbwbhbck.supabase.co";

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                       "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjc3Rud3djcGxib2Zid2JoYmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNzY5NjMsImV4cCI6MjA2Njc1Mjk2M30.iTZ65IW6iEKug6VMdg4zIADF7QF69LCaGpDxh4FORDc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // This will help Supabase determine the correct redirect URL
    flowType: 'pkce'
  }
});
