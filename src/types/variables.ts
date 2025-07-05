// Enhanced Variables System - TypeScript Types

export interface Variable {
  id: string;
  label: string;
  slug: string;
  type: 'continuous' | 'categorical' | 'boolean' | 'ordinal';
  unit?: string;
  unit_group?: string;
  is_convertible: boolean;
  method: 'manual_entry' | 'withings' | 'oura' | 'formula' | 'apple_health' | 'garmin' | 'fitbit' | 'custom_integration';
  description?: string;
  icon?: string;
  category?: string;
  is_predefined: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Validation and display
  validation_rules: Record<string, any>;
  display_options: Record<string, any>;
  
  // Categorical constraints
  categorical_options?: string[];
  
  // Continuous constraints
  min_value?: number;
  max_value?: number;
  decimal_places: number;
  
  // Ordinal constraints
  ordinal_min?: number;
  ordinal_max?: number;
  ordinal_labels?: string[];
}

export interface UnitGroup {
  id: string;
  name: string;
  description?: string;
  base_unit: string;
  created_at: string;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  symbol: string;
  unit_group_id?: string;
  conversion_factor: number;
  conversion_offset: number;
  is_base_unit: boolean;
  created_at: string;
}

export interface UserUnitPreference {
  id: string;
  user_id: string;
  unit_group_id: string;
  preferred_unit_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserVariable {
  id: string;
  user_id: string;
  variable_id: string;
  is_enabled: boolean;
  custom_label?: string;
  custom_unit_id?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DailyLogV2 {
  id: string;
  user_id: string;
  variable_id: string;
  value?: number;
  text_value?: string;
  unit_id?: string;
  canonical_value?: number;
  date: string;
  timestamp: string;
  method: string;
  confidence: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Extended types with joined data
export interface VariableWithUnit extends Variable {
  unit_info?: Unit;
  unit_group_info?: UnitGroup;
}

export interface UserVariableWithDetails extends UserVariable {
  variable: Variable;
  custom_unit?: Unit;
}

export interface LogEntryWithDetails extends DailyLogV2 {
  variable: Variable;
  unit?: Unit;
  display_value?: string;
  display_unit?: string;
}

// Form and validation types
export interface VariableValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface VariableFormData {
  label: string;
  slug: string;
  type: Variable['type'];
  unit?: string;
  method: Variable['method'];
  description?: string;
  icon?: string;
  category?: string;
  
  // Categorical
  categorical_options?: string[];
  
  // Continuous
  min_value?: number;
  max_value?: number;
  decimal_places?: number;
  
  // Ordinal
  ordinal_min?: number;
  ordinal_max?: number;
  ordinal_labels?: string[];
}

// Unit conversion types
export interface ConversionResult {
  value: number;
  unit: Unit;
  formatted: string;
}

export interface UnitConversionRequest {
  value: number;
  fromUnit: string;
  toUnit: string;
  precision?: number;
}

// Data analysis types
export interface VariableStats {
  variable_id: string;
  count: number;
  mean?: number;
  median?: number;
  std_dev?: number;
  min?: number;
  max?: number;
  mode?: string | number;
  latest_value?: number | string;
  latest_date?: string;
}

export interface CorrelationResult {
  variable1_id: string;
  variable2_id: string;
  correlation_coefficient: number;
  p_value: number;
  sample_size: number;
  strength: 'weak' | 'moderate' | 'strong';
  direction: 'positive' | 'negative';
}

// UI and display types
export interface VariableDisplayConfig {
  show_unit: boolean;
  show_icon: boolean;
  use_custom_label: boolean;
  chart_type?: 'line' | 'bar' | 'scatter' | 'heatmap';
  color_scheme?: string;
}

export interface VariableInputProps {
  variable: Variable;
  value?: number | string;
  unit?: Unit;
  onChange: (value: number | string, unit?: Unit) => void;
  onValidationChange?: (result: VariableValidationResult) => void;
  disabled?: boolean;
  showValidation?: boolean;
  displayConfig?: VariableDisplayConfig;
}

// Search and filtering types
export interface VariableFilter {
  categories?: string[];
  types?: Variable['type'][];
  methods?: Variable['method'][];
  is_convertible?: boolean;
  is_predefined?: boolean;
  is_active?: boolean;
  created_by?: string;
  search_query?: string;
}

export interface VariableSort {
  field: 'label' | 'category' | 'type' | 'created_at' | 'updated_at';
  direction: 'asc' | 'desc';
}

// API response types
export interface VariablesResponse {
  variables: Variable[];
  total: number;
  page: number;
  per_page: number;
}

export interface UnitsResponse {
  units: Unit[];
  unit_groups: UnitGroup[];
}

export interface UserVariablesResponse {
  user_variables: UserVariableWithDetails[];
  user_unit_preferences: UserUnitPreference[];
}

// Constants
export const VARIABLE_TYPES = ['continuous', 'categorical', 'boolean', 'ordinal'] as const;
export const VARIABLE_METHODS = [
  'manual_entry',
  'withings',
  'oura',
  'formula',
  'apple_health',
  'garmin',
  'fitbit',
  'custom_integration'
] as const;

export const VARIABLE_CATEGORIES = [
  'Mental & Emotional',
  'Sleep & Recovery',
  'Physical Health',
  'Substances & Diet',
  'Environment',
  'Oura Data',
  'Custom'
] as const;

// Type guards
export function isVariable(obj: any): obj is Variable {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.label === 'string' && 
         typeof obj.slug === 'string' && 
         VARIABLE_TYPES.includes(obj.type);
}

export function isUnit(obj: any): obj is Unit {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.code === 'string' && 
         typeof obj.symbol === 'string';
}

export function isContinuousVariable(variable: Variable): boolean {
  return variable.type === 'continuous';
}

export function isCategoricalVariable(variable: Variable): boolean {
  return variable.type === 'categorical';
}

export function isBooleanVariable(variable: Variable): boolean {
  return variable.type === 'boolean';
}

export function isOrdinalVariable(variable: Variable): boolean {
  return variable.type === 'ordinal';
}

export function isConvertibleVariable(variable: Variable): boolean {
  return variable.is_convertible && !!variable.unit_group;
}

// Utility functions
export function getVariableDisplayName(variable: Variable, userVariable?: UserVariable): string {
  return userVariable?.custom_label || variable.label;
}

export function getVariableIcon(variable: Variable): string {
  return variable.icon || '📊';
}

export function getVariableDescription(variable: Variable): string {
  return variable.description || `${variable.label} measurement`;
}

export function createVariableSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getDefaultValueForVariable(variable: Variable): number | string | boolean | null {
  switch (variable.type) {
    case 'boolean':
      return false;
    case 'continuous':
      return variable.min_value || 0;
    case 'ordinal':
      return variable.ordinal_min || 1;
    case 'categorical':
      return variable.categorical_options?.[0] || '';
    default:
      return null;
  }
}