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
    const result = validateVariableValue(value, variable);
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
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="true">True</MenuItem>
              <MenuItem value="false">False</MenuItem>
              <MenuItem value="1">1</MenuItem>
              <MenuItem value="0">0</MenuItem>
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

      {/* Validation Success Indicator */}
      {hasInteracted && validation.isValid && value.trim() && (
        <Typography
          variant="caption"
          color="success.main"
          sx={{ mt: 0.5, display: "block" }}
        >
          ✓ Valid value
        </Typography>
      )}
    </Box>
  );
}
