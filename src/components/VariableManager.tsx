import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/utils/supaBase";
import { VARIABLE_CATEGORIES } from "@/utils/categories";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Chip,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Alert,
  Grid,
  Snackbar,
  Tooltip,
  InputAdornment,
  Collapse,
  ListSubheader,
  Checkbox,
  ListItemText,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SelectAll as SelectAllIcon,
} from "@mui/icons-material";
import { FaEdit } from "react-icons/fa";
import {
  Variable,
  UserVariablePreference,
  CreateVariableRequest,
  Unit,
  VariableUnit,
} from "../types/variables";
import {
  createVariable,
  updateVariable,
  getVariablesWithPreferences,
  updateUserVariablePreference,
} from "../utils/variableUtils";
import {
  fetchVariableUnits,
  addVariableUnit,
  removeVariableUnit,
  setVariableUnits,
  getAvailableUnitsForVariable,
} from "../utils/variableUnitsUtils";
import { fetchUnits } from "../utils/unitsTableUtils";
import { useUser } from "../pages/_app";

interface VariableManagerProps {
  open: boolean;
  onClose: () => void;
  onVariableCreate?: (variable: Variable) => void;
  onVariableUpdate?: (variable: Variable) => void;
  onPreferenceUpdate?: (preferences: UserVariablePreference) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`variable-manager-tabpanel-${index}`}
      aria-labelledby={`variable-manager-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Component to display variable units
function VariableUnitsDisplay({ variableId }: { variableId: string }) {
  const [variableUnits, setVariableUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const units = await getAvailableUnitsForVariable(variableId);
        setVariableUnits(units);
      } catch (error) {
        console.error("Failed to load variable units:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUnits();
  }, [variableId]);

  if (loading) {
    return <Chip label="Loading..." size="small" variant="outlined" />;
  }

  if (variableUnits.length === 0) {
    return <Chip label="No units" size="small" variant="outlined" />;
  }

  return (
    <>
      {variableUnits.slice(0, 2).map((unit, index) => (
        <Chip
          key={unit.id}
          label={`${unit.label} (${unit.symbol})`}
          size="small"
          variant="outlined"
          color={index === 0 ? "primary" : "default"}
        />
      ))}
      {variableUnits.length > 2 && (
        <Chip
          label={`+${variableUnits.length - 2} more`}
          size="small"
          variant="outlined"
        />
      )}
    </>
  );
}

export default function VariableManager({
  open,
  onClose,
  onVariableCreate,
  onVariableUpdate,
  onPreferenceUpdate,
}: VariableManagerProps) {
  const { user } = useUser();
  const [tabValue, setTabValue] = useState(0);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [userPreferences, setUserPreferences] = useState<
    UserVariablePreference[]
  >([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Unit selector enhancements
  const [unitSearchQuery, setUnitSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Filter and group units
  const filteredAndGroupedUnits = useMemo(() => {
    // Filter units based on search query
    const filtered = units.filter(unit => 
      unit.label.toLowerCase().includes(unitSearchQuery.toLowerCase()) ||
      unit.symbol.toLowerCase().includes(unitSearchQuery.toLowerCase()) ||
      unit.unit_group.toLowerCase().includes(unitSearchQuery.toLowerCase())
    );

    // Group by unit_group
    const grouped = filtered.reduce((acc, unit) => {
      const group = unit.unit_group || "Other";
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(unit);
      return acc;
    }, {} as Record<string, Unit[]>);

    // Sort groups alphabetically and units within groups
    const sortedGroups = Object.keys(grouped).sort();
    const result: { group: string; units: Unit[] }[] = [];
    
    sortedGroups.forEach(group => {
      const sortedUnits = grouped[group].sort((a, b) => a.label.localeCompare(b.label));
      result.push({ group, units: sortedUnits });
    });

    return result;
  }, [units, unitSearchQuery]);

  // Functions for category management
  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const selectAllInCategory = (categoryUnits: Unit[]) => {
    const categoryUnitIds = categoryUnits.map(u => u.id);
    const newSelected = [...selectedUnits];
    
    // Check if all units in this category are already selected
    const allSelected = categoryUnitIds.every(id => selectedUnits.includes(id));
    
    if (allSelected) {
      // Remove all from selection
      setSelectedUnits(newSelected.filter(id => !categoryUnitIds.includes(id)));
    } else {
      // Add all to selection (avoid duplicates)
      categoryUnitIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      setSelectedUnits(newSelected);
    }
  };

  // Form states
  const [createForm, setCreateForm] = useState<CreateVariableRequest>({
    slug: "",
    label: "",
    description: "",
    data_type: "continuous",
    source_type: ["manual"],
    category: "",
    validation_rules: {},
  });

  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);

  // Load variables and preferences
  useEffect(() => {
    if (open && user) {
      loadVariables();
      loadUnits();
    }
  }, [open, user]);

  const loadVariables = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await getVariablesWithPreferences(user.id, {
        limit: 100,
      });

      setVariables(response.variables);
      setUserPreferences(
        response.variables
          .map((v) => v.user_preferences)
          .filter(Boolean) as UserVariablePreference[]
      );
    } catch (error) {
      console.error("Failed to load variables:", error);
      setMessage({ type: "error", text: "Failed to load variables" });
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async () => {
    try {
      const allUnits = await fetchUnits();
      setUnits(allUnits);
    } catch (error) {
      console.error("Failed to load units:", error);
    }
  };

  const handleCreateVariable = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const newVariable = await createVariable(createForm, user.id);

      if (newVariable) {
        // Add selected units to the new variable
        if (selectedUnits.length > 0) {
          const unitConfigs = selectedUnits.map((unitId, index) => ({
            unitId,
            priority: index + 1,
          }));
          await setVariableUnits(newVariable.id, unitConfigs);
        }

        setVariables((prev) => [...prev, newVariable]);
        setMessage({ type: "success", text: "Variable created successfully" });
        onVariableCreate?.(newVariable);

        // Reset form
        setCreateForm({
          slug: "",
          label: "",
          description: "",
          data_type: "continuous",
          source_type: ["manual"],
          category: "",
          validation_rules: {},
        });
        setSelectedUnits([]);
        setUnitSearchQuery("");
        setExpandedCategories(new Set());
      }
    } catch (error) {
      console.error("Failed to create variable:", error);
      setMessage({ type: "error", text: "Failed to create variable" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVariable = async () => {
    if (!editingVariable) return;

    try {
      setLoading(true);
      const updatedVariable = await updateVariable(
        editingVariable.id,
        createForm
      );

      if (updatedVariable) {
        // Update variable units
        const unitConfigs = selectedUnits.map((unitId, index) => ({
          unitId,
          priority: index + 1,
        }));
        await setVariableUnits(editingVariable.id, unitConfigs);

        setVariables((prev) =>
          prev.map((v) => (v.id === updatedVariable.id ? updatedVariable : v))
        );
        setMessage({ type: "success", text: "Variable updated successfully" });
        onVariableUpdate?.(updatedVariable);
        setEditingVariable(null);
        setSelectedUnits([]);
        setUnitSearchQuery("");
        setExpandedCategories(new Set());
      }
    } catch (error) {
      console.error("Failed to update variable:", error);
      setMessage({ type: "error", text: "Failed to update variable" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreference = async (
    variableId: string,
    updates: Partial<UserVariablePreference>
  ) => {
    if (!user) return;

    try {
      const updatedPreference = await updateUserVariablePreference(
        user.id,
        variableId,
        updates
      );
      if (updatedPreference) {
        // Since updateUserVariablePreference returns boolean, we need to update manually
        setUserPreferences((prev) =>
          prev.map((p) =>
            p.variable_id === variableId ? { ...p, ...updates } : p
          )
        );
        // Create a preference object for the callback
        const updatedPref = {
          variable_id: variableId,
          ...updates,
        } as UserVariablePreference;
        onPreferenceUpdate?.(updatedPref);
      }
    } catch (error) {
      console.error("Failed to update preference:", error);
      setMessage({ type: "error", text: "Failed to update preference" });
    }
  };

  const startEdit = async (variable: Variable) => {
    setEditingVariable(variable);
    setCreateForm({
      slug: variable.slug,
      label: variable.label,
      description: variable.description || "",
      data_type: variable.data_type,
      source_type: Array.isArray(variable.source_type) ? variable.source_type : [variable.source_type],
      category: variable.category || "",
      validation_rules: variable.validation_rules || {},
    });

    // Load existing variable units
    try {
      const variableUnits = await fetchVariableUnits(variable.id);
      const unitIds = variableUnits
        .sort((a, b) => a.priority - b.priority)
        .map((vu) => vu.unit_id);
      setSelectedUnits(unitIds);
    } catch (error) {
      console.error("Failed to load variable units:", error);
      setSelectedUnits([]);
    }
  };

  const cancelEdit = () => {
    setEditingVariable(null);
    setCreateForm({
      slug: "",
      label: "",
      description: "",
      data_type: "continuous",
      source_type: ["manual"],
      category: "",
      validation_rules: {},
    });
    setSelectedUnits([]);
    setUnitSearchQuery("");
    setExpandedCategories(new Set());
  };

  const renderCreateForm = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6" gutterBottom>
        {editingVariable ? "Edit Variable" : "Create New Variable"}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            fullWidth
            label="Label"
            value={createForm.label}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, label: e.target.value }))
            }
            required
          />
          <TextField
            fullWidth
            label="Slug"
            value={createForm.slug}
            onChange={(e) =>
              setCreateForm((prev) => ({
                ...prev,
                slug: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "_")
              }))
            }
            helperText="Internal identifier (auto-generated if empty)"
            required
          />
        </Box>
        <TextField
          fullWidth
          label="Description"
          value={createForm.description}
          onChange={(e) =>
            setCreateForm((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
          multiline
          rows={2}
        />
        <Box sx={{ display: "flex", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Data Type</InputLabel>
            <Select
              value={createForm.data_type}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  data_type: e.target.value as any,
                }))
              }
              label="Data Type"
            >
              <MenuItem value="continuous">Continuous</MenuItem>
              <MenuItem value="categorical">Categorical</MenuItem>
              <MenuItem value="boolean">Boolean</MenuItem>
              <MenuItem value="time">Time</MenuItem>
              <MenuItem value="text">Text</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Source Types</InputLabel>
            <Select
              multiple
              value={Array.isArray(createForm.source_type) ? createForm.source_type : [createForm.source_type]}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  source_type: e.target.value as string[],
                }))
              }
              label="Source Types"
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip
                      key={value}
                      label={value === "apple_health" ? "Apple Health" : 
                            value.charAt(0).toUpperCase() + value.slice(1)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="manual">
                <Checkbox checked={(Array.isArray(createForm.source_type) ? createForm.source_type : [createForm.source_type]).indexOf("manual") > -1} />
                <ListItemText primary="Manual" />
              </MenuItem>
              <MenuItem value="withings">
                <Checkbox checked={(Array.isArray(createForm.source_type) ? createForm.source_type : [createForm.source_type]).indexOf("withings") > -1} />
                <ListItemText primary="Withings" />
              </MenuItem>
              <MenuItem value="oura">
                <Checkbox checked={(Array.isArray(createForm.source_type) ? createForm.source_type : [createForm.source_type]).indexOf("oura") > -1} />
                <ListItemText primary="Oura" />
              </MenuItem>
              <MenuItem value="apple_health">
                <Checkbox checked={(Array.isArray(createForm.source_type) ? createForm.source_type : [createForm.source_type]).indexOf("apple_health") > -1} />
                <ListItemText primary="Apple Health" />
              </MenuItem>
              <MenuItem value="formula">
                <Checkbox checked={(Array.isArray(createForm.source_type) ? createForm.source_type : [createForm.source_type]).indexOf("formula") > -1} />
                <ListItemText primary="Formula" />
              </MenuItem>
              <MenuItem value="calculated">
                <Checkbox checked={(Array.isArray(createForm.source_type) ? createForm.source_type : [createForm.source_type]).indexOf("calculated") > -1} />
                <ListItemText primary="Calculated" />
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
        {/* Enhanced Unit Selection */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Available Units for this Variable
          </Typography>
          
          {/* Search Field and Controls */}
          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search units..."
              value={unitSearchQuery}
              onChange={(e) => setUnitSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const allGroups = filteredAndGroupedUnits.map(g => g.group);
                if (expandedCategories.size === allGroups.length) {
                  setExpandedCategories(new Set());
                } else {
                  setExpandedCategories(new Set(allGroups));
                }
              }}
              sx={{ minWidth: "auto", px: 1 }}
            >
              {expandedCategories.size === filteredAndGroupedUnits.length ? 
                <ExpandLessIcon /> : <ExpandMoreIcon />
              }
            </Button>
          </Box>

          {/* Selected Units Display */}
          {selectedUnits.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Selected Units ({selectedUnits.length}):
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                {selectedUnits.map((unitId) => {
                  const unit = units.find((u) => u.id === unitId);
                  return (
                    <Chip
                      key={unitId}
                      label={unit ? `${unit.label} (${unit.symbol})` : unitId}
                      size="small"
                      onDelete={() => {
                        setSelectedUnits(selectedUnits.filter(id => id !== unitId));
                      }}
                      color="primary"
                      variant="outlined"
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Unit Categories */}
          <Card variant="outlined" sx={{ maxHeight: 300, overflow: "auto" }}>
            <CardContent sx={{ p: 1 }}>
              {filteredAndGroupedUnits.map(({ group, units: groupUnits }) => {
                const isExpanded = expandedCategories.has(group);
                const categoryUnitIds = groupUnits.map(u => u.id);
                const selectedInCategory = categoryUnitIds.filter(id => selectedUnits.includes(id)).length;
                const allSelectedInCategory = selectedInCategory === categoryUnitIds.length;
                const someSelectedInCategory = selectedInCategory > 0 && selectedInCategory < categoryUnitIds.length;

                return (
                  <Box key={group}>
                    {/* Category Header */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1,
                        bgcolor: "grey.50",
                        borderRadius: 1,
                        mb: 1,
                        cursor: "pointer",
                      }}
                      onClick={() => toggleCategory(group)}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {group} ({groupUnits.length})
                        </Typography>
                        {selectedInCategory > 0 && (
                          <Chip
                            size="small"
                            label={`${selectedInCategory} selected`}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAllInCategory(groupUnits);
                          }}
                          title={allSelectedInCategory ? "Deselect all" : "Select all"}
                        >
                          <Checkbox
                            size="small"
                            checked={allSelectedInCategory}
                            indeterminate={someSelectedInCategory}
                          />
                        </IconButton>
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </Box>
                    </Box>

                    {/* Category Units */}
                    <Collapse in={isExpanded}>
                      <Box sx={{ pl: 2, pb: 1 }}>
                        {groupUnits.map((unit) => {
                          const isSelected = selectedUnits.includes(unit.id);
                          return (
                            <Box
                              key={unit.id}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                py: 0.5,
                                cursor: "pointer",
                                "&:hover": { bgcolor: "grey.50" },
                                borderRadius: 1,
                                px: 1,
                              }}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedUnits(selectedUnits.filter(id => id !== unit.id));
                                } else {
                                  setSelectedUnits([...selectedUnits, unit.id]);
                                }
                              }}
                            >
                              <Checkbox size="small" checked={isSelected} />
                              <Box sx={{ ml: 1, flex: 1 }}>
                                <Typography variant="body2">
                                  {unit.label} ({unit.symbol})
                                </Typography>
                                {unit.is_base && (
                                  <Chip size="small" label="Base Unit" variant="outlined" sx={{ ml: 1 }} />
                                )}
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}

              {filteredAndGroupedUnits.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                  No units found matching "{unitSearchQuery}"
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={createForm.category}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, category: e.target.value }))
              }
              label="Category"
            >
              {VARIABLE_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Validation Rules */}
      {createForm.data_type === "continuous" && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Validation Rules
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              fullWidth
              label="Min Value"
              type="number"
              value={createForm.validation_rules?.min || ""}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  validation_rules: {
                    ...prev.validation_rules,
                    min: parseFloat(e.target.value) || undefined,
                  },
                }))
              }
            />
            <TextField
              fullWidth
              label="Max Value"
              type="number"
              value={createForm.validation_rules?.max || ""}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  validation_rules: {
                    ...prev.validation_rules,
                    max: parseFloat(e.target.value) || undefined,
                  },
                }))
              }
            />
            <TextField
              fullWidth
              label="Unit"
              value={createForm.validation_rules?.unit || ""}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  validation_rules: {
                    ...prev.validation_rules,
                    unit: e.target.value,
                  },
                }))
              }
            />
          </Box>
        </Box>
      )}

      {/* Scale Validation */}
      {createForm.data_type === "continuous" && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Scale Settings (for 1-10 scales)
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              fullWidth
              label="Scale Min"
              type="number"
              value={createForm.validation_rules?.scaleMin || 1}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  validation_rules: {
                    ...prev.validation_rules,
                    scaleMin: parseInt(e.target.value) || 1,
                  },
                }))
              }
            />
            <TextField
              fullWidth
              label="Scale Max"
              type="number"
              value={createForm.validation_rules?.scaleMax || 10}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  validation_rules: {
                    ...prev.validation_rules,
                    scaleMax: parseInt(e.target.value) || 10,
                  },
                }))
              }
            />
          </Box>
        </Box>
      )}

      <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
        {editingVariable && (
          <Button onClick={cancelEdit} variant="outlined">
            Cancel
          </Button>
        )}
        <Button
          onClick={
            editingVariable ? handleUpdateVariable : handleCreateVariable
          }
          variant="contained"
          disabled={loading || !createForm.label}
        >
          {loading
            ? "Saving..."
            : editingVariable
            ? "Update Variable"
            : "Create Variable"}
        </Button>
      </Box>
    </Box>
  );

  const renderVariablesList = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Your Variables
      </Typography>

      {loading ? (
        <Typography>Loading variables...</Typography>
      ) : variables.length === 0 ? (
        <Alert severity="info">
          No variables found. Create your first variable above.
        </Alert>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {variables.map((variable) => {
            const preference = userPreferences.find(
              (p) => p.variable_id === variable.id
            );

            return (
              <Box
                key={variable.id}
                sx={{
                  width: {
                    xs: "100%",
                    sm: "calc(50% - 8px)",
                    md: "calc(33.333% - 10.667px)",
                  },
                }}
              >
                <Card variant="outlined">
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight="medium">
                        {variable.icon} {variable.label}
                      </Typography>
                      <Box>
                        <Tooltip title="Edit variable">
                          <IconButton
                            size="small"
                            onClick={() => startEdit(variable)}
                          >
                            <FaEdit />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ mb: 2 }}
                    >
                      {variable.description || "No description"}
                    </Typography>

                    <Box
                      sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}
                    >
                      <Chip
                        label={variable.data_type}
                        size="small"
                        variant="outlined"
                      />
                      {variable.category && (
                        <Chip
                          label={variable.category}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      <VariableUnitsDisplay variableId={variable.id} />
                    </Box>

                    {/* User Preferences */}
                    {preference && (
                      <Box sx={{ mt: 2 }}>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          gutterBottom
                        >
                          Your Settings:
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={preference.is_shared}
                                onChange={(e) =>
                                  handleUpdatePreference(variable.id, {
                                    is_shared: e.target.checked,
                                  })
                                }
                              />
                            }
                            label="Share with others"
                          />
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Variable Manager
        <Typography variant="body2" color="textSecondary">
          Create and manage your variables
        </Typography>
      </DialogTitle>

      <DialogContent>
        {message && (
          <Alert
            severity={message.type}
            sx={{ mb: 2 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
        >
          <Tab label="Create/Edit" />
          <Tab label="Your Variables" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {renderCreateForm()}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {renderVariablesList()}
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
