import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supaBase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id parameter" });
    }

    console.log("[Apple Health Status] Checking status for user:", user_id);

    // Check if user has Apple Health token (connected)
    const { data: tokens, error: tokenError } = await supabase
      .from("apple_health_tokens")
      .select("id, created_at, expires_at")
      .eq("user_id", user_id)
      .limit(1);

    if (tokenError) {
      console.error("[Apple Health Status] Token check error:", tokenError);
      return res.status(500).json({ error: "Failed to check connection status" });
    }

    const isConnected = tokens && tokens.length > 0;

    // Count data points
    const { count: dataCount, error: countError } = await supabase
      .from("apple_health_variable_data_points")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id);

    if (countError) {
      console.error("[Apple Health Status] Count error:", countError);
    }

    // Get recent data points to check if they're from iOS app
    const { data: recentData, error: recentError } = await supabase
      .from("apple_health_variable_data_points")
      .select("raw, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentError) {
      console.error("[Apple Health Status] Recent data error:", recentError);
    }

    // Check if any recent data is from iOS app
    const hasRealData = recentData?.some(point => 
      point.raw && typeof point.raw === 'object' && 
      (point.raw as any).from_ios_app === true
    ) || false;

    // Provide the endpoint URL for iOS app
    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.VERCEL_URL || 
                   "http://localhost:3001";
    
    const endpointUrl = `${baseUrl}/api/applehealth/receive`;

    const status = {
      connected: isConnected,
      dataPoints: dataCount || 0,
      hasRealData,
      lastDataReceived: recentData?.[0]?.created_at || null,
      connection: {
        connectedAt: tokens?.[0]?.created_at || null,
        expiresAt: tokens?.[0]?.expires_at || null
      },
      iosApp: {
        endpointUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        bodyFormat: {
          user_id: "string (required)",
          type: "string (required) - e.g. 'step_count', 'heart_rate'",
          value: "number (required)",
          timestamp: "string (optional) - ISO date string",
          raw_data: "object (optional) - additional HealthKit data"
        },
        supportedTypes: [
          "step_count", "stepCount",
          "heart_rate", "heartRate", 
          "active_energy_burned", "activeEnergyBurned",
          "body_mass", "bodyMass",
          "body_fat_percentage", "bodyFatPercentage",
          "sleep_analysis", "sleepAnalysis",
          "resting_heart_rate", "restingHeartRate",
          "blood_pressure_systolic", "bloodPressureSystolic",
          "blood_pressure_diastolic", "bloodPressureDiastolic",
          "vo2_max", "vo2Max"
        ]
      }
    };

    console.log("[Apple Health Status] Status:", status);

    return res.status(200).json(status);

  } catch (error) {
    console.error("[Apple Health Status] Error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
} 