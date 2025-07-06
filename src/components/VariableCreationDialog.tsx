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
  Autocomplete,
} from "@mui/material";
import { FaGlobe, FaLock, FaPlus, FaQuestion, FaSmile } from "react-icons/fa";
import { supabase } from "@/utils/supaBase";

interface VariableCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onVariableCreated: (variable: any) => void;
  initialVariableName: string;
  user: any;
}

// Predefined unit options with default min/max values
const UNIT_OPTIONS = [
  {
    value: "kg",
    label: "Kilograms (kg)",
    category: "Weight",
    defaultMin: 0,
    defaultMax: 300,
  },
  {
    value: "lbs",
    label: "Pounds (lbs)",
    category: "Weight",
    defaultMin: 0,
    defaultMax: 660,
  },
  {
    value: "mg",
    label: "Milligrams (mg)",
    category: "Medication/Supplement",
    defaultMin: 0,
    defaultMax: 1000,
  },
  {
    value: "ml",
    label: "Milliliters (ml)",
    category: "Volume",
    defaultMin: 0,
    defaultMax: 5000,
  },
  {
    value: "L",
    label: "Liters (L)",
    category: "Volume",
    defaultMin: 0,
    defaultMax: 10,
  },
  {
    value: "hours",
    label: "Hours",
    category: "Time",
    defaultMin: 0,
    defaultMax: 24,
  },
  {
    value: "minutes",
    label: "Minutes",
    category: "Time",
    defaultMin: 0,
    defaultMax: 1440,
  },
  {
    value: "bpm",
    label: "Beats per minute (bpm)",
    category: "Health",
    defaultMin: 30,
    defaultMax: 220,
  },
  {
    value: "°C",
    label: "Degrees Celsius (°C)",
    category: "Temperature",
    defaultMin: 35,
    defaultMax: 42,
  },
  {
    value: "°F",
    label: "Degrees Fahrenheit (°F)",
    category: "Temperature",
    defaultMin: 95,
    defaultMax: 108,
  },
  {
    value: "steps",
    label: "Steps",
    category: "Activity",
    defaultMin: 0,
    defaultMax: 50000,
  },
  {
    value: "calories",
    label: "Calories",
    category: "Food/Exercise",
    defaultMin: 0,
    defaultMax: 5000,
  },
  {
    value: "mmHg",
    label: "mmHg (Blood Pressure)",
    category: "Health",
    defaultMin: 60,
    defaultMax: 200,
  },
  {
    value: "rating",
    label: "Rating/Score",
    category: "Subjective",
    defaultMin: 1,
    defaultMax: 10,
  },
  {
    value: "percentage",
    label: "Percentage (%)",
    category: "General",
    defaultMin: 0,
    defaultMax: 100,
  },
  {
    value: "units",
    label: "Units (generic)",
    category: "General",
    defaultMin: 0,
    defaultMax: 100,
  },
];

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
    scaleMin: "",
    scaleMax: "",
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
        scaleMin: "",
        scaleMax: "",
        type: "continuous",
      });
      setIcon("📊");
      setError("");
      setEmojiAnchor(null);
    }
  }, [open, initialVariableName]);

  const handleUnitChange = (selectedUnit: string | null) => {
    const unitValue = selectedUnit || "";
    setUnit(unitValue);

    // Find the unit option and set default min/max values
    const unitOption = UNIT_OPTIONS.find((opt) => opt.value === unitValue);
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

  const handleSubmit = async () => {
    if (!variableName.trim()) {
      setError("Variable name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create the variable in the universal variables system
      const slug = variableName.toLowerCase().replace(/\s+/g, "_");

      const validationRules: any = {};
      if (constraints.min) validationRules.min = parseFloat(constraints.min);
      if (constraints.max) validationRules.max = parseFloat(constraints.max);
      if (constraints.scaleMin)
        validationRules.scaleMin = parseFloat(constraints.scaleMin);
      if (constraints.scaleMax)
        validationRules.scaleMax = parseFloat(constraints.scaleMax);
      if (unit) validationRules.unit = unit;

      const variableData = {
        slug,
        label: variableName,
        description: description || null,
        icon,
        data_type: constraints.type,
        validation_rules:
          Object.keys(validationRules).length > 0 ? validationRules : null,
        canonical_unit: unit || null,
        source_type: source,
        category: null,
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
        is_tracked: true,
        is_favorite: false,
        display_order: 0,
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
                  <MenuItem value="continuous">Continuous (Numbers)</MenuItem>
                  <MenuItem value="categorical">Categorical (Options)</MenuItem>
                  <MenuItem value="boolean">Boolean (Yes/No)</MenuItem>
                  <MenuItem value="text">Text</MenuItem>
                </Select>
              </FormControl>

              <Autocomplete
                fullWidth
                freeSolo
                value={unit}
                onChange={(event, newValue) => handleUnitChange(newValue)}
                options={UNIT_OPTIONS.map((option) => option.value)}
                groupBy={(option) => {
                  const unitOption = UNIT_OPTIONS.find(
                    (u) => u.value === option
                  );
                  return unitOption ? unitOption.category : "Other";
                }}
                getOptionLabel={(option) => {
                  const unitOption = UNIT_OPTIONS.find(
                    (u) => u.value === option
                  );
                  return unitOption ? unitOption.label : option;
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Unit"
                    helperText="Choose from list or type custom unit"
                  />
                )}
              />
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
                      unit && !UNIT_OPTIONS.find((u) => u.value === unit)
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
                      unit && !UNIT_OPTIONS.find((u) => u.value === unit)
                        ? "Minimum number of characters"
                        : "Minimum allowed value"
                    }
                  />

                  <TextField
                    fullWidth
                    label={
                      unit && !UNIT_OPTIONS.find((u) => u.value === unit)
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
                      unit && !UNIT_OPTIONS.find((u) => u.value === unit)
                        ? "Maximum number of characters"
                        : "Maximum allowed value"
                    }
                  />
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
                    label="Scale Minimum"
                    type="number"
                    value={constraints.scaleMin}
                    onChange={(e) =>
                      setConstraints((prev) => ({
                        ...prev,
                        scaleMin: e.target.value,
                      }))
                    }
                    helperText="e.g., 1 for a 1-10 scale"
                  />

                  <TextField
                    fullWidth
                    label="Scale Maximum"
                    type="number"
                    value={constraints.scaleMax}
                    onChange={(e) =>
                      setConstraints((prev) => ({
                        ...prev,
                        scaleMax: e.target.value,
                      }))
                    }
                    helperText="e.g., 10 for a 1-10 scale"
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
                  ? "Other users will be able to select and use this variable for their own logging. This helps build a comprehensive community database."
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
