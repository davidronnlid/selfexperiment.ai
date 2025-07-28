import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, syncType, startDate, endDate } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // For Apple Health, we'll use a custom redirect URL that opens iOS Health app
    // or shows instructions for HealthKit access
    
    // Get the host from the request to support local development on different devices
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    
    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.VERCEL_URL || 
                   `${protocol}://${host}`;
    
    // Build the query parameters for the auth URL
    const params = new URLSearchParams({
      user_id: userId,
      sync_type: syncType || 'all',
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate })
    });
    
    // For Apple Health integration, we'll redirect to a custom authorization page
    // that handles HealthKit permissions and generates a session token
    const authUrl = `${baseUrl}/api/applehealth/callback?${params.toString()}`;

    res.status(200).json({ authUrl });
  } catch (error) {
    console.error("Error generating Apple Health auth URL:", error);
    res.status(500).json({ error: "Failed to generate authorization URL" });
  }
} 