// Apple Health Variable Mapping Utility
// This handles the mapping between Apple Health variable_id strings and actual variable records
// since there's no foreign key relationship in the database schema

export interface AppleHealthVariableMapping {
  variable_id: string;
  slug: string;
  label: string;
}

// Mapping from Apple Health variable_id (string) to actual variable information
export const APPLE_HEALTH_VARIABLE_MAPPING: Record<string, AppleHealthVariableMapping> = {
  'steps': {
    variable_id: 'bb4b56d6-02f3-47fe-97fe-b1f1b44e6017',
    slug: 'apple_health_steps',
    label: 'Steps (Apple Health)'
  },
  'heart_rate': {
    variable_id: '89a8bf8c-2b64-4967-8600-d1e2c63670fb',
    slug: 'apple_health_heart_rate',
    label: 'Heart Rate (Apple Health)'
  },
  'weight': {
    variable_id: '4db5c85b-0f41-4eb9-81de-3b57b5dfa198',
    slug: 'apple_health_weight',
    label: 'Weight (Apple Health)'
  },
  'sleep_duration': {
    variable_id: 'a7c4d7c3-9981-44e8-85a4-2fd9653a28af',
    slug: 'ah_sleep_duration',
    label: 'Sleep Duration (Apple Health)'
  },
  'active_calories': {
    variable_id: 'd57060df-b589-458f-a4ba-b0dc8326f0ab',
    slug: 'ah_active_calories',
    label: 'Active Calories (Apple Health)'
  }
};

// Type for Apple Health data point
export interface AppleHealthDataPoint {
  id: string;
  user_id: string;
  date: string;
  variable_id: string;
  value: number | string | null;
  source: string;
  created_at: string;
}

// Type for Apple Health data point with mapped variable
export interface MappedAppleHealthDataPoint extends AppleHealthDataPoint {
  variables: Array<{
    id: string;
    slug: string;
    label: string;
  }>;
}

/**
 * Maps Apple Health data points to include proper variable information
 * @param dataPoints Raw Apple Health data points
 * @returns Data points with mapped variable information
 */
export function mapAppleHealthDataPoints(dataPoints: AppleHealthDataPoint[]): MappedAppleHealthDataPoint[] {
  return dataPoints.map((item) => {
    const variableMapping = APPLE_HEALTH_VARIABLE_MAPPING[item.variable_id];
    return {
      ...item,
      variables: variableMapping ? [
        {
          id: variableMapping.variable_id,
          slug: variableMapping.slug,
          label: variableMapping.label,
        },
      ] : [
        {
          id: item.variable_id,
          slug: item.variable_id,
          label: `Apple Health ${item.variable_id}`,
        },
      ],
    };
  });
}

/**
 * Gets the variable information for a given Apple Health variable_id
 * @param variableId The Apple Health variable_id string
 * @returns Variable mapping or null if not found
 */
export function getAppleHealthVariableMapping(variableId: string): AppleHealthVariableMapping | null {
  return APPLE_HEALTH_VARIABLE_MAPPING[variableId] || null;
}

/**
 * Gets all available Apple Health variable mappings
 * @returns Array of all variable mappings
 */
export function getAllAppleHealthVariableMappings(): AppleHealthVariableMapping[] {
  return Object.values(APPLE_HEALTH_VARIABLE_MAPPING);
}

/**
 * Checks if a variable_id is a known Apple Health variable
 * @param variableId The variable_id to check
 * @returns True if it's a known Apple Health variable
 */
export function isKnownAppleHealthVariable(variableId: string): boolean {
  return variableId in APPLE_HEALTH_VARIABLE_MAPPING;
} 