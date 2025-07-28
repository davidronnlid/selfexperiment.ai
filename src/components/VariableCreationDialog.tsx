import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Box,
  Typography,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Popover,
  IconButton,
  Grid,
  ListSubheader,
} from "@mui/material";
import { FaGlobe, FaLock, FaPlus, FaQuestion, FaSmile } from "react-icons/fa";
import { supabase } from "@/utils/supaBase";
import {
  generateVariableUnitConfig,
  getUnitDisplayInfo,
} from "../utils/unitGroupUtils";
import { addVariableUnit, setVariableUnits } from "../utils/variableUnitsUtils";
import { fetchUnits } from "../utils/unitsTableUtils";
import { Unit } from "../types/variables";
import { createPermissiveSlug } from "@/utils/slugUtils";
import {
  validateVariableName,
  moderateContent,
  checkRateLimit,
  suggestVariableImprovements,
} from "@/utils/contentModeration";

interface VariableCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onVariableCreated: (variable: any) => void;
  initialVariableName: string;
  user: any;
}

// Predefined unit options with default min/max values
const UNIT_OPTIONS = [
  // Continuous/Numeric Units
  {
    value: "kg",
    label: "Kilograms (kg)",
    category: "Weight",
    dataTypes: ["continuous"],
    defaultMin: 0,
    defaultMax: 300,
  },
  {
    value: "lbs",
    label: "Pounds (lbs)",
    category: "Weight",
    dataTypes: ["continuous"],
    defaultMin: 0,
    defaultMax: 660,
  },
  {
    value: "mg",
    label: "Milligrams (mg)",
    category: "Medication/Supplement",
    dataTypes: ["continuous"],
    defaultMin: 0,
    defaultMax: 1000,
  },
  {
    value: "ml",
    label: "Milliliters (ml)",
    category: "Volume",
    dataTypes: ["continuous"],
    defaultMin: 0,
    defaultMax: 5000,
  },
  {
    value: "L",
    label: "Liters (L)",
    category: "Volume",
    dataTypes: ["continuous"],
    defaultMin: 0,
    defaultMax: 10,
  },
  {
    value: "hours",
    label: "Hours",
    category: "Time",
    dataTypes: ["continuous"],
    defaultMin: 0,
    defaultMax: 24,
  },
  {
    value: "minutes",
    label: "Minutes",
    category: "Time",
    dataTypes: ["continuous"],
    defaultMin: 0,
    defaultMax: 1440,
  },
  {
    value: "bpm",
    label: "Beats per minute (bpm)",
    category: "Health",
    dataTypes: ["continuous"],
    defaultMin: 30,
    defaultMax: 220,
  },
  {
    value: "°C",
    label: "Degrees Celsius (°C)",
    category: "Temperature",
    dataTypes: ["continuous"],
    defaultMin: 35,
    defaultMax: 42,
  },
  {
    value: "°F",
    label: "Degrees Fahrenheit (°F)",
    category: "Temperature",
    dataTypes: ["continuous"],
    defaultMin: 95,
    defaultMax: 108,
  },
  {
    value: "steps",
    label: "Steps",
    category: "Activity",
    dataTypes: ["continuous"],
    defaultMin: 0,
    defaultMax: 50000,
  },
  {
    value: "calories",
    label: "Calories",
    category: "Food/Exercise",
    dataTypes: ["continuous"],
    defaultMin: 0,
    defaultMax: 5000,
  },
  {
    value: "mmHg",
    label: "mmHg (Blood Pressure)",
    category: "Health",
    dataTypes: ["continuous"],
    defaultMin: 60,
    defaultMax: 200,
  },
  {
    value: "rating",
    label: "Rating/Score",
    category: "Subjective",
    dataTypes: ["continuous"],
    defaultMin: 1,
    defaultMax: 10,
  },
  {
    value: "percentage",
    label: "Percentage (%)",
    category: "General",
    dataTypes: ["continuous"],
    defaultMin: 0,
    defaultMax: 100,
  },
  {
    value: "units",
    label: "Units (generic)",
    category: "General",
    dataTypes: ["continuous"],
    defaultMin: 0,
    defaultMax: 100,
  },
  // Boolean Units
  {
    value: "true/false",
    label: "True/False",
    category: "Boolean",
    dataTypes: ["boolean"],
    defaultMin: 0,
    defaultMax: 1,
  },
  {
    value: "yes/no",
    label: "Yes/No",
    category: "Boolean",
    dataTypes: ["boolean"],
    defaultMin: 0,
    defaultMax: 1,
  },
  {
    value: "0/1",
    label: "0/1",
    category: "Boolean",
    dataTypes: ["boolean"],
    defaultMin: 0,
    defaultMax: 1,
  },
  // Categorical Units
  {
    value: "option",
    label: "Option",
    category: "Categorical",
    dataTypes: ["categorical"],
    defaultMin: 0,
    defaultMax: 0,
  },
  {
    value: "choice",
    label: "Choice",
    category: "Categorical",
    dataTypes: ["categorical"],
    defaultMin: 0,
    defaultMax: 0,
  },
  {
    value: "level",
    label: "Level",
    category: "Categorical",
    dataTypes: ["categorical"],
    defaultMin: 0,
    defaultMax: 0,
  },
  {
    value: "type",
    label: "Type",
    category: "Categorical",
    dataTypes: ["categorical"],
    defaultMin: 0,
    defaultMax: 0,
  },
  {
    value: "category",
    label: "Category",
    category: "Categorical",
    dataTypes: ["categorical"],
    defaultMin: 0,
    defaultMax: 0,
  },
  // Text Units
  {
    value: "characters",
    label: "Characters",
    category: "Text",
    dataTypes: ["text"],
    defaultMin: 1,
    defaultMax: 500,
  },
  {
    value: "words",
    label: "Words",
    category: "Text",
    dataTypes: ["text"],
    defaultMin: 1,
    defaultMax: 100,
  },
];

