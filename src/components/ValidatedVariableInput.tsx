import React, { useState, useEffect, useCallback } from "react";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Chip,
  InputAdornment,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Add, Remove, Info } from "@mui/icons-material";
import {
  validateVariableValue,
  getConstraintsText,
  getVariableInputProps,
  shouldAllowInput,
  type Variable,
  type ValidationResult,
} from "@/utils/variableValidation";

// Dynamic validation feedback function
function getDynamicValidationFeedback(
  value: string,
  variable: Variable,
  validation: ValidationResult
): string {
  const rules = variable.validation_rules;
  
  // If no value entered yet, show what to enter
  if (!value.trim()) {
    if (rules?.required) {
      return `Enter a value for ${variable.label}`;
    }
    return `Enter ${getInputHint(variable)}`;
  }
  
  // If invalid, provide specific guidance
  if (!validation.isValid) {
    return getSpecificGuidance(value, variable, validation);
  }
  
  // If valid, show the validation rules that were met
  if (validation.isValid && value.trim()) {
    return getValidationRulesSummary(variable);
  }
  
  return "";
}

// Function to show validation rules summary when value is valid
function getValidationRulesSummary(variable: Variable): string {
  const rules = variable.validation_rules;
  const summaries = [];
  
  switch (variable.data_type) {
    case "continuous":
      if (rules?.scaleMin !== undefined && rules?.scaleMax !== undefined) {
        summaries.push(`✓ Scale: ${rules.scaleMin}-${rules.scaleMax}`);
      }
      if (rules?.min !== undefined && rules?.max !== undefined) {
        summaries.push(`✓ Range: ${rules.min}-${rules.max}${rules.unit ? ` ${rules.unit}` : ""}`);
      } else if (rules?.min !== undefined) {
        summaries.push(`✓ Min: ${rules.min}${rules.unit ? ` ${rules.unit}` : ""}`);
      } else if (rules?.max !== undefined) {
        summaries.push(`✓ Max: ${rules.max}${rules.unit ? ` ${rules.unit}` : ""}`);
      }
      if (rules?.scaleMin !== undefined || rules?.scaleMax !== undefined) {
        summaries.push("✓ Whole number (no decimals)");
      }
      break;
      
    case "categorical":
      if (rules?.options && rules.options.length > 0) {
        summaries.push(`✓ Valid option from: ${rules.options.join(", ")}`);
      }
      break;
      
    case "boolean":
      summaries.push("✓ Valid boolean value (yes/no, true/false, 1/0)");
      break;
      
    case "time":
      summaries.push("✓ Valid time format (HH:MM)");
      break;
      
    case "text":
      if (rules?.minLength && rules?.maxLength) {
        summaries.push(`✓ Length: ${rules.minLength}-${rules.maxLength} characters`);
      } else if (rules?.minLength) {
        summaries.push(`✓ Min length: ${rules.minLength} characters`);
      } else if (rules?.maxLength) {
        summaries.push(`✓ Max length: ${rules.maxLength} characters`);
      }
      break;
  }
  
  return summaries.length > 0 ? summaries.join(" • ") : "✓ Valid value";
}

function getInputHint(variable: Variable): string {
  const rules = variable.validation_rules;
  
  switch (variable.data_type) {
    case "continuous":
      if (rules?.scaleMin !== undefined && rules?.scaleMax !== undefined) {
        return `a number from ${rules.scaleMin} to ${rules.scaleMax}`;
      }
      if (rules?.min !== undefined && rules?.max !== undefined) {
        return `a number between ${rules.min} and ${rules.max}${rules.unit ? ` ${rules.unit}` : ""}`;
      }
      if (rules?.min !== undefined) {
        return `a number ${rules.min} or higher${rules.unit ? ` ${rules.unit}` : ""}`;
      }
      if (rules?.max !== undefined) {
        return `a number up to ${rules.max}${rules.unit ? ` ${rules.unit}` : ""}`;
      }
      return "a number";
      
    case "categorical":
      if (rules?.options && rules.options.length > 0) {
        return `one of: ${rules.options.join(", ")}`;
      }
      return "a valid option";
      
    case "boolean":
      return "yes/no, true/false, or 1/0";
      
    case "time":
      return "time in HH:MM format";
      
    case "text":
      if (rules?.minLength && rules?.maxLength) {
        return `text (${rules.minLength}-${rules.maxLength} characters)`;
      }
      if (rules?.minLength) {
        return `text (at least ${rules.minLength} characters)`;
      }
      if (rules?.maxLength) {
        return `text (up to ${rules.maxLength} characters)`;
      }
      return "text";
      
    default:
      return "a value";
  }
}

