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

    const clientId = process.env.NEXT_PUBLIC_OURA_CLIENT_ID;
    
    if (!clientId) {
      console.error("OURA_CLIENT_ID environment variable is not set");
      return res.status(500).json({ 
        error: "Oura integration is not properly configured. Please contact support." 
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.VERCEL_URL || 
                   "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/oura/callback`;
    const scope = "email personal daily heartrate";
    
    const authUrl = `https://cloud.ouraring.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${userId}`;

    res.status(200).json({ authUrl });
  } catch (error) {
    console.error("Error generating Oura auth URL:", error);
    res.status(500).json({ error: "Failed to generate authorization URL" });
  }
} 