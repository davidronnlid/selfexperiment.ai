import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id, data_type, value, date, start_date, end_date, unit, source, is_daily_total } = req.body;

    if (!user_id || !data_type || value === undefined) {
      return res.status(400).json({ 
        error: "Missing required fields: user_id, data_type, value" 
      });
    }

    // Determine the date for the data point
    let dataDate: string;
    if (date) {
      // New format: single date field (YYYY-MM-DD)
      dataDate = date;
    } else if (start_date) {
      // Legacy format: extract date from start_date
      dataDate = new Date(start_date).toISOString().split('T')[0];
    } else {
      // Fallback to today
      dataDate = new Date().toISOString().split('T')[0];
    }

    console.log(`[Apple Health Data] Storing daily ${data_type} data:`, {
      user_id,
      data_type,
      value,
      date: dataDate,
      is_daily_total,
      unit,
      source
    });

    // Store the health data with structured columns and minimal raw data
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('apple_health_variable_data_points')
      .upsert({
        user_id,
        date: dataDate, // Clean YYYY-MM-DD format
        variable_id: data_type === 'steps' ? 'steps' : data_type,
        value: parseFloat(value),
        // New structured columns
        unit: unit || 'count',
        source: source || 'apple_health',
        data_type: data_type || 'steps',
        is_daily_total: is_daily_total || false,
        start_date: start_date ? new Date(start_date).toISOString() : null,
        end_date: end_date ? new Date(end_date).toISOString() : null,
        // Keep raw for any additional metadata not in structured columns
        raw: {
          // Only store fields that aren't already in dedicated columns
          ...(req.body.metadata || {}),
          original_request_timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date,variable_id'
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      
      // If table doesn't exist, provide helpful error
      if (insertError.code === '42P01') {
        return res.status(500).json({ 
          error: "apple_health_variable_data_points table not found. Please check your database setup.",
          hint: "Expected table: apple_health_variable_data_points with columns: id, user_id, date, variable_id, value, raw, created_at, updated_at"
        });
      }
      
      return res.status(500).json({ 
        error: "Failed to store health data",
        details: insertError.message 
      });
    }

    console.log("✅ Apple Health data stored successfully:", insertedData);

    return res.status(200).json({ 
      success: true,
      message: `Successfully stored ${data_type} data`,
      data: {
        id: insertedData.id,
        variable_id: insertedData.variable_id,
        value,
        date: insertedData.date,
        stored_at: insertedData.created_at
      }
    });

  } catch (error) {
    console.error("❌ API error storing Apple Health data:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 