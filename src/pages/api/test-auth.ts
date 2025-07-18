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

  try {
    // First try to get user from headers
    const userId = req.headers['x-user-id'] as string;
    const userEmail = req.headers['x-user-email'] as string;
    
    if (userId && userEmail) {
      console.log("[Test Auth] Using user from headers:", userId);
      return res.status(200).json({
        authenticated: true,
        user: {
          id: userId,
          email: userEmail,
        },
        session: {
          user_id: userId,
          email: userEmail,
        },
      });
    }
    
    // Fallback to Supabase auth
    console.log("[Test Auth] No user in headers, trying Supabase auth...");
    const {
      data: { user: userData },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[Test Auth] User error:", userError);
      return res.status(401).json({
        authenticated: false,
        error: "User error",
        details: userError.message,
      });
    }

    if (!userData) {
      return res.status(401).json({
        authenticated: false,
        error: "No user found",
        message: "Please log in to continue",
      });
    }

    return res.status(200).json({
      authenticated: true,
      user: {
        id: userData.id,
        email: userData.email,
        created_at: userData.created_at,
      },
      session: {
        user_id: userData.id,
        email: userData.email,
      },
    });
  } catch (error) {
    console.error("[Test Auth] Unexpected error:", error);
    return res.status(500).json({
      authenticated: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
} 