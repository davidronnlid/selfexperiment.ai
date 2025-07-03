import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = process.env.OURA_CLIENT_ID!;
  const redirectUri = encodeURIComponent(
    "http://localhost:3000/api/oura/callback"
  );

  // ✅ Scopes now include heartrate so we can access time-series HR
  const scope = "email personal daily heartrate";

  const authUrl = `https://cloud.ouraring.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;

  console.log("🔐 Redirecting to Oura auth URL:", authUrl);
  res.redirect(authUrl);
}
