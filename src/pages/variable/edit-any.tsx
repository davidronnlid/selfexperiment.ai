import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useUser } from "../_app";
import { supabase } from "@/utils/supaBase";
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  TextField,
  Chip,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Snackbar,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";

interface Variable {
  id: string;
  label: string;
  slug: string;
  description?: string;
  data_type: string;
  source_type: string;
  category?: string;
}

interface Unit {
  id: string;
  label: string;
  symbol: string;
  unit_group: string;
  is_base: boolean;
  conversion_to?: string;
  conversion_factor?: number;
}

interface VariableUnit {
  variable_id: string;
  unit_id: string;
  priority: number;
  note?: string;
  units?: Unit;
  variables?: Variable;
}

interface UnitGroup {
  name: string;
  units: Unit[];
}

export default function EditAnyVariablePage() {
  const { user, loading: userLoading, username } = useUser();
  const router = useRouter();

  // Access control state
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Data state
  const [variables, setVariables] = useState<Variable[]>([]);
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(
    null
  );
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitGroups, setUnitGroups] = useState<UnitGroup[]>([]);
  const [variableUnits, setVariableUnits] = useState<VariableUnit[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<VariableUnit | null>(null);

  // Form state for add/edit dialogs
  const [selectedUnitGroup, setSelectedUnitGroup] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [priority, setPriority] = useState(1);
  const [note, setNote] = useState("");

  // Check user authorization
  useEffect(() => {
    if (!userLoading) {
      const authorized = username === "davidronnlidmh";
      setIsAuthorized(authorized);
      setAuthChecked(true);

      if (!authorized) {
        setError(
          "Access denied. This page is only available to davidronnlidmh."
        );
      }
    }
  }, [userLoading, username]);

  // Load initial data
  useEffect(() => {
    if (isAuthorized) {
      loadVariables();
      loadUnits();
    }
  }, [isAuthorized]);

  // Load variables from database
  const loadVariables = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("variables")
        .select(
          "id, label, slug, description, data_type, source_type, category"
        )
        .eq("is_active", true)
        .order("label");

      if (error) throw error;
      setVariables(data || []);
    } catch (err) {
      console.error("Error loading variables:", err);
      setError("Failed to load variables");
    } finally {
      setLoading(false);
    }
  };

  // Load units and organize by unit group
  const loadUnits = async () => {
    try {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .order("unit_group")
        .order("is_base", { ascending: false })
        .order("label");

      if (error) throw error;

      setUnits(data || []);

      // Group units by unit_group
      const groups = (data || []).reduce(
        (acc: { [key: string]: Unit[] }, unit) => {
          if (!acc[unit.unit_group]) {
            acc[unit.unit_group] = [];
          }
          acc[unit.unit_group].push(unit);
          return acc;
        },
        {}
      );

      const groupArray = Object.entries(groups).map(([name, units]) => ({
        name,
        units: units as Unit[],
      }));

      setUnitGroups(groupArray);
    } catch (err) {
      console.error("Error loading units:", err);
      setError("Failed to load units");
    }
  };

  // Load variable units for selected variable
  const loadVariableUnits = async (variableId: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/variable-units?variable_id=${variableId}`
      );
      if (!response.ok) throw new Error("Failed to fetch variable units");

      const data = await response.json();
      setVariableUnits(data);
    } catch (err) {
      console.error("Error loading variable units:", err);
      setError("Failed to load variable units");
    } finally {
      setLoading(false);
    }
  };

  // Handle variable selection
  const handleVariableSelect = (variable: Variable | null) => {
    setSelectedVariable(variable);
    if (variable) {
      loadVariableUnits(variable.id);
    } else {
      setVariableUnits([]);
    }
  };

  // Create new variable unit relationship
  const handleCreateVariableUnit = async () => {
    if (!selectedVariable || !selectedUnit) return;

    try {
      setLoading(true);
      const response = await fetch("/api/variable-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variable_id: selectedVariable.id,
          unit_id: selectedUnit,
          priority,
          note: note || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create variable unit");
      }

      setSuccess("Variable unit relationship created successfully");
      setAddDialogOpen(false);
      resetForm();
      await loadVariableUnits(selectedVariable.id);
    } catch (err) {
      console.error("Error creating variable unit:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create variable unit"
      );
    } finally {
      setLoading(false);
    }
  };

  // Update existing variable unit relationship
  const handleUpdateVariableUnit = async () => {
    if (!editingUnit || !selectedVariable) return;

    try {
      setLoading(true);
      const response = await fetch("/api/variable-units", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variable_id: editingUnit.variable_id,
          unit_id: editingUnit.unit_id,
          priority,
          note: note || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update variable unit");
      }

      setSuccess("Variable unit relationship updated successfully");
      setEditDialogOpen(false);
      setEditingUnit(null);
      resetForm();
      await loadVariableUnits(selectedVariable.id);
    } catch (err) {
      console.error("Error updating variable unit:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update variable unit"
      );
    } finally {
      setLoading(false);
    }
  };

  // Delete variable unit relationship
  const handleDeleteVariableUnit = async (variableUnit: VariableUnit) => {
    if (!selectedVariable) return;

    if (
      !confirm(
        `Are you sure you want to remove ${variableUnit.units?.label} from this variable?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/variable-units", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variable_id: variableUnit.variable_id,
          unit_id: variableUnit.unit_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete variable unit");
      }

      setSuccess("Variable unit relationship deleted successfully");
      await loadVariableUnits(selectedVariable.id);
    } catch (err) {
      console.error("Error deleting variable unit:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete variable unit"
      );
    } finally {
      setLoading(false);
    }
  };

  // Open edit dialog
  const handleEditVariableUnit = (variableUnit: VariableUnit) => {
    setEditingUnit(variableUnit);
    setPriority(variableUnit.priority);
    setNote(variableUnit.note || "");
    setEditDialogOpen(true);
  };

  // Reset form state
  const resetForm = () => {
    setSelectedUnitGroup("");
    setSelectedUnit("");
    setPriority(1);
    setNote("");
  };

  // Handle unit group selection in add dialog
  const handleUnitGroupSelect = (groupName: string) => {
    setSelectedUnitGroup(groupName);
    setSelectedUnit(""); // Reset unit selection when group changes
  };

  // Get available units for selected unit group
  const getAvailableUnits = () => {
    if (!selectedUnitGroup) return [];
    const group = unitGroups.find((g) => g.name === selectedUnitGroup);
    return group?.units || [];
  };

  // Show loading while checking auth
  if (userLoading || !authChecked) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Show unauthorized message
  if (!isAuthorized) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Access denied. This page is only available to authorized users.
        </Alert>
        <Button variant="contained" onClick={() => router.push("/")}>
          Go Home
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          🔧 Variable Units Editor
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage variable-unit relationships and priorities. Select a variable
          to view and edit its associated units.
        </Typography>
      </Box>

      {/* Variable Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select Variable
        </Typography>
        <Autocomplete
          options={variables}
          getOptionLabel={(option) => `${option.label} (${option.slug})`}
          value={selectedVariable}
          onChange={(_, newValue) => handleVariableSelect(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search variables..."
              placeholder="Type to search for a variable"
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Box>
                <Typography variant="body1">{option.label}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {option.slug} • {option.category} • {option.data_type}
                </Typography>
              </Box>
            </Box>
          )}
          fullWidth
        />
      </Paper>

      {/* Variable Details and Units Management */}
      {selectedVariable && (
        <Paper sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h6">
              Units for "{selectedVariable.label}"
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
            >
              Add Unit
            </Button>
          </Box>

          {/* Variable info chips */}
          <Box sx={{ mb: 3, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip label={`Type: ${selectedVariable.data_type}`} size="small" />
            <Chip
              label={`Source: ${selectedVariable.source_type}`}
              size="small"
            />
            {selectedVariable.category && (
              <Chip
                label={`Category: ${selectedVariable.category}`}
                size="small"
              />
            )}
          </Box>

          {/* Variable Units Table */}
          {loading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress />
            </Box>
          ) : variableUnits.length === 0 ? (
            <Alert severity="info">
              No units assigned to this variable. Click "Add Unit" to get
              started.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Priority</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Unit Group</TableCell>
                    <TableCell>Base Unit</TableCell>
                    <TableCell>Note</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {variableUnits
                    .sort((a, b) => a.priority - b.priority)
                    .map((variableUnit) => (
                      <TableRow
                        key={`${variableUnit.variable_id}-${variableUnit.unit_id}`}
                      >
                        <TableCell>
                          <Chip
                            label={variableUnit.priority}
                            size="small"
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>{variableUnit.units?.label}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {variableUnit.units?.symbol}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={variableUnit.units?.unit_group}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {variableUnit.units?.is_base ? (
                            <Chip label="Base" size="small" color="success" />
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              No
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {variableUnit.note ? (
                            <Tooltip title={variableUnit.note}>
                              <Typography
                                variant="body2"
                                noWrap
                                sx={{ maxWidth: 150 }}
                              >
                                {variableUnit.note}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleEditVariableUnit(variableUnit)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleDeleteVariableUnit(variableUnit)
                            }
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Add Unit Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Unit to Variable</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Unit Group Selection */}
            <FormControl fullWidth>
              <InputLabel>Unit Group</InputLabel>
              <Select
                value={selectedUnitGroup}
                onChange={(e) => handleUnitGroupSelect(e.target.value)}
                label="Unit Group"
              >
                {unitGroups.map((group) => (
                  <MenuItem key={group.name} value={group.name}>
                    {group.name} ({group.units.length} units)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Unit Selection */}
            <FormControl fullWidth disabled={!selectedUnitGroup}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                label="Unit"
              >
                {getAvailableUnits().map((unit) => (
                  <MenuItem key={unit.id} value={unit.id}>
                    {unit.label} ({unit.symbol}){" "}
                    {unit.is_base ? " - Base Unit" : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Priority */}
            <TextField
              label="Priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
              helperText="Lower numbers have higher priority"
              InputProps={{ inputProps: { min: 1 } }}
              fullWidth
            />

            {/* Note */}
            <TextField
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateVariableUnit}
            variant="contained"
            disabled={!selectedUnit || loading}
            startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            Add Unit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Unit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Variable Unit</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 3 }}>
            {editingUnit && (
              <Alert severity="info">
                Editing: {editingUnit.units?.label} ({editingUnit.units?.symbol}
                )
              </Alert>
            )}

            {/* Priority */}
            <TextField
              label="Priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
              helperText="Lower numbers have higher priority"
              InputProps={{ inputProps: { min: 1 } }}
              fullWidth
            />

            {/* Note */}
            <TextField
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateVariableUnit}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            Update Unit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}
