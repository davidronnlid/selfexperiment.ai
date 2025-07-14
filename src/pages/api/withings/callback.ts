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

async function fetchAndStoreAllWithingsData(
  supabase: any,
  user_id: string,
  access_token: string
): Promise<number> {
  // Fetch in 30-day batches from 1990-01-01 to today
  const startDate = new Date("1990-01-01");
  const endDate = new Date();
  let batchStart = new Date(startDate);
  let batchEnd = new Date(startDate);
  batchEnd.setDate(batchEnd.getDate() + 29);
  const allRows: { [key: string]: any }[] = [];

  while (batchStart < endDate) {
    const startUnix = Math.floor(batchStart.getTime() / 1000);
    const endUnix = Math.floor(
      Math.min(batchEnd.getTime(), endDate.getTime()) / 1000
    );
    const url = `https://wbsapi.withings.net/measure?action=getmeas&meastype=${MEAS_TYPES.map(
      (m) => m.type
    ).join(
      ","
    )}&category=1&startdate=${startUnix}&enddate=${endUnix}&access_token=${access_token}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.body && data.body.measuregrps) {
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
    }
    // Move to next batch
    batchStart.setDate(batchStart.getDate() + 30);
    batchEnd.setDate(batchEnd.getDate() + 30);
  }

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

  // Filter out rows where weight_kg is not a valid, positive number
  const validRows = deduplicatedRows.filter(
    (row) =>
      typeof row.weight_kg === "number" &&
      !isNaN(row.weight_kg) &&
      row.weight_kg > 0
  );

  // Upsert all rows in batches of 100
  for (let i = 0; i < validRows.length; i += 100) {
    await supabase
      .from("withings_weights")
      .upsert(validRows.slice(i, i + 100), {
        onConflict: "user_id,date",
      });
  }
  return validRows.length;
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
          cookiesToSet.forEach(({ name, value, options }) => {
            res.setHeader("Set-Cookie", `${name}=${value}; Path=/; HttpOnly`);
          });
        },
      },
    }
  );

  const { code, state } = req.query;
  console.log("[Withings Callback] state:", state);
  // Extract user_id from state parameter
  const stateParts = (state as string)?.split("_");
  const user_id = stateParts?.[1]; // Format: withings_USERID_RANDOM
  console.log("[Withings Callback] Extracted user_id:", user_id);
  if (!user_id) {
    console.error("[Withings Callback] No user_id found in state param");
    return res.status(401).json({ error: "No user_id found in state param" });
  }

  const clientId = process.env.WITHINGS_ClientID!;
  const clientSecret = process.env.WITHINGS_Secret!;
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/withings/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://wbsapi.withings.net/v2/oauth2", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      action: "requesttoken",
      client_id: clientId,
      client_secret: clientSecret,
      code: code as string,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const tokenData = await tokenRes.json();
  console.log("[Withings Callback] Token exchange response:", tokenData);
  if (!tokenData.body || !tokenData.body.access_token) {
    console.error(
      "[Withings Callback] Failed to get Withings tokens",
      tokenData
    );
    return res
      .status(400)
      .json({ error: "Failed to get Withings tokens", details: tokenData });
  }

  // Save tokens to Supabase
  const { error: upsertError, data: upsertData } = await supabase
    .from("withings_tokens")
    .upsert({
      user_id: user_id,
      access_token: tokenData.body.access_token,
      refresh_token: tokenData.body.refresh_token,
      expires_at: new Date(
        Date.now() + tokenData.body.expires_in * 1000
      ).toISOString(),
    });
  console.log("[Withings Callback] Upsert result:", {
    upsertError,
    upsertData,
  });

  if (upsertError) {
    console.error("[Withings Callback] Error upserting tokens:", upsertError);
    return res
      .status(500)
      .json({ error: "Failed to save tokens", details: upsertError });
  }

  // Fetch and store all historical Withings data (all supported types)
  try {
    const count = await fetchAndStoreAllWithingsData(
      supabase,
      user_id,
      tokenData.body.access_token
    );
    console.log(
      `[Withings Callback] Imported ${count} Withings data rows for user ${user_id}`
    );
  } catch (err) {
    console.error("[Withings Callback] Error fetching Withings data:", err);
  }

  res.redirect("/analytics?withings=success");
}
