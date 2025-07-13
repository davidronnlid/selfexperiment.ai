import { supabase } from "./supaBase";

// Enhanced validation interfaces
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface VariableValidationRules {
  min?: number;
  max?: number;
  scaleMin?: number;
  scaleMax?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  required?: boolean;
  options?: string[];
  unit?: string;
  step?: number;
}

export interface Variable {
  id: string;
  label: string;
  data_type: "continuous" | "categorical" | "boolean" | "time" | "text";
  validation_rules?: VariableValidationRules;
  canonical_unit?: string;
  icon?: string;
}

/**
 * Main validation function that validates a value against variable constraints
 */
export function validateVariableValue(
  value: string | number,
  variable: Variable
): ValidationResult {
  if (!variable.validation_rules) {
    return { isValid: true };
  }

  const rules = variable.validation_rules;
  const strValue = typeof value === "string" ? value : value.toString();
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  // Required field validation
  if (rules.required && (!value || strValue.trim() === "")) {
    return {
      isValid: false,
      error: `${variable.label} is required`,
    };
  }

  // Empty value handling - if not required, allow empty
  if (!rules.required && (!value || strValue.trim() === "")) {
    return { isValid: true };
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

/**
 * Validate continuous (numeric) values
 */
function validateContinuousValue(
  value: number,
  rules: VariableValidationRules,
  variable: Variable
): ValidationResult {
  // Check if it's a valid number
  if (isNaN(value)) {
    return {
      isValid: false,
      error: `${variable.label} must be a valid number`,
    };
  }

  // Check minimum value
  if (rules.min !== undefined && value < rules.min) {
    return {
      isValid: false,
      error: `${variable.label} must be at least ${rules.min}${
        rules.unit ? ` ${rules.unit}` : ""
      }`,
    };
  }

  // Check maximum value
  if (rules.max !== undefined && value > rules.max) {
    return {
      isValid: false,
      error: `${variable.label} must be no more than ${rules.max}${
        rules.unit ? ` ${rules.unit}` : ""
      }`,
    };
  }

  // Check scale constraints (for 1-10 scales, etc.)
  if (rules.scaleMin !== undefined && value < rules.scaleMin) {
    return {
      isValid: false,
      error: `${variable.label} must be at least ${rules.scaleMin}`,
    };
  }

  if (rules.scaleMax !== undefined && value > rules.scaleMax) {
    return {
      isValid: false,
      error: `${variable.label} must be no more than ${rules.scaleMax}`,
    };
  }

  // Check if it's a whole number for scales
  if (rules.scaleMin !== undefined || rules.scaleMax !== undefined) {
    if (value % 1 !== 0) {
      return {
        isValid: false,
        error: `${variable.label} must be a whole number`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate categorical values
 */
function validateCategoricalValue(
  value: string,
  rules: VariableValidationRules,
  variable: Variable
): ValidationResult {
  if (rules.options && rules.options.length > 0) {
    if (!rules.options.includes(value)) {
      return {
        isValid: false,
        error: `${variable.label} must be one of: ${rules.options.join(", ")}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate boolean values
 */
function validateBooleanValue(
  value: string,
  rules: VariableValidationRules,
  variable: Variable
): ValidationResult {
  const validBooleanValues = ["yes", "no", "true", "false", "1", "0", "y", "n"];

  if (!validBooleanValues.includes(value.toLowerCase())) {
    return {
      isValid: false,
      error: `${variable.label} must be yes/no, true/false, or 1/0`,
    };
  }

  return { isValid: true };
}

/**
 * Validate time values
 */
function validateTimeValue(
  value: string,
  rules: VariableValidationRules,
  variable: Variable
): ValidationResult {
  const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (!timePattern.test(value)) {
    return {
      isValid: false,
      error: `${variable.label} must be in HH:MM format (e.g., 23:30)`,
    };
  }

  return { isValid: true };
}

/**
 * Validate text values
 */
function validateTextValue(
  value: string,
  rules: VariableValidationRules,
  variable: Variable
): ValidationResult {
  // Check minimum length
  if (rules.minLength !== undefined && value.length < rules.minLength) {
    return {
      isValid: false,
      error: `${variable.label} must be at least ${rules.minLength} characters`,
    };
  }

  // Check maximum length
  if (rules.maxLength !== undefined && value.length > rules.maxLength) {
    return {
      isValid: false,
      error: `${variable.label} must be no more than ${rules.maxLength} characters`,
    };
  }

  // Check pattern if provided
  if (rules.pattern) {
    try {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        return {
          isValid: false,
          error: `${variable.label} format is invalid`,
        };
      }
    } catch (e) {
      console.error("Invalid regex pattern:", rules.pattern);
    }
  }

  return { isValid: true };
}

/**
 * Get validation constraints display text for UI
 */
export function getConstraintsText(variable: Variable): string {
  if (!variable.validation_rules) return "";

  const rules = variable.validation_rules;
  const constraints: string[] = [];

  // Add range constraints
  if (rules.min !== undefined && rules.max !== undefined) {
    constraints.push(
      `Range: ${rules.min}-${rules.max}${rules.unit ? ` ${rules.unit}` : ""}`
    );
  } else if (rules.min !== undefined) {
    constraints.push(`Min: ${rules.min}${rules.unit ? ` ${rules.unit}` : ""}`);
  } else if (rules.max !== undefined) {
    constraints.push(`Max: ${rules.max}${rules.unit ? ` ${rules.unit}` : ""}`);
  }

  // Add scale constraints
  if (rules.scaleMin !== undefined && rules.scaleMax !== undefined) {
    constraints.push(`Scale: ${rules.scaleMin}-${rules.scaleMax}`);
  }

  // Add text length constraints
  if (rules.minLength !== undefined || rules.maxLength !== undefined) {
    if (rules.minLength !== undefined && rules.maxLength !== undefined) {
      constraints.push(`Length: ${rules.minLength}-${rules.maxLength} chars`);
    } else if (rules.minLength !== undefined) {
      constraints.push(`Min length: ${rules.minLength} chars`);
    } else if (rules.maxLength !== undefined) {
      constraints.push(`Max length: ${rules.maxLength} chars`);
    }
  }

  // Add options for categorical variables
  if (rules.options && rules.options.length > 0) {
    constraints.push(`Options: ${rules.options.join(", ")}`);
  }

  // Add required indicator
  if (rules.required) {
    constraints.push("Required");
  }

  return constraints.join(" • ");
}

/**
 * Get input props for form fields based on variable type and constraints
 */
export function getVariableInputProps(variable: Variable) {
  const rules = variable.validation_rules;

  switch (variable.data_type) {
    case "continuous":
      return {
        type: "number" as const,
        min: rules?.min,
        max: rules?.max,
        step: rules?.step || (rules?.scaleMin !== undefined ? 1 : "any"),
        placeholder: rules?.unit ? `Enter ${rules.unit}...` : "Enter number...",
      };

    case "time":
      return {
        type: "time" as const,
        placeholder: "HH:MM",
      };

    case "text":
      return {
        type: "text" as const,
        maxLength: rules?.maxLength,
        placeholder: "Enter text...",
      };

    case "boolean":
      return {
        type: "text" as const,
        placeholder: "yes/no, true/false, or 1/0",
      };

    case "categorical":
      return {
        type: "text" as const,
        placeholder: rules?.options
          ? `Choose: ${rules.options.join(", ")}`
          : "Select option...",
      };

    default:
      return {
        type: "text" as const,
        placeholder: "Enter value...",
      };
  }
}

/**
 * Real-time validation function for input fields
 * Prevents invalid input from being entered
 */
export function shouldAllowInput(
  currentValue: string,
  newValue: string,
  variable: Variable
): boolean {
  if (!variable.validation_rules) return true;

  const rules = variable.validation_rules;

  switch (variable.data_type) {
    case "continuous":
      // Allow empty, minus sign, decimal point
      if (newValue === "" || newValue === "-" || newValue === ".") {
        return true;
      }

      // Check if it's a valid number format
      const numberRegex = /^-?\d*\.?\d*$/;
      if (!numberRegex.test(newValue)) {
        return false;
      }

      const numValue = parseFloat(newValue);

      // For scale values, don't allow decimals
      if (
        (rules.scaleMin !== undefined || rules.scaleMax !== undefined) &&
        newValue.includes(".")
      ) {
        return false;
      }

      // Check constraints if it's a valid number
      if (!isNaN(numValue)) {
        if (rules.min !== undefined && numValue < rules.min) {
          return false;
        }
        if (rules.max !== undefined && numValue > rules.max) {
          return false;
        }
        if (rules.scaleMin !== undefined && numValue < rules.scaleMin) {
          return false;
        }
        if (rules.scaleMax !== undefined && numValue > rules.scaleMax) {
          return false;
        }
      }

      return true;

    case "text":
      // Check max length
      if (rules.maxLength !== undefined && newValue.length > rules.maxLength) {
        return false;
      }
      return true;

    case "time":
      // Allow partial time input
      const timeRegex = /^([0-2]?[0-9]?:?[0-5]?[0-9]?)?$/;
      return timeRegex.test(newValue);

    default:
      return true;
  }
}

/**
 * Fetch variable by ID with validation rules
 */
export async function fetchVariableById(
  variableId: string
): Promise<Variable | null> {
  try {
    const { data, error } = await supabase
      .from("variables")
      .select("*")
      .eq("id", variableId)
      .single();

    if (error) {
      console.error("Error fetching variable:", error);
      return null;
    }

    return data as Variable;
  } catch (error) {
    console.error("Error fetching variable:", error);
    return null;
  }
}

/**
 * Batch validate multiple values
 */
export function validateMultipleValues(
  values: { variableId: string; value: string; variable: Variable }[]
): { variableId: string; validation: ValidationResult }[] {
  return values.map(({ variableId, value, variable }) => ({
    variableId,
    validation: validateVariableValue(value, variable),
  }));
}
