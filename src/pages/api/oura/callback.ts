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

  // Get user_id from state parameter
  const user_id = req.query.state as string;
  if (!user_id) {
    console.error("[Oura Callback] No user_id found in state param");
    return res.status(401).send("No user_id found in state param");
  }

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

    // Save access_token, refresh_token, and user_id to Supabase
    const { error } = await supabase.from("oura_tokens").insert([
      {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        user_id: user_id,
      },
    ]);

    if (error) {
      console.error("Failed to save token to Supabase:", error.message);
      return res.status(500).send("Token saved failed.");
    }

    console.log("✅ Oura Token Response:", tokenData);
    // Redirect to analytics page with success message
    res.redirect("/analytics?oura=success");
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).send("OAuth failed");
  }
}
