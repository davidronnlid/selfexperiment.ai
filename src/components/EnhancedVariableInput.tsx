// Enhanced Variable Input Component with Unit Conversion

import React, { useState, useEffect } from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Slider,
  Typography,
  Switch,
  FormControlLabel,
  Autocomplete,
} from '@mui/material';
import { FaExclamationTriangle, FaCheckCircle, FaExchangeAlt } from 'react-icons/fa';
import { 
  Variable, 
  Unit, 
  UnitGroup,
  VariableValidationResult,
  getVariableIcon,
  isContinuousVariable,
  isCategoricalVariable,
  isBooleanVariable,
  isOrdinalVariable,
  isConvertibleVariable
} from '@/types/variables';
import { 
  validateVariableValue, 
  getAllUnits, 
  getAllUnitGroups,
  getUserUnitPreferences,
  updateUserUnitPreference
} from '@/utils/variablesV2';
import { 
  UnitConverter, 
  convertUnit, 
  formatValue,
  findUnitByCode,
  getUnitsForGroup 
} from '@/utils/unitConversion';
import { useUser } from '@/pages/_app';

interface EnhancedVariableInputProps {
  variable: Variable;
  value?: number | string | boolean;
  onChange: (value: number | string | boolean, unit?: Unit) => void;
  onValidationChange?: (result: VariableValidationResult) => void;
  disabled?: boolean;
  className?: string;
  showValidation?: boolean;
  showUnitConverter?: boolean;
  autoConvert?: boolean;
}