function getSpecificGuidance(
  value: string,
  variable: Variable,
  validation: ValidationResult
): string {
  const rules = variable.validation_rules;
  const numValue = parseFloat(value);
  
  switch (variable.data_type) {
    case "continuous":
      if (isNaN(numValue)) {
        return "Enter a valid number";
      }
      
      // Scale validation
      if (rules?.scaleMin !== undefined && numValue < rules.scaleMin) {
        return `Increase to at least ${rules.scaleMin}`;
      }
      if (rules?.scaleMax !== undefined && numValue > rules.scaleMax) {
        return `Decrease to ${rules.scaleMax} or less`;
      }
      
      // Regular min/max validation
      if (rules?.min !== undefined && numValue < rules.min) {
        return `Increase to at least ${rules.min}${rules.unit ? ` ${rules.unit}` : ""}`;
      }
      if (rules?.max !== undefined && numValue > rules.max) {
        return `Decrease to ${rules.max}${rules.unit ? ` ${rules.unit}` : ""} or less`;
      }
      
      // Check for decimal in scale
      if ((rules?.scaleMin !== undefined || rules?.scaleMax !== undefined) && value.includes(".")) {
        return "Enter a whole number (no decimals)";
      }
      
      break;
      
    case "categorical":
      if (rules?.options && rules.options.length > 0) {
        const suggestions = rules.options.filter(option => 
          option.toLowerCase().includes(value.toLowerCase())
        );
        if (suggestions.length > 0) {
          return `Try: ${suggestions.join(", ")}`;
        }
        return `Choose from: ${rules.options.join(", ")}`;
      }
      break;
      
    case "boolean":
      return "Enter yes/no, true/false, or 1/0";
      
    case "time":
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
        return "Use HH:MM format (e.g., 14:30)";
      }
      break;
      
    case "text":
      if (rules?.minLength && value.length < rules.minLength) {
        const needed = rules.minLength - value.length;
        return `Add ${needed} more character${needed === 1 ? "" : "s"} (minimum ${rules.minLength})`;
      }
      if (rules?.maxLength && value.length > rules.maxLength) {
        const excess = value.length - rules.maxLength;
        return `Remove ${excess} character${excess === 1 ? "" : "s"} (maximum ${rules.maxLength})`;
      }
      break;
  }
  
  // Fallback to the original error message
  return validation.error || "Invalid value";
}

interface ValidatedVariableInputProps {
  variable: Variable;
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean, error?: string) => void;
  disabled?: boolean;
  size?: "small" | "medium";
  fullWidth?: boolean;
  variant?: "outlined" | "filled" | "standard";
  label?: string;
  helperText?: string;
  showConstraints?: boolean;
  allowRealTimeValidation?: boolean;
  selectedUnit?: string;
  sx?: any;
}

