import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Debug environment variables
console.log("Supabase URL configured:", !!supabaseUrl);
console.log("Supabase Anon Key configured:", !!supabaseAnonKey);

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
