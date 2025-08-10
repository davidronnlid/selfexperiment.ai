import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
} from "@mui/material";
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes } from "react-icons/fa";
import { supabase } from "@/utils/supaBase";

interface Unit {
  id: string;
  label: string;
  symbol: string;
  unit_group: string;
  is_base: boolean;
}

interface VariableUnit {
  variable_id: string;
  unit_id: string;
  priority: number;
  note?: string;
  unit_label?: string;
  unit_symbol?: string;
  unit_group?: string;
}

interface VariableUnitsManagerProps {
  open: boolean;
  onClose: () => void;
  variableId: string;
  variableName: string;
}

export default function VariableUnitsManager({
  open,
  onClose,
  variableId,
  variableName,
}: VariableUnitsManagerProps) {
  const [variableUnits, setVariableUnits] = useState<VariableUnit[]>([]);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Add unit state
  const [selectedUnitGroup, setSelectedUnitGroup] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [newPriority, setNewPriority] = useState(1);
  const [newNote, setNewNote] = useState("");
  
  // Edit state
  const [editingUnit, setEditingUnit] = useState<VariableUnit | null>(null);
  const [editPriority, setEditPriority] = useState(1);
  const [editNote, setEditNote] = useState("");

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadVariableUnits();
      loadAvailableUnits();
    }
  }, [open, variableId]);

  const loadVariableUnits = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("variable_units")
        .select(`
          *,
          units!inner (
            label,
            symbol,
            unit_group
          )
        `)
        .eq("variable_id", variableId)
        .order("priority");

      if (error) throw error;

      const formattedData = data.map((item: any) => ({
        variable_id: item.variable_id,
        unit_id: item.unit_id,
        priority: item.priority,
        note: item.note,
        unit_label: item.units.label,
        unit_symbol: item.units.symbol,
        unit_group: item.units.unit_group,
      }));

      setVariableUnits(formattedData);
    } catch (err) {
      console.error("Error loading variable units:", err);
      setError("Failed to load variable units");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUnits = async () => {
    try {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .order("unit_group, label");

      if (error) throw error;
      setAvailableUnits(data || []);
    } catch (err) {
      console.error("Error loading available units:", err);
    }
  };

  const handleAddUnit = async () => {
    if (!selectedUnit) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from("variable_units")
        .insert({
          variable_id: variableId,
          unit_id: selectedUnit,
          priority: newPriority,
          note: newNote || null,
        });

      if (error) throw error;

      setSuccess("Unit added successfully");
      setSelectedUnit("");
      setSelectedUnitGroup("");
      setNewPriority(1);
      setNewNote("");
      await loadVariableUnits();
    } catch (err: any) {
      console.error("Error adding unit:", err);
      setError(err.message || "Failed to add unit");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUnit = (unit: VariableUnit) => {
    setEditingUnit(unit);
    setEditPriority(unit.priority);
    setEditNote(unit.note || "");
  };

  const handleSaveEdit = async () => {
    if (!editingUnit) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from("variable_units")
        .update({
          priority: editPriority,
          note: editNote || null,
        })
        .eq("variable_id", editingUnit.variable_id)
        .eq("unit_id", editingUnit.unit_id);

      if (error) throw error;

      setSuccess("Unit updated successfully");
      setEditingUnit(null);
      await loadVariableUnits();
    } catch (err: any) {
      console.error("Error updating unit:", err);
      setError(err.message || "Failed to update unit");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm("Are you sure you want to remove this unit?")) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from("variable_units")
        .delete()
        .eq("variable_id", variableId)
        .eq("unit_id", unitId);

      if (error) throw error;

      setSuccess("Unit removed successfully");
      await loadVariableUnits();
    } catch (err: any) {
      console.error("Error deleting unit:", err);
      setError(err.message || "Failed to remove unit");
    } finally {
      setLoading(false);
    }
  };

  const unitGroups = [...new Set(availableUnits.map(u => u.unit_group))];
  const filteredUnits = selectedUnitGroup 
    ? availableUnits.filter(u => u.unit_group === selectedUnitGroup)
    : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Manage Units for {variableName}
      </DialogTitle>
      
      <DialogContent>
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

        {/* Add New Unit Section */}
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: "grey.50",
            borderRadius: 1,
            color: "#000",
            "& .MuiTypography-root": { color: "#000" },
            "& .MuiFormLabel-root": { color: "#000" },
            "& .MuiInputBase-input": { color: "#000" },
            "& .MuiOutlinedInput-input": { color: "#000" },
            "& .MuiSelect-select": { color: "#000" },
            "& .MuiSvgIcon-root": { color: "#000" },
          }}
        >
          <Typography variant="h6" gutterBottom>
            Add New Unit
          </Typography>
          
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Unit Group</InputLabel>
              <Select
                value={selectedUnitGroup}
                onChange={(e) => {
                  setSelectedUnitGroup(e.target.value);
                  setSelectedUnit("");
                }}
                label="Unit Group"
              >
                {unitGroups.map((group) => (
                  <MenuItem key={group} value={group}>
                    {group.charAt(0).toUpperCase() + group.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }} disabled={!selectedUnitGroup}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                label="Unit"
              >
                {filteredUnits.map((unit) => (
                  <MenuItem key={unit.id} value={unit.id}>
                    {unit.label} ({unit.symbol})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              type="number"
              label="Priority"
              value={newPriority}
              onChange={(e) => setNewPriority(parseInt(e.target.value) || 1)}
              sx={{ width: 100 }}
              inputProps={{ min: 1 }}
            />

            <TextField
              size="small"
              label="Note (optional)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              sx={{ minWidth: 200 }}
            />

            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <FaPlus />}
              onClick={handleAddUnit}
              disabled={!selectedUnit || loading}
            >
              Add Unit
            </Button>
          </Box>
        </Box>

        {/* Current Units Table */}
        <Typography variant="h6" gutterBottom>
          Current Units
        </Typography>
        
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Priority</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Group</TableCell>
                <TableCell>Note</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {variableUnits.map((unit) => (
                <TableRow key={unit.unit_id}>
                  <TableCell>
                    {editingUnit?.unit_id === unit.unit_id ? (
                      <TextField
                        size="small"
                        type="number"
                        value={editPriority}
                        onChange={(e) => setEditPriority(parseInt(e.target.value) || 1)}
                        sx={{ width: 80 }}
                        inputProps={{ min: 1 }}
                      />
                    ) : (
                      <Chip 
                        label={unit.priority} 
                        size="small" 
                        color={unit.priority === 1 ? "primary" : "default"}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {unit.unit_label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({unit.unit_symbol})
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={unit.unit_group} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {editingUnit?.unit_id === unit.unit_id ? (
                      <TextField
                        size="small"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="Optional note"
                        sx={{ minWidth: 150 }}
                      />
                    ) : (
                      unit.note || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {editingUnit?.unit_id === unit.unit_id ? (
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton size="small" onClick={handleSaveEdit} color="primary">
                          <FaSave />
                        </IconButton>
                        <IconButton size="small" onClick={() => setEditingUnit(null)}>
                          <FaTimes />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton size="small" onClick={() => handleEditUnit(unit)}>
                          <FaEdit />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteUnit(unit.unit_id)}
                          color="error"
                        >
                          <FaTrash />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {variableUnits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">
                      No units configured for this variable
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}