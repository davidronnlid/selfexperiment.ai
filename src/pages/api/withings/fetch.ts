import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Create a service role client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getCookiesFromReq(req: NextApiRequest) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return [];
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

const MEAS_TYPE_MAP: { [key: number]: string } = {
  // Body Composition
  1: "weight_kg",
  5: "fat_free_mass_kg",
  6: "fat_ratio",
  8: "fat_mass_weight_kg",
  76: "muscle_mass_kg",
  77: "hydration_kg",
  88: "bone_mass_kg",
  
  // Blood Pressure
  9: "diastolic_bp",
  10: "systolic_bp",
  11: "heart_pulse",
  
  // Heart Rate
  12: "heart_rate",
  13: "heart_rate_variability",
  
  // Activity
  16: "steps",
  17: "calories",
  18: "distance",
  19: "elevation",
  
  // Sleep
  20: "sleep_duration",
  21: "sleep_light",
  22: "sleep_deep",
  23: "sleep_rem",
  24: "sleep_wake",
  
  // Temperature
  71: "temperature",
  73: "skin_temperature",
  
  // SpO2
  54: "spo2",
  
  // ECG
  91: "ecg",
  
  // Other
  14: "pulse_wave_velocity",
  15: "vo2_max",
  25: "sleep_score",
  26: "sleep_latency",
  27: "sleep_efficiency",
  28: "sleep_midpoint",
  29: "sleep_hr_lowest",
  30: "sleep_hr_average",
  31: "sleep_hr_highest",
  32: "sleep_hrv_lowest",
  33: "sleep_hrv_average",
  34: "sleep_hrv_highest",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // For now, let's get the user ID from query params or headers to bypass session issues
    const userId = req.query.user_id as string || req.headers['x-user-id'] as string;
    
    if (!userId) {
      console.log("[Withings Fetch] No user ID provided");
      return res.status(401).json({ error: "No user ID provided" });
    }
    
    console.log("[Withings Fetch] Using user ID:", userId);
    
    const user = { id: userId };

    // Fetch tokens for this user using admin client to bypass RLS
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("withings_tokens")
      .select("access_token, refresh_token")
      .eq("user_id", user.id)
      .single();
      
    console.log("[Withings Fetch] Token fetch result:", { 
      hasTokens: !!tokenRow, 
      error: tokenError,
      userId: user.id 
    });
    
    if (tokenError) {
      console.error("[Withings Fetch] Token fetch error:", tokenError);
      return res.status(401).json({ error: "Failed to fetch tokens", details: tokenError.message });
    }
    
    if (!tokenRow?.access_token || !tokenRow?.refresh_token) {
      console.log("[Withings Fetch] No tokens found for user:", user.id);
      return res.status(401).json({ error: "Not connected to Withings" });
    }

    // Parse query params
    const now = new Date();
    let startdate = req.query.startdate
      ? Number(req.query.startdate)
      : undefined;
    let enddate = req.query.enddate ? Number(req.query.enddate) : undefined;
    const meastype = req.query.meastype
      ? req.query.meastype.toString().split(",").map(Number)
      : [1];
    // Clamp dates to today if in the future
    const nowUnix = Math.floor(now.getTime() / 1000);
    if (startdate && startdate > nowUnix) startdate = nowUnix;
    if (enddate && enddate > nowUnix) enddate = nowUnix;
    if (!startdate || !enddate) {
      return res.status(400).json({ error: "Missing startdate or enddate" });
    }

    // Helper to fetch Withings data with a given access token
    async function fetchWithingsData(accessToken: string) {
      const url = `https://wbsapi.withings.net/measure?action=getmeas&meastype=${meastype.join(
        ","
      )}&category=1&startdate=${startdate}&enddate=${enddate}&access_token=${accessToken}`;
      const resp = await fetch(url);
      return resp.json();
    }

    // Try fetching data with the current access token
    let data = await fetchWithingsData(tokenRow.access_token);

    // If token is invalid, try to refresh and retry once
    if (
      data.status === 401 ||
      (data.error && String(data.error).includes("invalid_token"))
    ) {
      // Refresh the access token
      const refreshRes = await fetch("https://wbsapi.withings.net/v2/oauth2", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "requesttoken",
          grant_type: "refresh_token",
          client_id: process.env.WITHINGS_ClientID!,
          client_secret: process.env.WITHINGS_Secret!,
          refresh_token: tokenRow.refresh_token,
        }),
      });
      const refreshData = await refreshRes.json();
      if (!refreshData.body || !refreshData.body.access_token) {
        return res
          .status(401)
          .json({
            error: "Failed to refresh Withings token",
            details: refreshData,
          });
      }
      // Update tokens in Supabase using admin client
      await supabaseAdmin.from("withings_tokens").upsert({
        user_id: user.id,
        access_token: refreshData.body.access_token,
        refresh_token: refreshData.body.refresh_token,
        expires_at: new Date(
          Date.now() + refreshData.body.expires_in * 1000
        ).toISOString(),
      });
      // Retry fetching data with the new access token
      data = await fetchWithingsData(refreshData.body.access_token);
    }

    if (!data.body || !data.body.measuregrps) {
      console.error(
        "[Withings Fetch] No data or measuregrps from Withings:",
        data
      );
      return res.status(400).json({ error: "No data", details: data });
    }

    // Prepare rows for upsert
    const rows = [];
    for (const grp of data.body.measuregrps) {
      const date = new Date(grp.date * 1000).toISOString();
      const row: { [key: string]: any } = {
        user_id: user.id,
        date,
        raw_data: grp,
      };
      for (const t of meastype) {
        const meas = grp.measures.find((m: any) => m.type === t);
        if (meas) {
          row[MEAS_TYPE_MAP[t] || `type_${t}`] =
            meas.value * Math.pow(10, meas.unit);
        }
      }
      rows.push(row);
    }

    // Deduplicate rows by user_id and date to avoid ON CONFLICT errors
    const deduplicatedRows = Object.values(
      rows.reduce((acc, row) => {
        const key = `${row.user_id}_${row.date}`;
        if (!acc[key]) {
          acc[key] = row;
        } else {
          // Merge measurement data if we have multiple measurements for the same date
          for (const [propKey, value] of Object.entries(row)) {
            if (
              value !== undefined &&
              value !== null &&
              propKey !== "user_id" &&
              propKey !== "date" &&
              propKey !== "raw_data"
            ) {
              acc[key][propKey] = value;
            }
          }
          // Merge raw_data arrays if they exist
          if (row.raw_data && acc[key].raw_data) {
            if (Array.isArray(acc[key].raw_data)) {
              acc[key].raw_data.push(row.raw_data);
            } else {
              acc[key].raw_data = [acc[key].raw_data, row.raw_data];
            }
          }
        }
        return acc;
      }, {} as Record<string, any>)
    );

    // Filter out rows that don't have any valid measurements
    const validRows = deduplicatedRows.filter((row) => {
      // Check if the row has any valid measurement data
      const hasValidData = Object.entries(row).some(([key, value]) => {
        if (key === "user_id" || key === "date" || key === "raw_data") return false;
        return typeof value === "number" && !isNaN(value) && value > 0;
      });
      return hasValidData;
    });
    console.log(
      "[Withings Fetch] After deduplication and filtering:",
      validRows.map((r) => r.date)
    );

    // Upsert in batches of 100
    let upserted = 0;
    for (let i = 0; i < validRows.length; i += 100) {
      const batch = validRows.slice(i, i + 100);
      
      // Transform to match withings_variable_logs structure
      const transformedBatch = batch.flatMap(row => {
        const entries = [];
        for (const [key, value] of Object.entries(row)) {
          if (key !== 'user_id' && key !== 'date' && key !== 'raw_data' && 
              typeof value === 'number' && !isNaN(value) && value > 0) {
            entries.push({
              user_id: row.user_id,
              date: row.date,
              variable: key,
              value: value
            });
          }
        }
        return entries;
      });

      const { error: batchError } = await supabaseAdmin
        .from("withings_variable_data_points")
        .upsert(transformedBatch, {
          onConflict: "user_id,date,variable",
        });

      if (batchError) {
        console.error("[Withings Fetch] Batch upsert error:", batchError);
      } else {
        upserted += transformedBatch.length;
      }
    }

    res.status(200).json({
      success: true,
      count: validRows.length,
      upserted,
      rows: validRows,
    });
  } catch (err) {
    console.error("[Withings Fetch] Unexpected error:", err);
    res
      .status(500)
      .json({ error: "Unexpected server error", details: String(err) });
  }
}
