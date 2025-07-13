import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Box,
  Grid,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  FormGroup,
  FormControlLabel,
  Snackbar,
  Alert,
  Divider,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  AccessTime,
  Close,
  ContentCopy,
  ExpandMore,
  ExpandLess,
  Sort,
} from "@mui/icons-material";
import { useUser } from "@/pages/_app";
import { supabase } from "@/utils/supaBase";
import { getVariables } from "@/utils/variableUtils";
import { Variable } from "@/types/variables";
import { validateVariableValue } from "@/utils/variableValidation";
import { format } from "date-fns";
import Autocomplete from "@mui/material/Autocomplete";
import MuiAlert from "@mui/material/Alert";
import {
  generateAllLogsForRoutine,
  generateHistoricalLogsForExistingRoutines,
} from "@/utils/generatePlannedLogs";

const weekdays = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

function timeString(t: string) {
  try {
    const d = new Date(`1970-01-01T${t}`);
    return format(d, "h:mm a");
  } catch {
    return t;
  }
}

const defaultTime = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

async function fetchPlannedLogsForRoutine(routineId: string, userId: string) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 14);
  const end = new Date(today);
  end.setDate(today.getDate() + 14);

  const { data } = await supabase
    .from("planned_logs")
    .select("*")
    .eq("routine_id", routineId)
    .eq("user_id", userId)
    .gte("planned_date", start.toISOString().slice(0, 10))
    .lte("planned_date", end.toISOString().slice(0, 10))
    .order("planned_date", { ascending: true });

  return data || [];
}

