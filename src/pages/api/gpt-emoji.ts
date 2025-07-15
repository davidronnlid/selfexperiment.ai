import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";

// -------------------
// Simple in-memory rate limiter (per Node process)
// -------------------
const RATE_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;
// Map<userId|ip, { count: number, reset: number }>
const rateCache: Map<string, { count: number; reset: number }> = new Map();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateCache.get(key);
  if (!entry || entry.reset < now) {
    rateCache.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  entry.count += 1;
  return false;
}

function getCookiesFromReq(req: NextApiRequest) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return [] as { name: string; value: string }[];
  return cookieHeader.split(";").map((c) => {
    const [name, ...rest] = c.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

function getSupabase(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return getCookiesFromReq(req);
        },
        setAll(cookies) {
          cookies.forEach(({ name, value }) => {
            res.setHeader("Set-Cookie", `${name}=${value}; Path=/; HttpOnly`);
          });
        },
      },
    }
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const supabase = getSupabase(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { variable } = req.body as { variable?: string };

  // Input validation – non-empty string, max 50 chars, only letters/spaces
  if (!variable || typeof variable !== "string" || variable.trim().length === 0) {
    return res.status(400).json({ error: "Variable is required" });
  }
  if (variable.length > 50) {
    return res.status(400).json({ error: "Variable too long" });
  }

  // Rate limiting (per user id)
  if (isRateLimited(user.id)) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  const formattedVariable =
    variable.charAt(0).toUpperCase() + variable.slice(1).toLowerCase();

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an assistant that only responds with a single emoji." },
          { role: "user", content: `Suggest a single emoji that best represents the variable \"${formattedVariable}\" for a self-tracking app. Only return the emoji.` },
        ],
        max_tokens: 5,
        temperature: 0.7,
      }),
    });

    const data = await openaiRes.json();

    const emoji = data.choices?.[0]?.message?.content?.trim() || "🆕";
    res.status(200).json({ emoji });
  } catch (e) {
    console.error("GPT Emoji error", e);
    res.status(500).json({ error: "OpenAI request failed" });
  }
}
