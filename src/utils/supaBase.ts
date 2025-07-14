import { createBrowserClient } from "@supabase/ssr";

// Fallback values for environment variables
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ecstnwwcplbofbwbhbck.supabase.com";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjc3Rud3djcGxib2Zid2JoYmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNzY5NjMsImV4cCI6MjA2Njc1Mjk2M30.iTZ65IW6iEKug6VMdg4zIADF7QF69LCaGpDxh4FORDc";

// Debug environment variables
console.log("🔍 PRODUCTION DEBUG:");
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase URL configured:", !!supabaseUrl);
console.log("Supabase Key configured:", !!supabaseAnonKey);
console.log("Environment:", process.env.NODE_ENV);
console.log(
  "Base URL:",
  process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "localhost fallback"
);

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
