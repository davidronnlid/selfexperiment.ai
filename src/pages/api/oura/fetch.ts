import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supaBase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  console.log("[Oura Fetch] Starting fetch for user:", user_id);

  // First try to update existing tokens
  try {
    // Get the user's tokens
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

    const ouraToken = tokens[0].access_token;
    const refresh_token = tokens[0].refresh_token;
    const token_id = tokens[0].id;
    console.log(
      "[Oura Fetch] token, refresh_token, token_id:",
      ouraToken,
      refresh_token,
      token_id
    );

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 90);

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
          refresh_token: refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[Oura Fetch] Refreshed token");

        // Update in Supabase
        const { error } = await supabase
          .from("oura_tokens")
          .update({ access_token: data.access_token })
          .eq("id", token_id);

        if (error) {
          console.error("[Oura Fetch] Error updating token:", error);
        }

        return data.access_token;
      } else {
        console.error("[Oura Fetch] Error refreshing token");
        return null;
      }
    }

    let accessToken = ouraToken;

    // Fetch data with retry logic
    const fetchWithRetry = async (endpoint: string) => {
      let response = await fetchData(endpoint, accessToken);
      
      if (response.status === 401) {
        console.log(`[Oura Fetch] ${endpoint}: Token expired, refreshing...`);
        accessToken = await refreshOuraToken();
        if (accessToken) {
          response = await fetchData(endpoint, accessToken);
        }
      }
      
      if (!response.ok) {
        console.error(`[Oura Fetch] ${endpoint} error:`, response.status, response.statusText);
        const errorText = await response.text();
        console.error(`[Oura Fetch] ${endpoint} error body:`, errorText);
        return null;
      }
      
      const data = await response.json();
      console.log(`[Oura Fetch] ${endpoint} data count:`, data.data?.length || 0);
      
      // Debug: Log first item to see structure
      if (data.data && data.data.length > 0) {
        console.log(`[Oura Fetch] ${endpoint} sample data:`, data.data[0]);
      }
      
      return data;
    };

    console.log("[Oura Fetch] Fetching data...");
    const [readinessData, sleepData, hrData] = await Promise.all([
      fetchWithRetry("daily_readiness"),
      fetchWithRetry("daily_sleep"),
      fetchWithRetry("heartrate"),
    ]);

    console.log("[Oura Fetch] Readiness data:", readinessData?.data?.length || 0, "items");
    console.log("[Oura Fetch] Sleep data:", sleepData?.data?.length || 0, "items");
    console.log("[Oura Fetch] HR data:", hrData?.data?.length || 0, "items");

    if (!readinessData || !sleepData || !hrData) {
      return res.status(500).json({ error: "Failed to fetch some data from Oura" });
    }

    const inserts: Record<string, unknown>[] = [];

    // Process readiness data
    for (const item of readinessData.data) {
      console.log("[Oura Fetch] Readiness item:", {
        day: item.day,
        score: item.score,
        temperature_deviation: item.temperature_deviation,
        temperature_trend_deviation: item.temperature_trend_deviation
      });
      
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

    // Process sleep data with detailed logging
    for (const item of sleepData.data) {
      console.log("[Oura Fetch] Sleep item:", {
        day: item.day,
        score: item.score,
        total_sleep_duration: item.total_sleep_duration,
        rem_sleep_duration: item.rem_sleep_duration,
        deep_sleep_duration: item.deep_sleep_duration,
        light_sleep_duration: item.light_sleep_duration,
        efficiency: item.efficiency,
        sleep_latency: item.sleep_latency,
        sleep_timing: item.sleep_timing
      });
      
      // Only insert values that are not null/undefined
      const addSleepMetric = (variable_id: string, value: any) => {
        if (value !== null && value !== undefined) {
          console.log(`[Oura Fetch] Adding ${variable_id} = ${value} for ${item.day}`);
          inserts.push({
            source: "oura",
            variable_id,
            date: item.day,
            value,
            raw: item,
            user_id,
          });
        } else {
          console.log(`[Oura Fetch] Skipping ${variable_id} for ${item.day} - value is null/undefined (${value})`);
        }
      };

      addSleepMetric("sleep_score", item.score);
      addSleepMetric("total_sleep_duration", item.total_sleep_duration);
      addSleepMetric("rem_sleep_duration", item.rem_sleep_duration);
      addSleepMetric("deep_sleep_duration", item.deep_sleep_duration);
      addSleepMetric("light_sleep_duration", item.light_sleep_duration);
      addSleepMetric("efficiency", item.efficiency);
      addSleepMetric("sleep_latency", item.sleep_latency);
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

    console.log(`📝 Inserting ${inserts.length} items to oura_variable_data_points...`);
    
    // Debug: Log some sample inserts
    console.log("Sample inserts:", inserts.slice(0, 5));
    
    const { error: insertErr } = await supabase
      .from("oura_variable_data_points")
      .upsert(inserts, { onConflict: "user_id,variable_id,date" });

    if (insertErr) {
      console.error("[Oura Fetch] Insert error:", insertErr);
      return res.status(500).json({ error: "Failed to insert data" });
    }

    console.log("[Oura Fetch] ✅ Success!");
    return res.status(200).json({ 
      message: "Data fetched and stored successfully",
      stats: {
        readiness: readinessData.data.length,
        sleep: sleepData.data.length,
        heartrate: hrData.data.length,
        inserts: inserts.length
      }
    });

  } catch (error) {
    console.error("[Oura Fetch] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
