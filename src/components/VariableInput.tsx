import React, { useState, useEffect } from "react";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Chip,
  Alert,
  InputAdornment,
  IconButton,
  Tooltip,
} from "@mui/material";
import { FaInfoCircle, FaExchangeAlt } from "react-icons/fa";
import {
  Variable,
  UserVariablePreference,
  ValidationResult,
} from "../types/variables";
import {
  validateVariableValue,
  convertUnit,
  getUserPreferredUnit,
  convertBooleanValueToString,
  convertBooleanStringToValue,
} from "../utils/variableUtils";
import { useUser } from "../pages/_app";
import UnitSelector from "./UnitSelector";

interface VariableInputProps {
  variable: Variable;
  userPreferences?: UserVariablePreference;
  value?: string | number;
  unit?: string;
  onChange: (value: string | number, unit?: string) => void;
  onUnitChange?: (unit: string) => void;
  disabled?: boolean;
  showValidation?: boolean;
  showUnitSelector?: boolean;
  placeholder?: string;
  size?: "small" | "medium";
}

export default function VariableInput({
  variable,
  userPreferences,
  value = "",
  unit,
  onChange,
  onUnitChange,
  disabled = false,
  showValidation = true,
  showUnitSelector = true,
  placeholder,
  size = "medium",
}: VariableInputProps) {
  const { user } = useUser();
  const [inputValue, setInputValue] = useState<string | number>(value);
  const [displayUnit, setDisplayUnit] = useState<string>(unit || "");
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
  });
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  const [isConverting, setIsConverting] = useState(false);

  // Load user's preferred unit and available units
  useEffect(() => {
    const loadUnitData = async () => {
      if (!user) return;

      try {
        // Get user's preferred unit
        const preferredUnit = getUserPreferredUnit(variable);
        if (preferredUnit && !displayUnit) {
          setDisplayUnit(preferredUnit);
        }

        // Get available units for this variable
        if (variable.convertible_units) {
          setAvailableUnits(variable.convertible_units);
        } else if (variable.canonical_unit) {
          setAvailableUnits([variable.canonical_unit]);
        }
      } catch (error) {
        console.error("Failed to load unit data:", error);
      }
    };

    loadUnitData();
  }, [user, variable, displayUnit]);

  // Validate input when it changes
  useEffect(() => {
    if (!showValidation) return;

    const validateInput = async () => {
      const result = validateVariableValue(inputValue, variable);
      setValidation(result);

      // If validation passes and we have a unit, trigger onChange
      if (result.isValid && inputValue !== "") {
        onChange(inputValue, displayUnit);
      }
    };

    validateInput();
  }, [inputValue, displayUnit, variable, showValidation, onChange]);

  // Handle unit conversion when unit changes
  const handleUnitChange = async (newUnit: string) => {
    if (!displayUnit || displayUnit === newUnit) {
      setDisplayUnit(newUnit);
      onUnitChange?.(newUnit);
      return;
    }

    setIsConverting(true);
    try {
      const numValue =
        typeof inputValue === "string" ? parseFloat(inputValue) : inputValue;
      if (!isNaN(numValue)) {
        const convertedValue = await convertUnit(
          numValue,
          displayUnit,
          newUnit
        );
        setInputValue(convertedValue);
        setDisplayUnit(newUnit);
        onChange(convertedValue, newUnit);
        onUnitChange?.(newUnit);
      }
    } catch (error) {
      console.error("Unit conversion failed:", error);
    } finally {
      setIsConverting(false);
    }
  };

  // Render input based on variable type
  const renderInput = () => {
    const commonProps = {
      size,
      disabled: disabled || isConverting,
      error: showValidation && !validation.isValid,
      helperText: showValidation && validation.error,
      placeholder: placeholder || `Enter ${variable.label.toLowerCase()}`,
    };

    switch (variable.data_type) {
      case "continuous":
        return (
          <TextField
            {...commonProps}
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            InputProps={{
              endAdornment: displayUnit && (
                <InputAdornment position="end">
                  <Typography variant="body2" color="textSecondary">
                    {displayUnit}
                  </Typography>
                </InputAdornment>
              ),
            }}
          />
        );

      case "categorical":
        return (
          <FormControl {...commonProps} fullWidth>
            <InputLabel>{variable.label}</InputLabel>
            <Select
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              label={variable.label}
            >
              {variable.validation_rules?.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case "boolean":
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={
                    inputValue === "true" ||
                    inputValue === "yes" ||
                    inputValue === "1"
                  }
                  onChange={(e) => {
                    // Local conversion function
                    const convertBooleanValueToString = (
                      value: boolean,
                      unit: string
                    ): string => {
                      switch (unit) {
                        case "true/false":
                          return value ? "true" : "false";
                        case "yes/no":
                          return value ? "yes" : "no";
                        case "0/1":
                          return value ? "1" : "0";
                        default:
                          return value ? "true" : "false";
                      }
                    };

                    const newValue = convertBooleanValueToString(
                      e.target.checked,
                      displayUnit || "true/false"
                    );
                    setInputValue(newValue);
                  }}
                  disabled={disabled}
                />
              }
              label={variable.label}
            />
            {showUnitSelector && availableUnits.length > 1 && (
              <Select
                value={displayUnit || "true/false"}
                onChange={(e) => {
                  const newUnit = e.target.value;
                  setDisplayUnit(newUnit);
                  if (onUnitChange) {
                    onUnitChange(newUnit);
                  }

                  // Convert current value to new unit
                  const convertBooleanValueToString = (
                    value: boolean,
                    unit: string
                  ): string => {
                    switch (unit) {
                      case "true/false":
                        return value ? "true" : "false";
                      case "yes/no":
                        return value ? "yes" : "no";
                      case "0/1":
                        return value ? "1" : "0";
                      default:
                        return value ? "true" : "false";
                    }
                  };

                  const isCurrentlyTrue =
                    inputValue === "true" ||
                    inputValue === "yes" ||
                    inputValue === "1";
                  const newValue = convertBooleanValueToString(
                    isCurrentlyTrue,
                    newUnit
                  );
                  setInputValue(newValue);
                }}
                size="small"
                sx={{ minWidth: 120 }}
              >
                {availableUnits.map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unit}
                  </MenuItem>
                ))}
              </Select>
            )}
          </Box>
        );

      case "time":
        return (
          <TextField
            {...commonProps}
            type="time"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            inputProps={{
              step: 300, // 5 minutes
            }}
          />
        );

      case "text":
        return (
          <TextField
            {...commonProps}
            multiline
            rows={3}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            inputProps={{
              maxLength: variable.validation_rules?.maxLength,
            }}
          />
        );

      default:
        return (
          <TextField
            {...commonProps}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        );
    }
  };

  // Render scale input for continuous variables with scale validation
  const renderScaleInput = () => {
    if (
      variable.data_type !== "continuous" ||
      !variable.validation_rules?.scaleMin
    ) {
      return null;
    }

    const { scaleMin = 1, scaleMax = 10 } = variable.validation_rules;
    const marks = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => ({
      value: scaleMin + i,
      label: (scaleMin + i).toString(),
    }));

    return (
      <Box sx={{ width: "100%", mt: 2 }}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {variable.label} ({scaleMin}-{scaleMax})
        </Typography>
        <Slider
          value={
            typeof inputValue === "number"
              ? inputValue
              : parseFloat(inputValue) || scaleMin
          }
          onChange={(_, newValue) => setInputValue(newValue)}
          min={scaleMin}
          max={scaleMax}
          marks={marks}
          step={1}
          disabled={disabled}
          valueLabelDisplay="auto"
        />
      </Box>
    );
  };

  // Render unit selector
  const renderUnitSelector = () => {
    if (!showUnitSelector || availableUnits.length <= 1) {
      return null;
    }

    return (
      <UnitSelector
        variable={variable}
        value={displayUnit}
        onChange={handleUnitChange}
        disabled={disabled || isConverting}
        size={size}
        showPreview={true}
        label="Unit"
      />
    );
  };

  return (
    <Box>
      {/* Variable Info */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>
          {variable.icon} {variable.label}
        </Typography>
        {variable.description && (
          <Tooltip title={variable.description}>
            <IconButton size="small">
              <FaInfoCircle />
            </IconButton>
          </Tooltip>
        )}
        {isConverting && (
          <Chip
            icon={<FaExchangeAlt />}
            label="Converting..."
            size="small"
            color="info"
            sx={{ ml: 1 }}
          />
        )}
      </Box>

      {/* Input Row */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          {renderInput()}
          {renderScaleInput()}
        </Box>
        {renderUnitSelector()}
      </Box>

      {/* Validation Error */}
      {showValidation && validation.error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {validation.error}
        </Alert>
      )}

      {/* Suggestions */}
      {showValidation &&
        validation.suggestions &&
        validation.suggestions.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="textSecondary">
              Suggestions:
            </Typography>
            {validation.suggestions.map((suggestion, index) => (
              <Chip
                key={index}
                label={suggestion}
                size="small"
                variant="outlined"
                sx={{ mr: 0.5, mt: 0.5 }}
                onClick={() => setInputValue(suggestion)}
              />
            ))}
          </Box>
        )}
    </Box>
  );
}
