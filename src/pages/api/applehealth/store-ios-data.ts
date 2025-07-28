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

    // Validation
    if (!user_id || !type || value === undefined) {
      return res.status(400).json({ 
        error: "Missing required fields: user_id, type, value"
      });
    }

    const numericValue = parseFloat(value.toString());
    if (isNaN(numericValue)) {
      return res.status(400).json({ 
        error: "Value must be a valid number" 
      });
    }

    console.log("[Apple Health iOS] Data received:", { 
      user_id, 
      type, 
      value: numericValue, 
      from_ios: raw_data?.from_ios_app || false
    });

    // Create a manual log entry in the existing logs table
    const logEntry = {
      user_id,
      variable_name: `${type} (iOS)`,
      value: numericValue,
      date: timestamp ? new Date(timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notes: JSON.stringify({
        source: 'apple_health_ios',
        original_type: type,
        from_ios_app: raw_data?.from_ios_app || false,
        app_version: raw_data?.app_version || '1.0.0',
        device_info: raw_data?.device_info || 'iPhone',
        received_at: new Date().toISOString()
      })
    };

    console.log("[Apple Health iOS] Storing as manual log:", logEntry);

    const { data, error } = await supabase
      .from("logs")
      .insert(logEntry)
      .select();

    if (error) {
      console.error("[Apple Health iOS] Database error:", error);
      return res.status(500).json({ 
        error: "Failed to store health data",
        details: error.message
      });
    }

    console.log("[Apple Health iOS] Successfully stored:", data);

    return res.status(200).json({ 
      success: true,
      message: "iOS health data stored successfully",
      data: {
        id: data[0]?.id,
        variable_name: logEntry.variable_name,
        value: numericValue,
        date: logEntry.date,
        type: type,
        from_ios_app: raw_data?.from_ios_app || false,
        stored_in: 'logs'
      }
    });

  } catch (error) {
    console.error("[Apple Health iOS] Error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
} 