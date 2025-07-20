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

  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  try {
    // Delete the user's Withings tokens
    const { error: tokenError } = await supabaseAdmin
      .from("withings_tokens")
      .delete()
      .eq("user_id", user_id);

    if (tokenError) {
      console.error("[Withings Disconnect] Error deleting tokens:", tokenError);
      return res.status(500).json({
        success: false,
        error: "Failed to delete tokens",
      });
    }

    // Optionally, also delete the user's Withings data points
    const { error: dataError } = await supabaseAdmin
      .from("withings_variable_data_points")
      .delete()
      .eq("user_id", user_id);

    if (dataError) {
      console.error("[Withings Disconnect] Error deleting data:", dataError);
      // Don't fail the request if data deletion fails, just log it
    }

    console.log(`[Withings Disconnect] Successfully disconnected user ${user_id}`);

    return res.json({
      success: true,
      message: "Account disconnected successfully",
    });
  } catch (error) {
    console.error("[Withings Disconnect] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
} 