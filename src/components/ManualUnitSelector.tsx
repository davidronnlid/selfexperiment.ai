import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  SelectChangeEvent,
  Tooltip,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { supabase } from "@/utils/supaBase";

interface Unit {
  unit_id: string;
  label: string;
  symbol: string;
  unit_group: string;
  is_base: boolean;
  is_default_group: boolean;
}

interface ManualUnitSelectorProps {
  variableId: string;
  userId: string;
  currentDisplayUnit?: string; // The user's current default unit
  selectedUnit: string; // Currently selected unit for this entry
  onUnitChange: (unitId: string) => void;
  onDefaultUnitChange?: (unitId: string, unitGroup: string) => void;
  disabled?: boolean;
  label?: string;
  size?: "small" | "medium";
}

export default function ManualUnitSelector({
  variableId,
  userId,
  currentDisplayUnit,
  selectedUnit,
  onUnitChange,
  onDefaultUnitChange,
  disabled = false,
  label = "Unit",
  size = "medium",
}: ManualUnitSelectorProps) {
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setAsDefault, setSetAsDefault] = useState(false);

  // Fetch available units for this variable
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        setLoading(true);
        setError(null);

        // Call the PostgreSQL function to get available units
        const { data: units, error: unitsError } = await supabase.rpc(
          "get_variable_units",
          { var_id: variableId }
        );

        if (unitsError) throw unitsError;

        setAvailableUnits(units || []);

        // If no unit is currently selected, set to display unit or first available
        if (!selectedUnit && units && units.length > 0) {
          const defaultUnit = currentDisplayUnit && units.find(u => u.unit_id === currentDisplayUnit)
            ? currentDisplayUnit
            : units.find((u: any) => u.is_default_group && u.is_base)?.unit_id || units[0]?.unit_id;
          
          if (defaultUnit) {
            onUnitChange(defaultUnit);
          }
        }
      } catch (err) {
        console.error("Error fetching units:", err);
        setError("Failed to load available units");
      } finally {
        setLoading(false);
      }
    };

    if (variableId) {
      fetchUnits();
    }
  }, [variableId, currentDisplayUnit, selectedUnit, onUnitChange]);

  const handleUnitChange = (event: SelectChangeEvent) => {
    const newUnitId = event.target.value;
    onUnitChange(newUnitId);
    
    // Reset the "set as default" checkbox when unit changes
    setSetAsDefault(false);
  };

  const handleSetAsDefaultChange = async (checked: boolean) => {
    setSetAsDefault(checked);
    
    if (checked && onDefaultUnitChange) {
      const selectedUnitData = availableUnits.find(u => u.unit_id === selectedUnit);
      if (selectedUnitData) {
        onDefaultUnitChange(selectedUnit, selectedUnitData.unit_group);
      }
    }
  };

  // Group units by unit group
  const groupedUnits = availableUnits.reduce((groups, unit) => {
    if (!groups[unit.unit_group]) {
      groups[unit.unit_group] = [];
    }
    groups[unit.unit_group].push(unit);
    return groups;
  }, {} as Record<string, Unit[]>);

  // Get unit groups in order (default group first)
  const unitGroups = Object.keys(groupedUnits).sort((a, b) => {
    const aHasDefault = groupedUnits[a].some((u) => u.is_default_group);
    const bHasDefault = groupedUnits[b].some((u) => u.is_default_group);
    if (aHasDefault && !bHasDefault) return -1;
    if (!aHasDefault && bHasDefault) return 1;
    return a.localeCompare(b);
  });

  const formatUnitGroupName = (group: string) => {
    return group.charAt(0).toUpperCase() + group.slice(1);
  };

  const getUnitDisplayText = (unit: Unit) => {
    return `${unit.label} (${unit.symbol})`;
  };

  const getUnitTooltip = (unit: Unit) => {
    const parts = [];
    if (unit.is_base) {
      parts.push("Base unit for this measurement type");
    }
    parts.push(`Unit group: ${formatUnitGroupName(unit.unit_group)}`);
    return parts.join(" • ");
  };

  // Check if selected unit is different from display unit
  const isDifferentFromDefault = selectedUnit && currentDisplayUnit && selectedUnit !== currentDisplayUnit;

  if (loading) {
    return (
      <FormControl size={size} disabled>
        <InputLabel>{label}</InputLabel>
        <Select value="" label={label}>
          <MenuItem value="">Loading...</MenuItem>
        </Select>
      </FormControl>
    );
  }

  if (error) {
    return (
      <FormControl size={size} error>
        <InputLabel>{label}</InputLabel>
        <Select value="" label={label}>
          <MenuItem value="">Error loading units</MenuItem>
        </Select>
      </FormControl>
    );
  }

  return (
    <Box>
      <FormControl size={size} disabled={disabled} fullWidth>
        <InputLabel sx={{ color: 'white' }}>{label}</InputLabel>
        <Select 
          value={selectedUnit || ""} 
          label={label} 
          onChange={handleUnitChange}
          renderValue={(value) => {
            if (!value) return "";
            const selectedUnitData = availableUnits.find(u => u.unit_id === value);
            return selectedUnitData ? getUnitDisplayText(selectedUnitData) : value;
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: 'background.paper',
                '& .MuiMenuItem-root': {
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  },
                  '&.Mui-disabled': {
                    color: 'text.secondary',
                    fontWeight: 'bold',
                  },
                },
              },
            },
          }}
          sx={{
            '& .MuiSelect-select': {
              color: 'white !important',
            },
            '& .MuiInputBase-input': {
              color: 'white !important',
            },
            '& .MuiSelect-nativeInput': {
              color: 'white !important',
            },
            '& .MuiOutlinedInput-input': {
              color: 'white !important',
            },
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              },
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.23)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.4)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#ffd700',
            },
            '& .MuiSvgIcon-root': {
              color: 'white !important',
            },
            color: 'white !important',
          }}
        >
          {unitGroups.map((groupName) => {
            const units = groupedUnits[groupName];
            const isDefaultGroup = units.some((u) => u.is_default_group);

            return [
              // Group header
              <MenuItem key={`${groupName}-header`} disabled sx={{ opacity: 1 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    {formatUnitGroupName(groupName)}
                  </Typography>
                  {isDefaultGroup && (
                    <Chip
                      label="Default"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </MenuItem>,
              // Units in this group
              ...units.map((unit) => (
                <Tooltip key={unit.unit_id} title={getUnitTooltip(unit)} placement="right">
                  <MenuItem value={unit.unit_id} sx={{ pl: 3 }}>
                    {getUnitDisplayText(unit)}
                    {unit.unit_id === currentDisplayUnit && (
                      <Chip
                        label="Your Default"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </MenuItem>
                </Tooltip>
              )),
            ];
          })}
        </Select>
      </FormControl>

      {/* Show checkbox when different unit is selected */}
      {isDifferentFromDefault && (
        <Box sx={{ mt: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={setAsDefault}
                onChange={(e) => handleSetAsDefaultChange(e.target.checked)}
                size="small"
                sx={{
                  color: '#ffd700',
                  '&.Mui-checked': {
                    color: '#ffd700',
                  },
                }}
              />
            }
            label={
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Set as Your New Default Unit
              </Typography>
            }
            sx={{ ml: 0 }}
          />
        </Box>
      )}
    </Box>
  );
}