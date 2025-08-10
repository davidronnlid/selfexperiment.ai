import { supabase } from "./supaBase";

/**
 * Centralized utility for managing user unit preferences
 * Handles saving, loading, and caching user's preferred units for variables
 */

export interface UserUnitPreference {
  unit_id: string;
  label: string;
  symbol: string;
  unit_group: string;
  is_base: boolean;
  priority: number;
  is_user_preference: boolean;
}

/**
 * Save user's unit preference for a variable
 * This will be used across all interfaces (variable page, manual tracking, routine setup, auto-tracking)
 */
export async function saveUserUnitPreference(
  userId: string,
  variableId: string,
  unitId: string,
  unitGroup: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('💾 Saving user unit preference:', {
      userId: userId.substring(0, 8) + '...',
      variableId: variableId.substring(0, 8) + '...',
      unitId,
      unitGroup
    });

    const { data: success, error } = await supabase.rpc(
      "set_user_unit_preference",
      {
        user_id_param: userId,
        variable_id_param: variableId,
        unit_id_param: unitId,
        unit_group_param: unitGroup,
      }
    );

    if (error) {
      console.error("❌ Error saving unit preference:", error);
      return { success: false, error: error.message };
    }

    if (!success) {
      console.error("❌ Failed to save unit preference - function returned false");
      console.error("This usually means:");
      console.error("1. The unit is not valid for this variable (check variable_units table)");
      console.error("2. User or variable doesn't exist");
      console.error("3. Database constraint issue");
      console.error("Check the database logs for more details");
      return { success: false, error: "Function returned false - check console for details" };
    }

    console.log('✅ Unit preference saved successfully');
    
    // Clear any cached display units to force refresh
    invalidateUserUnitCache(userId, variableId);
    
    return { success: true };
  } catch (err) {
    console.error("❌ Unexpected error saving unit preference:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error" 
    };
  }
}

/**
 * Get user's preferred unit for a variable
 * Returns user preference if exists, otherwise falls back to variable default
 */
export async function getUserPreferredUnit(
  userId: string,
  variableId: string
): Promise<{ unit: UserUnitPreference | null; error?: string }> {
  try {
    const cacheKey = `user_unit_${userId}_${variableId}`;
    
    // Check cache first (with 5 minute expiry)
    const cached = getCachedUnit(cacheKey);
    if (cached) {
      return { unit: cached };
    }

    console.log('🔍 Fetching user preferred unit:', {
      userId: userId.substring(0, 8) + '...',
      variableId: variableId.substring(0, 8) + '...'
    });

    const { data: preferredUnits, error } = await supabase.rpc(
      "get_user_preferred_unit",
      {
        user_id_param: userId,
        variable_id_param: variableId,
      }
    );

    if (error) {
      console.error("❌ Error fetching preferred unit:", error);
      return { unit: null, error: error.message };
    }

    if (!preferredUnits || preferredUnits.length === 0) {
      console.log('ℹ️ No preferred unit found for user');
      return { unit: null };
    }

    const unit = preferredUnits[0] as UserUnitPreference;
    
    // Cache the result
    setCachedUnit(cacheKey, unit);
    
    console.log('✅ Found preferred unit:', unit);
    return { unit };
    
  } catch (err) {
    console.error("❌ Unexpected error fetching preferred unit:", err);
    return { 
      unit: null, 
      error: err instanceof Error ? err.message : "Unknown error" 
    };
  }
}

/**
 * Get all available units for a variable, sorted by priority
 * User preference will have priority -1 (highest)
 */
export async function getVariableUnits(
  variableId: string
): Promise<{ units: UserUnitPreference[]; error?: string }> {
  try {
    console.log('🔍 Fetching variable units:', variableId.substring(0, 8) + '...');

    const { data: units, error } = await supabase.rpc(
      "get_variable_units",
      { var_id: variableId }
    );

    if (error) {
      console.error("❌ Error fetching variable units:", error);
      return { units: [], error: error.message };
    }

    console.log('✅ Found variable units:', units?.length || 0);
    return { units: units || [] };
    
  } catch (err) {
    console.error("❌ Unexpected error fetching variable units:", err);
    return { 
      units: [], 
      error: err instanceof Error ? err.message : "Unknown error" 
    };
  }
}

/**
 * Determine the best unit to use for a user and variable
 * Priority: 1. User preference 2. Variable default (highest priority)
 */
export async function getEffectiveUnit(
  userId: string,
  variableId: string
): Promise<{ unit: UserUnitPreference | null; error?: string }> {
  // First try to get user preference
  const { unit: userUnit, error: userError } = await getUserPreferredUnit(userId, variableId);
  
  if (userError) {
    return { unit: null, error: userError };
  }
  
  if (userUnit) {
    return { unit: userUnit };
  }
  
  // Fall back to variable default
  const { units, error: unitsError } = await getVariableUnits(variableId);
  
  if (unitsError) {
    return { unit: null, error: unitsError };
  }
  
  if (units.length === 0) {
    return { unit: null, error: "No units available for this variable" };
  }
  
  // Return highest priority unit (lowest priority number)
  const defaultUnit = units.sort((a, b) => a.priority - b.priority)[0];
  return { unit: defaultUnit };
}

// Simple in-memory cache for unit preferences (5 minute expiry)
const unitCache = new Map<string, { unit: UserUnitPreference; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedUnit(key: string): UserUnitPreference | null {
  const cached = unitCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    unitCache.delete(key);
    return null;
  }
  
  return cached.unit;
}

function setCachedUnit(key: string, unit: UserUnitPreference): void {
  unitCache.set(key, { unit, timestamp: Date.now() });
}

function invalidateUserUnitCache(userId: string, variableId?: string): void {
  if (variableId) {
    // Clear specific cache entry
    const key = `user_unit_${userId}_${variableId}`;
    unitCache.delete(key);
  } else {
    // Clear all cache entries for this user
    const keysToDelete = Array.from(unitCache.keys()).filter(key => 
      key.startsWith(`user_unit_${userId}_`)
    );
    keysToDelete.forEach(key => unitCache.delete(key));
  }
}

/**
 * Clear all cached unit preferences (useful for testing or when user logs out)
 */
export function clearAllUnitCache(): void {
  unitCache.clear();
}
