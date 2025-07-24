import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supaBase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  console.log("[Apple Health Fetch] Starting fetch for user:", userId);

  try {
    // Get the user's tokens
    const { data: tokens, error: tokenFetchError } = await supabase
      .from("apple_health_tokens")
      .select("access_token, refresh_token, id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (tokenFetchError) {
      console.error("[Apple Health Fetch] Error fetching tokens:", tokenFetchError);
    }
    console.log("[Apple Health Fetch] tokens:", tokens);

    if (!tokens?.[0]) {
      console.error("[Apple Health Fetch] No token for user");
      return res.status(500).json({ error: "No token for user" });
    }

    const appleHealthToken = tokens[0].access_token;
    const token_id = tokens[0].id;
    console.log("[Apple Health Fetch] token, token_id:", appleHealthToken, token_id);

    // Check if user already has real data from iOS app
    const { data: existingData, error: checkError } = await supabase
      .from("apple_health_variable_data_points")
      .select("raw, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const hasRealData = existingData?.some(point => 
      point.raw && typeof point.raw === 'object' && 
      (point.raw as any).from_ios_app === true
    ) || false;

    if (hasRealData) {
      console.log("[Apple Health Fetch] User has real iOS data, skipping sample generation");
      return res.status(200).json({ 
        message: "Real Apple Health data detected from iOS app",
        stats: {
          realDataDetected: true,
          dataPoints: existingData?.length || 0,
          note: "No sample data generated - using real HealthKit data from iOS app"
        }
      });
    }

    console.log("[Apple Health Fetch] No real iOS data found, generating sample data for testing...");
    
    // Sample Apple Health variables that would come from HealthKit
    const appleHealthVariables = [
      "steps",
      "heart_rate",
      "weight",
      "sleep_duration",
      "active_calories",
      "resting_heart_rate",
      "blood_pressure_systolic",
      "blood_pressure_diastolic",
      "body_fat_percentage",
      "vo2_max"
    ];

    const inserts: Record<string, unknown>[] = [];
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30); // Last 30 days

    // Generate sample data for the last 30 days
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      
      // Generate realistic sample data for each variable
      appleHealthVariables.forEach(variable => {
        let value = 0;
        
        switch (variable) {
          case "steps":
            value = Math.floor(Math.random() * 5000) + 5000; // 5000-10000 steps
            break;
          case "heart_rate":
            value = Math.floor(Math.random() * 40) + 60; // 60-100 bpm
            break;
          case "weight":
            value = Math.round((Math.random() * 20 + 70) * 100) / 100; // 70-90 kg
            break;
          case "sleep_duration":
            value = Math.round((Math.random() * 2 + 6.5) * 100) / 100; // 6.5-8.5 hours
            break;
          case "active_calories":
            value = Math.floor(Math.random() * 300) + 200; // 200-500 calories
            break;
          case "resting_heart_rate":
            value = Math.floor(Math.random() * 20) + 50; // 50-70 bpm
            break;
          case "blood_pressure_systolic":
            value = Math.floor(Math.random() * 30) + 110; // 110-140 mmHg
            break;
          case "blood_pressure_diastolic":
            value = Math.floor(Math.random() * 20) + 70; // 70-90 mmHg
            break;
          case "body_fat_percentage":
            value = Math.round((Math.random() * 10 + 15) * 100) / 100; // 15-25%
            break;
          case "vo2_max":
            value = Math.round((Math.random() * 10 + 35) * 100) / 100; // 35-45 ml/kg/min
            break;
        }

        inserts.push({
          source: "apple_health",
          variable_id: variable,
          date: dateStr,
          value: value,
          raw: null,
          user_id: userId,
        });
      });
    }

    console.log(`📝 Inserting ${inserts.length} sample Apple Health items...`);
    
    // Debug: Log some sample inserts
    console.log("Sample inserts:", inserts.slice(0, 5));
    
    const { error: insertErr } = await supabase
      .from("apple_health_variable_data_points")
      .upsert(inserts, { onConflict: "user_id,variable_id,date" });

    if (insertErr) {
      console.error("[Apple Health Fetch] Insert error:", insertErr);
      return res.status(500).json({ error: "Failed to insert data" });
    }

    console.log("[Apple Health Fetch] ✅ Success!");
    return res.status(200).json({ 
      message: "Apple Health data fetched and stored successfully",
      stats: {
        sampleDataGenerated: inserts.length,
        variablesTracked: appleHealthVariables.length,
        daysOfData: 30,
        note: "This is sample data. In production, this would sync real HealthKit data."
      }
    });

  } catch (error) {
    console.error("[Apple Health Fetch] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
} 