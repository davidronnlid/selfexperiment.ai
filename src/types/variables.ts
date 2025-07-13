// Simplified Variables System TypeScript Interfaces
// Only includes fields that are actually used in the app

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface Variable {
  id: string;
  slug: string;
  label: string;
  description?: string;
  icon?: string;

  // Data Type & Validation
  data_type: "continuous" | "categorical" | "boolean" | "time" | "text";
  validation_rules?: VariableValidationRules;

  // Unit System
  canonical_unit?: string;
  unit_group?: string;
  convertible_units?: string[];
  default_display_unit?: string;

  // Data Source & Collection
  source_type:
    | "manual"
    | "withings"
    | "oura"
    | "apple_health"
    | "formula"
    | "calculated";

  // Categorization
  category?: string;
  tags?: string[]; // For variable tagging

  // User preferences
  user_preferences?: any; // User-specific preferences

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  is_active: boolean;
}

export interface VariableValidationRules {
  min?: number;
  max?: number;
  scaleMin?: number; // For scale-based validation
  scaleMax?: number; // For scale-based validation
  step?: number;
  pattern?: string;
  required?: boolean;
  options?: string[]; // For categorical variables
  maxLength?: number; // For text validation
  unit?: string; // For unit validation
}

export interface VariableLog {
  id: string;
  user_id: string;
  variable_id: string;

  // Core data (simplified)
  value?: string;
  canonical_value?: string; // Canonical value for the log

  // Metadata
  created_at: string;
  source?: string;

  // Additional context
  notes?: string;
  context?: Record<string, any>;

  // Privacy
  is_private: boolean;
}

export interface VariableWithLogs extends Variable {
  logs?: VariableLog[];
}

// ============================================================================
// ROUTINE INTERFACES
// ============================================================================

export interface DailyRoutine {
  id: string;
  user_id: string;
  routine_name: string;
  notes?: string;
  is_active: boolean;
  weekdays: number[];
  created_at: string;
  updated_at: string;
  last_auto_logged?: string;
  times?: RoutineTime[];
}

export interface RoutineTime {
  time_id: string;
  time_of_day: string;
  time_name?: string;
  is_active: boolean;
  display_order: number;
  variables?: RoutineVariable[];
}

export interface RoutineVariable {
  variable_id: string;
  variable_name: string;
  variable_slug: string;
  default_value: string;
  default_unit?: string;
  display_order: number;
}

// ============================================================================
// SHARING INTERFACES
// ============================================================================

export interface VariableSharingSettings {
  id: number;
  user_id: string;
  variable_name: string;
  is_shared: boolean;
  variable_type: "predefined" | "custom" | "oura";
  category?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE INTERFACES
// ============================================================================

export interface CreateVariableRequest {
  slug: string;
  label: string;
  description?: string;
  icon?: string;
  data_type: "continuous" | "categorical" | "boolean" | "time" | "text";
  validation_rules?: VariableValidationRules;
  canonical_unit?: string;
  unit_group?: string;
  convertible_units?: string[];
  default_display_unit?: string;
  source_type:
    | "manual"
    | "withings"
    | "oura"
    | "apple_health"
    | "formula"
    | "calculated";
  category?: string;
}

export interface UpdateVariableRequest {
  label?: string;
  description?: string;
  icon?: string;
  data_type?: "continuous" | "categorical" | "boolean" | "time" | "text";
  validation_rules?: VariableValidationRules;
  canonical_unit?: string;
  unit_group?: string;
  convertible_units?: string[];
  default_display_unit?: string;
  source_type?:
    | "manual"
    | "withings"
    | "oura"
    | "apple_health"
    | "formula"
    | "calculated";
  category?: string;
  is_active?: boolean;
}

export interface CreateVariableLogRequest {
  variable_id: string;
  value: string;
  notes?: string;
  context?: Record<string, any>;
  is_private?: boolean;
}

export interface UpdateVariableLogRequest {
  value?: string;
  notes?: string;
  context?: Record<string, any>;
  is_private?: boolean;
}

// ============================================================================
// UTILITY INTERFACES
// ============================================================================

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface VariableFilter {
  category?: string;
  data_type?: string;
  source_type?: string;
  is_active?: boolean;
  search?: string;
}

export interface VariableLogFilter {
  variable_id?: string;
  source?: string;
  start_date?: string;
  end_date?: string;
  is_private?: boolean;
}

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

export interface VariableListResponse {
  variables: Variable[];
  total: number;
  page: number;
  limit: number;
}

export interface VariableLogListResponse {
  logs: VariableLog[];
  total: number;
  page: number;
  limit: number;
}

export interface VariableStats {
  total_logs: number;
  first_log_date?: string;
  last_log_date?: string;
  average_value?: number;
  min_value?: number;
  max_value?: number;
}

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[]; // For validation suggestions
}

export interface UnitConversion {
  from_unit: string;
  to_unit: string;
  conversion_factor: number;
  offset?: number;
  formula?: string;
}

// ============================================================================
// EXPERIMENT INTERFACES
// ============================================================================

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  variables: ExperimentVariable[];
  created_at: string;
  updated_at: string;
}

export interface ExperimentVariable {
  variable_id: string;
  variable_name: string;
  is_independent: boolean;
  target_value?: string;
  measurement_frequency: string;
}

// ============================================================================
// ANALYTICS INTERFACES
// ============================================================================

export interface CorrelationAnalysis {
  variable_id_1: string;
  variable_id_2: string;
  correlation_coefficient: number;
  p_value: number;
  sample_size: number;
  analysis_date: string;
}

export interface TrendAnalysis {
  variable_id: string;
  trend_direction: "increasing" | "decreasing" | "stable";
  trend_strength: number;
  period_days: number;
  analysis_date: string;
}

// ============================================================================
// EXPORT/IMPORT INTERFACES
// ============================================================================

export interface VariableExport {
  variables: Variable[];
  logs: VariableLog[];
  routines: DailyRoutine[];
  sharing_settings: VariableSharingSettings[];
  export_date: string;
  version: string;
}

export interface VariableImport {
  variables?: Variable[];
  logs?: VariableLog[];
  routines?: DailyRoutine[];
  sharing_settings?: VariableSharingSettings[];
  import_options: {
    skip_existing_variables?: boolean;
    skip_existing_logs?: boolean;
    skip_existing_routines?: boolean;
    merge_sharing_settings?: boolean;
  };
}

// ============================================================================
// USER PREFERENCES INTERFACES
// ============================================================================

export interface UserVariablePreference {
  id: string;
  user_id: string;
  variable_id: string;
  variable_name: string;
  is_shared: boolean;
  variable_type: string;
  category?: string;
  preferred_unit?: string;
  display_name?: string;
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
}
