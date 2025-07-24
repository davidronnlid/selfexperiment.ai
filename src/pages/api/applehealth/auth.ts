import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // For Apple Health, we'll use a custom redirect URL that opens iOS Health app
    // or shows instructions for HealthKit access
    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.VERCEL_URL || 
                   "http://localhost:3000";
    
    // For Apple Health integration, we'll redirect to a custom authorization page
    // that handles HealthKit permissions and generates a session token
    const authUrl = `${baseUrl}/api/applehealth/callback?user_id=${userId}`;

    res.status(200).json({ authUrl });
  } catch (error) {
    console.error("Error generating Apple Health auth URL:", error);
    res.status(500).json({ error: "Failed to generate authorization URL" });
  }
} 