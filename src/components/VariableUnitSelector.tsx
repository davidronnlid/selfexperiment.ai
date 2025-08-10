import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Typography,
  Chip,
  SelectChangeEvent,
} from "@mui/material";
import { supabase } from "@/utils/supaBase";
import { saveUserUnitPreference, getUserPreferredUnit, getVariableUnits } from "@/utils/userUnitPreferences";

interface Unit {
  unit_id: string;
  label: string;
  symbol: string;
  unit_group: string;
  is_base: boolean;
  is_default_group: boolean;
  priority: number;
}

interface VariableUnitSelectorProps {
  variableId: string;
  userId: string;
  currentUnit?: string;
  onUnitChange?: (unitId: string, unitGroup: string) => void;
  disabled?: boolean;
  label?: string;
  size?: "small" | "medium";
  autoSavePreference?: boolean; // New prop to control automatic saving
}

export default function VariableUnitSelector({
  variableId,
  userId,
  currentUnit,
  onUnitChange,
  disabled = false,
  label = "Unit",
  size = "medium",
  autoSavePreference = true,
}: VariableUnitSelectorProps) {
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>(currentUnit || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available units for this variable (run when variableId/userId change)
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use our centralized utility function
        const { units, error: unitsError } = await getVariableUnits(variableId);

        if (unitsError) throw new Error(unitsError);

        setAvailableUnits(units || []);

        // Always prioritize the currentUnit prop if provided (from parent)
        if (currentUnit && units && units.some(u => u.unit_id === currentUnit)) {
          // Avoid unnecessary setState loops
          setSelectedUnit(prev => (prev === currentUnit ? prev : currentUnit));
          return; // Exit early if currentUnit is valid
        }

        // Only fetch user preference if no currentUnit is provided
        if (!currentUnit && units && units.length > 0) {
          const { unit: preferredUnit, error: prefError } = await getUserPreferredUnit(userId, variableId);

          if (prefError) {
            console.warn("Could not get user preferred unit:", prefError);
            // Fall back to highest priority unit (lowest priority number)
            const defaultUnit = units.slice().sort((a, b) => a.priority - b.priority)[0];
            setSelectedUnit(prev => (prev === defaultUnit.unit_id ? prev : defaultUnit.unit_id));
          } else if (preferredUnit) {
            setSelectedUnit(prev => (prev === preferredUnit.unit_id ? prev : preferredUnit.unit_id));
          } else {
            // Fall back to highest priority unit (lowest priority number)
            const defaultUnit = units.slice().sort((a, b) => a.priority - b.priority)[0];
            setSelectedUnit(prev => (prev === defaultUnit.unit_id ? prev : defaultUnit.unit_id));
          }
        }
      } catch (err) {
        console.error("Error fetching units:", err);
        setError("Failed to load available units");
      } finally {
        setLoading(false);
      }
    };

    if (variableId && userId) {
      fetchUnits();
    }
  }, [variableId, userId]);

  // Sync selectedUnit when currentUnit prop changes
  useEffect(() => {
    if (currentUnit && currentUnit !== selectedUnit) {
      setSelectedUnit(currentUnit);
    }
    // Only react to currentUnit changes; avoid tying to selectedUnit to prevent loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUnit]);

  const handleUnitChange = async (event: SelectChangeEvent) => {
    const newUnitId = event.target.value;
    const selectedUnitData = availableUnits.find(
      (u) => u.unit_id === newUnitId
    );

    console.log('🔄 VariableUnitSelector: Unit change detected', {
      newUnitId,
      selectedUnitData,
      autoSavePreference
    });

    if (!selectedUnitData) return;

    setSelectedUnit(newUnitId);

    // Auto-save user preference if enabled (default behavior)
    if (autoSavePreference) {
      try {
        const { success, error } = await saveUserUnitPreference(
          userId,
          variableId,
          newUnitId,
          selectedUnitData.unit_group
        );
        
        if (!success) {
          console.warn('⚠️ Failed to save unit preference automatically:', error);
          console.warn('Unit selection will still work, but preference won\'t be saved');
          // Continue without breaking the UI - the selection still works locally
        } else {
          console.log('✅ Unit preference auto-saved successfully');
        }
      } catch (err) {
        console.warn('⚠️ Error auto-saving unit preference:', err);
        console.warn('Unit selection will still work, but preference won\'t be saved');
        // Continue without breaking the UI
      }
    }

    // Notify parent component (for additional custom handling)
    onUnitChange?.(newUnitId, selectedUnitData.unit_group);
  };

  // Group units by unit group and sort by priority within each group
  const groupedUnits = availableUnits.reduce((groups, unit) => {
    if (!groups[unit.unit_group]) {
      groups[unit.unit_group] = [];
    }
    groups[unit.unit_group].push(unit);
    return groups;
  }, {} as Record<string, Unit[]>);

  // Sort units within each group by priority (lower numbers = higher priority)
  Object.keys(groupedUnits).forEach(groupName => {
    groupedUnits[groupName].sort((a, b) => a.priority - b.priority);
  });

  // Get unit groups in order (default group first, then by name)
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
    parts.push(`Priority: ${unit.priority} (lower = higher priority)`);
    return parts.join(" • ");
  };

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
        <FormHelperText>{error}</FormHelperText>
      </FormControl>
    );
  }

  return (
    <FormControl size={size} disabled={disabled} fullWidth>
      <InputLabel sx={{ color: 'white' }}>{label}</InputLabel>
      <Select 
        value={selectedUnit} 
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
              <MenuItem 
                key={unit.unit_id} 
                value={unit.unit_id} 
                sx={{ pl: 3 }}
                title={getUnitTooltip(unit)} // Use native HTML title instead of MUI Tooltip
              >
                {getUnitDisplayText(unit)}
              </MenuItem>
            )),
          ];
        })}
      </Select>

    </FormControl>
  );
}
