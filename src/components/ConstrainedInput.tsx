import React, { useState, useCallback } from "react";
import TextField from "@mui/material/TextField";
import FormHelperText from "@mui/material/FormHelperText";
import InputAdornment from "@mui/material/InputAdornment";
import { validateValue, getInputProps, LOG_LABELS } from "@/utils/logLabels";
import { FaCheckCircle } from "react-icons/fa";

interface Constraints {
  min?: number;
  max?: number;
  scaleMin?: number;
  scaleMax?: number;
  unit?: string;
  maxLength?: number;
}

interface ConstrainedInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  disabled?: boolean;
  className?: string;
  showValidation?: boolean;
  placeholder?: string;
  size?: "small" | "medium";
  fullWidth?: boolean;
  variant?: "outlined" | "filled" | "standard";
  sx?: any;
}

export default function ConstrainedInput({
  label,
  value,
  onChange,
  onValidationChange,
  disabled = false,
  className = "",
  showValidation = true,
  placeholder,
  size = "medium",
  fullWidth = true,
  variant = "outlined",
  sx = {},
}: ConstrainedInputProps) {
  const [isValid, setIsValid] = useState<boolean>(true);

  const variable = LOG_LABELS.find((v) => v.label === label);
  const inputProps = getInputProps(label);

  // Handle input changes with real-time constraint enforcement
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      if (!variable) {
        onChange(newValue);
        return;
      }

      const { type, constraints } = variable;

      // Handle different input types with prevention logic
      switch (type) {
        case "number":
          handleNumberInput(newValue, constraints);
          break;
        case "scale":
          handleScaleInput(newValue, constraints);
          break;
        case "time":
          handleTimeInput(newValue, constraints);
          break;
        case "text":
          handleTextInput(newValue, constraints);
          break;
        case "yesno":
          handleYesNoInput(newValue, constraints);
          break;
        case "dropdown":
          // Dropdown should use DropdownInput component instead
          onChange(newValue);
          break;
        default:
          onChange(newValue);
      }
    },
    [variable, onChange]
  );

  const handleNumberInput = (
    newValue: string,
    constraints: Constraints | undefined
  ) => {
    // Allow empty string, minus sign, and decimal point
    if (newValue === "" || newValue === "-" || newValue === ".") {
      onChange(newValue);
      return;
    }

    // Check if the new value matches number format
    const numberRegex = /^-?\d*\.?\d*$/;
    if (!numberRegex.test(newValue)) {
      return; // Don't allow invalid number formats
    }

    const numValue = parseFloat(newValue);

    // If it's a valid number, check constraints
    if (!isNaN(numValue)) {
      if (constraints?.min !== undefined && numValue < constraints.min) {
        return; // Don't allow values below minimum
      }
      if (constraints?.max !== undefined && numValue > constraints.max) {
        return; // Don't allow values above maximum
      }
    }

    onChange(newValue);
  };

  const handleScaleInput = (
    newValue: string,
    constraints: Constraints | undefined
  ) => {
    // Allow empty string
    if (newValue === "") {
      onChange(newValue);
      return;
    }

    // Only allow whole numbers for scales
    const numberRegex = /^\d+$/;
    if (!numberRegex.test(newValue)) {
      return; // Don't allow non-integers
    }

    const numValue = parseInt(newValue);

    if (
      constraints?.scaleMin !== undefined &&
      numValue < constraints.scaleMin
    ) {
      return; // Don't allow values below scale minimum
    }
    if (
      constraints?.scaleMax !== undefined &&
      numValue > constraints.scaleMax
    ) {
      return; // Don't allow values above scale maximum
    }

    onChange(newValue);
  };

  const handleTimeInput = (
    newValue: string,
    constraints: Constraints | undefined
  ) => {
    // Allow empty string
    if (newValue === "") {
      onChange(newValue);
      return;
    }

    // Time format validation (HH:MM or H:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeRegex.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleTextInput = (
    newValue: string,
    constraints: Constraints | undefined
  ) => {
    // Check max length constraint
    if (constraints?.maxLength && newValue.length > constraints.maxLength) {
      return; // Don't allow text longer than max length
    }
    onChange(newValue);
  };

  const handleYesNoInput = (
    newValue: string,
    constraints: Constraints | undefined
  ) => {
    // Allow empty string
    if (newValue === "") {
      onChange(newValue);
      return;
    }

    // Only allow valid yes/no patterns
    const validPatterns =
      /^(y|n|ye|yes|no|t|tr|tru|true|f|fa|fal|fals|false|1|0)$/i;
    if (!validPatterns.test(newValue)) {
      return; // Don't allow invalid yes/no patterns
    }

    onChange(newValue);
  };

  // Validate current value
  React.useEffect(() => {
    if (!showValidation) return;

    const validation = validateValue(label, value);
    setIsValid(validation.isValid);
    onValidationChange?.(validation.isValid);
  }, [value, label, showValidation, onValidationChange]);

  // Get helper text based on variable type
  const getHelperText = () => {
    if (!variable) return "";

    const { type, constraints } = variable;

    switch (type) {
      case "number":
        if (constraints?.min !== undefined && constraints?.max !== undefined) {
          return `Range: ${constraints.min}-${constraints.max}${
            constraints.unit ? ` ${constraints.unit}` : ""
          }`;
        } else if (constraints?.min !== undefined) {
          return `Min: ${constraints.min}${
            constraints.unit ? ` ${constraints.unit}` : ""
          }`;
        } else if (constraints?.max !== undefined) {
          return `Max: ${constraints.max}${
            constraints.unit ? ` ${constraints.unit}` : ""
          }`;
        }
        break;

      case "scale":
        if (
          constraints?.scaleMin !== undefined &&
          constraints?.scaleMax !== undefined
        ) {
          return `Scale: ${constraints.scaleMin}-${constraints.scaleMax}`;
        }
        break;

      case "text":
        if (constraints?.maxLength) {
          return `${value.length}/${constraints.maxLength} characters`;
        }
        break;

      case "time":
        return "Format: HH:MM (e.g., 23:30)";

      case "yesno":
        return "Enter: yes/no, true/false, or 1/0";

      case "dropdown":
        if (variable.options) {
          return `Options: ${variable.options.join(", ")}`;
        }
        break;
    }

    return "";
  };

  // Get appropriate icon for the input
  const getInputIcon = () => {
    if (variable?.icon) {
      return (
        <span role="img" aria-label={label}>
          {variable.icon}
        </span>
      );
    }
    return <span>📝</span>;
  };

  // Get validation icon
  const getValidationIcon = () => {
    if (!showValidation) return null;

    if (isValid && value.trim()) {
      return <FaCheckCircle className="text-green-500" />;
    }
    return null;
  };

  return (
    <div className={className}>
      <TextField
        {...inputProps}
        label={label}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        fullWidth={fullWidth}
        variant={variant}
        size={size}
        placeholder={placeholder}
        sx={sx as any}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">{getInputIcon()}</InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {getValidationIcon()}
            </InputAdornment>
          ),
        }}
      />

      {/* Helper text */}
      {getHelperText() && (
        <FormHelperText sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
          {getHelperText()}
        </FormHelperText>
      )}
    </div>
  );
}