export default function ValidatedVariableInput({
  variable,
  value,
  onChange,
  onValidationChange,
  disabled = false,
  size = "medium",
  fullWidth = true,
  variant = "outlined",
  label,
  helperText,
  showConstraints = true,
  allowRealTimeValidation = true,
  selectedUnit,
  sx = {},
}: ValidatedVariableInputProps) {
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
  });
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);

  const displayLabel = label || variable.label;
  const inputProps = getVariableInputProps(variable);
  const constraintsText = getConstraintsText(variable);

  // Validate the current value
  useEffect(() => {
    // Debug logging for Broccoli variable
    if (variable.label === 'Broccoli') {
      console.log('🥦 Debug: Broccoli variable validation:', {
        label: variable.label,
        value,
        validation_rules: variable.validation_rules,
        data_type: variable.data_type
      });
    }
    
    const result = validateVariableValue(value, variable);
    
    // More debug logging for Broccoli
    if (variable.label === 'Broccoli') {
      console.log('🥦 Debug: Validation result:', result);
    }
    
    setValidation(result);
    onValidationChange?.(result.isValid, result.error);
  }, [value, variable, onValidationChange]);

  // Show validation error after user interaction
  useEffect(() => {
    if (hasInteracted && !validation.isValid) {
      setShowValidationError(true);
    } else {
      setShowValidationError(false);
    }
  }, [hasInteracted, validation.isValid]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;

      // Real-time validation to prevent invalid input
      if (
        allowRealTimeValidation &&
        !shouldAllowInput(value, newValue, variable)
      ) {
        return; // Don't allow the change
      }

      setHasInteracted(true);
      onChange(newValue);
    },
    [value, variable, onChange, allowRealTimeValidation]
  );

  const handleBlur = useCallback(() => {
    setHasInteracted(true);
  }, []);

  const handleIncrement = useCallback(() => {
    if (variable.data_type === "continuous") {
      const rules = variable.validation_rules;
      const step = rules?.step || (rules?.scaleMin !== undefined ? 1 : 1);
      const currentNum = parseFloat(value || "0");
      const newValue = (currentNum + step).toString();

      if (!shouldAllowInput(value, newValue, variable)) {
        return;
      }

      setHasInteracted(true);
      onChange(newValue);
    }
  }, [value, variable, onChange]);

  const handleDecrement = useCallback(() => {
    if (variable.data_type === "continuous") {
      const rules = variable.validation_rules;
      const step = rules?.step || (rules?.scaleMin !== undefined ? 1 : 1);
      const currentNum = parseFloat(value || "0");
      const newValue = (currentNum - step).toString();

      if (!shouldAllowInput(value, newValue, variable)) {
        return;
      }

      setHasInteracted(true);
      onChange(newValue);
    }
  }, [value, variable, onChange]);

  const handleSelectChange = useCallback(
    (event: any) => {
      setHasInteracted(true);
      onChange(event.target.value);
    },
    [onChange]
  );

  // Render different input types based on variable data type
  const renderInput = () => {
    const rules = variable.validation_rules;

    switch (variable.data_type) {
      case "categorical":
        if (rules?.options && rules.options.length > 0) {
          return (
            <FormControl fullWidth={fullWidth} size={size} variant={variant}>
              <InputLabel>{displayLabel}</InputLabel>
              <Select
                value={value}
                onChange={handleSelectChange}
                onBlur={handleBlur}
                label={displayLabel}
                disabled={disabled}
                error={showValidationError}
              >
                {rules.options.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }
        break;

      case "boolean":
        // Get available options based on selected unit
        const getBooleanOptions = (unit: string) => {
          switch (unit) {
            case 'yes/no':
              return [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' }
              ];
            case '0/1':
              return [
                { value: '1', label: '1' },
                { value: '0', label: '0' }
              ];
            case 'true/false':
            default:
              return [
                { value: 'true', label: 'True' },
                { value: 'false', label: 'False' }
              ];
          }
        };

        const options = getBooleanOptions(selectedUnit || 'true/false');

        return (
          <FormControl fullWidth={fullWidth} size={size} variant={variant}>
            <InputLabel>{displayLabel}</InputLabel>
            <Select
              value={value}
              onChange={handleSelectChange}
              onBlur={handleBlur}
              label={displayLabel}
              disabled={disabled}
              error={showValidationError}
            >
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case "continuous":
        return (
          <TextField
            fullWidth={fullWidth}
            size={size}
            variant={variant}
            label={displayLabel}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            error={showValidationError}
            type={inputProps.type}
            inputProps={{
              min: inputProps.min,
              max: inputProps.max,
              step: inputProps.step,
            }}
            placeholder={inputProps.placeholder}
            InputProps={{
              endAdornment: variable.data_type === "continuous" && (
                <InputAdornment position="end">
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <IconButton
                      size="small"
                      onClick={handleIncrement}
                      disabled={disabled}
                      sx={{ p: 0.25, fontSize: "0.75rem" }}
                    >
                      <Add fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={handleDecrement}
                      disabled={disabled}
                      sx={{ p: 0.25, fontSize: "0.75rem" }}
                    >
                      <Remove fontSize="small" />
                    </IconButton>
                  </Box>
                </InputAdornment>
              ),
            }}
            sx={sx}
          />
        );

      default:
        return (
          <TextField
            fullWidth={fullWidth}
            size={size}
            variant={variant}
            label={displayLabel}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            error={showValidationError}
            type={inputProps.type}
            inputProps={{
              maxLength: inputProps.maxLength,
            }}
            placeholder={inputProps.placeholder}
            sx={sx}
          />
        );
    }

    // Fallback to text input
    return (
      <TextField
        fullWidth={fullWidth}
        size={size}
        variant={variant}
        label={displayLabel}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        error={showValidationError}
        placeholder={inputProps.placeholder}
        sx={sx}
      />
    );
  };

  return (
    <Box>
      {renderInput()}

      {/* Validation Error */}
      {showValidationError && validation.error && (
        <Typography
          variant="caption"
          color="error"
          sx={{ mt: 0.5, display: "block" }}
        >
          {validation.error}
        </Typography>
      )}

      {/* Helper Text */}
      {helperText && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, display: "block" }}
        >
          {helperText}
        </Typography>
      )}

      {/* Constraints Display */}
      {showConstraints && constraintsText && (
        <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title="Variable constraints" placement="top">
            <Info fontSize="small" color="action" />
          </Tooltip>
          <Chip
            label={constraintsText}
            size="small"
            variant="outlined"
            sx={{
              fontSize: "0.7rem",
              height: "20px",
              backgroundColor: validation.isValid
                ? "success.light"
                : "warning.light",
              color: validation.isValid ? "success.dark" : "warning.dark",
              borderColor: validation.isValid ? "success.main" : "warning.main",
            }}
          />
        </Box>
      )}

      {/* Dynamic Validation Feedback */}
      {(hasInteracted || !value.trim()) && (
        <Typography
          variant="caption"
          color={validation.isValid ? "success.main" : "warning.main"}
          sx={{ mt: 0.5, display: "block", fontSize: "0.75rem" }}
        >
          {getDynamicValidationFeedback(value, variable, validation)}
        </Typography>
      )}
    </Box>
  );
}
