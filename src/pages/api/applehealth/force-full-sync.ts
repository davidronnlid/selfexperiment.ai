import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for Apple Health operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Variable mappings for automatic sync to main data_points table
const VARIABLE_MAPPINGS = {
  'ah_steps': 'bb4b56d6-02f3-47fe-97fe-b1f1b44e6017',
  'ah_heart_rate': '89a8bf8c-2b64-4967-8600-d1e2c63670fb', 
  'ah_weight': '4db5c85b-0f41-4eb9-81de-3b57b5dfa198',
  'ah_active_calories': null, // Add if exists in variables table
  'ah_sleep_duration': null,
  'ah_resting_heart_rate': null
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id, data_points, force_historical = false, clear_existing = false } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    // Validate user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        error: "User not found",
        user_id 
      });
    }

    console.log("[Apple Health Force Sync] Starting for user:", user_id);
    console.log(`[Apple Health Force Sync] Data points to process: ${data_points?.length || 0}`);

    // If requested, clear existing data first
    if (clear_existing) {
      console.log("[Apple Health Force Sync] Clearing existing data...");
      
      const { error: clearError } = await supabaseAdmin
        .from('apple_health_variable_data_points')
        .delete()
        .eq('user_id', user_id);
        
      if (clearError) {
        console.error("[Apple Health Force Sync] Error clearing data:", clearError);
      } else {
        console.log("[Apple Health Force Sync] Existing data cleared");
      }
    }

    // Enhanced HealthKit type mapping - ALL SUPPORTED TYPES
    const healthKitTypeMapping: Record<string, { variable_id: string, unit: string, constraints: { min: number, max: number } }> = {
      // Activity & Fitness
      'step_count': { variable_id: 'ah_steps', unit: 'steps', constraints: { min: 0, max: 50000 } },
      'stepCount': { variable_id: 'ah_steps', unit: 'steps', constraints: { min: 0, max: 50000 } },
      'distance_walking_running': { variable_id: 'ah_distance_walking_running', unit: 'm', constraints: { min: 0, max: 100000 } },
      'distanceWalkingRunning': { variable_id: 'ah_distance_walking_running', unit: 'm', constraints: { min: 0, max: 100000 } },
      'active_energy_burned': { variable_id: 'ah_active_calories', unit: 'kcal', constraints: { min: 0, max: 5000 } },
      'activeEnergyBurned': { variable_id: 'ah_active_calories', unit: 'kcal', constraints: { min: 0, max: 5000 } },
      'basal_energy_burned': { variable_id: 'ah_basal_calories', unit: 'kcal', constraints: { min: 800, max: 3000 } },
      'basalEnergyBurned': { variable_id: 'ah_basal_calories', unit: 'kcal', constraints: { min: 800, max: 3000 } },
      'flights_climbed': { variable_id: 'ah_flights_climbed', unit: 'flights', constraints: { min: 0, max: 500 } },
      'flightsClimbed': { variable_id: 'ah_flights_climbed', unit: 'flights', constraints: { min: 0, max: 500 } },
      'exercise_time': { variable_id: 'ah_exercise_time', unit: 'min', constraints: { min: 0, max: 1440 } },
      'exerciseTime': { variable_id: 'ah_exercise_time', unit: 'min', constraints: { min: 0, max: 1440 } },

      // Heart & Circulatory
      'heart_rate': { variable_id: 'ah_heart_rate', unit: 'bpm', constraints: { min: 30, max: 220 } },
      'heartRate': { variable_id: 'ah_heart_rate', unit: 'bpm', constraints: { min: 30, max: 220 } },
      'resting_heart_rate': { variable_id: 'ah_resting_heart_rate', unit: 'bpm', constraints: { min: 30, max: 150 } },
      'restingHeartRate': { variable_id: 'ah_resting_heart_rate', unit: 'bpm', constraints: { min: 30, max: 150 } },
      'heart_rate_variability': { variable_id: 'ah_heart_rate_variability', unit: 'ms', constraints: { min: 10, max: 200 } },
      'heartRateVariability': { variable_id: 'ah_heart_rate_variability', unit: 'ms', constraints: { min: 10, max: 200 } },

      // Body Measurements
      'body_mass': { variable_id: 'ah_weight', unit: 'kg', constraints: { min: 30, max: 300 } },
      'bodyMass': { variable_id: 'ah_weight', unit: 'kg', constraints: { min: 30, max: 300 } },
      'height': { variable_id: 'ah_height', unit: 'm', constraints: { min: 1.0, max: 2.5 } },
      'body_fat_percentage': { variable_id: 'ah_body_fat_percentage', unit: '%', constraints: { min: 5, max: 50 } },
      'bodyFatPercentage': { variable_id: 'ah_body_fat_percentage', unit: '%', constraints: { min: 5, max: 50 } },

      // Sleep & Mindfulness
      'sleep_analysis': { variable_id: 'ah_sleep_duration', unit: 'hours', constraints: { min: 0, max: 24 } },
      'sleepAnalysis': { variable_id: 'ah_sleep_duration', unit: 'hours', constraints: { min: 0, max: 24 } },
      'mindful_session': { variable_id: 'ah_mindfulness', unit: 'min', constraints: { min: 0, max: 480 } },
      'mindfulSession': { variable_id: 'ah_mindfulness', unit: 'min', constraints: { min: 0, max: 480 } },

      // Nutrition
      'dietary_energy_consumed': { variable_id: 'ah_dietary_calories', unit: 'kcal', constraints: { min: 0, max: 10000 } },
      'dietaryEnergyConsumed': { variable_id: 'ah_dietary_calories', unit: 'kcal', constraints: { min: 0, max: 10000 } },
      'dietary_water': { variable_id: 'ah_water_intake', unit: 'L', constraints: { min: 0, max: 20 } },
      'dietaryWater': { variable_id: 'ah_water_intake', unit: 'L', constraints: { min: 0, max: 20 } }
    };

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: any[] = [];

    // Process data points in batches
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < data_points.length; i += batchSize) {
      batches.push(data_points.slice(i, i + batchSize));
    }

    console.log(`[Apple Health Force Sync] Processing ${batches.length} batches of ${batchSize} items each`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchData: any[] = [];
      
      for (const dataPoint of batch) {
        try {
          const { type, value, timestamp, raw_data } = dataPoint;
          processedCount++;

          // Validate required fields
          if (!type || value === undefined) {
            skippedCount++;
            continue;
          }

          // Map health kit type
          const variableMapping = healthKitTypeMapping[type];
          if (!variableMapping) {
            skippedCount++;
            continue;
          }

          // Validate value
          const numericValue = parseFloat(value.toString());
          if (isNaN(numericValue)) {
            skippedCount++;
            continue;
          }

          // Validate constraints
          const { min, max } = variableMapping.constraints;
          if (numericValue < min || numericValue > max) {
            skippedCount++;
            continue;
          }

          // Use provided timestamp or current date
          const dataDate = timestamp ? new Date(timestamp) : new Date();
          const dateString = dataDate.toISOString().split('T')[0];

          // Enhanced raw data
          const enhancedRawData = {
            original_type: type,
            original_value: value,
            processed_value: numericValue,
            timestamp: timestamp || new Date().toISOString(),
            from_ios_app: true,
            sync_session: Date.now(),
            device_info: "iOS HealthKit",
            variable_mapping: variableMapping.variable_id,
            unit: variableMapping.unit,
            validation_passed: true,
            batch_index: batchIndex,
            force_sync: true,
            ...raw_data
          };

          batchData.push({
            user_id: user_id,
            variable_id: variableMapping.variable_id,
            value: numericValue,
            date: dateString,
            raw: enhancedRawData
          });

        } catch (error) {
          errorCount++;
          errors.push({
            dataPoint,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Insert batch into Apple Health table
      if (batchData.length > 0) {
        try {
          const { data: insertedData, error: insertError } = await supabaseAdmin
            .from('apple_health_variable_data_points')
            .upsert(batchData, { 
              onConflict: 'user_id,date,variable_id',
              ignoreDuplicates: false 
            })
            .select();

          if (insertError) {
            console.error(`[Apple Health Force Sync] Batch ${batchIndex} insert error:`, insertError);
            errorCount += batchData.length;
          } else {
            successCount += insertedData?.length || batchData.length;
            console.log(`[Apple Health Force Sync] Batch ${batchIndex + 1}/${batches.length} completed: ${insertedData?.length || batchData.length} items`);
          }
        } catch (batchError) {
          console.error(`[Apple Health Force Sync] Batch ${batchIndex} exception:`, batchError);
          errorCount += batchData.length;
        }
      }
    }

    // Sync to main data_points table
    console.log("[Apple Health Force Sync] Syncing to main data_points table...");
    
    const { data: allAppleHealthData } = await supabaseAdmin
      .from('apple_health_variable_data_points')
      .select('*')
      .eq('user_id', user_id);

    let mainSyncCount = 0;
    for (const dataPoint of allAppleHealthData || []) {
      const mainVariableId = VARIABLE_MAPPINGS[dataPoint.variable_id as keyof typeof VARIABLE_MAPPINGS];
      if (mainVariableId) {
        try {
          await supabaseAdmin
            .from('data_points')
            .upsert({
              user_id: user_id,
              variable_id: mainVariableId,
              date: dataPoint.date,
              value: parseFloat(dataPoint.value),
              created_at: dataPoint.created_at
            }, {
              onConflict: 'user_id,variable_id,date',
              ignoreDuplicates: true
            });
          mainSyncCount++;
        } catch (syncError) {
          // Continue on sync errors
        }
      }
    }

    // Get final counts
    const { count: finalAppleHealthCount } = await supabaseAdmin
      .from("apple_health_variable_data_points")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id);

    const { count: finalMainCount } = await supabaseAdmin
      .from("data_points")
      .select("*", { count: "exact", head: true })
      .in('variable_id', Object.values(VARIABLE_MAPPINGS).filter(Boolean));

    const result = {
      user_id,
      force_historical,
      clear_existing,
      processing_summary: {
        total_input: data_points?.length || 0,
        processed: processedCount,
        successful: successCount,
        errors: errorCount,
        skipped: skippedCount,
        success_rate: processedCount > 0 ? ((successCount / processedCount) * 100).toFixed(1) + '%' : '0%'
      },
      sync_summary: {
        apple_health_table_total: finalAppleHealthCount || 0,
        main_table_synced: mainSyncCount,
        main_table_total: finalMainCount || 0
      },
      errors: errors.slice(0, 10), // Only return first 10 errors
      timestamp: new Date().toISOString()
    };

    console.log("[Apple Health Force Sync] Completed:", result);

    return res.status(200).json(result);

  } catch (error) {
    console.error('[Apple Health Force Sync] Unexpected error:', error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
} 