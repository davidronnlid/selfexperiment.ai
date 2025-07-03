import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Chip,
  Alert,
} from "@mui/material";
import { supabase } from "@/utils/supaBase";

interface VariableConstraint {
  label: string;
  type: "number" | "scale" | "text" | "time" | "yesno" | "dropdown";
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  unit?: string;
  scaleMin?: number;
  scaleMax?: number;
  options?: string[];
}

interface VariableConstraintManagerProps {
  open: boolean;
  onClose: () => void;
  variableLabel: string;
  onSave: (constraints: VariableConstraint) => void;
}

export default function VariableConstraintManager({
  open,
  onClose,
  variableLabel,
  onSave,
}: VariableConstraintManagerProps) {
  const [constraints, setConstraints] = useState<VariableConstraint>({
    label: variableLabel,
    type: "text",
    required: false,
  });
  const [customOptions, setCustomOptions] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleTypeChange = (type: VariableConstraint["type"]) => {
    setConstraints((prev) => ({
      ...prev,
      type,
      // Reset type-specific constraints when type changes
      min: undefined,
      max: undefined,
      scaleMin: undefined,
      scaleMax: undefined,
      options: undefined,
    }));
    setCustomOptions("");
  };

  const handleSave = async () => {
    try {
      // Validate constraints based on type
      if (constraints.type === "number") {
        if (
          constraints.min !== undefined &&
          constraints.max !== undefined &&
          constraints.min > constraints.max
        ) {
          setError("Minimum value cannot be greater than maximum value");
          return;
        }
      }

      if (constraints.type === "scale") {
        if (
          constraints.scaleMin !== undefined &&
          constraints.scaleMax !== undefined &&
          constraints.scaleMin > constraints.scaleMax
        ) {
          setError("Scale minimum cannot be greater than scale maximum");
          return;
        }
      }

      if (constraints.type === "dropdown" && customOptions.trim()) {
        const options = customOptions
          .split(",")
          .map((opt) => opt.trim())
          .filter((opt) => opt);
        if (options.length === 0) {
          setError("Please provide at least one option for dropdown");
          return;
        }
        constraints.options = options;
      }

      // Save to database
      const { error: dbError } = await supabase.from("user_variables").upsert({
        label: variableLabel,
        type: constraints.type,
        constraints: constraints,
        updated_at: new Date().toISOString(),
      });

      if (dbError) {
        setError("Failed to save constraints: " + dbError.message);
        return;
      }

      onSave(constraints);
      onClose();
      setError("");
    } catch (err) {
      setError(
        "Unexpected error: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  const renderTypeSpecificFields = () => {
    switch (constraints.type) {
      case "number":
        return (
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              label="Minimum"
              type="number"
              value={constraints.min || ""}
              onChange={(e) =>
                setConstraints((prev) => ({
                  ...prev,
                  min: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              size="small"
            />
            <TextField
              label="Maximum"
              type="number"
              value={constraints.max || ""}
              onChange={(e) =>
                setConstraints((prev) => ({
                  ...prev,
                  max: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              size="small"
            />
            <TextField
              label="Unit (optional)"
              value={constraints.unit || ""}
              onChange={(e) =>
                setConstraints((prev) => ({ ...prev, unit: e.target.value }))
              }
              size="small"
              placeholder="e.g., mg, hours"
            />
          </Box>
        );

      case "scale":
        return (
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              label="Scale Minimum"
              type="number"
              value={constraints.scaleMin || ""}
              onChange={(e) =>
                setConstraints((prev) => ({
                  ...prev,
                  scaleMin: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              size="small"
            />
            <TextField
              label="Scale Maximum"
              type="number"
              value={constraints.scaleMax || ""}
              onChange={(e) =>
                setConstraints((prev) => ({
                  ...prev,
                  scaleMax: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              size="small"
            />
          </Box>
        );

      case "text":
        return (
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              label="Minimum Length"
              type="number"
              value={constraints.minLength || ""}
              onChange={(e) =>
                setConstraints((prev) => ({
                  ...prev,
                  minLength: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                }))
              }
              size="small"
            />
            <TextField
              label="Maximum Length"
              type="number"
              value={constraints.maxLength || ""}
              onChange={(e) =>
                setConstraints((prev) => ({
                  ...prev,
                  maxLength: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                }))
              }
              size="small"
            />
          </Box>
        );

      case "dropdown":
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Options (comma-separated)"
              value={customOptions}
              onChange={(e) => setCustomOptions(e.target.value)}
              placeholder="Option 1, Option 2, Option 3"
              multiline
              rows={3}
              helperText="Enter options separated by commas"
            />
            {customOptions && (
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Preview:
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                  {customOptions
                    .split(",")
                    .map(
                      (opt, index) =>
                        opt.trim() && (
                          <Chip key={index} label={opt.trim()} size="small" />
                        )
                    )}
                </Box>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Set Constraints for "{variableLabel}"</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth>
            <InputLabel>Variable Type</InputLabel>
            <Select
              value={constraints.type}
              onChange={(e) =>
                handleTypeChange(e.target.value as VariableConstraint["type"])
              }
              label="Variable Type"
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="number">Number</MenuItem>
              <MenuItem value="scale">Scale (1-10)</MenuItem>
              <MenuItem value="time">Time</MenuItem>
              <MenuItem value="yesno">Yes/No</MenuItem>
              <MenuItem value="dropdown">Dropdown</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={constraints.required || false}
                onChange={(e) =>
                  setConstraints((prev) => ({
                    ...prev,
                    required: e.target.checked,
                  }))
                }
              />
            }
            label="Required field"
          />

          {renderTypeSpecificFields()}

          <Box>
            <Typography variant="caption" color="textSecondary">
              These constraints will help ensure data quality and provide better
              validation when logging values for this variable.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Constraints
        </Button>
      </DialogActions>
    </Dialog>
  );
}
