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
  const code = req.query.code as string;
  const clientId = process.env.OURA_CLIENT_ID!;
  const clientSecret = process.env.OURA_CLIENT_SECRET!;
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/oura/callback`;

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
    const { error } = await supabaseAdmin.from("oura_tokens").upsert({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        user_id: user_id,
      expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "user_id"
    });

    if (error) {
      console.error("Failed to save token to Supabase:", error);
      return res.status(500).json({ 
        error: "Token save failed", 
        details: error.message,
        code: error.code 
      });
    }

    console.log("✅ Oura Token Response:", tokenData);
    // Redirect to oura-test page with success message
    res.redirect("/oura-test?oura=success");
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).send("OAuth failed");
  }
}
