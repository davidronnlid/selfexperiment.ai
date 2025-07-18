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
    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "No user ID provided" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[Withings Reimport] Starting reimport for user ${userId}`)

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

    // Clear existing data for this user
    const { error: deleteError } = await supabase
      .from("withings_variable_data_points")
      .delete()
      .eq("user_id", userId)

    if (deleteError) {
      console.error(`[Withings Reimport] Error clearing existing data for user ${userId}:`, deleteError)
    } else {
      console.log(`[Withings Reimport] Cleared existing data for user ${userId}`)
    }

    // Define date ranges for reimport (monthly chunks from 2009 to now)
    const startDate = new Date("2009-01-01")
    const endDate = new Date()
    const dateRanges = []

    let currentDate = new Date(startDate)
    while (currentDate < endDate) {
      const rangeStart = new Date(currentDate)
      const rangeEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      
      if (rangeEnd > endDate) {
        rangeEnd.setTime(endDate.getTime())
      }

      dateRanges.push({
        start: Math.floor(rangeStart.getTime() / 1000),
        end: Math.floor(rangeEnd.getTime() / 1000),
        label: `${rangeStart.toISOString().slice(0, 7)}`
      })

      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    console.log(`[Withings Reimport] Processing ${dateRanges.length} date ranges for user ${userId}`)

    let totalUpserted = 0
    const results = []

    // Helper to fetch Withings data with a given access token
    async function fetchWithingsData(accessToken: string, startdate: number, enddate: number) {
      const url = `https://wbsapi.withings.net/measure?action=getmeas&meastype=1,5,6,8,76,77,88&category=1&startdate=${startdate}&enddate=${enddate}&access_token=${accessToken}`
      const resp = await fetch(url)
      return resp.json()
    }

    // Helper to refresh token
    async function refreshToken(refreshToken: string) {
      const refreshRes = await fetch("https://wbsapi.withings.net/v2/oauth2", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "requesttoken",
          grant_type: "refresh_token",
          client_id: Deno.env.get('WITHINGS_ClientID')!,
          client_secret: Deno.env.get('WITHINGS_Secret')!,
          refresh_token: refreshToken,
        }),
      })
      return refreshRes.json()
    }

    let currentAccessToken = tokenRow.access_token
    let currentRefreshToken = tokenRow.refresh_token

    // Process each date range
    for (let i = 0; i < dateRanges.length; i++) {
      const range = dateRanges[i]
      
      try {
        console.log(`[Withings Reimport] Processing range ${i + 1}/${dateRanges.length}: ${range.label} for user ${userId}`)

        // Try fetching data with the current access token
        let data = await fetchWithingsData(currentAccessToken, range.start, range.end)

        // If token is invalid, try to refresh and retry once
        if (data.status === 401 || (data.error && String(data.error).includes("invalid_token"))) {
          console.log(`[Withings Reimport] Token expired, refreshing for user ${userId}`)
          
          const refreshData = await refreshToken(currentRefreshToken)
          if (!refreshData.body || !refreshData.body.access_token) {
            throw new Error("Failed to refresh Withings token")
          }

          // Update tokens in Supabase
          await supabase.from("withings_tokens").upsert({
            user_id: userId,
            access_token: refreshData.body.access_token,
            refresh_token: refreshData.body.refresh_token,
            expires_at: new Date(Date.now() + refreshData.body.expires_in * 1000).toISOString(),
          })

          currentAccessToken = refreshData.body.access_token
          currentRefreshToken = refreshData.body.refresh_token

          // Retry fetching data with the new access token
          data = await fetchWithingsData(currentAccessToken, range.start, range.end)
        }

        if (!data.body || !data.body.measuregrps) {
          console.log(`[Withings Reimport] No data for range ${range.label} for user ${userId}`)
          continue
        }

        // Process the data
        const rows = []
        for (const grp of data.body.measuregrps) {
          const date = new Date(grp.date * 1000).toISOString()
          const row: { [key: string]: any } = {
            user_id: userId,
            date,
            raw_data: grp,
          }
          
          for (const meas of grp.measures) {
            const variableName = MEAS_TYPE_MAP[meas.type] || `type_${meas.type}`
            row[variableName] = meas.value * Math.pow(10, meas.unit)
          }
          rows.push(row)
        }

        // Deduplicate and filter rows
        const deduplicatedRows = Object.values(
          rows.reduce((acc, row) => {
            const key = `${row.user_id}_${row.date}`
            if (!acc[key]) {
              acc[key] = row
            } else {
              // Merge measurement data
              for (const [propKey, value] of Object.entries(row)) {
                if (value !== undefined && value !== null && 
                    propKey !== "user_id" && propKey !== "date" && propKey !== "raw_data") {
                  acc[key][propKey] = value
                }
              }
            }
            return acc
          }, {} as Record<string, any>)
        )

        const validRows = deduplicatedRows.filter((row) => {
          // Check if the row has any valid measurement data
          const hasValidData = Object.entries(row).some(([key, value]) => {
            if (key === "user_id" || key === "date" || key === "raw_data") return false;
            return typeof value === "number" && !isNaN(value) && value > 0;
          });
          return hasValidData;
        })

        // Transform and upsert
        const transformedBatch = validRows.flatMap(row => {
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

        if (transformedBatch.length > 0) {
          const { error: batchError } = await supabase
            .from("withings_variable_data_points")
            .upsert(transformedBatch, {
              onConflict: "user_id,date,variable",
            })

          if (batchError) {
            console.error(`[Withings Reimport] Batch upsert error for range ${range.label}:`, batchError)
          } else {
            totalUpserted += transformedBatch.length
          }
        }

        results.push({
          range: range.label,
          count: validRows.length,
          upserted: transformedBatch.length
        })

      } catch (error) {
        console.error(`[Withings Reimport] Error processing range ${range.label} for user ${userId}:`, error)
        results.push({
          range: range.label,
          error: String(error)
        })
      }
    }

    console.log(`[Withings Reimport] Completed reimport for user ${userId}. Total upserted: ${totalUpserted}`)

    return new Response(
      JSON.stringify({
        success: true,
        totalUpserted,
        results,
        dateRanges: dateRanges.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[Withings Reimport] Unexpected error:', error)
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