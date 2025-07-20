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
  console.log("[Withings Auth] Query params:", req.query);

  // First try to get user from headers or query params (client-side approach)
  const headerUser = getUserFromRequest(req);
  let user = null;
  
  if (headerUser) {
    console.log("[Withings Auth] Using user from query/headers:", headerUser.id);
    user = headerUser;
  } else {
    // Only try Supabase auth if we have cookies
    if (req.headers.cookie) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return getCookiesFromReq(req);
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                const cookieValue = options 
                  ? `${name}=${value}; Path=${options.path || '/'}; ${options.httpOnly ? 'HttpOnly; ' : ''}${options.secure ? 'Secure; ' : ''}${options.sameSite ? `SameSite=${options.sameSite}; ` : ''}`
                  : `${name}=${value}; Path=/; HttpOnly`;
                res.setHeader("Set-Cookie", cookieValue);
              });
            },
          },
        }
      );

      try {
        console.log("[Withings Auth] Trying Supabase auth with cookies...");
        const {
          data: { user: userData },
          error: userError,
        } = await supabase.auth.getUser();
        
        console.log("[Withings Auth] Supabase user data:", userData ? "FOUND" : "NOT FOUND");
        
        if (userData && !userError) {
          user = userData;
          console.log("[Withings Auth] Using user from Supabase:", user.id);
        } else {
          console.log("[Withings Auth] Supabase auth failed:", userError?.message || "No user found");
        }
      } catch (error) {
        console.log("[Withings Auth] Supabase auth error:", error);
      }
    } else {
      console.log("[Withings Auth] No cookies found, skipping Supabase auth");
    }
  }

  // If we still don't have a user, return an error
  if (!user) {
    console.log("[Withings Auth] No user found from any method");
    return res.status(401).json({ 
      error: "Authentication failed", 
      message: "Please log in to connect your Withings account. Make sure to access this page from the application."
    });
  }

  try {
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
      "http://localhost:3000";
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
