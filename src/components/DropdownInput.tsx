import React, { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import FormHelperText from "@mui/material/FormHelperText";
import InputAdornment from "@mui/material/InputAdornment";
import { validateValue, LOG_LABELS } from "@/utils/logLabels";
import { FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";

interface DropdownInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  disabled?: boolean;
  className?: string;
  showValidation?: boolean;
}

export default function DropdownInput({
  label,
  value,
  onChange,
  onValidationChange,
  disabled = false,
  className = "",
  showValidation = true,
}: DropdownInputProps) {
  const [error, setError] = useState<string>("");
  const [isValid, setIsValid] = useState<boolean>(true);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  const variable = LOG_LABELS.find((v) => v.label === label);
  const options = variable?.options || [];

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
        select
        label={label}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        error={!!error && hasInteracted}
        fullWidth
        variant="outlined"
        className="mb-1"
        SelectProps={{
          native: true,
        }}
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
      >
        <option value="">Select an option...</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </TextField>

      {/* Helper text */}
      <FormHelperText className="text-gray-600 text-sm">
        Options: {options.join(", ")}
      </FormHelperText>

      {/* Error text */}
      {error && hasInteracted && (
        <FormHelperText error className="text-sm">
          {error}
        </FormHelperText>
      )}
    </div>
  );
}
