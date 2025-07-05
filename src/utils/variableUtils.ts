// Universal Variables System Utilities
// Optimized for performance and type safety

import { supabase } from "./supaBase";
import type {
  Variable,
  VariableLog,
  UserVariablePreference,
  UnitConversion,
  ValidationResult,
  ValidationContext,
  VariableDisplayData,
  CreateVariableRequest,
  UpdateVariableRequest,
  CreateVariableLogRequest,
  VariableSearchRequest,
  VariableSearchResponse,
  VariableAnalytics,
  VariableCorrelation,
  VariableInsight,
  UNIT_GROUPS,
  DataType,
  SourceType,
} from "../types/variables";

// ============================================================================
// UNIT CONVERSION UTILITIES
// ============================================================================

/**
 * Convert a value between units using the database conversion table
 */
export async function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string
): Promise<number> {
  if (fromUnit === toUnit) return value;

  try {
    const { data, error } = await supabase.rpc("convert_unit", {
      value,
      from_unit: fromUnit,
      to_unit: toUnit,
    });

    if (error) throw error;
    return data || value;
  } catch (error) {
    console.error("Unit conversion failed:", error);
    return value; // Return original value if conversion fails
  }
}

/**
 * Get all available units for a variable
 */
export async function getVariableUnits(variableId: string): Promise<string[]> {
  try {
    const { data: variable, error } = await supabase
      .from("variables")
      .select("convertible_units, canonical_unit")
      .eq("id", variableId)
      .single();

    if (error) throw error;

    const units = variable?.convertible_units || [];
    if (variable?.canonical_unit && !units.includes(variable.canonical_unit)) {
      units.unshift(variable.canonical_unit);
    }

    return units;
  } catch (error) {
    console.error("Failed to get variable units:", error);
    return [];
  }
}

/**
 * Get user's preferred unit for a variable
 */
export async function getUserPreferredUnit(
  userId: string,
  variableId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("get_user_preferred_unit", {
      user_uuid: userId,
      variable_uuid: variableId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to get user preferred unit:", error);
    return null;
  }
}

// ============================================================================
// VARIABLE VALIDATION
// ============================================================================

/**
 * Validate a value against variable constraints
 */
export function validateVariableValue(
  value: string | number,
  variable: Variable,
  context?: ValidationContext
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
      error: `${variable.label} must be yes/no, true/false, or 1/0`,
    };
  }

  return { isValid: true };
}

