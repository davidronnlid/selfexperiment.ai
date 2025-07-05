// Universal Variables System TypeScript Interfaces
// Optimized for type safety and developer experience

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
  collection_method?: string;
  frequency?: string;

  // Categorization
  category?: string;
  subcategory?: string;
  tags?: string[];

  // Privacy & Sharing
  is_public?: boolean;
  privacy_level?: "private" | "friends" | "public";

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  is_active: boolean;
}

export interface VariableValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  unit?: string;
  scaleMin?: number;
  scaleMax?: number;
  options?: string[];
  pattern?: string;
}

export interface UserVariablePreference {
  id: string;
  user_id: string;
  variable_id: string;

  // User-specific settings
  preferred_unit?: string;
  display_name?: string;
  is_tracked: boolean;
  tracking_frequency?: string;

  // Privacy settings
  is_shared: boolean;
  share_level: "private" | "friends" | "public";

  // UI preferences
  display_order: number;
  is_favorite: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface VariableLog {
  id: string;
  user_id: string;
  variable_id: string;

  // Core data
  canonical_value?: number;
  display_value?: string;
  display_unit?: string;

  // Metadata
  logged_at: string;
  source?: string;
  confidence_score?: number;

  // Additional context
  notes?: string;
  tags?: string[];
  location?: GeoLocation;
  context?: Record<string, any>;

  // Privacy
  is_private: boolean;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface UnitConversion {
  id: string;
  from_unit: string;
  to_unit: string;
  conversion_factor: number;
  offset?: number;
  formula?: string;
  unit_group: string;
  is_active: boolean;
  created_at: string;
}

export interface VariableRelationship {
  id: string;
  variable_id_1: string;
  variable_id_2: string;
  relationship_type: "correlation" | "causation" | "inverse" | "composite";
  strength?: number;
  confidence?: number;
  analysis_date: string;
  sample_size?: number;
  methodology?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DataType = Variable["data_type"];
export type SourceType = Variable["source_type"];
export type PrivacyLevel = Variable["privacy_level"];
export type RelationshipType = VariableRelationship["relationship_type"];

export interface VariableWithPreferences extends Variable {
  user_preferences?: UserVariablePreference;
}

export interface VariableWithLogs extends Variable {
  logs?: VariableLog[];
}

export interface VariableDisplayData {
  variable: Variable;
  value: string | number;
  unit?: string;
  converted_value?: number;
  converted_unit?: string;
  user_preferences?: UserVariablePreference;
}

// ============================================================================
// UNIT CONVERSION TYPES
// ============================================================================

export interface UnitGroup {
  name: string;
  units: string[];
  base_unit: string;
}

export const UNIT_GROUPS: Record<string, UnitGroup> = {
  mass: {
    name: "Mass",
    units: ["kg", "lb", "g", "oz"],
    base_unit: "kg",
  },
  distance: {
    name: "Distance",
    units: ["km", "mi", "m", "ft", "cm", "in"],
    base_unit: "m",
  },
  time: {
    name: "Time",
    units: ["hours", "minutes", "seconds"],
    base_unit: "seconds",
  },
  temperature: {
    name: "Temperature",
    units: ["°C", "°F"],
    base_unit: "°C",
  },
};

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  suggestions?: string[];
}

export interface ValidationContext {
  variable: Variable;
  user_preferences?: UserVariablePreference;
  previous_values?: VariableLog[];
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface VariableAnalytics {
  variable_id: string;
  total_logs: number;
  date_range: {
    start: string;
    end: string;
  };
  trends: {
    direction: "increasing" | "decreasing" | "stable";
    change_percentage: number;
    period: string;
  };
  correlations: VariableCorrelation[];
  insights: VariableInsight[];
}

export interface VariableCorrelation {
  variable_id: string;
  correlation_strength: number;
  confidence: number;
  direction: "positive" | "negative";
  sample_size: number;
}

export interface VariableInsight {
  type: "trend" | "pattern" | "anomaly" | "correlation";
  title: string;
  description: string;
  confidence: number;
  data_points: number;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateVariableRequest {
  slug: string;
  label: string;
  description?: string;
  icon?: string;
  data_type: DataType;
  canonical_unit?: string;
  unit_group?: string;
  convertible_units?: string[];
  default_display_unit?: string;
  source_type: SourceType;
  category?: string;
  subcategory?: string;
  tags?: string[];
  validation_rules?: VariableValidationRules;
}

export interface UpdateVariableRequest extends Partial<CreateVariableRequest> {
  id: string;
}

export interface CreateVariableLogRequest {
  variable_id: string;
  display_value: string;
  display_unit?: string;
  notes?: string;
  tags?: string[];
  context?: Record<string, any>;
  is_private?: boolean;
}

export interface UpdateVariableLogRequest
  extends Partial<CreateVariableLogRequest> {
  id: string;
}

export interface VariableSearchRequest {
  query?: string;
  category?: string;
  data_type?: DataType;
  source_type?: SourceType;
  tags?: string[];
  is_tracked?: boolean;
  limit?: number;
  offset?: number;
}

export interface VariableSearchResponse {
  variables: VariableWithPreferences[];
  total: number;
  has_more: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const VARIABLE_CATEGORIES = [
  "Physical Health",
  "Mental Health",
  "Sleep & Recovery",
  "Substances",
  "Exercise & Fitness",
  "Environment",
  "Nutrition",
  "Social",
  "Work & Productivity",
  "Custom",
] as const;

export const VARIABLE_SUBCATEGORIES = {
  "Physical Health": ["Body Metrics", "Vital Signs", "Symptoms", "Medications"],
  "Mental Health": ["Emotional State", "Stress", "Anxiety", "Mood Disorders"],
  "Sleep & Recovery": [
    "Sleep Quality",
    "Sleep Timing",
    "Sleep Environment",
    "Recovery",
  ],
  Substances: [
    "Stimulants",
    "Alcohol",
    "Nicotine",
    "Medications",
    "Supplements",
  ],
  "Exercise & Fitness": [
    "Exercise",
    "Strength Training",
    "Cardio",
    "Flexibility",
  ],
  Environment: ["Temperature", "Light", "Noise", "Air Quality", "Location"],
  Nutrition: ["Meals", "Hydration", "Supplements", "Dietary Restrictions"],
  Social: ["Social Interactions", "Relationships", "Social Events"],
  "Work & Productivity": ["Work Hours", "Focus", "Creativity", "Stress"],
  Custom: ["User Defined"],
} as const;

export const DEFAULT_VARIABLES: Omit<CreateVariableRequest, "slug">[] = [
  {
    label: "Weight",
    description: "Body weight measurement",
    icon: "⚖️",
    data_type: "continuous",
    canonical_unit: "kg",
    unit_group: "mass",
    convertible_units: ["kg", "lb", "g"],
    default_display_unit: "kg",
    source_type: "manual",
    category: "Physical Health",
    subcategory: "Body Metrics",
    tags: ["health", "fitness"],
    validation_rules: {
      min: 20,
      max: 300,
      unit: "kg",
      required: true,
    },
  },
  {
    label: "Sleep Duration",
    description: "Total sleep time",
    icon: "😴",
    data_type: "continuous",
    canonical_unit: "hours",
    unit_group: "time",
    convertible_units: ["hours", "minutes"],
    default_display_unit: "hours",
    source_type: "manual",
    category: "Sleep & Recovery",
    subcategory: "Sleep Quality",
    tags: ["sleep", "recovery"],
    validation_rules: {
      min: 0,
      max: 24,
      unit: "hours",
      required: true,
    },
  },
  {
    label: "Mood",
    description: "Overall mood rating",
    icon: "😊",
    data_type: "continuous",
    canonical_unit: "score",
    source_type: "manual",
    category: "Mental Health",
    subcategory: "Emotional State",
    tags: ["mental", "emotion"],
    validation_rules: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
];
