import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";

function getCookiesFromReq(req: NextApiRequest) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return [];
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Debug: print cookies received
  console.log("[Withings Auth] req.headers.cookie:", req.headers.cookie);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return getCookiesFromReq(req);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            res.setHeader("Set-Cookie", `${name}=${value}; Path=/; HttpOnly`);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("[Withings Auth] supabase.auth.getUser() result:", user);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const clientId = process.env.WITHINGS_ClientID!;
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/withings/callback`;
  const state = `withings_${user.id}_${Math.random().toString(36).slice(2)}`;

  const url = `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${clientId}&state=${state}&scope=user.metrics&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;
  res.redirect(url);
}
