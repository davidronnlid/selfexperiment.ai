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
    const { targetDate, userId } = req.body;
    const dateToProcess = targetDate || new Date().toISOString().split("T")[0];

    console.log(
      `[Auto-Logs API] Processing for user: ${userId}, date: ${dateToProcess}`
    );

    // Always use the simplified user-specific function
    if (!userId) {
      console.error("[Auto-Logs API] No user ID provided");
      return res.status(400).json({
        error: "User ID is required for auto-logging",
      });
    }

    // Call the simplified auto-logging function
    console.log(`[Auto-Logs API] Calling create_simple_routine_auto_logs...`);
    const { data, error } = await supabase.rpc(
      "create_simple_routine_auto_logs",
      {
        p_user_id: userId,
        target_date: dateToProcess,
      }
    );

    if (error) {
      console.error("[Auto-Logs API] Database error:", error);
      return res.status(500).json({
        error: "Failed to create auto-logs",
        details: error.message,
        code: error.code,
      });
    }

    console.log(`[Auto-Logs API] Database response:`, data);

    // Process and summarize the results
    const results = data || [];
    const successCount = results.filter(
      (result: any) => result.auto_logged
    ).length;
    const skippedCount = results.filter(
      (result: any) => !result.auto_logged
    ).length;

    console.log(
      `[Auto-Logs API] Results: ${successCount} created, ${skippedCount} skipped`
    );

    return res.status(200).json({
      success: true,
      summary: {
        total_variables_processed: results.length,
        auto_logs_created: successCount,
        skipped: skippedCount,
        errors: 0,
      },
      details: results,
      message: `Successfully created ${successCount} auto-logs${
        skippedCount > 0 ? `, skipped ${skippedCount}` : ""
      }`,
    });
  } catch (error) {
    console.error("[Auto-Logs API] API Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
