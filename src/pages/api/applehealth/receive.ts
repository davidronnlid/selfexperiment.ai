import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supaBase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id, type, value, timestamp, raw_data } = req.body;

    if (!user_id || !type || value === undefined) {
      return res.status(400).json({ 
        error: "Missing required fields: user_id, type, value" 
      });
    }

    console.log("[Apple Health Receive] Data received:", { user_id, type, value, timestamp });

    // Map HealthKit types to our variable IDs
    const healthKitTypeMapping: Record<string, string> = {
      'step_count': 'ah_steps',
      'stepCount': 'ah_steps',
      'heart_rate': 'ah_heart_rate',
      'heartRate': 'ah_heart_rate',
      'active_energy_burned': 'ah_active_calories',
      'activeEnergyBurned': 'ah_active_calories',
      'body_mass': 'ah_weight',
      'bodyMass': 'ah_weight',
      'body_fat_percentage': 'ah_body_fat_percentage',
      'bodyFatPercentage': 'ah_body_fat_percentage',
      'sleep_analysis': 'ah_sleep_duration',
      'sleepAnalysis': 'ah_sleep_duration',
      'resting_heart_rate': 'ah_resting_heart_rate',
      'restingHeartRate': 'ah_resting_heart_rate',
      'blood_pressure_systolic': 'ah_blood_pressure_systolic',
      'bloodPressureSystolic': 'ah_blood_pressure_systolic',
      'blood_pressure_diastolic': 'ah_blood_pressure_diastolic',
      'bloodPressureDiastolic': 'ah_blood_pressure_diastolic',
      'vo2_max': 'ah_vo2_max',
      'vo2Max': 'ah_vo2_max'
    };

    const variable_id = healthKitTypeMapping[type] || `ah_${type}`;

    // Use provided timestamp or current date
    const dataDate = timestamp ? new Date(timestamp) : new Date();
    const dateString = dataDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Prepare data for insertion
    const dataPoint = {
      user_id,
      variable_id,
      date: dateString,
      value: parseFloat(value.toString()),
      source: 'apple_health',
      raw: raw_data || { 
        original_type: type, 
        received_at: new Date().toISOString(),
        from_ios_app: true
      }
    };

    console.log("[Apple Health Receive] Inserting data point:", dataPoint);

    // Insert into apple_health_variable_data_points table
    const { data, error } = await supabase
      .from("apple_health_variable_data_points")
      .upsert(dataPoint, { 
        onConflict: "user_id,variable_id,date",
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error("[Apple Health Receive] Database error:", error);
      return res.status(500).json({ 
        error: "Failed to store health data",
        details: error.message 
      });
    }

    console.log("[Apple Health Receive] Successfully stored:", data);

    return res.status(200).json({ 
      success: true,
      message: "Health data stored successfully",
      data: {
        variable_id,
        value: dataPoint.value,
        date: dateString,
        type: type
      }
    });

  } catch (error) {
    console.error("[Apple Health Receive] Error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
} 