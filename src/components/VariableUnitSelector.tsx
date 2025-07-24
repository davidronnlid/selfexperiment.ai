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
  Tooltip,
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

interface VariableUnitSelectorProps {
  variableId: string;
  userId: string;
  currentUnit?: string;
  onUnitChange: (unitId: string, unitGroup: string) => void;
  disabled?: boolean;
  label?: string;
  size?: "small" | "medium";
}

export default function VariableUnitSelector({
  variableId,
  userId,
  currentUnit,
  onUnitChange,
  disabled = false,
  label = "Unit",
  size = "medium",
}: VariableUnitSelectorProps) {
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>(currentUnit || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // If no current unit is set, get user's preferred unit or default
        if (!currentUnit && units && units.length > 0) {
          const { data: preferredUnit, error: prefError } = await supabase.rpc(
            "get_user_preferred_unit",
            {
              user_id_param: userId,
              variable_id_param: variableId,
            }
          );

          if (prefError) {
            console.warn("Could not get user preferred unit:", prefError);
            // Fall back to first base unit of default group
            const defaultUnit =
              units.find((u: any) => u.is_default_group && u.is_base) ||
              units[0];
            setSelectedUnit(defaultUnit.unit_id);
          } else if (preferredUnit && preferredUnit.length > 0) {
            setSelectedUnit(preferredUnit[0].unit_id);
          } else {
            // Fall back to first base unit of default group
            const defaultUnit =
              units.find((u: any) => u.is_default_group && u.is_base) ||
              units[0];
            setSelectedUnit(defaultUnit.unit_id);
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
  }, [variableId, userId, currentUnit]);

  // Update selected unit when currentUnit prop changes
  useEffect(() => {
    if (currentUnit) {
      setSelectedUnit(currentUnit);
    }
  }, [currentUnit]);

  const handleUnitChange = async (event: SelectChangeEvent) => {
    const newUnitId = event.target.value;
    const selectedUnitData = availableUnits.find(
      (u) => u.unit_id === newUnitId
    );

    if (!selectedUnitData) return;

    setSelectedUnit(newUnitId);

    // Save user preference
    try {
      const { error } = await supabase.rpc("set_user_unit_preference", {
        user_id_param: userId,
        variable_id_param: variableId,
        unit_id_param: newUnitId,
        unit_group_param: selectedUnitData.unit_group,
      });

      if (error) {
        console.warn("Could not save unit preference:", error);
      }
    } catch (err) {
      console.warn("Error saving unit preference:", err);
    }

    // Notify parent component
    onUnitChange(newUnitId, selectedUnitData.unit_group);
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
                </MenuItem>
              </Tooltip>
            )),
          ];
        })}
      </Select>

    </FormControl>
  );
}
