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

    // Enhanced validation
    if (!user_id || !type || value === undefined) {
      return res.status(400).json({ 
        error: "Missing required fields: user_id, type, value",
        required: ["user_id", "type", "value"],
        received: { user_id: !!user_id, type: !!type, value: value !== undefined }
      });
    }

    // Validate user_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      return res.status(400).json({ 
        error: "Invalid user_id format. Must be a valid UUID." 
      });
    }

    // Validate value is a number
    const numericValue = parseFloat(value.toString());
    if (isNaN(numericValue)) {
      return res.status(400).json({ 
        error: "Value must be a valid number" 
      });
    }

    console.log("[Apple Health Receive] Data received:", { 
      user_id, 
      type, 
      value: numericValue, 
      timestamp,
      from_ios: raw_data?.from_ios_app || false
    });

    // Simple type mapping for existing variables
    const typeMapping: Record<string, string> = {
      'step_count': 'ah_steps',
      'stepCount': 'ah_steps',
      'heart_rate': 'ah_heart_rate',
      'heartRate': 'ah_heart_rate',
      'active_energy_burned': 'ah_active_calories',
      'activeEnergyBurned': 'ah_active_calories',
      'body_mass': 'ah_weight',
      'bodyMass': 'ah_weight'
    };

    const variable_id = typeMapping[type] || `ah_${type}`;

    // Use provided timestamp or current date
    const dataDate = timestamp ? new Date(timestamp) : new Date();
    const dateString = dataDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Enhanced raw data with more metadata
    const enhancedRawData = {
      original_type: type,
      received_at: new Date().toISOString(),
      from_ios_app: raw_data?.from_ios_app || false,
      app_version: raw_data?.app_version || 'unknown',
      device_info: raw_data?.device_info || null,
      health_kit_metadata: raw_data?.health_kit_metadata || null,
      ...raw_data
    };

    // Try to insert into the universal data_points table (which should exist)
    const universalDataPoint = {
      user_id,
      variable_id,
      date: dateString,
      value: numericValue
    };

    console.log("[Apple Health Receive] Storing in universal data_points table:", universalDataPoint);

    const { data, error } = await supabase
      .from("data_points")
      .insert(universalDataPoint)
      .select();

    if (error) {
      console.error("[Apple Health Receive] Database error:", error);
      return res.status(500).json({ 
        error: "Failed to store health data",
        details: error.message,
        code: error.code
      });
    }

    console.log("[Apple Health Receive] Successfully stored:", data);

    return res.status(200).json({ 
      success: true,
      message: "Health data stored successfully",
      data: {
        variable_id,
        value: numericValue,
        date: dateString,
        type: type,
        from_ios_app: enhancedRawData.from_ios_app,
        stored_in: 'data_points'
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