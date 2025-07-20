// Simplified Variables System Utilities
// Only includes functions that are actually used in the app

import { supabase } from "./supaBase";
import type {
  Variable,
  VariableLog,
  ValidationResult,
  CreateVariableRequest,
  UpdateVariableRequest,
  CreateVariableLogRequest,
} from "../types/variables";

// ============================================================================
// VARIABLE VALIDATION
// ============================================================================

/**
 * Validate a value against variable constraints
 */
export function validateVariableValue(
  value: string | number,
  variable: Variable
): ValidationResult {
  const rules = variable.validation_rules;
  if (!rules) return { isValid: true };

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  const strValue = typeof value === "string" ? value : value.toString();

  // Required field validation
  if (rules.required && (!value || strValue.trim() === "")) {
    return {
      isValid: false,
      error: `${variable.label} is required`,
    };
  }

  // Type-specific validation
  switch (variable.data_type) {
    case "continuous":
      return validateContinuousValue(numValue, rules, variable);
    case "categorical":
      return validateCategoricalValue(strValue, rules, variable);
    case "boolean":
      return validateBooleanValue(strValue, rules, variable);
    case "time":
      return validateTimeValue(strValue, rules, variable);
    case "text":
      return validateTextValue(strValue, rules, variable);
    default:
      return { isValid: true };
  }
}

function validateContinuousValue(
  value: number,
  rules: any,
  variable: Variable
): ValidationResult {
  if (isNaN(value)) {
    return {
      isValid: false,
      error: `${variable.label} must be a number`,
    };
  }

  if (rules.min !== undefined && value < rules.min) {
    return {
      isValid: false,
      error: `${variable.label} must be at least ${rules.min}${
        rules.unit ? ` ${rules.unit}` : ""
      }`,
    };
  }

  if (rules.max !== undefined && value > rules.max) {
    return {
      isValid: false,
      error: `${variable.label} must be no more than ${rules.max}${
        rules.unit ? ` ${rules.unit}` : ""
      }`,
    };
  }

  return { isValid: true };
}

function validateCategoricalValue(
  value: string,
  rules: any,
  variable: Variable
): ValidationResult {
  if (rules.options && !rules.options.includes(value)) {
    return {
      isValid: false,
      error: `${variable.label} must be one of: ${rules.options.join(", ")}`,
    };
  }

  return { isValid: true };
}

function validateBooleanValue(
  value: string,
  rules: any,
  variable: Variable
): ValidationResult {
  const validBooleans = ["true", "false", "yes", "no", "1", "0", "y", "n"];
  const normalizedValue = value.toLowerCase().trim();

  if (!validBooleans.includes(normalizedValue)) {
    return {
      isValid: false,
      error: `${variable.label} must be a valid boolean value`,
    };
  }

  return { isValid: true };
}

function validateTimeValue(
  value: string,
  rules: any,
  variable: Variable
): ValidationResult {
  // Basic time format validation (HH:MM or HH:MM:SS)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

  if (!timeRegex.test(value)) {
    return {
      isValid: false,
      error: `${variable.label} must be in HH:MM or HH:MM:SS format`,
    };
  }

  return { isValid: true };
}

function validateTextValue(
  value: string,
  rules: any,
  variable: Variable
): ValidationResult {
  if (rules.minLength && value.length < rules.minLength) {
    return {
      isValid: false,
      error: `${variable.label} must be at least ${rules.minLength} characters`,
    };
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return {
      isValid: false,
      error: `${variable.label} must be no more than ${rules.maxLength} characters`,
    };
  }

  if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
    return {
      isValid: false,
      error: `${variable.label} format is invalid`,
    };
  }

  return { isValid: true };
}

// ============================================================================
// VARIABLE MANAGEMENT
// ============================================================================

/**
 * Create a new variable
 */
