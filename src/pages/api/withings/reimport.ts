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

// Supported Withings measurement types
const MEAS_TYPES = [
  { type: 1, name: "weight_kg" }, // Weight (kg)
  { type: 5, name: "fat_free_mass_kg" }, // Fat-free mass (kg)
  { type: 6, name: "fat_ratio" }, // Fat ratio (%)
  { type: 8, name: "fat_mass_weight_kg" }, // Fat mass weight (kg)
  { type: 76, name: "muscle_mass_kg" }, // Muscle mass (kg)
  { type: 77, name: "hydration_kg" }, // Hydration (kg)
  { type: 88, name: "bone_mass_kg" }, // Bone mass (kg)
];

async function reimportAllWithingsData(
  supabase: any,
  user_id: string,
  access_token: string
): Promise<{
  upserted: number;
  totalBatches: number;
  batchesCompleted: number;
  rowsFetched: number;
  totalAvailable: number;
}> {
  // Fetch refresh_token from Supabase
  const { data: tokenRow, error: tokenError } = await supabase
    .from("withings_tokens")
    .select("refresh_token, expires_at")
    .eq("user_id", user_id)
    .single();

  if (tokenError) {
    console.error(
      `[Withings Reimport] Error fetching tokens for user ${user_id}:`,
      tokenError
    );
    throw new Error(`Failed to fetch Withings tokens: ${tokenError.message}`);
  }

  if (!tokenRow?.refresh_token) {
    console.error(
      `[Withings Reimport] No refresh token found for user ${user_id}. Token row:`,
      tokenRow
    );
    throw new Error(
      "No refresh_token found for user. Please re-authorize Withings integration."
    );
  }

  console.log(
    `[Withings Reimport] Found refresh token for user ${user_id}. Token expires at:`,
    tokenRow.expires_at
  );

  // Fetch in 360-day batches from 2009-05-01 to today
  const startDate = new Date("2009-05-01");
  const endDate = new Date();
  let batchStart = new Date(startDate);
  let batchEnd = new Date(startDate);
  batchEnd.setDate(batchEnd.getDate() + 359);
  const allRows: { [key: string]: any }[] = [];
  let currentAccessToken = access_token;
  let currentRefreshToken = tokenRow.refresh_token;

  let batchIndex = 0;
  const totalBatches = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (360 * 24 * 60 * 60 * 1000)
  );

  console.log(
    `[Withings Reimport] Starting re-import for user ${user_id} from ${startDate.toISOString()} to ${endDate.toISOString()}`
  );

  while (batchStart < endDate) {
    const startUnix = Math.floor(batchStart.getTime() / 1000);
    const endUnix = Math.floor(
      Math.min(batchEnd.getTime(), endDate.getTime()) / 1000
    );
    const url = `https://wbsapi.withings.net/measure?action=getmeas&meastype=${MEAS_TYPES.map(
      (m) => m.type
    ).join(
      ","
    )}&category=1&startdate=${startUnix}&enddate=${endUnix}&access_token=${currentAccessToken}`;

    console.log(
      `[Withings Reimport] Fetching batch: ${new Date(
        startUnix * 1000
      ).toISOString()} to ${new Date(endUnix * 1000).toISOString()}`
    );

    let resp = await fetch(url);
    let data = await resp.json();

    // Debug: Log the full API response for this batch
    console.log(
      "[Withings Reimport][DEBUG] Raw API response:",
      JSON.stringify(data, null, 2)
    );

    // Handle rate limit (601)
    if (data.status === 601 && data.body?.wait_seconds) {
      console.log(
        `[Withings Reimport] Rate limited. Waiting ${
          data.body.wait_seconds
        } seconds before retrying batch ${batchIndex + 1}/${totalBatches}...`
      );
      // Optionally, you could send progress to the client here
      await new Promise((res) =>
        setTimeout(res, data.body.wait_seconds * 1000)
      );
      continue; // Retry the same batch
    }

    // If token is invalid, try to refresh and retry once
    if (
      data.status === 401 ||
      (data.error && String(data.error).includes("invalid_token"))
    ) {
      console.log(
        "[Withings Reimport] Access token invalid, attempting to refresh..."
      );

      // Refresh the access token
      const refreshRes = await fetch("https://wbsapi.withings.net/v2/oauth2", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "requesttoken",
          grant_type: "refresh_token",
          client_id: process.env.WITHINGS_ClientID!,
          client_secret: process.env.WITHINGS_Secret!,
          refresh_token: currentRefreshToken,
        }),
      });

      const refreshData = await refreshRes.json();

      // Log the refresh response for debugging
      console.log(
        "[Withings Reimport][DEBUG] Refresh token response:",
        JSON.stringify(refreshData, null, 2)
      );

      if (!refreshData.body || !refreshData.body.access_token) {
        // Provide more specific error information
        const errorMsg = refreshData.error || "Unknown error";
        const errorDetails = refreshData.body || refreshData;

        console.error(
          "[Withings Reimport] Token refresh failed:",
          JSON.stringify({ error: errorMsg, details: errorDetails }, null, 2)
        );

        throw new Error(
          `Failed to refresh Withings token. Error: ${errorMsg}. ` +
            `This usually means the refresh token has expired or been revoked. ` +
            `Please re-authorize the Withings integration.`
        );
      }
      // Update tokens in Supabase
      await supabase.from("withings_tokens").upsert({
        user_id: user_id,
        access_token: refreshData.body.access_token,
        refresh_token: refreshData.body.refresh_token,
        expires_at: new Date(
          Date.now() + refreshData.body.expires_in * 1000
        ).toISOString(),
      });
      // Retry fetching data with the new access token
      currentAccessToken = refreshData.body.access_token;
      currentRefreshToken = refreshData.body.refresh_token;
      const retryUrl = `https://wbsapi.withings.net/measure?action=getmeas&meastype=${MEAS_TYPES.map(
        (m) => m.type
      ).join(
        ","
      )}&category=1&startdate=${startUnix}&enddate=${endUnix}&access_token=${currentAccessToken}`;
      resp = await fetch(retryUrl);
      data = await resp.json();
      // Debug: Log the full API response after token refresh
      console.log(
        "[Withings Reimport][DEBUG] Raw API response after token refresh:",
        JSON.stringify(data, null, 2)
      );
    }

    if (data.body && data.body.measuregrps) {
      console.log(
        `[Withings Reimport] Found ${data.body.measuregrps.length} measurement groups in this batch`
      );
      // Debug: Log the first 3 measurement groups for inspection
      console.log(
        "[Withings Reimport][DEBUG] First 3 measurement groups:",
        JSON.stringify(data.body.measuregrps.slice(0, 3), null, 2)
      );
      for (const grp of data.body.measuregrps) {
        const date = new Date(grp.date * 1000).toISOString();
        const row: { [key: string]: any } = { user_id, date, raw_data: grp };
        for (const m of MEAS_TYPES) {
          const meas = grp.measures.find((x: any) => x.type === m.type);
          if (meas) {
            row[m.name] = meas.value * Math.pow(10, meas.unit);
          }
        }
        allRows.push(row);
      }
    } else {
      // Debug: No measurement groups found
      console.log(
        "[Withings Reimport][DEBUG] No measurement groups found in this batch:",
        JSON.stringify(data, null, 2)
      );
    }

    // Move to next batch
    batchStart.setDate(batchStart.getDate() + 360);
    batchEnd.setDate(batchEnd.getDate() + 360);
    batchIndex++;
    // Optionally, you could send progress to the client here
  }

  console.log(`[Withings Reimport] Total rows fetched: ${allRows.length}`);
  // Debug: Log the first 3 rows before deduplication
  console.log(
    "[Withings Reimport][DEBUG] First 3 rows before deduplication:",
    JSON.stringify(allRows.slice(0, 3), null, 2)
  );

  // Deduplicate rows by user_id and date to avoid ON CONFLICT errors
  const deduplicatedRows = Object.values(
    allRows.reduce((acc, row) => {
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

  console.log(
    `[Withings Reimport] After deduplication: ${deduplicatedRows.length} rows`
  );
  // Debug: Log the first 3 rows after deduplication
  console.log(
    "[Withings Reimport][DEBUG] First 3 rows after deduplication:",
    JSON.stringify(deduplicatedRows.slice(0, 3), null, 2)
  );

  // Filter out rows where weight_kg is not a valid, positive number
  const validRows = deduplicatedRows.filter(
    (row) =>
      typeof row.weight_kg === "number" &&
      !isNaN(row.weight_kg) &&
      row.weight_kg > 0
  );

  console.log(
    `[Withings Reimport] Valid rows (with weight > 0): ${validRows.length}`
  );
  // Debug: Log the first 3 valid rows
  console.log(
    "[Withings Reimport][DEBUG] First 3 valid rows:",
    JSON.stringify(validRows.slice(0, 3), null, 2)
  );

  // Clear existing data for this user
  await supabase.from("withings_variable_logs").delete().eq("user_id", user_id);

  // Transform to match withings_variable_logs structure
  const transformedBatch = validRows.flatMap(row => {
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

  const { error } = await supabase.from("withings_variable_logs").upsert(transformedBatch, {
    onConflict: "user_id,date,variable",
  });

  // After all import logic, fetch the total available measurement groups from Withings
  async function getWithingsTotalCount(
    user_id: string,
    access_token: string,
    startDate: Date,
    endDate: Date
  ) {
    const startUnix = Math.floor(startDate.getTime() / 1000);
    const endUnix = Math.floor(endDate.getTime() / 1000);
    const url = `https://wbsapi.withings.net/measure?action=getmeas&meastype=${MEAS_TYPES.map(
      (m) => m.type
    ).join(
      ","
    )}&category=1&startdate=${startUnix}&enddate=${endUnix}&access_token=${access_token}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.body && data.body.measuregrps) {
      return data.body.measuregrps.length;
    }
    return 0;
  }

  // At the end, return progress info for the UI, including totalAvailable
  const totalAvailable = await getWithingsTotalCount(
    user_id,
    currentAccessToken,
    startDate,
    endDate
  );
  return {
    upserted: transformedBatch.length, // This will be the number of valid rows transformed
    totalBatches,
    batchesCompleted: batchIndex,
    rowsFetched: allRows.length,
    totalAvailable,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
            res.setHeader("Set-Cookie", `${name}=${value}; Path=/; HttpOnly`);
          });
        },
      },
    }
  );

  try {
    const { userId, accessToken } = req.body;

    if (!userId || !accessToken) {
      return res.status(400).json({ error: "Missing userId or accessToken" });
    }

    console.log(`[Withings Reimport] Starting re-import for user ${userId}`);

    const progress = await reimportAllWithingsData(
      supabase,
      userId,
      accessToken
    );

    console.log(
      `[Withings Reimport] Re-import completed for user ${userId}: ${progress.upserted} rows`
    );

    res.status(200).json({
      success: true,
      ...progress,
      message: `Successfully re-imported ${progress.upserted} Withings data points`,
    });
  } catch (error) {
    console.error("[Withings Reimport] Error:", error);
    res.status(500).json({
      error: "Failed to re-import Withings data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
