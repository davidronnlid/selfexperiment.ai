import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supaBase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const code = req.query.code as string;
  const clientId = process.env.OURA_CLIENT_ID!;
  const clientSecret = process.env.OURA_CLIENT_SECRET!;
  const redirectUri = "http://localhost:3000/api/oura/callback";

  try {
    const response = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token request failed with status ${response.status}`);
    }

    const tokenData = await response.json();

    // Save access_token and refresh_token to Supabase
    const { error } = await supabase.from("oura_tokens").insert([
      {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      },
    ]);

    if (error) {
      console.error("Failed to save token to Supabase:", error.message);
      return res.status(500).send("Token saved failed.");
    }

    console.log("✅ Oura Token Response:", tokenData);
    res.status(200).send("✅ Oura Connected! You can close this tab.");
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).send("OAuth failed");
  }
}