function validateTimeValue(
  value: string,
  rules: any,
  variable: Variable
): ValidationResult {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (!timeRegex.test(value)) {
    return {
      isValid: false,
      error: `${variable.label} must be in HH:MM format (e.g., 23:30)`,
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

  if (rules.pattern) {
    const regex = new RegExp(rules.pattern);
    if (!regex.test(value)) {
      return {
        isValid: false,
        error: `${variable.label} format is invalid`,
      };
    }
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
    // Auto-generate slug if not provided
    if (!request.slug) {
      request.slug = request.label
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
    }

    const { data, error } = await supabase
      .from("variables")
      .insert({
        ...request,
        created_by: userId,
        is_active: true,
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
  request: UpdateVariableRequest
): Promise<Variable | null> {
  try {
    const { data, error } = await supabase
      .from("variables")
      .update({
        ...request,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id)
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
 * Get variable by ID
 */
export async function getVariable(id: string): Promise<Variable | null> {
  try {
    const { data, error } = await supabase
      .from("variables")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to get variable:", error);
    return null;
  }
}

/**
 * Search variables with filters
 */
export async function searchVariables(
  request: VariableSearchRequest,
  userId?: string
): Promise<VariableSearchResponse> {
  try {
    let query = supabase
      .from("variables")
      .select("*, user_variable_preferences!inner(*)", { count: "exact" })
      .eq("is_active", true);

    // Apply filters
    if (request.query) {
      query = query.or(
        `label.ilike.%${request.query}%,description.ilike.%${request.query}%`
      );
    }

    if (request.category) {
      query = query.eq("category", request.category);
    }

    if (request.data_type) {
      query = query.eq("data_type", request.data_type);
    }

    if (request.source_type) {
      query = query.eq("source_type", request.source_type);
    }

    if (request.is_tracked !== undefined) {
      query = query.eq(
        "user_variable_preferences.is_tracked",
        request.is_tracked
      );
    }

    // Filter by user if provided
    if (userId) {
      query = query.eq("user_variable_preferences.user_id", userId);
    }

    // Apply pagination
    const limit = request.limit || 20;
    const offset = request.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      variables: data || [],
      total: count || 0,
      has_more: (count || 0) > offset + limit,
    };
  } catch (error) {
    console.error("Failed to search variables:", error);
    return {
      variables: [],
      total: 0,
      has_more: false,
    };
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
    // Get variable to determine canonical unit
    const variable = await getVariable(request.variable_id);
    if (!variable) {
      throw new Error("Variable not found");
    }

    // Convert to canonical unit if needed
    let canonicalValue: number | undefined;
    if (
      variable.canonical_unit &&
      request.display_unit &&
      request.display_unit !== variable.canonical_unit
    ) {
      const numValue = parseFloat(request.display_value);
      if (!isNaN(numValue)) {
        canonicalValue = await convertUnit(
          numValue,
          request.display_unit,
          variable.canonical_unit
        );
      }
    } else if (variable.canonical_unit) {
      canonicalValue = parseFloat(request.display_value);
    }

    const { data, error } = await supabase
      .from("variable_logs")
      .insert({
        user_id: userId,
        variable_id: request.variable_id,
        canonical_value: canonicalValue,
        display_value: request.display_value,
        display_unit: request.display_unit,
        notes: request.notes,
        tags: request.tags,
        context: request.context,
        is_private: request.is_private || false,
        source: "manual",
        confidence_score: 1.0,
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
      .from("variable_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("variable_id", variableId)
      .order("logged_at", { ascending: false });

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
      query = query.gte("logged_at", options.startDate);
    }

    if (options?.endDate) {
      query = query.lte("logged_at", options.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to get variable logs:", error);
    return [];
  }
}

// ============================================================================
// USER PREFERENCES MANAGEMENT
// ============================================================================

/**
 * Get user preferences for a variable
 */
export async function getUserVariablePreference(
  userId: string,
  variableId: string
): Promise<UserVariablePreference | null> {
  try {
    const { data, error } = await supabase
      .from("user_variable_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("variable_id", variableId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  } catch (error) {
    console.error("Failed to get user variable preference:", error);
    return null;
  }
}

/**
 * Update user preferences for a variable
 */
export async function updateUserVariablePreference(
  userId: string,
  variableId: string,
  updates: Partial<UserVariablePreference>
): Promise<UserVariablePreference | null> {
  try {
    const { data, error } = await supabase
      .from("user_variable_preferences")
      .upsert({
        user_id: userId,
        variable_id: variableId,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to update user variable preference:", error);
    return null;
  }
}

// ============================================================================
// DISPLAY UTILITIES
// ============================================================================

/**
 * Format a variable value for display
 */
export async function formatVariableValue(
  variable: Variable,
  value: string | number,
  unit?: string,
  userId?: string
): Promise<VariableDisplayData> {
  let displayUnit = unit;
  let convertedValue: number | undefined;

  // Get user's preferred unit if available
  if (userId && variable.canonical_unit) {
    const preferredUnit = await getUserPreferredUnit(userId, variable.id);
    if (preferredUnit && preferredUnit !== unit) {
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      if (!isNaN(numValue)) {
        convertedValue = await convertUnit(
          numValue,
          unit || variable.canonical_unit,
          preferredUnit
        );
        displayUnit = preferredUnit;
      }
    }
  }

  return {
    variable,
    value: convertedValue !== undefined ? convertedValue : value,
    unit: displayUnit,
    converted_value: convertedValue,
    converted_unit: displayUnit,
  };
}

/**
 * Get display-friendly variable name
 */
export function getVariableDisplayName(
  variable: Variable,
  userPreferences?: UserVariablePreference
): string {
  return userPreferences?.display_name || variable.label;
}

/**
 * Get variable icon
 */
export function getVariableIcon(variable: Variable): string {
  return variable.icon || "📊";
}

// ============================================================================
// ANALYTICS UTILITIES
// ============================================================================

/**
 * Get variable correlations
 */
export async function getVariableCorrelations(
  variableId: string,
  userId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    minStrength?: number;
  }
): Promise<VariableCorrelation[]> {
  try {
    // This would implement correlation analysis
    // For now, return mock data
    return [
      {
        variable_id: "sleep_duration",
        correlation_strength: 0.3,
        confidence: 0.8,
        direction: "positive",
        sample_size: 100,
      },
      {
        variable_id: "stress",
        correlation_strength: -0.2,
        confidence: 0.7,
        direction: "negative",
        sample_size: 100,
      },
    ];
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
  options?: {
    period?: string;
    granularity?: string;
  }
): Promise<{
  direction: "increasing" | "decreasing" | "stable";
  changePercentage: number;
  period: string;
  confidence: number;
}> {
  try {
    // This would implement trend analysis
    // For now, return mock data
    return {
      direction: "increasing",
      changePercentage: 5.2,
      period: "30 days",
      confidence: 0.8,
    };
  } catch (error) {
    console.error("Failed to get variable trends:", error);
    return {
      direction: "stable",
      changePercentage: 0,
      period: "30 days",
      confidence: 0,
    };
  }
}

/**
 * Get variable insights
 */
export async function getVariableInsights(
  variableId: string,
  userId: string,
  options?: {
    includePatterns?: boolean;
    includeAnomalies?: boolean;
  }
): Promise<VariableInsight[]> {
  try {
    // This would implement insight generation
    // For now, return mock data
    return [
      {
        type: "trend",
        title: "Consistent Improvement",
        description:
          "Your weight has been decreasing steadily over the past month",
        confidence: 0.9,
        data_points: 30,
      },
      {
        type: "pattern",
        title: "Weekly Pattern",
        description: "Weight tends to be higher on weekends",
        confidence: 0.7,
        data_points: 90,
      },
    ];
  } catch (error) {
    console.error("Failed to get variable insights:", error);
    return [];
  }
}

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================

/**
 * Migrate existing daily_logs to the new variable system
 */
export async function migrateDailyLogsToVariables(): Promise<void> {
  try {
    const { error } = await supabase.rpc("migrate_daily_logs_to_variables");
    if (error) throw error;
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Create default variables for a user
 */
export async function createDefaultVariables(userId: string): Promise<void> {
  try {
    // Import default variables from types
    const { DEFAULT_VARIABLES } = await import("../types/variables");

    for (const defaultVar of DEFAULT_VARIABLES) {
      const slug = defaultVar.label.toLowerCase().replace(/\s+/g, "_");

      // Create variable
      const variable = await createVariable(
        {
          ...defaultVar,
          slug,
        },
        userId
      );

      if (variable) {
        // Set user preferences
        await updateUserVariablePreference(userId, variable.id, {
          is_tracked: true,
          is_shared: false,
          share_level: "private",
          display_order: 0,
          is_favorite: false,
        });
      }
    }
  } catch (error) {
    console.error("Failed to create default variables:", error);
  }
}
