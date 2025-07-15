import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const isDevelopment = process.env.NODE_ENV === "development";
  const redirectUrl = isDevelopment 
    ? "http://localhost:3000/log/now"
    : "https://modularhealth.netlify.app/log/now";

  // Redirect to Google OAuth with our custom redirect URL
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
    `response_type=code&` +
    `scope=openid email profile&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.redirect(googleAuthUrl);
} 