import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    const { userId, startdate, enddate, meastype = [1] } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "No user ID provided" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[Withings Sync] Starting sync for user ${userId}`)

    // Fetch tokens for this user
    const { data: tokenRow, error: tokenError } = await supabase
      .from("withings_tokens")
      .select("access_token, refresh_token")
      .eq("user_id", userId)
      .single()

    if (tokenError || !tokenRow?.access_token || !tokenRow?.refresh_token) {
      return new Response(
        JSON.stringify({ error: "Not connected to Withings" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate dates
    const now = new Date()
    const nowUnix = Math.floor(now.getTime() / 1000)
    let startDate = startdate ? Number(startdate) : undefined
    let endDate = enddate ? Number(enddate) : undefined

    // Clamp dates to today if in the future
    if (startDate && startDate > nowUnix) startDate = nowUnix
    if (endDate && endDate > nowUnix) endDate = nowUnix

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: "Missing startdate or enddate" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Helper to fetch Withings data with a given access token
    async function fetchWithingsData(accessToken: string) {
      const url = `https://wbsapi.withings.net/measure?action=getmeas&meastype=${meastype.join(",")}&category=1&startdate=${startDate}&enddate=${endDate}&access_token=${accessToken}`
      const resp = await fetch(url)
      return resp.json()
    }

    // Try fetching data with the current access token
    let data = await fetchWithingsData(tokenRow.access_token)

    // If token is invalid, try to refresh and retry once
    if (data.status === 401 || (data.error && String(data.error).includes("invalid_token"))) {
      console.log(`[Withings Sync] Token expired, refreshing for user ${userId}`)
      
      // Refresh the access token
      const refreshRes = await fetch("https://wbsapi.withings.net/v2/oauth2", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "requesttoken",
          grant_type: "refresh_token",
          client_id: Deno.env.get('WITHINGS_ClientID')!,
          client_secret: Deno.env.get('WITHINGS_Secret')!,
          refresh_token: tokenRow.refresh_token,
        }),
      })
      
      const refreshData = await refreshRes.json()
      if (!refreshData.body || !refreshData.body.access_token) {
        return new Response(
          JSON.stringify({ 
            error: "Failed to refresh Withings token", 
            details: refreshData 
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update tokens in Supabase
      await supabase.from("withings_tokens").upsert({
        user_id: userId,
        access_token: refreshData.body.access_token,
        refresh_token: refreshData.body.refresh_token,
        expires_at: new Date(Date.now() + refreshData.body.expires_in * 1000).toISOString(),
      })

      // Retry fetching data with the new access token
      data = await fetchWithingsData(refreshData.body.access_token)
    }

    if (!data.body || !data.body.measuregrps) {
      console.error(`[Withings Sync] No data from Withings for user ${userId}:`, data)
      return new Response(
        JSON.stringify({ error: "No data", details: data }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare rows for upsert
    const rows = []
    for (const grp of data.body.measuregrps) {
      const date = new Date(grp.date * 1000).toISOString()
      const row: { [key: string]: any } = {
        user_id: userId,
        date,
        raw_data: grp,
      }
      
      for (const t of meastype) {
        const meas = grp.measures.find((m: any) => m.type === t)
        if (meas) {
          row[MEAS_TYPE_MAP[t] || `type_${t}`] = meas.value * Math.pow(10, meas.unit)
        }
      }
      rows.push(row)
    }

    // Deduplicate rows by user_id and date
    const deduplicatedRows = Object.values(
      rows.reduce((acc, row) => {
        const key = `${row.user_id}_${row.date}`
        if (!acc[key]) {
          acc[key] = row
        } else {
          // Merge measurement data if we have multiple measurements for the same date
          for (const [propKey, value] of Object.entries(row)) {
            if (value !== undefined && value !== null && 
                propKey !== "user_id" && propKey !== "date" && propKey !== "raw_data") {
              acc[key][propKey] = value
            }
          }
          // Merge raw_data arrays if they exist
          if (row.raw_data && acc[key].raw_data) {
            if (Array.isArray(acc[key].raw_data)) {
              acc[key].raw_data.push(row.raw_data)
            } else {
              acc[key].raw_data = [acc[key].raw_data, row.raw_data]
            }
          }
        }
        return acc
      }, {} as Record<string, any>)
    )

    // Filter out rows where weight_kg is not a valid, positive number
    const validRows = deduplicatedRows.filter((row) => {
      // Check if the row has any valid measurement data
      const hasValidData = Object.entries(row).some(([key, value]) => {
        if (key === "user_id" || key === "date" || key === "raw_data") return false;
        return typeof value === "number" && !isNaN(value) && value > 0;
      });
      return hasValidData;
    })

    console.log(`[Withings Sync] Processing ${validRows.length} valid rows for user ${userId}`)

    // Transform to match withings_variable_data_points structure and upsert in batches
    let upserted = 0
    for (let i = 0; i < validRows.length; i += 100) {
      const batch = validRows.slice(i, i + 100)
      
      const transformedBatch = batch.flatMap(row => {
        const entries = []
        for (const [key, value] of Object.entries(row)) {
          if (key !== 'user_id' && key !== 'date' && key !== 'raw_data' && 
              typeof value === 'number' && !isNaN(value) && value > 0) {
            entries.push({
              user_id: row.user_id,
              date: row.date,
              variable: key,
              value: value
            })
          }
        }
        return entries
      })

      const { error: batchError } = await supabase
        .from("withings_variable_data_points")
        .upsert(transformedBatch, {
          onConflict: "user_id,date,variable",
        })

      if (batchError) {
        console.error(`[Withings Sync] Batch upsert error for user ${userId}:`, batchError)
      } else {
        upserted += transformedBatch.length
      }
    }

    console.log(`[Withings Sync] Successfully synced ${upserted} data points for user ${userId}`)

    return new Response(
      JSON.stringify({
        success: true,
        count: validRows.length,
        upserted,
        rows: validRows,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[Withings Sync] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: "Unexpected server error", 
        details: String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 