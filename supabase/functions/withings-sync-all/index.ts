import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DateTime } from "https://esm.sh/luxon@3.4.3"

// Add UUID generation helper
function generateUUID(): string {
  return crypto.randomUUID();
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Updated variable mappings - removed units from slugs
const MEAS_TYPE_MAP: { [key: number]: { slug: string, label: string, unit: string, category: string } } = {
  1: { slug: "weight", label: "Weight", unit: "kg", category: "Body Composition" },
  5: { slug: "fat_free_mass", label: "Fat Free Mass", unit: "kg", category: "Body Composition" },
  6: { slug: "fat_ratio", label: "Fat Ratio", unit: "%", category: "Body Composition" },
  8: { slug: "fat_mass", label: "Fat Mass", unit: "kg", category: "Body Composition" },
  76: { slug: "muscle_mass", label: "Muscle Mass", unit: "kg", category: "Body Composition" },
  77: { slug: "hydration", label: "Hydration", unit: "kg", category: "Body Composition" },
  88: { slug: "bone_mass", label: "Bone Mass", unit: "kg", category: "Body Composition" },
};

interface WithingsSyncAllRequest {
  userId: string;
  clearExisting?: boolean;
  startYear?: number;
}

interface WithingsSyncAllResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { userId, clearExisting = true, startYear = 2020 }: WithingsSyncAllRequest = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No user ID provided" 
        } as WithingsSyncAllResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[Withings Sync All] Starting full sync for user ${userId} from ${startYear}`)

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
          error: "Not connected to Withings" 
        } as WithingsSyncAllResponse),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Clear existing data if requested
    if (clearExisting) {
      const { error: deleteError } = await supabase
        .from("withings_variable_data_points")
        .delete()
        .eq("user_id", userId)

      if (deleteError) {
        console.error(`[Withings Sync All] Error clearing existing data for user ${userId}:`, deleteError)
      } else {
        console.log(`[Withings Sync All] Cleared existing data for user ${userId}`)
      }
    }

    // Helper function to get user timezone
    async function getUserTimezone(supabase: any, userId: string) {
      const { data, error } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", userId)
        .single()
      
      return data?.timezone || "Europe/Stockholm"
    }

    // Helper function to ensure variables exist in the variables table
    async function ensureVariablesExist(supabase: any, userId: string) {
      const variableIds: { [slug: string]: string } = {}
      
      for (const [measType, varInfo] of Object.entries(MEAS_TYPE_MAP)) {
        // Check if variable already exists
        const { data: existingVar, error: selectError } = await supabase
          .from("variables")
          .select("id")
          .eq("slug", varInfo.slug)
          .single()

        if (existingVar && !selectError) {
          variableIds[varInfo.slug] = existingVar.id
          console.log(`[Withings Sync All] Variable ${varInfo.slug} already exists with id ${existingVar.id}`)
        } else {
          // Create new variable
          const { data: newVar, error: insertError } = await supabase
            .from("variables")
            .insert({
              slug: varInfo.slug,
              label: varInfo.label,
              description: `${varInfo.label} measured by Withings device`,
              data_type: "continuous",
              canonical_unit: varInfo.unit,
              unit_group: varInfo.unit === "%" ? "percentage" : "mass",
              convertible_units: varInfo.unit === "kg" ? ["kg", "lb", "g"] : [varInfo.unit],
              default_display_unit: varInfo.unit,
              source_type: "withings",
              category: varInfo.category,
              created_by: userId,
              is_active: true
            })
            .select("id")
            .single()

          if (insertError) {
            console.error(`[Withings Sync All] Error creating variable ${varInfo.slug}:`, insertError)
            throw new Error(`Failed to create variable ${varInfo.slug}: ${insertError.message}`)
          }

          variableIds[varInfo.slug] = newVar.id
          console.log(`[Withings Sync All] Created new variable ${varInfo.slug} with id ${newVar.id}`)
        }
      }

      return variableIds
    }

    // Helper to fetch Withings data with rate limiting
    async function fetchWithingsData(accessToken: string, start: number, end: number) {
      const url = `https://wbsapi.withings.net/measure?action=getmeas&meastype=1,5,6,8,76,77,88&category=1&startdate=${start}&enddate=${end}&access_token=${accessToken}`
      const resp = await fetch(url)
      const data = await resp.json()
      
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return data
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
    async function processAndUpsertData(data: any, userId: string, variableIds: { [slug: string]: string }) {
      if (!data.body?.measuregrps) {
        return { count: 0, upserted: 0 }
      }

      const userTimezone = await getUserTimezone(supabase, userId)
      const rows = []

      for (const grp of data.body.measuregrps) {
        const date = new Date(grp.date * 1000).toISOString()
        const row = {
          user_id: userId,
          date,
          raw_data: grp
        }
        
        for (const meas of grp.measures) {
          const varInfo = MEAS_TYPE_MAP[meas.type]
          if (varInfo) {
            row[varInfo.slug] = meas.value * Math.pow(10, meas.unit)
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
            for (const [k, v] of Object.entries(row)) {
              if (v != null && k !== "user_id" && k !== "date" && k !== "raw_data") {
                acc[key][k] = v
              }
            }
          }
          return acc
        }, {} as Record<string, any>)
      )

      const validRows = deduplicatedRows.filter((row) => 
        Object.entries(row).some(([k, v]) => 
          k !== 'user_id' && k !== 'date' && k !== 'raw_data' && 
          typeof v === 'number' && !isNaN(v) && v > 0
        )
      )

      // Transform to match withings_variable_data_points structure and upsert in batches
      let upserted = 0
      for (let i = 0; i < validRows.length; i += 100) {
        const batch = validRows.slice(i, i + 100)
        
        const transformedBatch = batch.flatMap(row => {
          const createdAt = DateTime.fromISO(row.date).setZone(userTimezone).toUTC().toISO()
          return Object.entries(row).flatMap(([key, value]) => {
            if (key !== 'user_id' && key !== 'date' && key !== 'raw_data' && 
                typeof value === 'number' && !isNaN(value) && value > 0 && 
                variableIds[key]) {
              return {
                id: generateUUID(), // Add explicit UUID generation
                user_id: row.user_id,
                date: row.date,
                variable_id: variableIds[key], // Use variable_id instead of variable name
                value: value,
                created_at: createdAt
              }
            }
            return []
          })
        })

        if (transformedBatch.length > 0) {
          try {
            const { error: batchError } = await supabase
              .from("withings_variable_data_points")
              .upsert(transformedBatch, {
                onConflict: "user_id,date,variable_id"
              })

            if (batchError) {
              console.error(`[Withings Sync All] Upsert error:`, batchError)
            } else {
              upserted += transformedBatch.length
              console.log(`[Withings Sync All] Upserted ${transformedBatch.length} for user ${userId}`)
            }
          } catch (err) {
            console.error(`[Withings Sync All] Exception:`, err)
          }
        }
      }

      return { count: validRows.length, upserted }
    }

    // Ensure all Withings variables exist in the variables table
    const variableIds = await ensureVariablesExist(supabase, userId)

    // Define date ranges (quarterly chunks from startYear to now)
    const startDate = new Date(`${startYear}-01-01`)
    const endDate = new Date()
    const dateRanges = []

    let currentDate = new Date(startDate)
    while (currentDate < endDate) {
      const rangeStart = new Date(currentDate)
      const rangeEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 0)
      
      if (rangeEnd > endDate) {
        rangeEnd.setTime(endDate.getTime())
      }

      dateRanges.push({
        start: Math.floor(rangeStart.getTime() / 1000),
        end: Math.floor(rangeEnd.getTime() / 1000),
        label: `${rangeStart.toISOString().slice(0, 7)} to ${rangeEnd.toISOString().slice(0, 7)}`
      })

      currentDate.setMonth(currentDate.getMonth() + 3)
    }

    let totalUpserted = 0
    let currentAccessToken = tokenRow.access_token
    let currentRefreshToken = tokenRow.refresh_token
    let processedRanges = 0
    let failedRanges = 0

    // Process each date range
    for (let i = 0; i < dateRanges.length; i++) {
      const range = dateRanges[i]
      
      try {
        let data = await fetchWithingsData(currentAccessToken, range.start, range.end)

        // Handle rate limiting with retry logic
        let retryCount = 0
        while ((data.status === 601 || String(data.error || '').includes("Too Many Requests")) && retryCount < 3) {
          const delay = Math.pow(2, ++retryCount) * 1000
          await new Promise(r => setTimeout(r, delay))
          data = await fetchWithingsData(currentAccessToken, range.start, range.end)
        }

        if (data.status === 601 || String(data.error || '').includes("Too Many Requests")) {
          failedRanges++
          continue
        }

        // If token is invalid, refresh and retry
        if (data.status === 401 || String(data.error || '').includes("invalid_token")) {
          const refreshData = await refreshToken(currentRefreshToken)
          if (!refreshData.body?.access_token) {
            throw new Error("Failed to refresh Withings token")
          }

          await supabase.from("withings_tokens").upsert({
            user_id: userId,
            access_token: refreshData.body.access_token,
            refresh_token: refreshData.body.refresh_token,
            expires_at: new Date(Date.now() + refreshData.body.expires_in * 1000).toISOString(),
          })

          currentAccessToken = refreshData.body.access_token
          currentRefreshToken = refreshData.body.refresh_token
          data = await fetchWithingsData(currentAccessToken, range.start, range.end)
        }

        const { count, upserted } = await processAndUpsertData(data, userId, variableIds)
        totalUpserted += upserted
        processedRanges++

      } catch (error) {
        failedRanges++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          totalUpserted,
          dateRangesProcessed: processedRanges,
          dateRangesFailed: failedRanges,
          totalDateRanges: dateRanges.length,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        }
      } as WithingsSyncAllResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Withings Sync All] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Unexpected server error", 
        details: String(error) 
      } as WithingsSyncAllResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 