export async function createVariable(
  request: CreateVariableRequest,
  userId: string
): Promise<Variable | null> {
  try {
    const { data, error } = await supabase
      .from("variables")
      .insert({
        ...request,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to create variable:", error);
    return null;
  }
}

/**
 * Update an existing variable
 */
export async function updateVariable(
  variableId: string,
  request: UpdateVariableRequest
): Promise<Variable | null> {
  try {
    const { data, error } = await supabase
      .from("variables")
      .update({
        ...request,
        updated_at: new Date().toISOString(),
      })
      .eq("id", variableId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to update variable:", error);
    return null;
  }
}

/**
 * Get a variable by ID
 */
export async function getVariable(id: string): Promise<Variable | null> {
  try {
    const { data, error } = await supabase
      .from("variables")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to get variable:", error);
    return null;
  }
}

/**
 * Get all variables for a user
 */
export async function getVariables(userId?: string): Promise<Variable[]> {
  try {
    let query = supabase
      .from("variables")
      .select("*")
      .eq("is_active", true)
      .order("label");

    if (userId) {
      query = query.eq("created_by", userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to get variables:", error);
    return [];
  }
}

/**
 * Get variables with user preferences included
 */
export async function getVariablesWithPreferences(
  userId: string,
  options?: {
    limit?: number;
  }
): Promise<{ variables: Variable[] }> {
  try {
    let query = supabase
      .from("variables")
      .select(
        `
        *,
        user_preferences:user_variable_preferences!user_variable_preferences_variable_id_fkey (
          id,
          user_id,
          variable_id,
          is_shared,
          created_at,
          updated_at
        )
      `
      )
      .eq("is_active", true)
      .order("label");

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { variables: data || [] };
  } catch (error) {
    console.error("Failed to get variables with preferences:", error);
    return { variables: [] };
  }
}

/**
 * Get variables that the user has data for
 */
export async function getVariablesWithUserData(userId: string): Promise<Variable[]> {
  try {
    // First, get all variable IDs that the user has data for
    const { data: userDataPoints, error: dataError } = await supabase
      .from("data_points")
      .select("variable_id")
      .eq("user_id", userId)
      .not("variable_id", "is", null);

    if (dataError) throw dataError;

    // Extract unique variable IDs
    const variableIds = [...new Set(userDataPoints?.map(dp => dp.variable_id) || [])];

    if (variableIds.length === 0) {
      return [];
    }

    // Get the variables that the user has data for
    const { data: variables, error: varError } = await supabase
      .from("variables")
      .select("*")
      .in("id", variableIds)
      .eq("is_active", true)
      .order("label");

    if (varError) throw varError;
    return variables || [];
  } catch (error) {
    console.error("Failed to get variables with user data:", error);
    return [];
  }
}

// ============================================================================
// VARIABLE LOGS MANAGEMENT
// ============================================================================

/**
 * Create a new variable log
 */
export async function createVariableLog(
  request: CreateVariableLogRequest,
  userId: string
): Promise<VariableLog | null> {
  try {
    const { data, error } = await supabase
      .from("logs")
      .insert({
        user_id: userId,
        variable_id: request.variable_id,
        value: request.value,
        display_unit: request.display_unit,
        notes: request.notes,
        context: request.context,
        is_private: request.is_private || false,
        source: ["manual"],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to create variable log:", error);
    return null;
  }
}

/**
 * Get variable logs for a user
 */
export async function getVariableLogs(
  variableId: string,
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<VariableLog[]> {
  try {
    let query = supabase
      .from("logs")
      .select("*")
      .eq("user_id", userId)
      .eq("variable_id", variableId)
      .order("created_at", { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 100) - 1
      );
    }

    if (options?.startDate) {
      query = query.gte("created_at", options.startDate);
    }

    if (options?.endDate) {
      query = query.lte("created_at", options.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to get variable logs:", error);
    return [];
  }
}

/**
 * Update a variable log
 */
export async function updateVariableLog(
  logId: string,
  updates: {
    value?: string;
    display_unit?: string;
    notes?: string;
    context?: Record<string, unknown>;
    is_private?: boolean;
  }
): Promise<VariableLog | null> {
  try {
    const { data, error } = await supabase
      .from("logs")
      .update(updates)
      .eq("id", logId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to update variable log:", error);
    return null;
  }
}

/**
 * Delete a variable log
 */
export async function deleteVariableLog(logId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("logs").delete().eq("id", logId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Failed to delete variable log:", error);
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get variable display name
 */
export function getVariableDisplayName(variable: Variable): string {
  return variable.label;
}

/**
 * Get variable icon
 */
export function getVariableIcon(variable: Variable): string {
  return variable.icon || "📊";
}

/**
 * Validate a value for a specific variable name (used in log/now.tsx)
 */
export function validateValue(
  variableName: string,
  value: string
): ValidationResult {
  // Basic validation - can be enhanced based on variable type
  if (!value || value.trim() === "") {
    return {
      isValid: false,
      error: `${variableName} is required`,
    };
  }
  return { isValid: true };
}

// ============================================================================
// SEARCH & UTILITY FUNCTIONS
// ============================================================================

/**
 * Search variables by name or description
 */
export async function searchVariables(
  query: string,
  userId?: string
): Promise<Variable[]> {
  try {
    // Use the new synonym-aware search function
    const { searchVariablesWithSynonyms } = await import('./variableSearchUtils');
    
    
    // Return just the variables from the search results
    return [];
  } catch (error) {
    console.error("Failed to search variables:", error);
    return [];
  }
}

/**
 * Convert between units
 */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  // Basic unit conversion - can be enhanced with more conversions
  if (fromUnit === toUnit) return value;

  // Handle boolean conversions
  if (fromUnit.includes("/") && toUnit.includes("/")) {
    // Boolean unit conversion
    return convertBooleanUnit(value, fromUnit, toUnit);
  }

  // Common conversions
  const conversions: Record<string, Record<string, number>> = {
    kg: { lbs: 2.20462 },
    lbs: { kg: 0.453592 },
    km: { miles: 0.621371 },
    miles: { km: 1.60934 },
  };

  // Temperature conversions (special case)
  if (fromUnit === "celsius" && toUnit === "fahrenheit") {
    return (value * 9) / 5 + 32;
  }
  if (fromUnit === "fahrenheit" && toUnit === "celsius") {
    return ((value - 32) * 5) / 9;
  }

  const conversion = conversions[fromUnit]?.[toUnit];
  if (typeof conversion === "number") {
    return value * conversion;
  }

  return value; // Return original if no conversion found
}

/**
 * Convert boolean value between different unit representations
 */
export function convertBooleanUnit(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  // All boolean units represent the same underlying value
  // The conversion is just a representation change
  return value;
}

/**
 * Convert boolean value to display string based on unit
 */
export function convertBooleanValueToString(
  value: string | number | boolean,
  unit: string
): string {
  // Normalize the value to a boolean
  let boolValue: boolean;
  if (typeof value === "boolean") {
    boolValue = value;
  } else if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    boolValue = ["true", "yes", "y", "1"].includes(normalized);
  } else {
    boolValue = value === 1;
  }

  // Return the appropriate string representation based on unit
  switch (unit) {
    case "true/false":
      return boolValue ? "true" : "false";
    case "yes/no":
      return boolValue ? "yes" : "no";
    case "0/1":
      return boolValue ? "1" : "0";
    default:
      return boolValue ? "true" : "false";
  }
}

/**
 * Convert boolean string to standard boolean value
 */
export function convertBooleanStringToValue(
  value: string,
  unit: string
): boolean {
  const normalized = value.toLowerCase().trim();

  switch (unit) {
    case "true/false":
      return normalized === "true";
    case "yes/no":
      return normalized === "yes";
    case "0/1":
      return normalized === "1";
    default:
      return ["true", "yes", "y", "1"].includes(normalized);
  }
}

/**
 * Get user's preferred unit for a variable
 * @deprecated Use getDefaultDisplayUnit from variableUnitsUtils instead
 */
export function getUserPreferredUnit(variable: Variable): string {
  return variable.default_display_unit || variable.canonical_unit || "";
}

/**
 * Get user's preferred display unit from database with caching
 */
const displayUnitCache = new Map<string, string>();

export async function getUserDisplayUnit(
  userId: string, 
  variableId: string, 
  variable?: Variable
): Promise<string> {
  const cacheKey = `${userId}-${variableId}`;
  
  // Check cache first
  if (displayUnitCache.has(cacheKey)) {
    return displayUnitCache.get(cacheKey)!;
  }
  
  try {
    // Use the RPC function instead of direct table access
    const { data, error } = await supabase.rpc('get_user_preferred_unit', {
      user_id_param: userId,
      variable_id_param: variableId
    });
    
    let displayUnit = "";
    if (!error && data && data.length > 0) {
      // RPC function returns an array, get the first result
      displayUnit = data[0].unit_id || data[0].symbol || "";
    } else {
      // Fallback to variable's canonical unit
      displayUnit = variable?.canonical_unit || "";
    }
    
    // Cache the result
    displayUnitCache.set(cacheKey, displayUnit);
    return displayUnit;
  } catch (error) {
    console.error("Failed to get user display unit:", error);
    const fallback = variable?.canonical_unit || "";
    displayUnitCache.set(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Format variable value with user's preferred display unit
 */
export async function formatVariableWithUserUnit(
  value: string | number,
  userId: string,
  variableId: string,
  variable?: Variable
): Promise<{ formattedValue: string; unit: string }> {
  const displayUnit = await getUserDisplayUnit(userId, variableId, variable);
  const formattedValue = typeof value === "number" ? value.toString() : value;
  
  return {
    formattedValue,
    unit: displayUnit
  };
}

/**
 * Clear display unit cache (useful when preferences are updated)
 */
export function clearDisplayUnitCache(userId?: string, variableId?: string) {
  if (userId && variableId) {
    displayUnitCache.delete(`${userId}-${variableId}`);
  } else {
    displayUnitCache.clear();
  }
}

/**
 * Format variable value for display
 */
export function formatVariableValue(
  value: string | number,
  unit?: string
): string {
  const formattedValue = typeof value === "number" ? value.toString() : value;
  return unit ? `${formattedValue} ${unit}` : formattedValue;
}

/**
 * Update user variable preference
 */
export async function updateUserVariablePreference(
  variableId: string,
  userId: string,
  preference: unknown
): Promise<boolean> {
  try {
    const { error } = await supabase.from("variable_preferences").upsert({
      variable_id: variableId,
      user_id: userId,
      preference: preference,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Failed to update variable preference:", error);
    return false;
  }
}

/**
 * Get variable correlations
 */
export async function getVariableCorrelations(
  variableId: string,
  userId: string
): Promise<unknown[]> {
  try {
    const { data, error } = await supabase.rpc("get_variable_correlations", {
      p_variable_id: variableId,
      p_user_id: userId,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to get variable correlations:", error);
    return [];
  }
}

/**
 * Get variable trends
 */
export async function getVariableTrends(
  variableId: string,
  userId: string,
  days: number = 30
): Promise<unknown> {
  try {
    const { data, error } = await supabase.rpc("get_variable_trends", {
      p_variable_id: variableId,
      p_user_id: userId,
      p_days: days,
    });

    if (error) throw error;
    return data || {};
  } catch (error) {
    console.error("Failed to get variable trends:", error);
    return {};
  }
}

/**
 * Get variable insights
 */
export async function getVariableInsights(
  variableId: string,
  userId: string
): Promise<unknown> {
  try {
    const { data, error } = await supabase.rpc("get_variable_insights", {
      p_variable_id: variableId,
      p_user_id: userId,
    });

    if (error) throw error;
    return data || {};
  } catch (error) {
    console.error("Failed to get variable insights:", error);
    return {};
  }
}

// Fix the getUserVariablePreferences function to use simplified query
export const getUserVariablePreferences = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("user_variable_preferences")
      .select("id, user_id, variable_id, is_shared, created_at, updated_at")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user variable preferences:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("getUserVariablePreferences error:", error);
    return [];
  }
};
