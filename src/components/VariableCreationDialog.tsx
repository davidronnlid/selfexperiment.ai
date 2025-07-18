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
} from "@mui/material";
import { FaGlobe, FaLock, FaPlus, FaQuestion, FaSmile } from "react-icons/fa";
import { supabase } from "@/utils/supaBase";
import UnitInput from "./UnitInput";
import {
  generateVariableUnitConfig,
  getUnitDisplayInfo,
} from "../utils/unitGroupUtils";

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
    }
  }, [open, initialVariableName]);

  // Clear unit when data type changes to prevent invalid unit-datatype combinations
  useEffect(() => {
    if (unit) {
      const availableUnits = getAvailableUnits(constraints.type);
      const isUnitValid = availableUnits.some((u) => u.value === unit);
      if (!isUnitValid) {
        setUnit("");
        setConstraints((prev) => ({
          ...prev,
          min: "",
          max: "",
        }));
      }
    }
  }, [constraints.type, unit]);

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
      // Import content moderation
      const {
        validateVariableName,
        moderateContent,
        checkRateLimit,
        suggestVariableImprovements,
      } = await import("@/utils/contentModeration");

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
      const slug = variableName.toLowerCase().replace(/\s+/g, "-");

      const validationRules: any = {};
      if (constraints.min) validationRules.min = parseFloat(constraints.min);
      if (constraints.max) validationRules.max = parseFloat(constraints.max);
      if (unit) validationRules.unit = unit;

      // Get category based on unit selection
      const unitCategory = getUnitCategory(unit);

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
        canonical_unit: unitConfig.canonical_unit,
        unit_group: unitConfig.unit_group,
        convertible_units: unitConfig.convertible_units,
        default_display_unit: unitConfig.default_display_unit,
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
                helperText="This will be the display name for your variable"
              />

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
              <Box>
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
                      📊 Continuous (Numbers)
                    </MenuItem>
                    <MenuItem value="categorical">
                      📋 Categorical (Options)
                    </MenuItem>
                    <MenuItem value="boolean">🔘 Boolean (Yes/No)</MenuItem>
                    <MenuItem value="text">📝 Text</MenuItem>
                  </Select>
                </FormControl>

                {/* Data Type Info */}
                <Box sx={{ mt: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {constraints.type === "continuous" && (
                      <>
                        📊 <strong>Continuous:</strong> Numeric values with
                        units (weight, time, rating, etc.)
                      </>
                    )}
                    {constraints.type === "categorical" && (
                      <>
                        📋 <strong>Categorical:</strong> Select from predefined
                        options (mood level, exercise type, etc.)
                      </>
                    )}
                    {constraints.type === "boolean" && (
                      <>
                        🔘 <strong>Boolean:</strong> Yes/No, True/False, or 0/1
                        values
                      </>
                    )}
                    {constraints.type === "text" && (
                      <>
                        📝 <strong>Text:</strong> Free-form text entries (notes,
                        descriptions, etc.)
                      </>
                    )}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <UnitInput
                  value={unit}
                  onChange={handleUnitChange}
                  dataType={constraints.type}
                  label="Unit"
                  placeholder="Select or type a unit..."
                  fullWidth
                />

                {/* Unit Compatibility Info */}
                {unit && (
                  <Box
                    sx={{ mt: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mb: 0.5 }}
                    >
                      💡 <strong>Selected Unit:</strong> {unit}
                    </Typography>

                    {getUnitCategory(unit) && (
                      <Typography
                        variant="caption"
                        color="primary.main"
                        sx={{ display: "block", mb: 0.5 }}
                      >
                        📁 Category: {getUnitCategory(unit)}
                      </Typography>
                    )}

                    {(() => {
                      const unitDisplayInfo = getUnitDisplayInfo(unit);
                      if (unitDisplayInfo.isConvertible) {
                        return (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography
                              variant="caption"
                              color="success.main"
                              sx={{ display: "block", mb: 0.5 }}
                            >
                              🔄 <strong>Convertible to:</strong>{" "}
                              {unitDisplayInfo.convertibleUnits.join(", ")}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.65rem" }}
                            >
                              ℹ️ Users can switch between these units and values
                              will convert automatically
                            </Typography>
                            {unitDisplayInfo.group && (
                              <Typography
                                variant="caption"
                                color="info.main"
                                sx={{
                                  display: "block",
                                  fontSize: "0.65rem",
                                  mt: 0.5,
                                }}
                              >
                                {unitDisplayInfo.icon} <strong>Group:</strong>{" "}
                                {unitDisplayInfo.group.name}
                              </Typography>
                            )}
                          </Box>
                        );
                      } else {
                        return (
                          <Typography
                            variant="caption"
                            color="warning.main"
                            sx={{ display: "block", fontSize: "0.65rem" }}
                          >
                            ⚠️ This unit may not have automatic conversions
                            available
                          </Typography>
                        );
                      }
                    })()}
                  </Box>
                )}
              </Box>
            </Box>

            {constraints.type === "continuous" && (
              <>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                  }}
                >
                  <TextField
                    fullWidth
                    label={
                      unit &&
                      !getAvailableUnits(constraints.type).find(
                        (u) => u.value === unit
                      )
                        ? "Minimum Characters"
                        : "Minimum Value"
                    }
                    type="number"
                    value={constraints.min}
                    onChange={(e) =>
                      setConstraints((prev) => ({
                        ...prev,
                        min: e.target.value,
                      }))
                    }
                    helperText={
                      unit &&
                      !getAvailableUnits(constraints.type).find(
                        (u) => u.value === unit
                      )
                        ? "Minimum number of characters"
                        : "Minimum allowed value"
                    }
                  />

                  <TextField
                    fullWidth
                    label={
                      unit &&
                      !getAvailableUnits(constraints.type).find(
                        (u) => u.value === unit
                      )
                        ? "Maximum Characters"
                        : "Maximum Value"
                    }
                    type="number"
                    value={constraints.max}
                    onChange={(e) =>
                      setConstraints((prev) => ({
                        ...prev,
                        max: e.target.value,
                      }))
                    }
                    helperText={
                      unit &&
                      !getAvailableUnits(constraints.type).find(
                        (u) => u.value === unit
                      )
                        ? "Maximum number of characters"
                        : "Maximum allowed value"
                    }
                  />
                </Box>
              </>
            )}

            {/* Source */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Source
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
                  <MenuItem value="manual">Manual Entry</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Sharing Settings */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Privacy & Sharing
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
