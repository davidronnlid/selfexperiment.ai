import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function insertCognitiveControlLogs() {
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const value = Math.floor(Math.random() * 10) + 1;
    const log = {
      date: date.toISOString(),
      label: "Cognitive control",
      value: value.toString(),
      notes: "Auto-generated cognitive control log",
    };
    const { error } = await supabase.from("daily_logs").insert([log]);
    if (error) {
      console.error(`❌ Failed to insert for ${date.toISOString()}:`, error);
    } else {
      console.log(
        `✅ Inserted cognitive control log for ${date.toISOString()} (value: ${value})`
      );
    }
  }
  console.log("Done inserting cognitive control logs.");
}

insertCognitiveControlLogs();
