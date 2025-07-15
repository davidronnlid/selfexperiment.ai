import React, { useState, useEffect } from "react";
import { Autocomplete, TextField, Chip, Box, Typography } from "@mui/material";
import UnitCategoryDialog from "./UnitCategoryDialog";

interface UnitOption {
  value: string;
  label: string;
  category: string;
  dataTypes: string[];
  isCustom?: boolean;
}

interface UnitInputProps {
  value: string;
  onChange: (value: string) => void;
  dataType?: string;
  label?: string;
  placeholder?: string;
  size?: "small" | "medium";
  disabled?: boolean;
  fullWidth?: boolean;
  sx?: any;
}

// Base unit options (matches the ones from VariableCreationDialog)
const BASE_UNIT_OPTIONS: UnitOption[] = [
  // Weight
  {
    value: "kg",
    label: "Kilograms (kg)",
    category: "Weight",
    dataTypes: ["continuous"],
  },
  {
    value: "lbs",
    label: "Pounds (lbs)",
    category: "Weight",
    dataTypes: ["continuous"],
  },
  {
    value: "g",
    label: "Grams (g)",
    category: "Weight",
    dataTypes: ["continuous"],
  },
  {
    value: "oz",
    label: "Ounces (oz)",
    category: "Weight",
    dataTypes: ["continuous"],
  },

  // Volume
  {
    value: "ml",
    label: "Milliliters (ml)",
    category: "Volume",
    dataTypes: ["continuous"],
  },
  {
    value: "L",
    label: "Liters (L)",
    category: "Volume",
    dataTypes: ["continuous"],
  },
  {
    value: "cups",
    label: "Cups",
    category: "Volume",
    dataTypes: ["continuous"],
  },
  {
    value: "fl oz",
    label: "Fluid Ounces (fl oz)",
    category: "Volume",
    dataTypes: ["continuous"],
  },

  // Time
  {
    value: "hours",
    label: "Hours",
    category: "Time",
    dataTypes: ["continuous"],
  },
  {
    value: "minutes",
    label: "Minutes",
    category: "Time",
    dataTypes: ["continuous"],
  },
  {
    value: "seconds",
    label: "Seconds",
    category: "Time",
    dataTypes: ["continuous"],
  },
  { value: "days", label: "Days", category: "Time", dataTypes: ["continuous"] },

  // Health
  {
    value: "bpm",
    label: "Beats per minute (bpm)",
    category: "Health",
    dataTypes: ["continuous"],
  },
  {
    value: "mmHg",
    label: "mmHg (Blood Pressure)",
    category: "Health",
    dataTypes: ["continuous"],
  },
  {
    value: "°C",
    label: "Degrees Celsius (°C)",
    category: "Temperature",
    dataTypes: ["continuous"],
  },
  {
    value: "°F",
    label: "Degrees Fahrenheit (°F)",
    category: "Temperature",
    dataTypes: ["continuous"],
  },

  // Activity
  {
    value: "steps",
    label: "Steps",
    category: "Activity",
    dataTypes: ["continuous"],
  },
  {
    value: "reps",
    label: "Repetitions",
    category: "Activity",
    dataTypes: ["continuous"],
  },
  {
    value: "sets",
    label: "Sets",
    category: "Activity",
    dataTypes: ["continuous"],
  },

  // Medication/Supplement
  {
    value: "mg",
    label: "Milligrams (mg)",
    category: "Medication/Supplement",
    dataTypes: ["continuous"],
  },
  {
    value: "mcg",
    label: "Micrograms (mcg)",
    category: "Medication/Supplement",
    dataTypes: ["continuous"],
  },
  {
    value: "IU",
    label: "International Units (IU)",
    category: "Medication/Supplement",
    dataTypes: ["continuous"],
  },
  {
    value: "tablets",
    label: "Tablets",
    category: "Medication/Supplement",
    dataTypes: ["continuous"],
  },

  // Food/Exercise
  {
    value: "calories",
    label: "Calories",
    category: "Food/Exercise",
    dataTypes: ["continuous"],
  },
  {
    value: "servings",
    label: "Servings",
    category: "Food/Exercise",
    dataTypes: ["continuous"],
  },

  // Distance
  {
    value: "km",
    label: "Kilometers (km)",
    category: "Distance",
    dataTypes: ["continuous"],
  },
  {
    value: "miles",
    label: "Miles",
    category: "Distance",
    dataTypes: ["continuous"],
  },
  {
    value: "m",
    label: "Meters (m)",
    category: "Distance",
    dataTypes: ["continuous"],
  },
  {
    value: "ft",
    label: "Feet (ft)",
    category: "Distance",
    dataTypes: ["continuous"],
  },

  // Speed
  {
    value: "mph",
    label: "Miles per hour (mph)",
    category: "Speed",
    dataTypes: ["continuous"],
  },
  {
    value: "km/h",
    label: "Kilometers per hour (km/h)",
    category: "Speed",
    dataTypes: ["continuous"],
  },
  {
    value: "m/s",
    label: "Meters per second (m/s)",
    category: "Speed",
    dataTypes: ["continuous"],
  },

  // Frequency
  {
    value: "per day",
    label: "Per day",
    category: "Frequency",
    dataTypes: ["continuous"],
  },
  {
    value: "per week",
    label: "Per week",
    category: "Frequency",
    dataTypes: ["continuous"],
  },
  {
    value: "times",
    label: "Times",
    category: "Frequency",
    dataTypes: ["continuous"],
  },

  // Boolean
  {
    value: "true/false",
    label: "True/False",
    category: "Boolean",
    dataTypes: ["boolean"],
  },
  {
    value: "yes/no",
    label: "Yes/No",
    category: "Boolean",
    dataTypes: ["boolean"],
  },
  {
    value: "0/1",
    label: "0/1",
    category: "Boolean",
    dataTypes: ["boolean"],
  },

  // General
  {
    value: "rating",
    label: "Rating/Score",
    category: "General",
    dataTypes: ["continuous"],
  },
  {
    value: "percentage",
    label: "Percentage (%)",
    category: "General",
    dataTypes: ["continuous"],
  },
  {
    value: "units",
    label: "Units (generic)",
    category: "General",
    dataTypes: ["continuous"],
  },
  {
    value: "pieces",
    label: "Pieces",
    category: "General",
    dataTypes: ["continuous"],
  },
  {
    value: "items",
    label: "Items",
    category: "General",
    dataTypes: ["continuous"],
  },

  // Categorical
  {
    value: "option",
    label: "Option",
    category: "Categorical",
    dataTypes: ["categorical"],
  },
  {
    value: "choice",
    label: "Choice",
    category: "Categorical",
    dataTypes: ["categorical"],
  },
  {
    value: "level",
    label: "Level",
    category: "Categorical",
    dataTypes: ["categorical"],
  },
  {
    value: "type",
    label: "Type",
    category: "Categorical",
    dataTypes: ["categorical"],
  },
  {
    value: "category",
    label: "Category",
    category: "Categorical",
    dataTypes: ["categorical"],
  },

  // Text
  {
    value: "characters",
    label: "Characters",
    category: "Text",
    dataTypes: ["text"],
  },
  { value: "words", label: "Words", category: "Text", dataTypes: ["text"] },
];

