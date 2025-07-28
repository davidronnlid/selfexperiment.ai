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
  'ah_weight': '4db5c85b-0f41-4eb9-81de-3b57b5dfa198'
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id, type, value, timestamp, raw_data } = req.body;

    // Enhanced validation
    if (!user_id || !type || value === undefined) {
      return res.status(400).json({ 
        error: "Missing required fields: user_id, type, value",
        required: ["user_id", "type", "value"],
        received: { user_id: !!user_id, type: !!type, value: value !== undefined }
      });
    }

    // Validate user_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      return res.status(400).json({ 
        error: "Invalid user_id format. Must be a valid UUID." 
      });
    }

    // Validate value is a number
    const numericValue = parseFloat(value.toString());
    if (isNaN(numericValue)) {
      return res.status(400).json({ 
        error: "Value must be a valid number" 
      });
    }

    console.log("[Apple Health Receive] Data received:", { 
      user_id, 
      type, 
      value: numericValue, 
      timestamp,
      from_ios: raw_data?.from_ios_app || false
    });

    // COMPREHENSIVE HealthKit type mapping with validation - ALL DATA TYPES
    const healthKitTypeMapping: Record<string, { variable_id: string, unit: string, constraints: { min: number, max: number } }> = {
      // Activity & Fitness
      'step_count': { variable_id: 'ah_steps', unit: 'steps', constraints: { min: 0, max: 50000 } },
      'stepCount': { variable_id: 'ah_steps', unit: 'steps', constraints: { min: 0, max: 50000 } },
      'distance_walking_running': { variable_id: 'ah_distance_walking_running', unit: 'm', constraints: { min: 0, max: 100000 } },
      'distanceWalkingRunning': { variable_id: 'ah_distance_walking_running', unit: 'm', constraints: { min: 0, max: 100000 } },
      'distance_cycling': { variable_id: 'ah_distance_cycling', unit: 'm', constraints: { min: 0, max: 200000 } },
      'distanceCycling': { variable_id: 'ah_distance_cycling', unit: 'm', constraints: { min: 0, max: 200000 } },
      'active_energy_burned': { variable_id: 'ah_active_calories', unit: 'kcal', constraints: { min: 0, max: 5000 } },
      'activeEnergyBurned': { variable_id: 'ah_active_calories', unit: 'kcal', constraints: { min: 0, max: 5000 } },
      'basal_energy_burned': { variable_id: 'ah_basal_calories', unit: 'kcal', constraints: { min: 800, max: 3000 } },
      'basalEnergyBurned': { variable_id: 'ah_basal_calories', unit: 'kcal', constraints: { min: 800, max: 3000 } },
      'flights_climbed': { variable_id: 'ah_flights_climbed', unit: 'flights', constraints: { min: 0, max: 500 } },
      'flightsClimbed': { variable_id: 'ah_flights_climbed', unit: 'flights', constraints: { min: 0, max: 500 } },
      'exercise_time': { variable_id: 'ah_exercise_time', unit: 'min', constraints: { min: 0, max: 1440 } },
      'exerciseTime': { variable_id: 'ah_exercise_time', unit: 'min', constraints: { min: 0, max: 1440 } },
      'stand_time': { variable_id: 'ah_stand_time', unit: 'min', constraints: { min: 0, max: 1440 } },
      'standTime': { variable_id: 'ah_stand_time', unit: 'min', constraints: { min: 0, max: 1440 } },

      // Heart & Circulatory
      'heart_rate': { variable_id: 'ah_heart_rate', unit: 'bpm', constraints: { min: 30, max: 220 } },
      'heartRate': { variable_id: 'ah_heart_rate', unit: 'bpm', constraints: { min: 30, max: 220 } },
      'resting_heart_rate': { variable_id: 'ah_resting_heart_rate', unit: 'bpm', constraints: { min: 30, max: 150 } },
      'restingHeartRate': { variable_id: 'ah_resting_heart_rate', unit: 'bpm', constraints: { min: 30, max: 150 } },
      'heart_rate_variability': { variable_id: 'ah_heart_rate_variability', unit: 'ms', constraints: { min: 10, max: 200 } },
      'heartRateVariability': { variable_id: 'ah_heart_rate_variability', unit: 'ms', constraints: { min: 10, max: 200 } },
      'blood_pressure_systolic': { variable_id: 'ah_blood_pressure_systolic', unit: 'mmHg', constraints: { min: 70, max: 200 } },
      'bloodPressureSystolic': { variable_id: 'ah_blood_pressure_systolic', unit: 'mmHg', constraints: { min: 70, max: 200 } },
      'blood_pressure_diastolic': { variable_id: 'ah_blood_pressure_diastolic', unit: 'mmHg', constraints: { min: 40, max: 130 } },
      'bloodPressureDiastolic': { variable_id: 'ah_blood_pressure_diastolic', unit: 'mmHg', constraints: { min: 40, max: 130 } },
      'vo2_max': { variable_id: 'ah_vo2_max', unit: 'ml/kg/min', constraints: { min: 20, max: 80 } },
      'vo2Max': { variable_id: 'ah_vo2_max', unit: 'ml/kg/min', constraints: { min: 20, max: 80 } },

      // Body Measurements
      'body_mass': { variable_id: 'ah_weight', unit: 'kg', constraints: { min: 30, max: 300 } },
      'bodyMass': { variable_id: 'ah_weight', unit: 'kg', constraints: { min: 30, max: 300 } },
      'body_mass_index': { variable_id: 'ah_bmi', unit: 'kg/m²', constraints: { min: 10, max: 50 } },
      'bodyMassIndex': { variable_id: 'ah_bmi', unit: 'kg/m²', constraints: { min: 10, max: 50 } },
      'body_fat_percentage': { variable_id: 'ah_body_fat_percentage', unit: '%', constraints: { min: 5, max: 50 } },
      'bodyFatPercentage': { variable_id: 'ah_body_fat_percentage', unit: '%', constraints: { min: 5, max: 50 } },
      'lean_body_mass': { variable_id: 'ah_lean_body_mass', unit: 'kg', constraints: { min: 20, max: 150 } },
      'leanBodyMass': { variable_id: 'ah_lean_body_mass', unit: 'kg', constraints: { min: 20, max: 150 } },
      'height': { variable_id: 'ah_height', unit: 'm', constraints: { min: 1.0, max: 2.5 } },
      'waist_circumference': { variable_id: 'ah_waist_circumference', unit: 'm', constraints: { min: 0.5, max: 2.0 } },
      'waistCircumference': { variable_id: 'ah_waist_circumference', unit: 'm', constraints: { min: 0.5, max: 2.0 } },

      // Nutrition
      'dietary_energy_consumed': { variable_id: 'ah_dietary_calories', unit: 'kcal', constraints: { min: 0, max: 10000 } },
      'dietaryEnergyConsumed': { variable_id: 'ah_dietary_calories', unit: 'kcal', constraints: { min: 0, max: 10000 } },
      'dietary_water': { variable_id: 'ah_water_intake', unit: 'L', constraints: { min: 0, max: 20 } },
      'dietaryWater': { variable_id: 'ah_water_intake', unit: 'L', constraints: { min: 0, max: 20 } },
      'dietary_protein': { variable_id: 'ah_protein', unit: 'g', constraints: { min: 0, max: 500 } },
      'dietaryProtein': { variable_id: 'ah_protein', unit: 'g', constraints: { min: 0, max: 500 } },
      'dietary_carbohydrates': { variable_id: 'ah_carbohydrates', unit: 'g', constraints: { min: 0, max: 1000 } },
      'dietaryCarbohydrates': { variable_id: 'ah_carbohydrates', unit: 'g', constraints: { min: 0, max: 1000 } },
      'dietary_fat_total': { variable_id: 'ah_total_fat', unit: 'g', constraints: { min: 0, max: 500 } },
      'dietaryFatTotal': { variable_id: 'ah_total_fat', unit: 'g', constraints: { min: 0, max: 500 } },
      'dietary_sugar': { variable_id: 'ah_sugar', unit: 'g', constraints: { min: 0, max: 500 } },
      'dietarySugar': { variable_id: 'ah_sugar', unit: 'g', constraints: { min: 0, max: 500 } },
      'dietary_fiber': { variable_id: 'ah_fiber', unit: 'g', constraints: { min: 0, max: 100 } },
      'dietaryFiber': { variable_id: 'ah_fiber', unit: 'g', constraints: { min: 0, max: 100 } },
      'dietary_sodium': { variable_id: 'ah_sodium', unit: 'g', constraints: { min: 0, max: 20 } },
      'dietarySodium': { variable_id: 'ah_sodium', unit: 'g', constraints: { min: 0, max: 20 } },
      'dietary_caffeine': { variable_id: 'ah_caffeine', unit: 'g', constraints: { min: 0, max: 2 } },
      'dietaryCaffeine': { variable_id: 'ah_caffeine', unit: 'g', constraints: { min: 0, max: 2 } },

      // Sleep & Mindfulness
      'sleep_analysis': { variable_id: 'ah_sleep_duration', unit: 'hours', constraints: { min: 0, max: 24 } },
      'sleepAnalysis': { variable_id: 'ah_sleep_duration', unit: 'hours', constraints: { min: 0, max: 24 } },
      'mindful_session': { variable_id: 'ah_mindfulness', unit: 'min', constraints: { min: 0, max: 480 } },
      'mindfulSession': { variable_id: 'ah_mindfulness', unit: 'min', constraints: { min: 0, max: 480 } },

      // Health Vitals
      'respiratory_rate': { variable_id: 'ah_respiratory_rate', unit: 'breaths/min', constraints: { min: 5, max: 60 } },
      'respiratoryRate': { variable_id: 'ah_respiratory_rate', unit: 'breaths/min', constraints: { min: 5, max: 60 } },
      'oxygen_saturation': { variable_id: 'ah_oxygen_saturation', unit: '%', constraints: { min: 70, max: 100 } },
      'oxygenSaturation': { variable_id: 'ah_oxygen_saturation', unit: '%', constraints: { min: 70, max: 100 } },
      'body_temperature': { variable_id: 'ah_body_temperature', unit: '°C', constraints: { min: 35, max: 45 } },
      'bodyTemperature': { variable_id: 'ah_body_temperature', unit: '°C', constraints: { min: 35, max: 45 } },
      'blood_glucose': { variable_id: 'ah_blood_glucose', unit: 'mg/dL', constraints: { min: 50, max: 500 } },
      'bloodGlucose': { variable_id: 'ah_blood_glucose', unit: 'mg/dL', constraints: { min: 50, max: 500 } }
    };

    const variableMapping = healthKitTypeMapping[type];
    if (!variableMapping) {
      return res.status(400).json({ 
        error: `Unsupported health data type: ${type}`,
        supported_types: Object.keys(healthKitTypeMapping),
        total_supported: Object.keys(healthKitTypeMapping).length
      });
    }

    // Validate value constraints
    const { min, max } = variableMapping.constraints;
    if (numericValue < min || numericValue > max) {
      return res.status(400).json({ 
        error: `Value ${numericValue} is outside valid range for ${type}`,
        valid_range: { min, max },
        unit: variableMapping.unit
      });
    }

    // Use provided timestamp or current date
    const dataDate = timestamp ? new Date(timestamp) : new Date();
    const dateString = dataDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Enhanced raw data with more metadata
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
      validation_passed: true
    };

    console.log("[Apple Health] Processing:", {
      type,
      mapped_variable: variableMapping.variable_id,
      value: numericValue,
      unit: variableMapping.unit,
      date: dateString
    });

    // Insert into apple_health_variable_data_points (no need to check variables table)
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('apple_health_variable_data_points')
      .insert({
        user_id: user_id,
        variable_id: variableMapping.variable_id,
        value: numericValue,
        date: dateString,
        raw: enhancedRawData
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Apple Health] Insert error:', insertError);
      return res.status(500).json({ 
        error: "Failed to store health data",
        details: insertError.message,
        variable_id: variableMapping.variable_id
      });
    }

    console.log('[Apple Health] Successfully stored:', {
      id: insertData.id,
      variable_id: variableMapping.variable_id,
      value: numericValue,
      date: dateString
    });

    // AUTOMATIC SYNC TO MAIN DATA_POINTS TABLE
    const mainVariableId = VARIABLE_MAPPINGS[variableMapping.variable_id as keyof typeof VARIABLE_MAPPINGS];
    if (mainVariableId) {
      try {
        // Check if already exists in main table
        const { data: existingMainData } = await supabaseAdmin
          .from('data_points')
          .select('id')
          .eq('user_id', user_id)
          .eq('variable_id', mainVariableId)
          .eq('date', dateString)
          .single();

        if (!existingMainData) {
          // Insert into main data_points table
          await supabaseAdmin
            .from('data_points')
            .insert({
              user_id: user_id,
              variable_id: mainVariableId,
              date: dateString,
              value: numericValue,
              created_at: insertData.created_at
            });

          console.log('[Apple Health] Auto-synced to main data_points table');
        }
      } catch (syncError) {
        console.log('[Apple Health] Auto-sync to main table failed (non-critical):', syncError);
      }
    }

    return res.status(200).json({ 
      success: true,
      message: `Successfully stored ${type} data`,
      data: {
        id: insertData.id,
        variable_id: variableMapping.variable_id,
        type: type,
        value: numericValue,
        unit: variableMapping.unit,
        date: dateString,
        timestamp: dataDate.toISOString(),
        auto_synced_to_main: !!mainVariableId
      }
    });

  } catch (error) {
    console.error('[Apple Health] Unexpected error:', error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
} 