// Function to filter unit options based on data type
const getAvailableUnits = (dataType: string) => {
  return UNIT_OPTIONS.filter(
    (unit) =>
      unit.dataTypes.includes(dataType) || unit.dataTypes.includes("all")
  );
};

// Common emojis for variable icons
const EMOJI_OPTIONS = [
  "📊",
  "💪",
  "🏃",
  "😊",
  "😴",
  "🍎",
  "💊",
  "🌡️",
  "❤️",
  "🧠",
  "⚡",
  "🔥",
  "💧",
  "🍽️",
  "☕",
  "🍷",
  "🚬",
  "🌿",
  "🎯",
  "📱",
  "💻",
  "📚",
  "🎵",
  "🎨",
  "💰",
  "🏠",
  "🚗",
  "✈️",
  "🌞",
  "🌙",
  "⭐",
  "🎉",
  "😰",
  "😌",
  "😢",
  "😡",
  "🤒",
  "🤕",
  "💉",
  "🩺",
  "🏥",
  "⚖️",
  "📏",
  "📐",
  "⏰",
  "📅",
  "🔢",
  "📈",
  "📉",
];

export default function VariableCreationDialog({
  open,
  onClose,
  onVariableCreated,
  initialVariableName,
  user,
}: VariableCreationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [variableName, setVariableName] = useState(initialVariableName);
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [source, setSource] = useState("manual");
  const [isShared, setIsShared] = useState(false);
  const [constraints, setConstraints] = useState({
    min: "",
    max: "",
    type: "continuous",
  });
  const [icon, setIcon] = useState("📊");
  const [error, setError] = useState("");
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);

  // New state for units table
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  // Load units from database
  useEffect(() => {
    if (open) {
      loadUnits();
    }
  }, [open]);

  // Reset form when dialog opens or initialVariableName changes
  useEffect(() => {
    if (open) {
      setVariableName(initialVariableName || "");
      setDescription("");
      setUnit("");
      setSource("manual");
      setIsShared(false);
      setConstraints({
        min: "",
        max: "",
        type: "continuous",
      });
      setIcon("📊");
      setError("");
      setEmojiAnchor(null);
      setSelectedUnitIds([]);
    }
  }, [open, initialVariableName]);

  // Clear invalid units when data type changes to prevent invalid unit-datatype combinations
  useEffect(() => {
    if (selectedUnitIds.length > 0 && availableUnits.length > 0) {
      const validUnitIds = selectedUnitIds.filter((unitId) => {
        const unit = availableUnits.find((u) => u.id === unitId);
        if (!unit) return false;

        // Filter based on data type compatibility
        if (constraints.type === "boolean") {
          return unit.unit_group === "boolean";
        } else if (constraints.type === "categorical") {
          return ["option", "choice", "level", "type", "category"].includes(
            unit.id
          );
        } else if (constraints.type === "text") {
          return ["characters", "words"].includes(unit.id);
        } else if (constraints.type === "continuous") {
          return unit.unit_group !== "boolean";
        }
        return true;
      });

      if (validUnitIds.length !== selectedUnitIds.length) {
        setSelectedUnitIds(validUnitIds);
        // Clear constraints if units changed
        setConstraints((prev) => ({
          ...prev,
          min: "",
          max: "",
        }));
      }
    }
  }, [constraints.type, selectedUnitIds, availableUnits]);

  // Handle category selection - select all units in a category
  const handleCategorySelect = (categoryName: string, categoryUnits: typeof availableUnits) => {
    const categoryUnitIds = categoryUnits.map(unit => unit.id);
    const allCategorySelected = categoryUnitIds.every(id => selectedUnitIds.includes(id));
    
    if (allCategorySelected) {
      // If all units in category are selected, deselect them
      setSelectedUnitIds(prev => prev.filter(id => !categoryUnitIds.includes(id)));
    } else {
      // If not all units are selected, select all units in the category
      setSelectedUnitIds(prev => {
        const newSelected = [...prev];
        categoryUnitIds.forEach(id => {
          if (!newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        return newSelected;
      });
    }
  };

  const loadUnits = async () => {
    setUnitsLoading(true);
    try {
      const units = await fetchUnits();
      setAvailableUnits(units);
    } catch (error) {
      console.error("Failed to load units:", error);
    } finally {
      setUnitsLoading(false);
    }
  };

  const handleUnitChange = (selectedUnit: string) => {
    const unitValue = selectedUnit || "";
    setUnit(unitValue);

    // Find the unit option and set default min/max values
    const availableUnits = getAvailableUnits(constraints.type);
    const unitOption = availableUnits.find((opt) => opt.value === unitValue);
    if (unitOption) {
      // Predefined unit - use numeric defaults
      setConstraints((prev) => ({
        ...prev,
        min: unitOption.defaultMin.toString(),
        max: unitOption.defaultMax.toString(),
      }));
    } else if (unitValue && !unitOption) {
      // Free text unit - set character limits
      setConstraints((prev) => ({
        ...prev,
        min: "1", // minimum characters
        max: "100", // maximum characters
      }));
    } else {
      // No unit - clear constraints
      setConstraints((prev) => ({
        ...prev,
        min: "",
        max: "",
      }));
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setIcon(emoji);
    setEmojiAnchor(null);
  };

  // Helper function to get unit category
  const getUnitCategory = (unitValue: string): string | null => {
    if (!unitValue) return null;

    // Check predefined units first
    const availableUnits = getAvailableUnits(constraints.type);
    const unitOption = availableUnits.find((opt) => opt.value === unitValue);
    if (unitOption) {
      return unitOption.category;
    }

    // Check custom units from localStorage
    const customUnits = localStorage.getItem("customUnits");
    if (customUnits) {
      try {
        const parsedCustomUnits = JSON.parse(customUnits);
        const customUnit = parsedCustomUnits.find(
          (u: any) => u.value === unitValue
        );
        if (customUnit) {
          return customUnit.category;
        }
      } catch (error) {
        console.error("Failed to parse custom units:", error);
      }
    }

    return null;
  };

  // Helper function to get unit conversion group
  const getUnitConversionInfo = (unitValue: string) => {
    const conversionGroups: Record<string, { group: string; units: string[] }> =
      {
        kg: { group: "mass", units: ["kg", "lb", "g", "oz"] },
        lb: { group: "mass", units: ["kg", "lb", "g", "oz"] },
        g: { group: "mass", units: ["kg", "lb", "g", "oz"] },
        mg: { group: "mass", units: ["mg", "mcg"] },
        L: { group: "volume", units: ["L", "ml", "cups", "fl oz"] },
        ml: { group: "volume", units: ["L", "ml", "cups", "fl oz"] },
        hours: {
          group: "time",
          units: ["hours", "minutes", "seconds", "days"],
        },
        minutes: { group: "time", units: ["hours", "minutes", "seconds"] },
        "°C": { group: "temperature", units: ["°C", "°F"] },
        "°F": { group: "temperature", units: ["°C", "°F"] },
        "true/false": {
          group: "boolean",
          units: ["true/false", "yes/no", "0/1"],
        },
        "yes/no": { group: "boolean", units: ["true/false", "yes/no", "0/1"] },
        "0/1": { group: "boolean", units: ["true/false", "yes/no", "0/1"] },
      };

    return conversionGroups[unitValue] || null;
  };

  const handleSubmit = async () => {
    if (!variableName.trim()) {
      setError("Variable name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Check rate limiting
      const rateLimitResult = checkRateLimit(user.id);
      if (!rateLimitResult.isAllowed) {
        setError(rateLimitResult.reason || "Rate limit exceeded");
        setLoading(false);
        return;
      }

      // Validate variable name
      const nameValidation = validateVariableName(variableName);
      if (!nameValidation.isAllowed) {
        setError(nameValidation.reason || "Invalid variable name");
        setLoading(false);
        return;
      }

      // Check content for potential issues
      const contentCheck = moderateContent(
        variableName + " " + (description || "")
      );
      if (contentCheck.reason) {
        // Show warning but don't block
        console.warn("Content flagged:", contentCheck.reason);
      }

      // Create the variable in the universal variables system
      const slug = createPermissiveSlug(variableName);

      const validationRules: any = {};
      if (constraints.min) validationRules.min = parseFloat(constraints.min);
      if (constraints.max) validationRules.max = parseFloat(constraints.max);
      // Note: Unit information is now stored in variable_units table instead of validation_rules

      // Get category based on unit selection - use the first selected unit for category
      const unitCategory =
        selectedUnitIds.length > 0
          ? availableUnits.find((u) => u.id === selectedUnitIds[0])
              ?.unit_group || null
          : null;

      // Generate unit configuration using the new utility
      const unitConfig = generateVariableUnitConfig(
        unit || "units",
        constraints.type
      );

      const variableData = {
        slug,
        label: variableName,
        description: description || null,
        icon,
        data_type: constraints.type,
        validation_rules:
          Object.keys(validationRules).length > 0 ? validationRules : null,
        // Remove old unit system fields - now using variable_units table
        source_type: source,
        category: unitCategory,
        is_public: isShared,
        created_by: user.id,
        is_active: true,
      };

      const { data: newVariable, error: variableError } = await supabase
        .from("variables")
        .insert([variableData])
        .select()
        .single();

      if (variableError) {
        throw variableError;
      }

      // Create variable_units relationships for selected units
      if (selectedUnitIds.length > 0) {
        try {
          const unitConfigs = selectedUnitIds.map((unitId, index) => ({
            unitId,
            priority: index + 1,
          }));
          await setVariableUnits(newVariable.id, unitConfigs);
        } catch (unitError) {
          console.error("Failed to create variable units:", unitError);
          // Don't fail the whole operation for this
        }
      } else if (unit) {
        // Fallback: if old unit system was used, try to find matching unit in units table
        const matchingUnit = availableUnits.find(
          (u) =>
            u.id === unit ||
            u.label.toLowerCase() === unit.toLowerCase() ||
            u.symbol === unit
        );
        if (matchingUnit) {
          try {
            await addVariableUnit(newVariable.id, matchingUnit.id, 1);
          } catch (unitError) {
            console.error(
              "Failed to create fallback variable unit:",
              unitError
            );
          }
        }
      }

      // Create user preference for this variable
      const preferenceData = {
        user_id: user.id,
        variable_id: newVariable.id,
        is_shared: isShared,
      };

      const { error: prefError } = await supabase
        .from("user_variable_preferences")
        .insert([preferenceData]);

      if (prefError) {
        console.error("Failed to create user preference:", prefError);
        // Don't fail the whole operation for this
      }

      // Return the new variable in the expected format
      const formattedVariable = {
        id: newVariable.id,
        label: newVariable.label,
        description: newVariable.description,
        icon: newVariable.icon,
        constraints: newVariable.validation_rules,
        data_type: newVariable.data_type,
        source_type: newVariable.source_type,
        category: null,
      };

      onVariableCreated(formattedVariable);
      onClose();
    } catch (error) {
      console.error("Error creating variable:", error);
      setError("Failed to create variable: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <FaPlus />
          Create New Variable
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Basic Information */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
              }}
            >
              <TextField
                fullWidth
                label="Variable Name"
                value={variableName}
                onChange={(e) => setVariableName(e.target.value)}
                required
                inputProps={{ maxLength: 100 }}
                helperText={`${variableName.length}/100 characters. You can use any symbols and spaces.`}
              />
              
              {variableName && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Slug: {createPermissiveSlug(variableName)}
                </Typography>
              )}

              <TextField
                fullWidth
                label="Icon"
                value={icon}
                helperText="Click to choose an emoji"
                InputProps={{
                  readOnly: true,
                  sx: { cursor: "pointer" },
                }}
                onClick={(e) => setEmojiAnchor(e.currentTarget)}
              />
            </Box>

            <Popover
              open={Boolean(emojiAnchor)}
              anchorEl={emojiAnchor}
              onClose={() => setEmojiAnchor(null)}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
            >
              <Box sx={{ p: 2, maxWidth: 350 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Choose an emoji:
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {EMOJI_OPTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      onClick={() => handleEmojiSelect(emoji)}
                      sx={{
                        minWidth: 40,
                        height: 40,
                        fontSize: "1.2em",
                        border:
                          icon === emoji
                            ? "2px solid #1976d2"
                            : "1px solid #e0e0e0",
                        "&:hover": {
                          backgroundColor: "#f5f5f5",
                        },
                      }}
                    >
                      {emoji}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Popover>

            <Box>
              <TextField
                fullWidth
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
                helperText="Brief description of what this variable tracks"
              />
            </Box>

            {/* Data Type and Constraints */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Data Type & Rules
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Data Type</InputLabel>
                  <Select
                    value={constraints.type}
                    label="Data Type"
                    onChange={(e) =>
                      setConstraints((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="continuous">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <span>📊</span>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Continuous (Numbers)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Numeric values with units
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                    <MenuItem value="categorical">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <span>📋</span>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Categorical (Options)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Select from predefined choices
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                    <MenuItem value="boolean">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <span>🔘</span>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Boolean (Yes/No)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            True/False, Yes/No, or 0/1 values
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                    <MenuItem value="text">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <span>📝</span>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Text
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Free-form text entries
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                {/* Enhanced Data Type Info */}
                <Box sx={{ mt: 1, p: 1.5, bgcolor: "grey.50", borderRadius: 1, border: "1px solid", borderColor: "grey.200" }}>
                  <Typography variant="caption" color="text.secondary">
                    {constraints.type === "continuous" && (
                      <>
                        📊 <strong>Continuous:</strong> Numeric values with units (weight, time, rating, etc.)
                        <br />
                        <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>
                          Examples: 75 kg, 8.5 hours, 7/10 rating
                        </span>
                      </>
                    )}
                    {constraints.type === "categorical" && (
                      <>
                        📋 <strong>Categorical:</strong> Select from predefined options (mood level, exercise type, etc.)
                        <br />
                        <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>
                          Examples: Happy/Sad/Angry, Running/Swimming/Cycling
                        </span>
                      </>
                    )}
                    {constraints.type === "boolean" && (
                      <>
                        🔘 <strong>Boolean:</strong> Yes/No, True/False, or 0/1 values
                        <br />
                        <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>
                          Examples: Did you exercise today? Yes/No
                        </span>
                      </>
                    )}
                    {constraints.type === "text" && (
                      <>
                        📝 <strong>Text:</strong> Free-form text entries (notes, descriptions, etc.)
                        <br />
                        <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>
                          Examples: "Felt great today", "Notes about workout"
                        </span>
                      </>
                    )}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Available Units for this Variable</InputLabel>
                  <Select
                    multiple
                    value={selectedUnitIds}
                    onChange={(e) =>
                      setSelectedUnitIds(e.target.value as string[])
                    }
                    label="Available Units for this Variable"
                    disabled={unitsLoading}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 400,
                          overflowY: 'auto',
                        },
                      },
                    }}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {(selected as string[]).map((unitId) => {
                          const unit = availableUnits.find(
                            (u) => u.id === unitId
                          );
                          return (
                            <Chip
                              key={unitId}
                              label={
                                unit ? `${unit.label} (${unit.symbol})` : unitId
                              }
                              size="small"
                              color="primary"
                              variant="filled"
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {(() => {
                      const filteredUnits = availableUnits.filter((unit) => {
                        // Filter units based on data type compatibility
                        if (constraints.type === "boolean") {
                          return unit.unit_group === "boolean";
                        } else if (constraints.type === "categorical") {
                          return [
                            "option",
                            "choice",
                            "level",
                            "type",
                            "category",
                          ].includes(unit.id);
                        } else if (constraints.type === "text") {
                          return ["characters", "words"].includes(unit.id);
                        } else if (constraints.type === "continuous") {
                          return unit.unit_group !== "boolean";
                        }
                        return true;
                      });

                      // Group units by unit_group for better organization
                      const groupedUnits = filteredUnits.reduce((groups, unit) => {
                        const group = unit.unit_group;
                        if (!groups[group]) {
                          groups[group] = [];
                        }
                        groups[group].push(unit);
                        return groups;
                      }, {} as Record<string, typeof filteredUnits>);

                      return Object.entries(groupedUnits).map(([groupName, units]) => [
                        <ListSubheader 
                          key={`header-${groupName}`} 
                          onClick={() => handleCategorySelect(groupName, units)}
                          sx={{ 
                            backgroundColor: "#ffd700", 
                            color: "black",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            userSelect: "none",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            "&:hover": {
                              backgroundColor: "#ffed4e",
                            },
                            transition: "background-color 0.2s ease"
                          }}
                        >
                          <span>{groupName} Units</span>
                          <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>
                            {(() => {
                              const categoryUnitIds = units.map(unit => unit.id);
                              const selectedInCategory = categoryUnitIds.filter(id => selectedUnitIds.includes(id)).length;
                              const totalInCategory = categoryUnitIds.length;
                              
                              if (selectedInCategory === 0) {
                                return "Click to select all";
                              } else if (selectedInCategory === totalInCategory) {
                                return "✓ All selected";
                              } else {
                                return `${selectedInCategory}/${totalInCategory} selected`;
                              }
                            })()}
                          </span>
                        </ListSubheader>,
                        ...units.map((unit) => (
                          <MenuItem key={unit.id} value={unit.id}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                width: "100%",
                              }}
                            >
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {unit.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Symbol: {unit.symbol}
                                </Typography>
                              </Box>
                              <Chip
                                label={unit.unit_group}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            </Box>
                          </MenuItem>
                        ))
                      ]).flat();
                    })()}
                  </Select>
                </FormControl>

                {/* Enhanced Unit Compatibility Info */}
                {selectedUnitIds.length > 0 && (
                  <Box
                    sx={{ 
                      mt: 1, 
                      p: 1.5, 
                      bgcolor: "grey.50", 
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "grey.200"
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mb: 0.5, fontWeight: 600 }}
                    >
                      💡 <strong>Selected Units:</strong>{" "}
                      {selectedUnitIds.length} unit
                      {selectedUnitIds.length !== 1 ? "s" : ""}
                    </Typography>

                    {(() => {
                      const selectedUnits = availableUnits.filter((u) =>
                        selectedUnitIds.includes(u.id)
                      );
                      const unitGroups = [
                        ...new Set(selectedUnits.map((u) => u.unit_group)),
                      ];

                      if (unitGroups.length === 1 && selectedUnits.length > 1) {
                        return (
                          <Typography
                            variant="caption"
                            color="success.main"
                            sx={{ display: "block", mb: 0.5, fontWeight: 500 }}
                          >
                            🔄 <strong>Convertible:</strong> All selected units
                            can convert between each other
                          </Typography>
                        );
                      } else if (unitGroups.length > 1) {
                        return (
                          <Typography
                            variant="caption"
                            color="warning.main"
                            sx={{ display: "block", mb: 0.5, fontWeight: 500 }}
                          >
                            ⚠️ <strong>Mixed Groups:</strong> Units from
                            different groups cannot convert between each other
                          </Typography>
                        );
                      } else {
                        return (
                          <Typography
                            variant="caption"
                            color="info.main"
                            sx={{ display: "block", mb: 0.5, fontWeight: 500 }}
                          >
                            📊 <strong>Single Unit:</strong> This will be the
                            primary unit for the variable
                          </Typography>
                        );
                      }
                    })()}

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", fontSize: "0.65rem" }}
                    >
                      ℹ️ The first selected unit will be the primary unit. Users
                      can switch between selected units when logging data.
                    </Typography>
                  </Box>
                )}

                {/* Unit Selection Help */}
                {selectedUnitIds.length === 0 && (
                  <Box
                    sx={{ 
                      mt: 1, 
                      p: 1.5, 
                      bgcolor: "info.50", 
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "info.200"
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="info.main"
                      sx={{ display: "block", fontWeight: 500 }}
                    >
                      💡 <strong>Tip:</strong> Select one or more units that users can choose from when logging data for this variable.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {constraints.type === "continuous" && (
              <>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Value Range
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Set the minimum and maximum allowed values for this variable. This helps validate user input and provides guidance.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="Minimum Value"
                      type="number"
                      value={constraints.min}
                      onChange={(e) =>
                        setConstraints((prev) => ({
                          ...prev,
                          min: e.target.value,
                        }))
                      }
                      helperText={
                        selectedUnitIds.length > 0
                          ? `Minimum allowed value (using selected units)`
                          : "Minimum allowed value"
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography variant="body2" color="text.secondary">
                              Min
                            </Typography>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="Maximum Value"
                      type="number"
                      value={constraints.max}
                      onChange={(e) =>
                        setConstraints((prev) => ({
                          ...prev,
                          max: e.target.value,
                        }))
                      }
                      helperText={
                        selectedUnitIds.length > 0
                          ? `Maximum allowed value (using selected units)`
                          : "Maximum allowed value"
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography variant="body2" color="text.secondary">
                              Max
                            </Typography>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                </Box>

                {/* Value Range Help */}
                <Box
                  sx={{ 
                    mt: 1, 
                    p: 1.5, 
                    bgcolor: "warning.50", 
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "warning.200"
                  }}
                >
                  <Typography
                    variant="caption"
                    color="warning.main"
                    sx={{ display: "block", fontWeight: 500 }}
                  >
                    ⚠️ <strong>Optional:</strong> Leave empty to allow any value. Setting min/max helps validate user input and provides better data quality.
                  </Typography>
                </Box>
              </>
            )}

            {/* Source */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Source
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                How data for this variable will be collected.
              </Typography>
            </Box>

            <Box>
              <FormControl fullWidth>
                <InputLabel>Source Type</InputLabel>
                <Select
                  value={source}
                  label="Source Type"
                  onChange={(e) => setSource(e.target.value)}
                  disabled
                >
                  <MenuItem value="manual">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span>✏️</span>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Manual Entry
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Users manually enter data
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Sharing Settings */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Privacy & Sharing
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Control who can see this variable and its data.
              </Typography>
            </Box>

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={isShared}
                    onChange={(e) => setIsShared(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    {isShared ? <FaGlobe /> : <FaLock />}
                    <Typography>
                      {isShared
                        ? "Make this variable available to all users"
                        : "Keep this variable private to you"}
                    </Typography>
                  </Box>
                }
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {isShared
                  ? "Other users will be able to select and use this variable for their own tracking. This helps build a comprehensive community database."
                  : "Only you will be able to use this variable. You can make it public later if you change your mind."}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !variableName.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : <FaPlus />}
        >
          {loading ? "Creating..." : "Create Variable"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