export default function RoutineManager() {
  const { user } = useUser();
  if (!user) return null;
  const [routines, setRoutines] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [allVariables, setAllVariables] = useState<Variable[]>([]);
  const [message, setMessage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"variables" | "time">("variables");

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  // Validation state for individual variables in the form
  const [variableValidationErrors, setVariableValidationErrors] = useState<
    Record<number, string>
  >({});

  // Load all routines
  useEffect(() => {
    if (!user) return;
    loadRoutines();
    getVariables(user?.id).then((variables) =>
      setAllVariables(variables || [])
    );
  }, [user]);

  async function loadRoutines() {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_user_routines", {
      p_user_id: user.id,
    });
    setRoutines(data || []);
    setLoading(false);
  }

  function openCreateDialog() {
    setEditingRoutine(null);
    setForm({
      routine_name: "",
      notes: "",
      variables: [],
    });
    setVariableValidationErrors({});
    setDialogOpen(true);
  }

  function openEditDialog(routine: any) {
    setEditingRoutine(routine);
    setForm({
      routine_name: routine.routine_name,
      notes: routine.notes || "",
      variables: (routine.variables || []).map((v: any) => {
        const variableInfo = allVariables.find((vv) => vv.id === v.variable_id);
        return {
          variable_id: v.variable_id,
          default_value: v.default_value,
          default_unit:
            v.default_unit || variableInfo?.default_display_unit || "",
          weekdays: v.weekdays || [1, 2, 3, 4, 5, 6, 7],
          times: v.times || [],
        };
      }),
    });
    setVariableValidationErrors({});
    setDialogOpen(true);
  }

  function handleFormChange(field: string, value: any) {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  }

  function handleVariableChange(idx: number, field: string, value: any) {
    setForm((prev: any) => {
      const variables = [...prev.variables];
      variables[idx] = { ...variables[idx], [field]: value };
      return { ...prev, variables };
    });

    // Real-time validation for default_value changes
    if (field === "default_value") {
      const variable = allVariables.find(
        (v) => v.id === form.variables[idx].variable_id
      );
      if (variable && value) {
        const validation = validateVariableValue(value, variable);
        setVariableValidationErrors((prev) => ({
          ...prev,
          [idx]: validation.isValid ? "" : validation.error || "Invalid value",
        }));
      } else {
        setVariableValidationErrors((prev) => ({
          ...prev,
          [idx]: "",
        }));
      }
    }
  }

  async function handleSave() {
    if (!user) {
      return;
    }

    // Validate routine name
    const trimmedName = (form.routine_name || "").trim();
    if (!trimmedName) {
      setMessage({
        type: "error",
        text: "Routine name cannot be empty or whitespace.",
      });
      return;
    }

    // Validate that at least one variable is added
    if (!form.variables || form.variables.length === 0) {
      setMessage({
        type: "error",
        text: "Please add at least one variable to your routine.",
      });
      return;
    }

    // Validate each variable
    for (let i = 0; i < form.variables.length; i++) {
      const v = form.variables[i];
      const variable = allVariables.find((vv) => vv.id === v.variable_id);
      const variableName = variable?.label || `Variable ${i + 1}`;

      // Check if default value is provided
      const defaultValueStr = String(v.default_value || "").trim();
      if (!v.default_value || defaultValueStr === "") {
        setMessage({
          type: "error",
          text: `${variableName}: Default value is required.`,
        });
        return;
      }

      // Validate the value using the comprehensive validation system
      if (variable) {
        const validation = validateVariableValue(defaultValueStr, variable);
        if (!validation.isValid) {
          setMessage({
            type: "error",
            text: `${variableName}: ${validation.error}`,
          });
          return;
        }
      }

      // Check if weekdays are selected
      if (!v.weekdays || v.weekdays.length === 0) {
        setMessage({
          type: "error",
          text: `${variableName}: Please select at least one weekday.`,
        });
        return;
      }

      // Check if times are configured
      if (!v.times || v.times.length === 0) {
        setMessage({
          type: "error",
          text: `${variableName}: Please add at least one time. Click "Add Time" to configure when this variable should be logged.`,
        });
        return;
      }

      // Validate each time
      for (let j = 0; j < v.times.length; j++) {
        const timeObj = v.times[j];
        if (!timeObj.time || timeObj.time.trim() === "") {
          setMessage({
            type: "error",
            text: `${variableName}: Time ${
              j + 1
            } is not configured. Please set a time or remove this time slot.`,
          });
          return;
        }

        // Validate time format (HH:MM)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(timeObj.time)) {
          setMessage({
            type: "error",
            text: `${variableName}: Time ${
              j + 1
            } has invalid format. Please use HH:MM format (e.g., 08:30).`,
          });
          return;
        }
      }
    }

    // If all validations pass, prepare the payload
    const payload = {
      user_id: user.id,
      routine_name: trimmedName,
      notes: form.notes || "",
      variables: form.variables.map((v: any, variableIndex: number) => {
        const variable = allVariables.find((vv) => vv.id === v.variable_id);
        let defaultValue = v.default_value;

        // Convert default_value to appropriate type based on variable data_type
        if (variable?.data_type === "continuous") {
          defaultValue = parseFloat(v.default_value);
        } else if (variable?.data_type === "boolean") {
          defaultValue = v.default_value === "true" || v.default_value === true;
        } else if (
          variable?.data_type === "categorical" ||
          variable?.data_type === "text"
        ) {
          defaultValue = String(v.default_value);
        } else if (variable?.data_type === "time") {
          defaultValue = String(v.default_value);
        } else {
          const numValue = parseFloat(v.default_value);
          defaultValue = isNaN(numValue) ? String(v.default_value) : numValue;
        }

        return {
          variable_id: v.variable_id,
          default_value: defaultValue,
          default_unit: v.default_unit || "",
          weekdays: v.weekdays || [1, 2, 3, 4, 5, 6, 7],
          times: (v.times || []).map((timeObj: any) => ({
            time: timeObj.time,
            name: timeObj.name || "",
          })),
        };
      }),
    };

    setLoading(true);

    try {
      const { error } = await supabase.rpc(
        editingRoutine ? "update_routine" : "create_routine",
        editingRoutine
          ? { p_routine_id: editingRoutine.id, p_routine_data: payload }
          : { p_routine_data: payload }
      );

      setLoading(false);

      if (error) {
        console.error("Database error:", error);
        let errorMessage = "Failed to create routine. ";

        // Provide specific error messages based on error type
        if (error.message.includes("violates foreign key constraint")) {
          errorMessage +=
            "One or more selected variables may no longer exist. Please try removing and re-adding the variables.";
        } else if (error.message.includes("violates unique constraint")) {
          errorMessage +=
            "A routine with this name already exists. Please choose a different name.";
        } else if (error.message.includes("permission denied")) {
          errorMessage +=
            "You don't have permission to create routines. Please try logging out and back in.";
        } else if (
          error.message.includes("function") &&
          error.message.includes("does not exist")
        ) {
          errorMessage +=
            "Database functions are not properly configured. Please contact support.";
        } else {
          errorMessage += `Database error: ${error.message}`;
        }

        setMessage({ type: "error", text: errorMessage });
      } else {
        setMessage({
          type: "success",
          text: `Routine "${trimmedName}" ${
            editingRoutine ? "updated" : "created"
          } successfully! Variables will be logged at the configured times on selected weekdays.`,
        });
        setDialogOpen(false);
        loadRoutines();
      }
    } catch (err) {
      setLoading(false);
      console.error("Unexpected error:", err);
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again or contact support if the problem persists.",
      });
    }
  }

  async function handleDeleteRoutine(routineId: string) {
    if (confirm("Are you sure you want to delete this routine?")) {
      const { error } = await supabase.rpc("delete_routine", {
        p_routine_id: routineId,
      });
      if (error) {
        console.error("Error deleting routine:", error);
      } else {
        setSnackbar({ open: true, message: "Routine deleted successfully" });
        await loadRoutines();
      }
    }
  }

  // Helper function to get the earliest time from a routine
  const getEarliestTime = (routine: any): string | null => {
    if (!routine.variables || routine.variables.length === 0) return null;

    let earliestTime: string | null = null;

    for (const variable of routine.variables) {
      if (variable.times && variable.times.length > 0) {
        for (const timeObj of variable.times) {
          if (timeObj.time) {
            if (earliestTime === null || timeObj.time < earliestTime) {
              earliestTime = timeObj.time;
            }
          }
        }
      }
    }

    return earliestTime;
  };

  // Sorting functions
  const sortedRoutines = React.useMemo(() => {
    if (!routines || routines.length === 0) return [];

    const routinesCopy = [...routines];

    if (sortBy === "variables") {
      // Sort by number of variables (descending)
      routinesCopy.sort((a, b) => {
        const aVarCount = a.variables?.length || 0;
        const bVarCount = b.variables?.length || 0;
        return bVarCount - aVarCount;
      });
    } else if (sortBy === "time") {
      // Sort by earliest time of day across all variables (ascending)
      routinesCopy.sort((a, b) => {
        const aEarliestTime = getEarliestTime(a);
        const bEarliestTime = getEarliestTime(b);

        if (aEarliestTime === null && bEarliestTime === null) return 0;
        if (aEarliestTime === null) return 1; // routines without times go to the end
        if (bEarliestTime === null) return -1;

        return aEarliestTime.localeCompare(bEarliestTime);
      });
    }

    return routinesCopy;
  }, [routines, sortBy]);

  // UI
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Routines
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
        <Button variant="contained" color="primary" onClick={openCreateDialog}>
          Add Routine
        </Button>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "variables" | "time")}
            label="Sort by"
            startAdornment={<Sort sx={{ mr: 1 }} />}
          >
            <MenuItem value="variables">Number of Variables</MenuItem>
            <MenuItem value="time">Earliest Time</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {sortedRoutines.map((routine) => (
        <Paper key={routine.id} sx={{ p: 2, mb: 3, background: "#222" }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h6">{routine.routine_name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {routine.variables?.length || 0} variables
                {sortBy === "time" && getEarliestTime(routine) && (
                  <span>
                    {" "}
                    • Earliest: {timeString(getEarliestTime(routine) || "")}
                  </span>
                )}
              </Typography>
            </Box>
            <Box>
              <IconButton onClick={() => openEditDialog(routine)}>
                <Edit />
              </IconButton>
              <IconButton onClick={() => handleDeleteRoutine(routine.id)}>
                <Delete />
              </IconButton>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {routine.notes}
          </Typography>

          <Divider sx={{ my: 1 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Variables ({routine.variables?.length || 0})
          </Typography>

          {(routine.variables || []).map((variable: any) => (
            <Box key={variable.id} sx={{ mb: 1, ml: 2 }}>
              <Typography variant="body2">
                <strong>{variable.variable_name}</strong> - Default:{" "}
                {variable.default_value}
                {variable.default_unit && ` ${variable.default_unit}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Weekdays:{" "}
                {variable.weekdays
                  ?.map(
                    (d: number) => weekdays.find((w) => w.value === d)?.label
                  )
                  .join(", ")}
              </Typography>
              {variable.times?.length > 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 2, display: "block" }}
                >
                  Times:{" "}
                  {variable.times
                    .map((timeObj: any) => timeString(timeObj.time))
                    .join(", ")}
                </Typography>
              )}
            </Box>
          ))}
        </Paper>
      ))}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingRoutine ? "Edit Routine" : "Create Routine"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Routine Name"
            value={form?.routine_name || ""}
            onChange={(e) => handleFormChange("routine_name", e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
            error={!form?.routine_name}
            helperText={
              !form?.routine_name ? "Routine name is required" : undefined
            }
          />
          <TextField
            label="Notes"
            value={form?.notes || ""}
            onChange={(e) => handleFormChange("notes", e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Variables
          </Typography>

          <Box display="flex" gap={1} alignItems="center" sx={{ mb: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Add Variable</InputLabel>
              <Select
                value=""
                label="Add Variable"
                onChange={(e) => {
                  const variable = allVariables.find(
                    (v) => v.id === e.target.value
                  );
                  if (variable) {
                    setForm((prev: any) => ({
                      ...prev,
                      variables: [
                        ...prev.variables,
                        {
                          variable_id: variable.id,
                          default_value: "",
                          default_unit: variable.default_display_unit || "",
                          weekdays: [1, 2, 3, 4, 5, 6, 7],
                          times: [],
                        },
                      ],
                    }));
                  }
                }}
              >
                {(allVariables || [])
                  .filter(
                    (v) =>
                      !(form?.variables || []).find(
                        (vv: any) => vv.variable_id === v.id
                      )
                  )
                  .map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.label}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>

          {form?.variables?.map((variable: any, idx: number) => {
            const variableInfo = allVariables.find(
              (v) => v.id === variable.variable_id
            );
            return (
              <Paper key={idx} sx={{ p: 2, mb: 2, background: "#181818" }}>
                <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                  <Typography variant="h6">
                    {variableInfo?.label || variable.variable_id}
                  </Typography>
                  <IconButton
                    onClick={() => {
                      setForm((prev: any) => ({
                        ...prev,
                        variables: prev.variables.filter(
                          (_: any, i: number) => i !== idx
                        ),
                      }));
                      // Clear validation errors for removed variable and reindex
                      setVariableValidationErrors((prev) => {
                        const newErrors: Record<number, string> = {};
                        Object.keys(prev).forEach((key) => {
                          const index = parseInt(key);
                          if (index < idx) {
                            newErrors[index] = prev[index];
                          } else if (index > idx) {
                            newErrors[index - 1] = prev[index];
                          }
                        });
                        return newErrors;
                      });
                    }}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </Box>

                <Box display="flex" gap={2} alignItems="center" sx={{ mb: 2 }}>
                  <TextField
                    label="Default Value"
                    value={variable.default_value}
                    onChange={(e) =>
                      handleVariableChange(idx, "default_value", e.target.value)
                    }
                    sx={{ width: 120 }}
                    error={!!variableValidationErrors[idx]}
                    helperText={variableValidationErrors[idx]}
                  />

                  <FormControl sx={{ width: 120 }}>
                    <InputLabel>Unit</InputLabel>
                    <Select
                      value={variable.default_unit || ""}
                      onChange={(e) =>
                        handleVariableChange(
                          idx,
                          "default_unit",
                          e.target.value
                        )
                      }
                      label="Unit"
                    >
                      <MenuItem value="">
                        <em>No unit</em>
                      </MenuItem>
                      {(variableInfo?.convertible_units || []).map((unit) => (
                        <MenuItem key={unit} value={unit}>
                          {unit}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl sx={{ width: 200 }}>
                    <InputLabel>Weekdays</InputLabel>
                    <Select
                      multiple
                      value={variable.weekdays || []}
                      onChange={(e) =>
                        handleVariableChange(idx, "weekdays", e.target.value)
                      }
                      renderValue={(selected) =>
                        (selected as number[])
                          .map(
                            (d) => weekdays.find((w) => w.value === d)?.label
                          )
                          .join(", ")
                      }
                    >
                      {weekdays.map((day) => (
                        <MenuItem key={day.value} value={day.value}>
                          <Checkbox
                            checked={
                              (variable.weekdays || []).indexOf(day.value) > -1
                            }
                          />
                          <ListItemText primary={day.label} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Times: {variable.times?.length || 0} configured
                </Typography>

                {/* Time Management UI */}
                <Box sx={{ mt: 2 }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={2}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="subtitle2">Times:</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        const newTime = { time: defaultTime() };
                        handleVariableChange(idx, "times", [
                          ...(variable.times || []),
                          newTime,
                        ]);
                      }}
                      startIcon={<Add />}
                    >
                      Add Time
                    </Button>
                  </Box>

                  {(variable.times || []).map(
                    (timeObj: any, timeIdx: number) => (
                      <Box
                        key={timeIdx}
                        display="flex"
                        alignItems="center"
                        gap={2}
                        sx={{ mb: 1, ml: 2 }}
                      >
                        <TextField
                          type="time"
                          value={timeObj.time || ""}
                          onChange={(e) => {
                            const newTimes = [...(variable.times || [])];
                            newTimes[timeIdx] = {
                              ...newTimes[timeIdx],
                              time: e.target.value,
                            };
                            handleVariableChange(idx, "times", newTimes);
                          }}
                          sx={{ width: 140 }}
                          InputLabelProps={{
                            shrink: true,
                          }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {timeObj.time ? timeString(timeObj.time) : ""}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newTimes = variable.times.filter(
                              (_: any, i: number) => i !== timeIdx
                            );
                            handleVariableChange(idx, "times", newTimes);
                          }}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    )
                  )}

                  {(!variable.times || variable.times.length === 0) && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 2 }}
                    >
                      No times configured
                    </Typography>
                  )}
                </Box>
              </Paper>
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            color="primary"
            variant="contained"
            disabled={loading}
          >
            {editingRoutine ? "Save Changes" : "Create Routine"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!message}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {message && <Alert severity={message.type}>{message.text}</Alert>}
      </Snackbar>
    </Box>
  );
}
