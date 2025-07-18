import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MEAS_TYPE_MAP: { [key: number]: string } = {
  1: "weight_kg",
  5: "fat_free_mass_kg",
  6: "fat_ratio",
  8: "fat_mass_weight_kg",
  76: "muscle_mass_kg",
  77: "hydration_kg",
  88: "bone_mass_kg",
};

interface WithingsRequest {
  action: 'sync' | 'reimport' | 'disconnect' | 'get-status';
  userId: string;
  startdate?: number;
  enddate?: number;
  meastype?: number[];
}

interface WithingsResponse {
  success: boolean;
  action: string;
  message?: string;
  data?: any;
  error?: string;
}

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
    const { action, userId, startdate, enddate, meastype = [1, 5, 6, 8, 76, 77, 88] }: WithingsRequest = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          action, 
          error: "No user ID provided" 
        } as WithingsResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!action) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          action: 'unknown', 
          error: "No action specified" 
        } as WithingsResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[Withings Processor] Action: ${action} for user ${userId}`)

    // Helper to fetch Withings data with a given access token
    async function fetchWithingsData(accessToken: string, start: number, end: number) {
      const url = `https://wbsapi.withings.net/measure?action=getmeas&meastype=${meastype.join(",")}&category=1&startdate=${start}&enddate=${end}&access_token=${accessToken}`
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

    // Helper to process and upsert data
    async function processAndUpsertData(data: any, userId: string) {
      if (!data.body || !data.body.measuregrps) {
        return { count: 0, upserted: 0 }
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
        
        for (const meas of grp.measures) {
          const variableName = MEAS_TYPE_MAP[meas.type] || `type_${meas.type}`
          row[variableName] = meas.value * Math.pow(10, meas.unit)
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
          }
          return acc
        }, {} as Record<string, any>)
      )

      // Filter out invalid rows
      const validRows = deduplicatedRows.filter(
        (row) => {
          // Check if at least one measurement is valid
          return Object.entries(row).some(([key, value]) => 
            key !== 'user_id' && key !== 'date' && key !== 'raw_data' && 
            typeof value === 'number' && !isNaN(value) && value > 0
          )
        }
      )

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

        if (transformedBatch.length > 0) {
          const { error: batchError } = await supabase
            .from("withings_variable_data_points")
            .upsert(transformedBatch, {
              onConflict: "user_id,date,variable",
            })

          if (batchError) {
            console.error(`[Withings Processor] Batch upsert error for user ${userId}:`, batchError)
          } else {
            upserted += transformedBatch.length
          }
        }
      }

      return { count: validRows.length, upserted }
    }

    // Handle different actions
    switch (action) {
      case 'get-status': {
        // Check connection status
        const { data: tokenRow, error: tokenError } = await supabase
          .from("withings_tokens")
          .select("access_token, refresh_token, expires_at")
          .eq("user_id", userId)
          .single()

        const isConnected = !tokenError && tokenRow?.access_token && tokenRow?.refresh_token
        
        // Get data count
        let dataCount = 0
        if (isConnected) {
          const { count } = await supabase
            .from("withings_variable_data_points")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", userId)
          dataCount = count || 0
        }

        return new Response(
          JSON.stringify({
            success: true,
            action,
            data: {
              connected: isConnected,
              dataCount,
              expiresAt: tokenRow?.expires_at
            }
          } as WithingsResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'disconnect': {
        // Delete tokens and data
        const { error: tokenDeleteError } = await supabase
          .from("withings_tokens")
          .delete()
          .eq("user_id", userId)

        const { error: dataDeleteError } = await supabase
          .from("withings_variable_data_points")
          .delete()
          .eq("user_id", userId)

        if (tokenDeleteError || dataDeleteError) {
          console.error(`[Withings Processor] Error disconnecting user ${userId}:`, { tokenDeleteError, dataDeleteError })
        }

        return new Response(
          JSON.stringify({
            success: true,
            action,
            message: "Successfully disconnected from Withings"
          } as WithingsResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'sync': {
        if (!startdate || !enddate) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              action, 
              error: "Missing startdate or enddate for sync" 
            } as WithingsResponse),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Fetch tokens for this user
        const { data: tokenRow, error: tokenError } = await supabase
          .from("withings_tokens")
          .select("access_token, refresh_token")
          .eq("user_id", userId)
          .single()

        if (tokenError || !tokenRow?.access_token || !tokenRow?.refresh_token) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              action, 
              error: "Not connected to Withings" 
            } as WithingsResponse),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Validate dates
        const now = new Date()
        const nowUnix = Math.floor(now.getTime() / 1000)
        let startDate = Number(startdate)
        let endDate = Number(enddate)

        // Clamp dates to today if in the future
        if (startDate > nowUnix) startDate = nowUnix
        if (endDate > nowUnix) endDate = nowUnix

        // Try fetching data with the current access token
        let data = await fetchWithingsData(tokenRow.access_token, startDate, endDate)

        // If token is invalid, try to refresh and retry once
        if (data.status === 401 || (data.error && String(data.error).includes("invalid_token"))) {
          console.log(`[Withings Processor] Token expired, refreshing for user ${userId}`)
          
          const refreshData = await refreshToken(tokenRow.refresh_token)
          if (!refreshData.body || !refreshData.body.access_token) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                action, 
                error: "Failed to refresh Withings token", 
                details: refreshData 
              } as WithingsResponse),
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
          data = await fetchWithingsData(refreshData.body.access_token, startDate, endDate)
        }

        const { count, upserted } = await processAndUpsertData(data, userId)

        return new Response(
          JSON.stringify({
            success: true,
            action,
            data: {
              count,
              upserted,
              dateRange: {
                start: new Date(startDate * 1000).toISOString(),
                end: new Date(endDate * 1000).toISOString()
              }
            }
          } as WithingsResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'reimport': {
        // Fetch tokens for this user
        const { data: tokenRow, error: tokenError } = await supabase
          .from("withings_tokens")
          .select("access_token, refresh_token")
          .eq("user_id", userId)
          .single()

        if (tokenError || !tokenRow?.access_token || !tokenRow?.refresh_token) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              action, 
              error: "Not connected to Withings" 
            } as WithingsResponse),
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
          console.error(`[Withings Processor] Error clearing existing data for user ${userId}:`, deleteError)
        } else {
          console.log(`[Withings Processor] Cleared existing data for user ${userId}`)
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

        console.log(`[Withings Processor] Processing ${dateRanges.length} date ranges for user ${userId}`)

        let totalUpserted = 0
        let currentAccessToken = tokenRow.access_token
        let currentRefreshToken = tokenRow.refresh_token

        // Process each date range
        for (let i = 0; i < dateRanges.length; i++) {
          const range = dateRanges[i]
          
          try {
            console.log(`[Withings Processor] Processing range ${i + 1}/${dateRanges.length}: ${range.label} for user ${userId}`)

            // Try fetching data with the current access token
            let data = await fetchWithingsData(currentAccessToken, range.start, range.end)

            // If token is invalid, try to refresh and retry once
            if (data.status === 401 || (data.error && String(data.error).includes("invalid_token"))) {
              console.log(`[Withings Processor] Token expired, refreshing for user ${userId}`)
              
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

            const { count, upserted } = await processAndUpsertData(data, userId)
            totalUpserted += upserted

            console.log(`[Withings Processor] Range ${range.label}: ${count} records, ${upserted} upserted`)

          } catch (error) {
            console.error(`[Withings Processor] Error processing range ${range.label} for user ${userId}:`, error)
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            action,
            data: {
              totalUpserted,
              dateRangesProcessed: dateRanges.length,
              dateRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
              }
            }
          } as WithingsResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            action, 
            error: `Unknown action: ${action}` 
          } as WithingsResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

  } catch (error) {
    console.error('[Withings Processor] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        action: 'unknown', 
        error: "Unexpected server error", 
        details: String(error) 
      } as WithingsResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 