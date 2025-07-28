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
    const { user_id, data_points, sync_mode = "batch" } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    // Validate user exists
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        error: "User not found",
        user_id 
      });
    }

    console.log("[Apple Health Sync] Starting sync for user:", user_id, "mode:", sync_mode);

    let results = [];
    let successCount = 0;
    let errorCount = 0;

    if (sync_mode === "batch" && Array.isArray(data_points)) {
      // Process batch of data points
      console.log("[Apple Health Sync] Processing batch of", data_points.length, "data points");

      for (const dataPoint of data_points) {
        try {
          const response = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3001"}/api/applehealth/receive`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...dataPoint,
              user_id, // Ensure user_id is set
              raw_data: {
                ...dataPoint.raw_data,
                sync_mode: "batch",
                batch_timestamp: new Date().toISOString()
              }
            })
          });

          const result = await response.json();
          
          if (response.ok) {
            successCount++;
            results.push({
              type: dataPoint.type,
              success: true,
              data: result.data
            });
          } else {
            errorCount++;
            results.push({
              type: dataPoint.type,
              success: false,
              error: result.error,
              status: response.status
            });
          }
        } catch (error) {
          errorCount++;
          results.push({
            type: dataPoint.type,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            status: 'error'
          });
        }
      }
    } else if (sync_mode === "status") {
      // Return sync status and statistics
      const { count: totalPoints } = await supabase
        .from("apple_health_variable_data_points")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id);

      const { data: recentData } = await supabase
        .from("apple_health_variable_data_points")
        .select("variable_id, value, date, created_at, raw")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: variableStats } = await supabase
        .from("apple_health_variable_data_points")
        .select("variable_id")
        .eq("user_id", user_id);

      const variableCounts = variableStats?.reduce((acc: any, point) => {
        acc[point.variable_id] = (acc[point.variable_id] || 0) + 1;
        return acc;
      }, {}) || {};

      return res.status(200).json({
        user_id,
        sync_status: "idle",
        statistics: {
          total_data_points: totalPoints || 0,
          variables_tracked: Object.keys(variableCounts).length,
          variable_breakdown: variableCounts,
          last_sync: recentData?.[0]?.created_at || null
        },
        recent_data: recentData || []
      });
    } else {
      return res.status(400).json({ 
        error: "Invalid sync_mode. Supported modes: 'batch', 'status'",
        received_mode: sync_mode
      });
    }

    // Get updated statistics
    const { count: updatedTotal } = await supabase
      .from("apple_health_variable_data_points")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id);

    const syncResult = {
      user_id,
      sync_mode,
      summary: {
        total_processed: data_points?.length || 0,
        successful: successCount,
        failed: errorCount,
        success_rate: data_points?.length ? (successCount / data_points.length * 100).toFixed(1) + '%' : '0%'
      },
      results,
      updated_statistics: {
        total_data_points: updatedTotal || 0
      },
      timestamp: new Date().toISOString()
    };

    console.log("[Apple Health Sync] Sync completed:", syncResult);

    return res.status(200).json(syncResult);

  } catch (error) {
    console.error("[Apple Health Sync] Error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
} 