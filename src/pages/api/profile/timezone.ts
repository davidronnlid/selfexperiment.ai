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
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { timezone } = req.body;

    if (!timezone) {
      return res.status(400).json({ error: "Timezone is required" });
    }

    // Update the user's timezone in the profiles table
    const { error } = await supabase
      .from("profiles")
      .update({ timezone })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating timezone:", error);
      return res.status(500).json({ error: "Failed to update timezone" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Timezone update error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
} 