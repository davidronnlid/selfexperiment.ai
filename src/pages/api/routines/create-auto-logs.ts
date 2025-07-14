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

    // If userId is provided, create a user-specific version
    if (userId) {
      // Call the user-specific auto-logging function
      const { data, error } = await supabase.rpc(
        "create_user_routine_auto_logs",
        {
          p_user_id: userId,
          target_date: dateToProcess,
        }
      );

      if (error) {
        console.error("Error creating user-specific auto-logs:", error);
        return res.status(500).json({
          error: "Failed to create user-specific auto-logs",
          details: error.message,
        });
      }

      // Process and summarize the results
      const results = data || [];
      const successCount = results.filter(
        (result: any) => result.auto_logged
      ).length;
      const skippedCount = results.filter(
        (result: any) => !result.auto_logged
      ).length;
      const errors = results.filter(
        (result: any) =>
          result.error_message &&
          result.error_message !== "Manual log exists - skipped" &&
          result.error_message !== "Auto-log already exists"
      );

      return res.status(200).json({
        success: true,
        summary: {
          total_routines_processed: results.length,
          auto_logs_created: successCount,
          skipped: skippedCount,
          errors: errors.length,
        },
        details: results,
        message: `Successfully created ${successCount} auto-logs for user${
          skippedCount > 0 ? `, skipped ${skippedCount}` : ""
        }${errors.length > 0 ? `, with ${errors.length} errors` : ""}`,
      });
    }

    // Fallback to original system-wide function if no userId provided
    const { data, error } = await supabase.rpc("create_routine_auto_logs", {
      target_date: dateToProcess,
    });

    if (error) {
      console.error("Error creating auto-logs:", error);
      return res.status(500).json({
        error: "Failed to create auto-logs",
        details: error.message,
      });
    }

    // Process and summarize the results
    const results = data || [];
    const successCount = results.filter(
      (result: any) => result.auto_logged
    ).length;
    const skippedCount = results.filter(
      (result: any) => !result.auto_logged
    ).length;
    const errors = results.filter(
      (result: any) =>
        result.error_message &&
        result.error_message !== "Manual log exists - skipped" &&
        result.error_message !== "Auto-log already exists"
    );

    return res.status(200).json({
      success: true,
      summary: {
        total_routines_processed: results.length,
        auto_logs_created: successCount,
        skipped: skippedCount,
        errors: errors.length,
      },
      details: results,
      message: `Successfully created ${successCount} auto-logs${
        skippedCount > 0 ? `, skipped ${skippedCount}` : ""
      }${errors.length > 0 ? `, with ${errors.length} errors` : ""}`,
    });
  } catch (error) {
    console.error("API Error creating auto-logs:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