export default function UnitInput({
  value,
  onChange,
  dataType = "continuous",
  label = "Unit",
  placeholder = "Select or type a unit...",
  size = "medium",
  disabled = false,
  fullWidth = true,
  sx = {},
}: UnitInputProps) {
  const [customUnits, setCustomUnits] = useState<UnitOption[]>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [pendingUnit, setPendingUnit] = useState<string>("");

  // Load custom units from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("customUnits");
    if (stored) {
      try {
        setCustomUnits(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to load custom units:", error);
      }
    }
  }, []);

  // Save custom units to localStorage
  const saveCustomUnits = (units: UnitOption[]) => {
    setCustomUnits(units);
    localStorage.setItem("customUnits", JSON.stringify(units));
  };

  // Get all available units (base + custom) filtered by data type
  const getAvailableUnits = () => {
    const allUnits = [...BASE_UNIT_OPTIONS, ...customUnits];
    return allUnits.filter(
      (unit) =>
        unit.dataTypes.includes(dataType) ||
        unit.dataTypes.includes("all") ||
        dataType === "all"
    );
  };

  // Check if a unit exists in the available options
  const isUnitKnown = (unitValue: string) => {
    const availableUnits = getAvailableUnits();
    return availableUnits.some(
      (unit) => unit.value.toLowerCase() === unitValue.toLowerCase()
    );
  };

  // Handle input change - detect new units
  const handleInputChange = (
    event: any,
    newValue: string | UnitOption | null
  ) => {
    if (typeof newValue === "string") {
      // User typed a custom value
      const trimmedValue = newValue.trim();
      if (trimmedValue && !isUnitKnown(trimmedValue)) {
        // New unit detected
        setPendingUnit(trimmedValue);
        setShowCategoryDialog(true);
      } else {
        // Known unit or empty
        onChange(trimmedValue);
      }
    } else if (newValue) {
      // User selected an existing option
      onChange(newValue.value);
    } else {
      // User cleared the selection
      onChange("");
    }
  };

  // Handle category selection for new unit
  const handleCategoryConfirm = (category: string, unitLabel?: string) => {
    const newUnit: UnitOption = {
      value: pendingUnit,
      label: unitLabel || pendingUnit,
      category,
      dataTypes: [dataType],
      isCustom: true,
    };

    const updatedCustomUnits = [...customUnits, newUnit];
    saveCustomUnits(updatedCustomUnits);

    onChange(pendingUnit);
    setShowCategoryDialog(false);
    setPendingUnit("");
  };

  // Handle category dialog close
  const handleCategoryClose = () => {
    setShowCategoryDialog(false);
    setPendingUnit("");
  };

  // Get the current value as an option object
  const getCurrentValue = () => {
    const availableUnits = getAvailableUnits();
    return availableUnits.find((unit) => unit.value === value) || null;
  };

  return (
    <>
      <Autocomplete
        options={getAvailableUnits()}
        getOptionLabel={(option) =>
          typeof option === "string" ? option : option.label
        }
        value={getCurrentValue()}
        onChange={handleInputChange}
        freeSolo
        disabled={disabled}
        fullWidth={fullWidth}
        size={size}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            variant="outlined"
            sx={sx}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                width: "100%",
              }}
            >
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1">{option.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.category}
                  {option.isCustom && " • Custom"}
                </Typography>
              </Box>
              {option.isCustom && (
                <Chip
                  label="Custom"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}
        groupBy={(option) => option.category}
      />

      <UnitCategoryDialog
        open={showCategoryDialog}
        onClose={handleCategoryClose}
        onConfirm={handleCategoryConfirm}
        unitValue={pendingUnit}
      />
    </>
  );
}
