import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supaBase";
import { PlannedRoutineLog } from "@/utils/batchRoutineLogging";
import { getUserDisplayUnit } from "@/utils/variableUtils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, logs }: { userId: string; logs: PlannedRoutineLog[] } = req.body;

    console.log("Batch log API called with:", {
      userId,
      logsCount: logs?.length,
      logs: logs?.slice(0, 2) // Log first 2 logs for debugging
    });

    if (!userId || !logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process each log
    for (const log of logs) {
      try {
        // Check if a log already exists for this date/time/variable
        const { data: existingLogs } = await supabase
          .from("variable_logs")
          .select("id")
          .eq("user_id", userId)
          .eq("variable_id", log.variable_id)
          .gte("logged_at", `${log.date}T00:00:00`)
          .lte("logged_at", `${log.date}T23:59:59`);

        if (existingLogs && existingLogs.length > 0) {
          skipped++;
          continue;
        }

        // Create the log timestamp
        const logTimestamp = `${log.date}T${log.time_of_day}:00`;

        // Get user's preferred unit for this variable (with fallback to default_unit)
        let preferredUnit = log.default_unit || null;
        try {
          const userUnit = await getUserDisplayUnit(userId, log.variable_id);
          if (userUnit) {
            preferredUnit = userUnit;
          }
        } catch (error) {
          console.warn(`Failed to get user preferred unit for variable ${log.variable_id}:`, error);
          // Keep the default_unit as fallback
        }

        // Convert default_value to number if it's a string
        const displayValue = typeof log.default_value === 'string' 
          ? parseFloat(log.default_value) || 0 
          : log.default_value;

        console.log(`Inserting log for ${log.variable_name}:`, {
          user_id: userId,
          variable_id: log.variable_id,
          display_value: displayValue,
          display_unit: preferredUnit,
          source: "routine",
          logged_at: logTimestamp,
          notes: `Auto-generated from routine: ${log.routine_name}`,
        });

        // Insert the log
        const { error: insertError } = await supabase
          .from("variable_logs")
          .insert({
            user_id: userId,
            variable_id: log.variable_id,
            display_value: displayValue,
            display_unit: preferredUnit,
            source: "routine",
            logged_at: logTimestamp,
            notes: `Auto-generated from routine: ${log.routine_name}`,
          });

        if (insertError) {
          errors.push(`Failed to create log for ${log.variable_name}: ${insertError.message}`);
        } else {
          created++;
        }
      } catch (error) {
        errors.push(`Error processing log for ${log.variable_name}: ${error}`);
      }
    }

    return res.status(200).json({
      success: true,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Created ${created} logs, skipped ${skipped} duplicates${
        errors.length > 0 ? `, with ${errors.length} errors` : ""
      }`,
    });
  } catch (error) {
    console.error("Batch log error:", error);
    return res.status(500).json({
      error: "Failed to create batch logs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
} 