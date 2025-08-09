import React, { useState, useEffect } from "react";
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
  Typography,
  Box,
  Alert,
  Chip,
  Grid,
  Switch,
  FormControlLabel,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import { supabase } from "@/utils/supaBase";
import VariableUnitsManager from "./VariableUnitsManager";

interface VariableInfo {
  id: string;
  slug: string;
  label: string;
  description?: string;
  icon?: string;
  data_type: "continuous" | "categorical" | "boolean" | "time" | "text";
  source_type: "manual" | "oura" | "withings" | "apple_health" | "formula" | "calculated";
  category?: string;
  validation_rules?: any;
  is_public: boolean;
  is_active: boolean;
  display_order?: number;
  created_at: string;
  updated_at: string;
  convertible_units?: string[];
}

interface VariableAdminEditorProps {
  variable: VariableInfo;
  open: boolean;
  onClose: () => void;
  onSave: (updatedVariable: VariableInfo) => void;
}

export default function VariableAdminEditor({
  variable,
  open,
  onClose,
  onSave,
}: VariableAdminEditorProps) {
  const [editedVariable, setEditedVariable] = useState<VariableInfo>(variable);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [unitsManagerOpen, setUnitsManagerOpen] = useState(false);

  // Reset form when variable changes
  useEffect(() => {
    setEditedVariable(variable);
    setError(null);
    setSuccess(null);
  }, [variable]);

  // Load available units
  useEffect(() => {
    const loadUnits = async () => {
      try {
        const { data: units, error } = await supabase
          .from("units")
          .select("id, symbol, name")
          .eq("is_active", true)
          .order("name");

        if (!error && units) {
          setAvailableUnits(units);
        }
      } catch (err) {
        console.error("Error loading units:", err);
      }
    };

    if (open) {
      loadUnits();
    }
  }, [open]);

  const handleInputChange = (field: keyof VariableInfo, value: any) => {
    setEditedVariable(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!editedVariable.label || !editedVariable.slug) {
      setError("Label and slug are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("variables")
        .update({
          label: editedVariable.label,
          slug: editedVariable.slug,
          description: editedVariable.description,
          icon: editedVariable.icon,
          data_type: editedVariable.data_type,
          source_type: editedVariable.source_type,
          category: editedVariable.category,
          is_public: editedVariable.is_public,
          is_active: editedVariable.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editedVariable.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess("Variable updated successfully!");
      onSave(editedVariable);
      
      // Close dialog after short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error("Error updating variable:", err);
      setError(err.message || "Failed to update variable");
    } finally {
      setLoading(false);
    }
  };

  const dataTypeOptions = [
    { value: "continuous", label: "Continuous (numbers)" },
    { value: "categorical", label: "Categorical (categories)" },
    { value: "boolean", label: "Boolean (true/false)" },
    { value: "time", label: "Time" },
    { value: "text", label: "Text" },
  ];

  const sourceTypeOptions = [
    { value: "manual", label: "Manual" },
    { value: "oura", label: "Oura Ring" },
    { value: "withings", label: "Withings" },
    { value: "apple_health", label: "Apple Health" },
    { value: "formula", label: "Formula" },
    { value: "calculated", label: "Calculated" },
  ];

  const categoryOptions = [
    "Health",
    "Fitness",
    "Sleep",
    "Nutrition",
    "Mental Health",
    "Productivity",
    "Lifestyle",
    "Environment",
    "Social",
    "Other"
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="h2">
          🔧 Edit Variable: {variable.label}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Admin panel for editing variable properties
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Basic Information
            </Typography>
            
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2 }}>
              <TextField
                label="Label"
                value={editedVariable.label}
                onChange={(e) => handleInputChange("label", e.target.value)}
                fullWidth
                required
                helperText="Display name for the variable"
              />

              <TextField
                label="Slug"
                value={editedVariable.slug}
                onChange={(e) => handleInputChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                fullWidth
                required
                helperText="URL-friendly identifier"
              />
            </Box>

            <TextField
              label="Description"
              value={editedVariable.description || ""}
              onChange={(e) => handleInputChange("description", e.target.value)}
              fullWidth
              multiline
              rows={3}
              helperText="Detailed description of the variable"
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Icon"
                value={editedVariable.icon || ""}
                onChange={(e) => handleInputChange("icon", e.target.value)}
                fullWidth
                helperText="Emoji or icon character"
                placeholder="📊"
              />
            </Box>
          </Box>

          {/* Data Configuration */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Data Configuration
            </Typography>
            
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Data Type</InputLabel>
                <Select
                  value={editedVariable.data_type}
                  onChange={(e) => handleInputChange("data_type", e.target.value)}
                  label="Data Type"
                >
                  {dataTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Source Type</InputLabel>
                <Select
                  value={editedVariable.source_type}
                  onChange={(e) => handleInputChange("source_type", e.target.value)}
                  label="Source Type"
                >
                  {sourceTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <Autocomplete
                options={categoryOptions}
                value={editedVariable.category || ""}
                onChange={(_, value) => handleInputChange("category", value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Category"
                    helperText="Variable category"
                  />
                )}
                freeSolo
              />
            </Box>
          </Box>

          {/* Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Settings
            </Typography>
            
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editedVariable.is_public}
                      onChange={(e) => handleInputChange("is_public", e.target.checked)}
                    />
                  }
                  label="Public Variable"
                />
                <Typography variant="body2" color="textSecondary">
                  Visible to all users
                </Typography>
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editedVariable.is_active}
                      onChange={(e) => handleInputChange("is_active", e.target.checked)}
                    />
                  }
                  label="Active"
                />
                <Typography variant="body2" color="textSecondary">
                  Available for use
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={() => setUnitsManagerOpen(true)}
          variant="outlined"
          disabled={loading}
        >
          Manage Units
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
      
      {/* Units Manager Dialog */}
      <VariableUnitsManager
        open={unitsManagerOpen}
        onClose={() => setUnitsManagerOpen(false)}
        variableId={variable.id}
        variableName={variable.label}
      />
    </Dialog>
  );
} 