export default function EnhancedVariableInput({
  variable,
  value = '',
  onChange,
  onValidationChange,
  disabled = false,
  className = '',
  showValidation = true,
  showUnitConverter = true,
  autoConvert = true
}: EnhancedVariableInputProps) {
  const { user } = useUser();
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitGroups, setUnitGroups] = useState<UnitGroup[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [validation, setValidation] = useState<VariableValidationResult>({ isValid: true });
  const [hasInteracted, setHasInteracted] = useState(false);
  const [converter, setConverter] = useState<UnitConverter | null>(null);

  useEffect(() => {
    loadUnitsData();
  }, []);

  useEffect(() => {
    if (units.length > 0 && unitGroups.length > 0) {
      setConverter(new UnitConverter(units, unitGroups));
      initializeUnit();
    }
  }, [units, unitGroups, variable]);

  useEffect(() => {
    if (showValidation && hasInteracted) {
      const result = validateVariableValue(variable, value);
      setValidation(result);
      onValidationChange?.(result);
    }
  }, [value, variable, showValidation, hasInteracted, onValidationChange]);

  const loadUnitsData = async () => {
    try {
      const [unitsData, unitGroupsData] = await Promise.all([
        getAllUnits(),
        getAllUnitGroups()
      ]);
      setUnits(unitsData);
      setUnitGroups(unitGroupsData);
    } catch (error) {
      console.error('Failed to load units data:', error);
    }
  };

  const initializeUnit = async () => {
    if (!isConvertibleVariable(variable) || !variable.unit_group) {
      return;
    }

    // Find the unit group
    const unitGroup = unitGroups.find((ug: UnitGroup) => ug.name === variable.unit_group);
    if (!unitGroup) return;

    // Get available units for this group
    const groupUnits = getUnitsForGroup(units, unitGroup.id);
    setAvailableUnits(groupUnits);

    // Get user's preferred unit for this group
    if (user) {
      try {
        const userPreferences = await getUserUnitPreferences(user.id);
        const preference = userPreferences.find((up: any) => up.unit_group_id === unitGroup.id);
        
        if (preference) {
          const preferredUnit = units.find((u: Unit) => u.id === preference.preferred_unit_id);
          if (preferredUnit) {
            setSelectedUnit(preferredUnit);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
    }

    // Default to variable's default unit or base unit
    const defaultUnit = findUnitByCode(units, variable.unit || '') || 
                       groupUnits.find((u: Unit) => u.is_base_unit) || 
                       groupUnits[0];
    
    if (defaultUnit) {
      setSelectedUnit(defaultUnit);
    }
  };

  const handleValueChange = (newValue: number | string | boolean) => {
    setHasInteracted(true);
    onChange(newValue, selectedUnit || undefined);
  };

  const handleUnitChange = async (newUnit: Unit) => {
    if (!converter || !selectedUnit || !isConvertibleVariable(variable)) {
      setSelectedUnit(newUnit);
      return;
    }

    // Convert current value to new unit
    if (typeof value === 'number' && value !== 0) {
      try {
        const converted = convertUnit(value, selectedUnit, newUnit);
        setSelectedUnit(newUnit);
        onChange(converted.value, newUnit);

        // Save user preference
        if (user && variable.unit_group) {
          const unitGroup = unitGroups.find((ug: UnitGroup) => ug.name === variable.unit_group);
          if (unitGroup) {
            await updateUserUnitPreference(user.id, unitGroup.id, newUnit.id);
          }
        }
      } catch (error) {
        console.error('Unit conversion failed:', error);
        setSelectedUnit(newUnit);
      }
    } else {
      setSelectedUnit(newUnit);
    }
  };

  const getInputIcon = () => {
    const icon = getVariableIcon(variable);
    return (
      <span role="img" aria-label={variable.label}>
        {icon}
      </span>
    );
  };

  const getValidationIcon = () => {
    if (!showValidation || !hasInteracted) return null;

    if (!validation.isValid) {
      return <FaExclamationTriangle className="text-red-500" />;
    }
    if (validation.isValid && value) {
      return <FaCheckCircle className="text-green-500" />;
    }
    return null;
  };

  const getHelperText = () => {
    if (!validation.isValid && hasInteracted) {
      return validation.error;
    }

    if (validation.warnings && validation.warnings.length > 0) {
      return validation.warnings[0];
    }

    // Type-specific helper text
    switch (variable.type) {
      case 'continuous':
        let text = '';
        if (variable.min_value !== undefined && variable.max_value !== undefined) {
          text = `Range: ${variable.min_value} - ${variable.max_value}`;
        } else if (variable.min_value !== undefined) {
          text = `Min: ${variable.min_value}`;
        } else if (variable.max_value !== undefined) {
          text = `Max: ${variable.max_value}`;
        }
        
        if (selectedUnit) {
          text += selectedUnit.symbol ? ` ${selectedUnit.symbol}` : '';
        }
        
        return text;

      case 'ordinal':
        if (variable.ordinal_min !== undefined && variable.ordinal_max !== undefined) {
          return `Scale: ${variable.ordinal_min} - ${variable.ordinal_max}`;
        }
        break;

      case 'categorical':
        if (variable.categorical_options) {
          return `Options: ${variable.categorical_options.join(', ')}`;
        }
        break;

      case 'boolean':
        return 'Enter: true/false, yes/no, or 1/0';
    }

    return variable.description || '';
  };

  const renderUnitSelector = () => {
    if (!isConvertibleVariable(variable) || !showUnitConverter || availableUnits.length <= 1) {
      return null;
    }

    return (
      <FormControl size="small" sx={{ minWidth: 80, ml: 1 }}>
        <Select
          value={selectedUnit?.id || ''}
          onChange={(e) => {
            const unit = units.find((u: Unit) => u.id === e.target.value);
            if (unit) handleUnitChange(unit);
          }}
          displayEmpty
          disabled={disabled}
        >
          {availableUnits.map((unit: Unit) => (
            <MenuItem key={unit.id} value={unit.id}>
              {unit.symbol || unit.code}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  const renderInputByType = () => {
    switch (variable.type) {
      case 'continuous':
        return (
          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
            <TextField
              type="number"
              label={variable.label}
              value={value || ''}
              onChange={(e) => handleValueChange(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              error={!validation.isValid && hasInteracted}
              fullWidth
              variant="outlined"
              inputProps={{
                min: variable.min_value,
                max: variable.max_value,
                step: 1 / Math.pow(10, variable.decimal_places || 2)
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
              helperText={getHelperText()}
            />
            {renderUnitSelector()}
          </Box>
        );

      case 'ordinal':
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              {variable.label} {getInputIcon()}
            </Typography>
            <Slider
              value={typeof value === 'number' ? value : variable.ordinal_min || 1}
              onChange={(_, newValue) => handleValueChange(newValue as number)}
              min={variable.ordinal_min || 1}
              max={variable.ordinal_max || 10}
              step={1}
              marks
              valueLabelDisplay="on"
              disabled={disabled}
            />
            {variable.ordinal_labels && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                {variable.ordinal_labels.map((label: string, index: number) => (
                  <Typography key={index} variant="caption" color="textSecondary">
                    {label}
                  </Typography>
                ))}
              </Box>
            )}
            <FormHelperText error={!validation.isValid && hasInteracted}>
              {getHelperText()}
            </FormHelperText>
          </Box>
        );

      case 'categorical':
        if (variable.categorical_options && variable.categorical_options.length <= 5) {
          // Use toggle buttons for few options
          return (
            <Box>
              <Typography variant="body2" gutterBottom>
                {variable.label} {getInputIcon()}
              </Typography>
              <ToggleButtonGroup
                value={value}
                exclusive
                onChange={(_, newValue) => newValue && handleValueChange(newValue)}
                disabled={disabled}
                size="small"
              >
                {variable.categorical_options.map((option: string) => (
                  <ToggleButton key={option} value={option}>
                    {option}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <FormHelperText error={!validation.isValid && hasInteracted}>
                {getHelperText()}
              </FormHelperText>
            </Box>
          );
        } else {
          // Use autocomplete for many options
          return (
            <Autocomplete
              options={variable.categorical_options || []}
              value={value as string || null}
              onChange={(_, newValue) => handleValueChange(newValue || '')}
              disabled={disabled}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={variable.label}
                  error={!validation.isValid && hasInteracted}
                  helperText={getHelperText()}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">{getInputIcon()}</InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {params.InputProps.endAdornment}
                        <InputAdornment position="end">
                          {getValidationIcon()}
                        </InputAdornment>
                      </>
                    ),
                  }}
                />
              )}
            />
          );
        }

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleValueChange(e.target.checked)}
                disabled={disabled}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getInputIcon()}
                {variable.label}
              </Box>
            }
          />
        );

      default:
        return (
          <TextField
            label={variable.label}
            value={value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            disabled={disabled}
            error={!validation.isValid && hasInteracted}
            fullWidth
            variant="outlined"
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
            helperText={getHelperText()}
          />
        );
    }
  };

  return (
    <Box className={className}>
      {renderInputByType()}
    </Box>
  );
}