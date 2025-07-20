import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DateTime } from "https://esm.sh/luxon@3.4.3";

// Add UUID generation helper
function generateUUID() {
  return crypto.randomUUID();
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Oura variable mappings - clean names without oura_ prefix
const OURA_VARIABLE_MAP = {
  // Sleep variables
  sleep_score: {
    slug: "sleep_score",
    label: "Sleep Score",
    unit: "score",
    category: "Sleep"
  },
  total_sleep_duration: {
    slug: "total_sleep_duration",
    label: "Total Sleep Duration",
    unit: "seconds",
    category: "Sleep"
  },
  rem_sleep_duration: {
    slug: "rem_sleep_duration",
    label: "REM Sleep Duration",
    unit: "seconds",
    category: "Sleep"
  },
  deep_sleep_duration: {
    slug: "deep_sleep_duration",
    label: "Deep Sleep Duration",
    unit: "seconds",
    category: "Sleep"
  },
  light_sleep_duration: {
    slug: "light_sleep_duration",
    label: "Light Sleep Duration",
    unit: "seconds",
    category: "Sleep"
  },
  efficiency: {
    slug: "efficiency",
    label: "Sleep Efficiency",
    unit: "%",
    category: "Sleep"
  },
  sleep_latency: {
    slug: "sleep_latency",
    label: "Sleep Latency",
    unit: "seconds",
    category: "Sleep"
  },
  // Readiness variables
  readiness_score: {
    slug: "readiness_score",
    label: "Readiness Score",
    unit: "score",
    category: "Recovery"
  },
  temperature_deviation: {
    slug: "temperature_deviation",
    label: "Temperature Deviation",
    unit: "°C",
    category: "Recovery"
  },
  temperature_trend_deviation: {
    slug: "temperature_trend_deviation",
    label: "Temperature Trend Deviation",
    unit: "°C",
    category: "Recovery"
  },
  // Heart rate variables
  hr_lowest: {
    slug: "hr_lowest",
    label: "Lowest Heart Rate",
    unit: "bpm",
    category: "Heart Rate"
  },
  hr_average: {
    slug: "hr_average",
    label: "Average Heart Rate",
    unit: "bpm",
    category: "Heart Rate"
  },
  // Activity variables
  activity_score: {
    slug: "activity_score",
    label: "Activity Score",
    unit: "score",
    category: "Activity"
  },
  steps: {
    slug: "steps",
    label: "Steps",
    unit: "steps",
    category: "Activity"
  },
  calories_active: {
    slug: "calories_active",
    label: "Active Calories",
    unit: "kcal",
    category: "Activity"
  },
  calories_total: {
    slug: "calories_total",
    label: "Total Calories",
    unit: "kcal",
    category: "Activity"
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      userId, 
      clearExisting = false, // Changed default to false for incremental sync
      startYear = 2020,
      forceFullSync = false // New parameter to force full re-sync if needed
    } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: "No user ID provided"
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Oura Sync Incremental] Starting ${forceFullSync ? 'full' : 'incremental'} sync for user ${userId}`);

    // Fetch tokens for this user
    const { data: tokenRow, error: tokenError } = await supabase
      .from("oura_tokens")
      .select("access_token, refresh_token")
      .eq("user_id", userId)
      .single();

    if (tokenError || !tokenRow?.access_token || !tokenRow?.refresh_token) {
      return new Response(JSON.stringify({
        success: false,
        error: "Not connected to Oura"
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Helper function to get existing data date ranges
    async function getExistingDataRanges(supabase, userId, variableIds) {
      // Get distinct dates where we already have data for any Oura variable
      const { data: existingDates, error } = await supabase
        .from("oura_variable_data_points")
        .select("date")
        .eq("user_id", userId)
        .in("variable_id", Object.values(variableIds))
        .order("date");

      if (error) {
        console.error("Error fetching existing dates:", error);
        return new Set();
      }

      return new Set(existingDates.map(row => row.date));
    }

    // Helper function to determine missing date ranges
    function getMissingDateRanges(startYear, existingDates, forceFullSync) {
      if (forceFullSync) {
        // If forcing full sync, return all dates from startYear to today
        const startDate = new Date(`${startYear}-01-01`);
        const endDate = new Date();
        return [{
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          type: 'full_sync'
        }];
      }

      const today = new Date().toISOString().split('T')[0];
      const ranges = [];
      
      if (existingDates.size === 0) {
        // No existing data - fetch everything from startYear
        const startDate = new Date(`${startYear}-01-01`);
        ranges.push({
          start: startDate.toISOString().split('T')[0],
          end: today,
          type: 'initial_sync'
        });
      } else {
        // Find gaps in existing data
        const sortedDates = Array.from(existingDates).sort();
        const earliestDate = sortedDates[0];
        const latestDate = sortedDates[sortedDates.length - 1];
        
        // 1. Fill gap before earliest existing data (if needed)
        const historicalStart = new Date(`${startYear}-01-01`).toISOString().split('T')[0];
        if (historicalStart < earliestDate) {
          ranges.push({
            start: historicalStart,
            end: earliestDate,
            type: 'historical_backfill'
          });
        }

        // 2. Fill gaps within existing data
        let currentDate = new Date(earliestDate);
        const endDate = new Date(latestDate);
        
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          if (!existingDates.has(dateStr)) {
            // Found a gap - extend it to find the full range
            const gapStart = dateStr;
            let gapEnd = dateStr;
            
            // Extend gap to find consecutive missing dates
            currentDate.setDate(currentDate.getDate() + 1);
            while (currentDate <= endDate && !existingDates.has(currentDate.toISOString().split('T')[0])) {
              gapEnd = currentDate.toISOString().split('T')[0];
              currentDate.setDate(currentDate.getDate() + 1);
            }
            
            ranges.push({
              start: gapStart,
              end: gapEnd,
              type: 'gap_fill'
            });
          } else {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }

        // 3. Fill gap after latest existing data (new data)
        if (latestDate < today) {
          ranges.push({
            start: latestDate,
            end: today,
            type: 'recent_data'
          });
        }
      }

      return ranges;
    }

    // Clear existing data if requested (for full re-sync)
    if (clearExisting || forceFullSync) {
      const { error: deleteError } = await supabase
        .from("oura_variable_data_points")
        .delete()
        .eq("user_id", userId);
      
      if (deleteError) {
        console.error(`[Oura Sync Incremental] Error clearing existing data for user ${userId}:`, deleteError);
      } else {
        console.log(`[Oura Sync Incremental] Cleared existing data for user ${userId}`);
      }
    }

    // Helper function to get user timezone
    async function getUserTimezone(supabase, userId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", userId)
        .single();
      return data?.timezone || "Europe/Stockholm";
    }

    // Helper function to ensure variables exist in the variables table
    async function ensureVariablesExist(supabase, userId) {
      const variableIds = {};
      
      for (const [key, varInfo] of Object.entries(OURA_VARIABLE_MAP)) {
        const { data: upsertedVar, error: upsertError } = await supabase
          .from("variables")
          .upsert({
            slug: varInfo.slug,
            label: varInfo.label,
            description: `${varInfo.label} measured by Oura Ring`,
            data_type: "continuous",
            canonical_unit: varInfo.unit,
            unit_group: varInfo.unit === "%" ? "percentage" : 
                       varInfo.unit === "°C" ? "temperature" : 
                       varInfo.unit === "bpm" ? "heart_rate" : 
                       varInfo.unit === "seconds" ? "time" : 
                       varInfo.unit === "kcal" ? "energy" : 
                       varInfo.unit === "score" ? "score" : "count",
            convertible_units: varInfo.unit === "seconds" ? ["seconds", "minutes", "hours"] :
                              varInfo.unit === "°C" ? ["°C", "°F"] :
                              varInfo.unit === "kcal" ? ["kcal", "kJ"] : [varInfo.unit],
            default_display_unit: varInfo.unit === "seconds" ? (varInfo.slug.includes("latency") ? "minutes" : "hours") : varInfo.unit,
            source_type: "oura",
            category: varInfo.category,
            created_by: userId,
            is_active: true
          }, {
            onConflict: "label",
            ignoreDuplicates: false
          })
          .select("id")
          .single();

        if (upsertError) {
          console.error(`[Oura Sync Incremental] Error upserting variable ${varInfo.slug}:`, upsertError);
          throw new Error(`Failed to upsert variable ${varInfo.slug}: ${upsertError.message}`);
        }

        variableIds[varInfo.slug] = upsertedVar.id;
        console.log(`[Oura Sync Incremental] Variable ${varInfo.slug} ready with id ${upsertedVar.id}`);
      }

      return variableIds;
    }

    // Helper to fetch Oura data with rate limiting
    async function fetchOuraData(endpoint, accessToken, startDate, endDate) {
      const url = `https://api.ouraring.com/v2/usercollection/${endpoint}?start_date=${startDate}&end_date=${endDate}`;
      
      try {
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await resp.json();
        
        // Add delay to prevent rate limiting (Oura allows 5000 requests per day)
        await new Promise(resolve => setTimeout(resolve, 200));
        return data;
      } catch (error) {
        console.error(`[Oura Sync Incremental] Error fetching ${endpoint}:`, error);
        return null;
      }
    }

    // Helper to refresh token
    async function refreshToken(refreshToken) {
      try {
        const refreshRes = await fetch("https://api.ouraring.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: Deno.env.get('OURA_CLIENT_ID'),
            client_secret: Deno.env.get('OURA_CLIENT_SECRET'),
            refresh_token: refreshToken
          })
        });
        return await refreshRes.json();
      } catch (error) {
        console.error(`[Oura Sync Incremental] Error refreshing token:`, error);
        return null;
      }
    }

    // Helper to process and upsert data (same as before but with conflict resolution)
    async function processAndUpsertData(sleepData, readinessData, activityData, heartRateData, userId, variableIds) {
      const userTimezone = await getUserTimezone(supabase, userId);
      const allRows = [];

      // Process sleep data
      if (sleepData?.data) {
        for (const item of sleepData.data) {
          const createdAt = DateTime.fromISO(item.day).setZone(userTimezone).toUTC().toISO();
          const baseRow = { user_id: userId, date: item.day, created_at: createdAt };

          if (item.score != null) allRows.push({ ...baseRow, variable_id: variableIds['sleep_score'], value: item.score });
          if (item.total_sleep_duration != null) allRows.push({ ...baseRow, variable_id: variableIds['total_sleep_duration'], value: item.total_sleep_duration });
          if (item.rem_sleep_duration != null) allRows.push({ ...baseRow, variable_id: variableIds['rem_sleep_duration'], value: item.rem_sleep_duration });
          if (item.deep_sleep_duration != null) allRows.push({ ...baseRow, variable_id: variableIds['deep_sleep_duration'], value: item.deep_sleep_duration });
          if (item.light_sleep_duration != null) allRows.push({ ...baseRow, variable_id: variableIds['light_sleep_duration'], value: item.light_sleep_duration });
          if (item.efficiency != null) allRows.push({ ...baseRow, variable_id: variableIds['efficiency'], value: item.efficiency });
          if (item.sleep_latency != null) allRows.push({ ...baseRow, variable_id: variableIds['sleep_latency'], value: item.sleep_latency });
        }
      }

      // Process readiness data
      if (readinessData?.data) {
        for (const item of readinessData.data) {
          const createdAt = DateTime.fromISO(item.day).setZone(userTimezone).toUTC().toISO();
          const baseRow = { user_id: userId, date: item.day, created_at: createdAt };

          if (item.score != null) allRows.push({ ...baseRow, variable_id: variableIds['readiness_score'], value: item.score });
          if (item.temperature_deviation != null) allRows.push({ ...baseRow, variable_id: variableIds['temperature_deviation'], value: item.temperature_deviation });
          if (item.temperature_trend_deviation != null) allRows.push({ ...baseRow, variable_id: variableIds['temperature_trend_deviation'], value: item.temperature_trend_deviation });
        }
      }

      // Process activity data
      if (activityData?.data) {
        for (const item of activityData.data) {
          const createdAt = DateTime.fromISO(item.day).setZone(userTimezone).toUTC().toISO();
          const baseRow = { user_id: userId, date: item.day, created_at: createdAt };

          if (item.score != null) allRows.push({ ...baseRow, variable_id: variableIds['activity_score'], value: item.score });
          if (item.steps != null) allRows.push({ ...baseRow, variable_id: variableIds['steps'], value: item.steps });
          if (item.active_calories != null) allRows.push({ ...baseRow, variable_id: variableIds['calories_active'], value: item.active_calories });
          if (item.total_calories != null) allRows.push({ ...baseRow, variable_id: variableIds['calories_total'], value: item.total_calories });
        }
      }

      // Process heart rate data (aggregate by day)
      if (heartRateData?.data) {
        const hrByDay = {};
        for (const hr of heartRateData.data) {
          const day = hr.timestamp.split('T')[0];
          if (!hrByDay[day]) hrByDay[day] = [];
          hrByDay[day].push(hr.bpm);
        }

        for (const [day, bpmArray] of Object.entries(hrByDay)) {
          if (bpmArray.length === 0) continue;
          const createdAt = DateTime.fromISO(day).setZone(userTimezone).toUTC().toISO();
          const baseRow = { user_id: userId, date: day, created_at: createdAt };

          const minHR = Math.min(...bpmArray);
          const avgHR = Math.round(bpmArray.reduce((a, b) => a + b, 0) / bpmArray.length);

          allRows.push({ ...baseRow, variable_id: variableIds['hr_lowest'], value: minHR });
          allRows.push({ ...baseRow, variable_id: variableIds['hr_average'], value: avgHR });
        }
      }

      // Filter valid rows and add UUIDs
      const validRows = allRows
        .filter(row => row.variable_id && row.value != null && !isNaN(row.value))
        .map(row => ({ id: generateUUID(), ...row }));

      // Upsert in batches with conflict resolution
      let upserted = 0;
      for (let i = 0; i < validRows.length; i += 100) {
        const batch = validRows.slice(i, i + 100);
        if (batch.length > 0) {
          try {
            const { error: batchError } = await supabase
              .from("oura_variable_data_points")
              .upsert(batch, {
                onConflict: "user_id,date,variable_id"
              });

            if (batchError) {
              console.error(`[Oura Sync Incremental] Upsert error:`, batchError);
            } else {
              upserted += batch.length;
              console.log(`[Oura Sync Incremental] Upserted ${batch.length} records for user ${userId}`);
            }
          } catch (err) {
            console.error(`[Oura Sync Incremental] Exception:`, err);
          }
        }
      }

      return { count: validRows.length, upserted };
    }

    // Ensure all Oura variables exist in the variables table
    const variableIds = await ensureVariablesExist(supabase, userId);

    // Get existing data to determine what needs to be fetched
    const existingDates = clearExisting || forceFullSync ? 
      new Set() : 
      await getExistingDataRanges(supabase, userId, variableIds);

    // Determine missing date ranges
    const missingRanges = getMissingDateRanges(startYear, existingDates, forceFullSync);

    if (missingRanges.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "No new data to sync - all dates are already present",
        data: {
          totalUpserted: 0,
          dateRangesProcessed: 0,
          existingDatesCount: existingDates.size
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Oura Sync Incremental] Found ${missingRanges.length} missing date ranges to sync`);
    for (const range of missingRanges) {
      console.log(`  - ${range.type}: ${range.start} to ${range.end}`);
    }

    let totalUpserted = 0;
    let currentAccessToken = tokenRow.access_token;
    let currentRefreshToken = tokenRow.refresh_token;
    let processedRanges = 0;
    let failedRanges = 0;

    // Process each missing date range
    for (let i = 0; i < missingRanges.length; i++) {
      const range = missingRanges[i];
      console.log(`[Oura Sync Incremental] Processing ${range.type} range ${i + 1}/${missingRanges.length}: ${range.start} to ${range.end}`);

      try {
        // Fetch all Oura data types for this range
        const [sleepData, readinessData, activityData, heartRateData] = await Promise.all([
          fetchOuraData('daily_sleep', currentAccessToken, range.start, range.end),
          fetchOuraData('daily_readiness', currentAccessToken, range.start, range.end),
          fetchOuraData('daily_activity', currentAccessToken, range.start, range.end),
          fetchOuraData('heartrate', currentAccessToken, range.start, range.end)
        ]);

        // Check for token expiration and refresh if needed
        const hasTokenError = [sleepData, readinessData, activityData, heartRateData]
          .some(data => data?.status === 401 || String(data?.error || '').includes("invalid_token"));

        if (hasTokenError) {
          const refreshData = await refreshToken(currentRefreshToken);
          if (!refreshData?.access_token) {
            throw new Error("Failed to refresh Oura token");
          }

          // Update token in database
          await supabase.from("oura_tokens").upsert({
            user_id: userId,
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token,
            expires_at: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
            updated_at: new Date().toISOString()
          });

          currentAccessToken = refreshData.access_token;
          currentRefreshToken = refreshData.refresh_token;

          // Retry with new token
          const [retrySleep, retryReadiness, retryActivity, retryHeartRate] = await Promise.all([
            fetchOuraData('daily_sleep', currentAccessToken, range.start, range.end),
            fetchOuraData('daily_readiness', currentAccessToken, range.start, range.end),
            fetchOuraData('daily_activity', currentAccessToken, range.start, range.end),
            fetchOuraData('heartrate', currentAccessToken, range.start, range.end)
          ]);

          const { count, upserted } = await processAndUpsertData(retrySleep, retryReadiness, retryActivity, retryHeartRate, userId, variableIds);
          totalUpserted += upserted;
        } else {
          const { count, upserted } = await processAndUpsertData(sleepData, readinessData, activityData, heartRateData, userId, variableIds);
          totalUpserted += upserted;
        }

        processedRanges++;
      } catch (error) {
        console.error(`[Oura Sync Incremental] Error processing range ${range.start} to ${range.end}:`, error);
        failedRanges++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        syncType: forceFullSync ? 'full_sync' : 'incremental_sync',
        totalUpserted,
        dateRangesProcessed: processedRanges,
        dateRangesFailed: failedRanges,
        totalDateRanges: missingRanges.length,
        existingDatesCount: existingDates.size,
        missingRanges: missingRanges.map(r => ({ 
          type: r.type, 
          start: r.start, 
          end: r.end 
        }))
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Oura Sync Incremental] Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: "Unexpected server error",
      details: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}); 