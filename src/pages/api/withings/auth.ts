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

// Helper function to extract user from request headers or query params
function getUserFromRequest(req: NextApiRequest) {
  // First try query parameters (for direct navigation)
  const userId = req.query.user_id as string;
  const userEmail = req.query.user_email as string;
  
  if (userId && userEmail) {
    return {
      id: userId,
      email: decodeURIComponent(userEmail),
    };
  }
  
  // Fallback to headers (for fetch requests)
  const headerUserId = req.headers['x-user-id'] as string;
  const headerUserEmail = req.headers['x-user-email'] as string;
  
  if (headerUserId && headerUserEmail) {
    return {
      id: headerUserId,
      email: headerUserEmail,
    };
  }
  
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Debug: print cookies received
  console.log("[Withings Auth] req.headers.cookie:", req.headers.cookie);
  console.log("[Withings Auth] All headers:", req.headers);

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
    // Debug: print all headers to understand the session issue
    console.log("[Withings Auth] All request headers:", Object.keys(req.headers));
    console.log("[Withings Auth] Cookie header:", req.headers.cookie);
    
    // First try to get user from headers or query params (client-side approach)
    const headerUser = getUserFromRequest(req);
    let user = null;
    
    if (headerUser) {
      console.log("[Withings Auth] Using user from headers:", headerUser.id);
      user = headerUser;
    } else {
      // Fallback to Supabase auth
      console.log("[Withings Auth] No user in headers, trying Supabase auth...");
      const {
        data: { user: userData },
        error: userError,
      } = await supabase.auth.getUser();
      
      console.log("[Withings Auth] User data:", userData ? "FOUND" : "NOT FOUND");
      console.log("[Withings Auth] User error:", userError);
      
      if (userError) {
        console.error("[Withings Auth] Authentication error:", userError);
        return res.status(401).json({ 
          error: "Authentication failed", 
          details: userError.message,
          message: "Please log in to connect your Withings account"
        });
      }
      
      if (!userData) {
      console.log("[Withings Auth] No user found");
      return res.status(401).json({ 
        error: "Not authenticated",
        message: "Please log in to connect your Withings account"
      });
      }
      
      user = userData;
      console.log("[Withings Auth] Using user from Supabase:", user.id);
    }

    const clientId = process.env.WITHINGS_ClientID;
    if (!clientId) {
      console.error("[Withings Auth] WITHINGS_ClientID not configured");
      return res.status(500).json({ 
        error: "Withings integration not configured" 
      });
    }

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000"; // Updated to use port 3000
    const redirectUri = `${baseUrl}/api/withings/callback`;
    const state = `withings_${user.id}_${Math.random().toString(36).slice(2)}`;

    console.log("[Withings Auth] Redirecting to Withings OAuth with:", {
      clientId,
      redirectUri,
      state,
      userId: user.id
    });

    const url = `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${clientId}&state=${state}&scope=user.metrics&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;
    
    res.redirect(url);
  } catch (error) {
    console.error("[Withings Auth] Unexpected error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
