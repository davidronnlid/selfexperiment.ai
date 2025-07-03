import React, { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import FormHelperText from "@mui/material/FormHelperText";
import InputAdornment from "@mui/material/InputAdornment";
import { validateValue, getInputProps, LOG_LABELS } from "@/utils/logLabels";
import { FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";

interface ValidatedInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  disabled?: boolean;
  className?: string;
  showValidation?: boolean;
}

export default function ValidatedInput({
  label,
  value,
  onChange,
  onValidationChange,
  disabled = false,
  className = "",
  showValidation = true,
}: ValidatedInputProps) {
  const [error, setError] = useState<string>("");
  const [isValid, setIsValid] = useState<boolean>(true);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  const variable = LOG_LABELS.find((v) => v.label === label);
  const inputProps = getInputProps(label);

  // Validate on value change
  useEffect(() => {
    if (!showValidation || !hasInteracted) {
      setError("");
      setIsValid(true);
      onValidationChange?.(true);
      return;
    }

    const validation = validateValue(label, value);
    setError(validation.error || "");
    setIsValid(validation.isValid);
    onValidationChange?.(validation.isValid);
  }, [value, label, showValidation, hasInteracted, onValidationChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasInteracted(true);
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setHasInteracted(true);
  };

  // Get helper text based on variable type
  const getHelperText = () => {
    if (!variable) return "";

    const { type, constraints } = variable;

    switch (type) {
      case "number":
        if (constraints?.min !== undefined && constraints?.max !== undefined) {
          return `${constraints.min}-${constraints.max}${
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
    if (!showValidation || !hasInteracted) return null;

    if (error) {
      return <FaExclamationTriangle className="text-red-500" />;
    }
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
        onBlur={handleBlur}
        disabled={disabled}
        error={!!error && hasInteracted}
        fullWidth
        variant="outlined"
        className="mb-1"
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
        <FormHelperText className="text-gray-600 text-sm">
          {getHelperText()}
        </FormHelperText>
      )}

      {/* Error text */}
      {error && hasInteracted && (
        <FormHelperText error className="text-sm">
          {error}
        </FormHelperText>
      )}
    </div>
  );
}
