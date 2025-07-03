const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const accessToken = "XFSRQI3G6RI66JRMCLMWYJGUTIZ4U3MV";

const startDate = "2025-06-20";
const endDate = "2025-06-29";

const url = `https://api.ouraring.com/v2/usercollection/heart_rate_variability?start_date=${startDate}&end_date=${endDate}`;

fetch(url, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
})
  .then((res) => res.json())
  .then((json) => {
    console.log("📊 HRV data:", JSON.stringify(json, null, 2));
  })
  .catch((err) => console.error("❌ HRV fetch failed:", err));

const supaBasePath = new URL("../utils/supaBase.ts", import.meta.url).pathname;
const { supabase } = await import(supaBasePath);

async function insertMoodLogs() {
  const today = new Date();
  for (let i = 0; i < 21; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const value = Math.floor(Math.random() * 10) + 1;
    const log = {
      date: date.toISOString(),
      label: "mood",
      value: value.toString(),
      notes: "Example mood log",
    };
    const { error } = await supabase.from("daily_logs").insert([log]);
    if (error) {
      console.error(`❌ Failed to insert for ${date.toISOString()}:`, error);
    } else {
      console.log(
        `✅ Inserted mood log for ${date.toISOString()} (value: ${value})`
      );
    }
  }
  console.log("Done inserting mood logs.");
}

insertMoodLogs();
