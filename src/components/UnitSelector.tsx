import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { fetchUnits, getUnitsByGroup } from "../utils/unitsTableUtils";
import { Unit } from "../types/variables";

interface UnitSelectorProps {
  value: string;
  onChange: (unitId: string) => void;
  label?: string;
  unitGroup?: string; // Filter by unit group
  dataType?: "continuous" | "categorical" | "boolean" | "time" | "text";
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

export default function UnitSelector({
  value,
  onChange,
  label = "Unit",
  unitGroup,
  dataType,
  disabled = false,
  required = false,
  error = false,
  helperText,
}: UnitSelectorProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const loadUnits = async () => {
      try {
        setLoading(true);
        setFetchError(null);

        let unitsData: Unit[];
        if (unitGroup) {
          unitsData = await getUnitsByGroup(unitGroup);
        } else {
          unitsData = await fetchUnits();
        }

        // Filter units based on data type
        let filteredUnits = unitsData;
        if (dataType === "boolean") {
          filteredUnits = unitsData.filter(
            (unit) => unit.unit_group === "boolean"
          );
        } else if (dataType === "continuous") {
          filteredUnits = unitsData.filter(
            (unit) =>
              unit.unit_group !== "boolean" && unit.unit_group !== "categorical"
          );
        }

        setUnits(filteredUnits);
      } catch (error) {
        console.error("Error loading units:", error);
        setFetchError("Failed to load units");
      } finally {
        setLoading(false);
      }
    };

    loadUnits();
  }, [unitGroup, dataType]);

  // Group units by unit_group for better organization
  const groupedUnits = units.reduce((groups, unit) => {
    const group = unit.unit_group;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(unit);
    return groups;
  }, {} as Record<string, Unit[]>);

  // Sort groups and units within groups
  const sortedGroups = Object.keys(groupedUnits).sort();
  sortedGroups.forEach((group) => {
    groupedUnits[group].sort((a, b) => {
      // Base units first, then alphabetically
      if (a.is_base && !b.is_base) return -1;
      if (!a.is_base && b.is_base) return 1;
      return a.label.localeCompare(b.label);
    });
  });

  if (loading) {
    return (
      <FormControl fullWidth disabled>
        <InputLabel>{label}</InputLabel>
        <Select value="" displayEmpty>
          <MenuItem value="">
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={16} />
              <Typography>Loading units...</Typography>
            </Box>
          </MenuItem>
        </Select>
      </FormControl>
    );
  }

  if (fetchError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {fetchError}
      </Alert>
    );
  }

  return (
    <FormControl
      fullWidth
      disabled={disabled}
      error={error}
      required={required}
    >
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as string)}
        label={label}
      >
        {sortedGroups
          .map((groupName) => [
            // Group header (if more than one group)
            sortedGroups.length > 1 && (
              <MenuItem
                key={`header-${groupName}`}
                disabled
                sx={{ opacity: 0.7 }}
              >
                <Typography variant="overline" fontWeight="bold">
                  {groupName.charAt(0).toUpperCase() + groupName.slice(1)}
                </Typography>
              </MenuItem>
            ),
            // Units in this group
            ...groupedUnits[groupName].map((unit) => (
              <MenuItem key={unit.id} value={unit.id}>
                <Box display="flex" alignItems="center" gap={1} width="100%">
                  <Typography>{unit.label}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    ({unit.symbol})
                  </Typography>
                  {unit.is_base && (
                    <Chip
                      label="Base"
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.7rem", height: 18 }}
                    />
                  )}
                </Box>
              </MenuItem>
            )),
          ])
          .filter(Boolean)}
      </Select>
      {helperText && (
        <Typography
          variant="caption"
          color={error ? "error" : "text.secondary"}
          sx={{ mt: 0.5 }}
        >
          {helperText}
        </Typography>
      )}
    </FormControl>
  );
}
