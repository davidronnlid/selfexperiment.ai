import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for token operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user_id = req.query.user_id as string;
  
  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }

  try {
    // Check if user has Apple Health tokens
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("apple_health_tokens")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (tokenError && tokenError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Error checking Apple Health tokens:", tokenError);
      return res.status(500).json({ error: "Database error" });
    }

    const connected = !!tokenData;

    // Get data points count if connected
    let dataPoints = 0;
    let hasRealData = false;

    if (connected) {
      const { count, error: countError } = await supabaseAdmin
        .from("apple_health_variable_data_points")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id);

      if (!countError) {
        dataPoints = count || 0;
        hasRealData = dataPoints > 0;
      }
    }

    res.status(200).json({
      connected,
      dataPoints,
      hasRealData,
      user_id,
      status: connected ? "connected" : "not_connected",
      last_checked: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error checking Apple Health status:", error);
    res.status(500).json({ error: "Failed to check status" });
  }
} 