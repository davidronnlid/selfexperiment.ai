import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supaBase";

interface HRData {
  bpm: number;
  source?: string;
  timestamp: string;
}

// Helper to get user_id from Supabase JWT in API route
function getUserIdFromRequest(req: NextApiRequest): string | null {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (!token) return null;
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString()
  );
  return payload.sub || null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("[Oura Fetch] Handler started");

  // Get user_id from JWT
  const user_id = getUserIdFromRequest(req);
  console.log("[Oura Fetch] user_id:", user_id);
  if (!user_id) {
    console.error("[Oura Fetch] No user_id in JWT");
    return res.status(401).json({ error: "No user_id in JWT" });
  }

  // Fetch the Oura token for the current user
  const { data: tokens, error: tokenFetchError } = await supabase
    .from("oura_tokens")
    .select("access_token, refresh_token, id")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (tokenFetchError) {
    console.error("[Oura Fetch] Error fetching tokens:", tokenFetchError);
  }
  console.log("[Oura Fetch] tokens:", tokens);

  if (!tokens?.[0]) {
    console.error("[Oura Fetch] No token for user");
    return res.status(500).json({ error: "No token for user" });
  }

  const token = tokens[0].access_token;
  const refresh_token = tokens[0].refresh_token;
  const token_id = tokens[0].id;
  console.log(
    "[Oura Fetch] token, refresh_token, token_id:",
    token,
    refresh_token,
    token_id
  );

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const startDate = fmt(start);
  const endDate = fmt(end);

  const fetchData = async (ep: string, accessToken: string) => {
    const resp = await fetch(
      `https://api.ouraring.com/v2/usercollection/${ep}?start_date=${startDate}&end_date=${endDate}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return resp;
  };

  // Helper to refresh the Oura token
  async function refreshOuraToken() {
    const clientId = process.env.OURA_CLIENT_ID!;
    const clientSecret = process.env.OURA_CLIENT_SECRET!;
    const response = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!response.ok) throw new Error("Failed to refresh Oura token");
    const tokenData = await response.json();
    // Update token in Supabase
    await supabase
      .from("oura_tokens")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      })
      .eq("id", token_id);
    return tokenData.access_token;
  }

  try {
    console.log("[Oura Fetch] Fetching Oura data for user:", user_id);
    // Try fetching data with the current token
    let readinessRes = await fetchData("daily_readiness", token);
    if (readinessRes.status === 401) {
      // Token expired, refresh and retry
      const newToken = await refreshOuraToken();
      readinessRes = await fetchData("daily_readiness", newToken);
    }
    if (!readinessRes.ok)
      throw new Error(`fetch daily_readiness ${readinessRes.status}`);
    const readinessData = await readinessRes.json();

    let sleepRes = await fetchData("daily_sleep", token);
    if (sleepRes.status === 401) {
      const newToken = await refreshOuraToken();
      sleepRes = await fetchData("daily_sleep", newToken);
    }
    if (!sleepRes.ok) throw new Error(`fetch daily_sleep ${sleepRes.status}`);
    const sleepData = await sleepRes.json();

    let hrRes = await fetchData("heartrate", token);
    if (hrRes.status === 401) {
      const newToken = await refreshOuraToken();
      hrRes = await fetchData("heartrate", newToken);
    }
    if (!hrRes.ok) throw new Error(`fetch heartrate ${hrRes.status}`);
    const hrData = await hrRes.json();

    console.log("⌚ HR data sample:", hrData.data.slice(0, 5));

    const inserts: Record<string, unknown>[] = [];

    for (const item of readinessData.data) {
      inserts.push(
        {
          source: "oura",
          variable_id: "readiness_score",
          date: item.day,
          value: item.score,
          raw: item,
          user_id,
        },
        {
          source: "oura",
          variable_id: "temperature_deviation",
          date: item.day,
          value: item.temperature_deviation,
          raw: item,
          user_id,
        },
        {
          source: "oura",
          variable_id: "temperature_trend_deviation",
          date: item.day,
          value: item.temperature_trend_deviation,
          raw: item,
          user_id,
        }
      );
    }

    for (const item of sleepData.data) {
      inserts.push(
        {
          source: "oura",
          variable_id: "sleep_score",
          date: item.day,
          value: item.score,
          raw: item,
          user_id,
        },
        {
          source: "oura",
          variable_id: "total_sleep_duration",
          date: item.day,
          value: item.total_sleep_duration,
          raw: item,
          user_id,
        },
        {
          source: "oura",
          variable_id: "rem_sleep_duration",
          date: item.day,
          value: item.rem_sleep_duration,
          raw: item,
          user_id,
        },
        {
          source: "oura",
          variable_id: "deep_sleep_duration",
          date: item.day,
          value: item.deep_sleep_duration,
          raw: item,
          user_id,
        },
        {
          source: "oura",
          variable_id: "efficiency",
          date: item.day,
          value: item.efficiency,
          raw: item,
          user_id,
        },
        {
          source: "oura",
          variable_id: "sleep_latency",
          date: item.day,
          value: item.sleep_latency,
          raw: item,
          user_id,
        }
      );
    }

    // Process heart rate data by day
    const hrByDay: { [key: string]: number[] } = {};
    for (const hr of hrData.data) {
      const day = hr.timestamp.split("T")[0];
      if (!hrByDay[day]) hrByDay[day] = [];
      hrByDay[day].push(hr.bpm);
    }

    for (const [day, arr] of Object.entries(hrByDay)) {
      if (arr.length === 0) continue;
      const minHR = Math.min(...arr);
      const avgHR = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      inserts.push(
        {
          source: "oura",
          variable_id: "hr_lowest_true",
          date: day,
          value: minHR,
          raw: null,
          user_id,
        },
        {
          source: "oura",
          variable_id: "hr_average_true",
          date: day,
          value: avgHR,
          raw: null,
          user_id,
        }
      );
    }

    console.log(`📝 Inserting ${inserts.length} items to oura_variable_logs...`);
    const { error: insertErr } = await supabase
      .from("oura_variable_logs")
      .upsert(inserts, { onConflict: "user_id,variable_id,date" });
    if (insertErr) {
      console.error("Supabase insert error:", insertErr);
      return res.status(500).json({ error: insertErr.message });
    }
    console.log("Inserted Oura data:", inserts);

    res.status(200).json({ inserted: inserts.length });
  } catch (e: unknown) {
    const err = e as Error;
    console.error("❌ Oura fetch error:", err);
    if (err.stack) console.error("Stack trace:", err.stack);
    res.status(500).json({ error: err.message || String(err) });
  }
}
