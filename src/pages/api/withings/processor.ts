import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Create a service role client that bypasses RLS
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

  const { action, user_id } = req.body;

  if (!action || !user_id) {
    return res.status(400).json({ error: "Missing action or user_id" });
  }

  try {
    switch (action) {
      case "get-status":
        // Check if user has valid tokens
        const { data: tokens, error: tokenError } = await supabaseAdmin
          .from("withings_tokens")
          .select("*")
          .eq("user_id", user_id)
          .single();

        if (tokenError || !tokens) {
          return res.json({
            success: false,
            error: "No Withings tokens found for user",
          });
        }

        // Check if token is expired
        const now = new Date();
        const expiresAt = new Date(tokens.expires_at);
        if (now > expiresAt) {
          return res.json({
            success: false,
            error: "Withings token expired",
          });
        }

        return res.json({
          success: true,
          data: {
            connected: true,
            lastSync: tokens.updated_at,
          },
        });

      case "get-data-count":
        // Get count of data points for user
        const { count, error: countError } = await supabaseAdmin
          .from("withings_variable_data_points")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user_id);

        if (countError) {
          return res.json({
            success: false,
            error: "Failed to get data count",
          });
        }

        return res.json({
          success: true,
          data_count: count || 0,
        });

      case "sync":
        // Call the Supabase edge function for sync
        const { meastype, startdate, enddate } = req.body;
        
        if (!meastype || !startdate || !enddate) {
          return res.status(400).json({ 
            success: false, 
            error: "Missing meastype, startdate, or enddate" 
          });
        }

        const syncResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/withings-processor`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              action: "sync",
              userId: user_id,
              meastype,
              startdate,
              enddate,
            }),
          }
        );

        const syncResult = await syncResponse.json();

        if (syncResult.success) {
          return res.json({
            success: true,
            dataCount: syncResult.data?.dataCount || 0,
            message: syncResult.data?.message || "Sync completed successfully",
          });
        } else {
          return res.json({
            success: false,
            error: syncResult.error || "Sync failed",
          });
        }

      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("[Withings Processor] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
} 