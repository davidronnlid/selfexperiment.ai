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
import { FaGlobe, FaLock, FaPlus, FaQuestion, FaSmile, FaGripVertical } from "react-icons/fa";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import { supabase } from "@/utils/supaBase";
import {
  generateVariableUnitConfig,
  getUnitDisplayInfo,
} from "../utils/unitGroupUtils";
import { addVariableUnit, setVariableUnits, reorderVariableUnits } from "../utils/variableUnitsUtils";
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



// Sortable Unit Chip Component
interface SortableUnitChipProps {
  unitId: string;
  unit: Unit | undefined;
  onRemove: (unitId: string) => void;
  isPrimary: boolean;
}

function SortableUnitChip({ unitId, unit, onRemove, isPrimary }: SortableUnitChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unitId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        borderRadius: 1,
        border: "1px solid",
        borderColor: isPrimary ? "primary.main" : "grey.300",
        backgroundColor: isPrimary ? "primary.50" : "background.paper",
        cursor: isDragging ? "grabbing" : "grab",
        "&:hover": {
          borderColor: "primary.main",
          backgroundColor: "primary.50",
        },
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          display: "flex",
          alignItems: "center",
          cursor: "grab",
          color: "text.secondary",
          "&:hover": { color: "primary.main" },
        }}
      >
        <FaGripVertical />
      </Box>
      
      <Chip
        label={unit ? `${unit.label} (${unit.symbol})` : unitId}
        size="small"
        color={isPrimary ? "primary" : "default"}
        variant={isPrimary ? "filled" : "outlined"}
        onDelete={() => onRemove(unitId)}
        sx={{ flex: 1 }}
      />
      
      {isPrimary && (
        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, fontSize: "0.65rem" }}>
          PRIMARY
        </Typography>
      )}
    </Box>
  );
}



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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering units
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSelectedUnitIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over?.id as string);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Remove unit from selection
  const handleRemoveUnit = (unitId: string) => {
    setSelectedUnitIds(prev => prev.filter(id => id !== unitId));
  };

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

      setSource("manual");
      setIsShared(true);
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

  // Clear invalid units when data type changes or when availableUnits loads
  useEffect(() => {
    if (selectedUnitIds.length > 0 && availableUnits.length > 0) {
      const validUnitIds = selectedUnitIds.filter((unitId) => {
        const unit = availableUnits.find((u) => u.id === unitId);
        if (!unit) {
          console.log(`🚨 Removing invalid unit ID "${unitId}" from selectedUnitIds`);
          return false;
        }

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
        console.log(`🔧 Cleaning selectedUnitIds: ${selectedUnitIds.length} → ${validUnitIds.length}`);
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

  // Clean up selectedUnitIds when availableUnits first loads
  useEffect(() => {
    if (availableUnits.length > 0 && selectedUnitIds.length > 0) {
      const existingUnitIds = selectedUnitIds.filter(unitId => 
        availableUnits.some(unit => unit.id === unitId)
      );
      
      if (existingUnitIds.length !== selectedUnitIds.length) {
        console.log(`🧹 Initial cleanup of selectedUnitIds after units loaded`);
        setSelectedUnitIds(existingUnitIds);
      }
    }
  }, [availableUnits]);

  // Handle category selection - select all units in a category
  const handleCategorySelect = (e: React.MouseEvent, categoryName: string, categoryUnits: typeof availableUnits) => {
    e.preventDefault();
    e.stopPropagation();
    
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



  const handleEmojiSelect = (emoji: string) => {
    setIcon(emoji);
    setEmojiAnchor(null);
  };

  // Helper function to get unit category
  const getUnitCategory = (unitValue: string): string | null => {
    if (!unitValue) return null;

    // Check database units first
    const unitOption = availableUnits.find((unit) => unit.id === unitValue);
    if (unitOption) {
      return unitOption.unit_group;
    }

    // Check custom units from localStorage
    const customUnits = localStorage.getItem("customUnits");
    if (customUnits) {
      try {
        const parsedCustomUnits = JSON.parse(customUnits);
        const customUnit = parsedCustomUnits.find(
          (u: any) => u.id === unitValue
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
        "units",
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
                  <Typography variant="caption" color="black">
                    {constraints.type === "continuous" && (
                      <>
                        📊 <strong>Continuous:</strong> Numeric values with units (weight, time, rating, etc.)
                        <br />
                        <span style={{ fontSize: "0.7rem", color: "black" }}>
                          Examples: 75 kg, 8.5 hours, 7/10 rating
                        </span>
                      </>
                    )}
                    {constraints.type === "categorical" && (
                      <>
                        📋 <strong>Categorical:</strong> Select from predefined options (mood level, exercise type, etc.)
                        <br />
                        <span style={{ fontSize: "0.7rem", color: "black" }}>
                          Examples: Happy/Sad/Angry, Running/Swimming/Cycling
                        </span>
                      </>
                    )}
                    {constraints.type === "boolean" && (
                      <>
                        🔘 <strong>Boolean:</strong> Yes/No, True/False, or 0/1 values
                        <br />
                        <span style={{ fontSize: "0.7rem", color: "black" }}>
                          Examples: Did you exercise today? Yes/No
                        </span>
                      </>
                    )}
                    {constraints.type === "text" && (
                      <>
                        📝 <strong>Text:</strong> Free-form text entries (notes, descriptions, etc.)
                        <br />
                        <span style={{ fontSize: "0.7rem", color: "black" }}>
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
                    value={selectedUnitIds.filter(unitId => {
                      // Only include unit IDs that exist in the currently filtered units
                      const filteredUnits = availableUnits.filter((unit) => {
                        if (constraints.type === "boolean") {
                          return unit.unit_group === "boolean";
                        } else if (constraints.type === "categorical") {
                          return ["option", "choice", "level", "type", "category"].includes(unit.id);
                        } else if (constraints.type === "text") {
                          return ["characters", "words"].includes(unit.id);
                        } else if (constraints.type === "continuous") {
                          return unit.unit_group !== "boolean";
                        }
                        return true;
                      });
                      return filteredUnits.some(unit => unit.id === unitId);
                    })}
                    onChange={(e) =>
                      setSelectedUnitIds(e.target.value as string[])
                    }
                    label="Available Units for this Variable"
                    disabled={unitsLoading}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 400,
                          overflow: 'auto',
                        },
                      },
                      MenuListProps: {
                        style: {
                          maxHeight: 380,
                          overflowY: 'auto',
                        },
                      },
                    }}
                    renderValue={(selected) => {
                      if (unitsLoading) {
                        return (
                          <Typography variant="body2" color="text.secondary">
                            Loading units...
                          </Typography>
                        );
                      }
                      
                      const validSelected = (selected as string[]).filter(unitId =>
                        availableUnits.some(unit => unit.id === unitId)
                      );
                      
                      return (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {validSelected.length} unit{validSelected.length !== 1 ? 's' : ''} selected
                          </Typography>
                          {validSelected.length > 0 && (
                            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                              (Drag to reorder below)
                            </Typography>
                          )}
                        </Box>
                      );
                    }}
                  >
                    {(() => {
                      // Show loading state when units are being fetched
                      if (unitsLoading) {
                        return [
                          <MenuItem key="loading" disabled>
                            <Typography variant="body2" color="text.secondary">
                              Loading units...
                            </Typography>
                          </MenuItem>
                        ];
                      }

                      // Show message when no units are available
                      if (availableUnits.length === 0) {
                        return [
                          <MenuItem key="no-units" disabled>
                            <Typography variant="body2" color="text.secondary">
                              No units available. Please try refreshing the page.
                            </Typography>
                          </MenuItem>
                        ];
                      }

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

                      // Show message when no units match the current data type
                      if (filteredUnits.length === 0) {
                        return [
                          <MenuItem key="no-compatible-units" disabled>
                            <Typography variant="body2" color="text.secondary">
                              No units available for {constraints.type} data type.
                            </Typography>
                          </MenuItem>
                        ];
                      }

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
                          onClick={(e) => handleCategorySelect(e, groupName, units)}
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
                            transition: "background-color 0.2s ease",
                            position: "sticky",
                            top: 0,
                            zIndex: 1,
                            borderBottom: "1px solid rgba(0,0,0,0.1)"
                          }}
                          title="Click to select/deselect all units in this category"
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

                {/* Sortable Selected Units */}
                {selectedUnitIds.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: "text.primary" }}>
                      Selected Units (Drag to reorder, first = primary):
                    </Typography>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={selectedUnitIds}
                        strategy={verticalListSortingStrategy}
                      >
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {selectedUnitIds.map((unitId, index) => {
                            const unit = availableUnits.find(u => u.id === unitId);
                            return (
                              <SortableUnitChip
                                key={unitId}
                                unitId={unitId}
                                unit={unit}
                                onRemove={handleRemoveUnit}
                                isPrimary={index === 0}
                              />
                            );
                          })}
                        </Box>
                      </SortableContext>
                    </DndContext>
                  </Box>
                )}

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
                      color="text.primary"
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
                      color="text.primary"
                      sx={{ display: "block", fontSize: "0.75rem", opacity: 0.8 }}
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
                    {(() => {
                      const primaryUnit = availableUnits.find(unit => unit.id === selectedUnitIds[0]);
                      return primaryUnit ? (
                        <Chip 
                          label={`${primaryUnit.label} (${primaryUnit.symbol})`}
                          size="small" 
                          color="primary" 
                          variant="outlined"
                          sx={{ ml: 2, fontSize: "0.7rem" }}
                        />
                      ) : null;
                    })()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {(() => {
                      const primaryUnit = availableUnits.find(unit => unit.id === selectedUnitIds[0]);
                      if (primaryUnit) {
                        return `Set the minimum and maximum allowed values in ${primaryUnit.label} (${primaryUnit.symbol}). This helps validate user input and provides guidance.`;
                      }
                      return "Set the minimum and maximum allowed values for this variable. Please select units first to specify the range.";
                    })()}
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
                      label={(() => {
                        const primaryUnit = availableUnits.find(unit => unit.id === selectedUnitIds[0]);
                        return primaryUnit ? `Minimum Value (${primaryUnit.symbol})` : "Minimum Value";
                      })()}
                      type="number"
                      value={constraints.min}
                      onChange={(e) =>
                        setConstraints((prev) => ({
                          ...prev,
                          min: e.target.value,
                        }))
                      }
                      helperText={(() => {
                        const primaryUnit = availableUnits.find(unit => unit.id === selectedUnitIds[0]);
                        if (primaryUnit) {
                          return `Minimum allowed value in ${primaryUnit.label}`;
                        } else if (selectedUnitIds.length > 0) {
                          return "Minimum allowed value (select primary unit first)";
                        }
                        return "Minimum allowed value";
                      })()}
                      disabled={selectedUnitIds.length === 0}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography variant="body2" color="text.secondary">
                              Min
                            </Typography>
                          </InputAdornment>
                        ),
                        endAdornment: (() => {
                          const primaryUnit = availableUnits.find(unit => unit.id === selectedUnitIds[0]);
                          return primaryUnit ? (
                            <InputAdornment position="end">
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {primaryUnit.symbol}
                              </Typography>
                            </InputAdornment>
                          ) : null;
                        })(),
                      }}
                    />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label={(() => {
                        const primaryUnit = availableUnits.find(unit => unit.id === selectedUnitIds[0]);
                        return primaryUnit ? `Maximum Value (${primaryUnit.symbol})` : "Maximum Value";
                      })()}
                      type="number"
                      value={constraints.max}
                      onChange={(e) =>
                        setConstraints((prev) => ({
                          ...prev,
                          max: e.target.value,
                        }))
                      }
                      helperText={(() => {
                        const primaryUnit = availableUnits.find(unit => unit.id === selectedUnitIds[0]);
                        if (primaryUnit) {
                          return `Maximum allowed value in ${primaryUnit.label}`;
                        } else if (selectedUnitIds.length > 0) {
                          return "Maximum allowed value (select primary unit first)";
                        }
                        return "Maximum allowed value";
                      })()}
                      disabled={selectedUnitIds.length === 0}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography variant="body2" color="text.secondary">
                              Max
                            </Typography>
                          </InputAdornment>
                        ),
                        endAdornment: (() => {
                          const primaryUnit = availableUnits.find(unit => unit.id === selectedUnitIds[0]);
                          return primaryUnit ? (
                            <InputAdornment position="end">
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {primaryUnit.symbol}
                              </Typography>
                            </InputAdornment>
                          ) : null;
                        })(),
                      }}
                    />
                  </Box>
                </Box>

                {/* Value Range Help */}
                {selectedUnitIds.length > 0 ? (
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
                      sx={{ display: "block", fontWeight: 500, mb: 0.5 }}
                    >
                      🎯 <strong>Primary Unit:</strong> {(() => {
                        const primaryUnit = availableUnits.find(unit => unit.id === selectedUnitIds[0]);
                        return primaryUnit ? `${primaryUnit.label} (${primaryUnit.symbol})` : "First selected unit";
                      })()} will be used for range validation.
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", fontSize: "0.65rem" }}
                    >
                      💡 Leave empty to allow any value. Setting min/max helps validate user input and provides better data quality.
                    </Typography>
                  </Box>
                ) : (
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
                      ⚠️ <strong>Select units first:</strong> Choose units for this variable to set appropriate min/max value ranges.
                    </Typography>
                  </Box>
                )}
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
                      <span>🏥</span>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Modular Health
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Users can track this variable manually or automate their tracking of it
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
