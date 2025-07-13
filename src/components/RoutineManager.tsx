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
} from "@mui/icons-material";
import { useUser } from "@/pages/_app";
import { supabase } from "@/utils/supaBase";
import { getVariables } from "@/utils/variableUtils";
import { Variable } from "@/types/variables";
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
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toTimeString().slice(0, 5);
};

// Add this helper at the top or in a utils file
async function fetchPlannedLogsForRoutine(routineId: string, userId: string) {
  const today = new Date();
  const start = today.toISOString().split("T")[0] + "T00:00:00Z";
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 13);
  const end = endDate.toISOString().split("T")[0] + "T23:59:59Z";

  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .eq("user_id", userId)
    .eq("source", "planned")
    .gte("created_at", start)
    .lte("created_at", end)
    .contains("context", { routine_id: routineId });

  // Debug log
  // eslint-disable-next-line no-console
  console.log("fetchPlannedLogsForRoutine", { routineId, userId, data, error });

  return data || [];
}

export default function RoutineManager() {
  const { user } = useUser();
  if (!user) return null;
  const [routines, setRoutines] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [allVariables, setAllVariables] = useState<Variable[]>([]); // FIX: always array
  const [message, setMessage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // Add state for selected variable to add to all times
  const [addAllVar, setAddAllVar] = useState<Variable | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });
  const [plannedEdits, setPlannedEdits] = useState<
    Record<
      string,
      Record<string, { default_value: string; default_unit: string }>
    >
  >({});
  const [expandedPlanned, setExpandedPlanned] = useState<
    Record<string, boolean>
  >({});
  const [logsByRoutineVarTime, setLogsByRoutineVarTime] = useState<
    Record<string, Record<string, any[]>>
  >({});
  const [editLogValue, setEditLogValue] = useState<Record<string, string>>({});
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  // Add state for planned logs
  const [plannedLogsByRoutine, setPlannedLogsByRoutine] = useState<
    Record<string, any[]>
  >({});

  // Load all routines
  useEffect(() => {
    if (!user) return;
    loadRoutines();
    getVariables(user?.id).then((variables) =>
      setAllVariables(variables || [])
    );
    // Generate historical logs for existing routines that don't have them
    if (user?.id) {
      generateHistoricalLogsForExistingRoutines(user.id);
    }
  }, [user]);

  // Fetch planned logs for all routines when routines change
  useEffect(() => {
    async function loadPlannedLogs() {
      if (!user || routines.length === 0) return;
      const logsByRoutine: Record<string, any[]> = {};
      for (const routine of routines) {
        logsByRoutine[routine.id] = await fetchPlannedLogsForRoutine(
          routine.id,
          user.id
        );
      }
      setPlannedLogsByRoutine(logsByRoutine);
    }
    loadPlannedLogs();
  }, [user, routines]);

  // Fetch logs for all routines/variables/times when expandedPlanned changes
  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;
      let newLogs: Record<string, Record<string, any[]>> = {};
      for (const routine of routines) {
        newLogs[routine.id] = {};
        for (const [timeIdx, time] of (routine.times || []).entries()) {
          for (const v of time.variables || []) {
            // Fetch logs for this variable/time
            const today = new Date();
            const start = new Date(today);
            start.setDate(today.getDate() - 14);
            const end = new Date(today);
            end.setDate(today.getDate() + 14);
            const startISO = start.toISOString().slice(0, 10) + "T00:00:00Z";
            const endISO = end.toISOString().slice(0, 10) + "T23:59:59Z";

            // Debug logging
            console.log(
              `Fetching logs for routine ${routine.id}, variable ${v.variable_id}, time ${timeIdx}`
            );
            console.log(`Date range: ${startISO} to ${endISO}`);

            const { data, error } = await supabase
              .from("logs")
              .select("*")
              .eq("user_id", user.id)
              .eq("variable_id", v.variable_id)
              .gte("created_at", startISO)
              .lte("created_at", endISO)
              .order("created_at", { ascending: false });

            // Debug logging
            console.log(
              `Found ${data?.length || 0} logs for variable ${v.variable_id}`
            );
            if (error) {
              console.error(
                `Error fetching logs for variable ${v.variable_id}:`,
                error
              );
            }

            newLogs[routine.id][`${timeIdx}_${v.variable_id}`] = data || [];
          }
        }
      }
      console.log("Final logs object:", newLogs);
      setLogsByRoutineVarTime(newLogs);
    };
    // Only fetch if any expanded
    if (Object.values(expandedPlanned).some(Boolean)) fetchLogs();
  }, [expandedPlanned, routines, user]);

  async function loadRoutines() {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_user_routines", {
      p_user_id: user.id,
    });
    setRoutines(data || []);
    setLoading(false);

    // Fetch logs for all routines after they are loaded
    if (data && data.length > 0) {
      await fetchAllRoutineLogs(data);
    }
  }

  async function fetchAllRoutineLogs(routinesToFetch: any[]) {
    if (!user) return;
    console.log("Fetching logs for routines:", routinesToFetch);
    let newLogs: Record<string, Record<string, any[]>> = {};
    for (const routine of routinesToFetch) {
      console.log("Processing routine:", routine.id, routine.routine_name);
      console.log("Routine times:", routine.times);
      newLogs[routine.id] = {};
      for (const [timeIdx, time] of (routine.times || []).entries()) {
        console.log(`Processing time ${timeIdx}:`, time);
        for (const v of time.variables || []) {
          console.log(`Processing variable:`, v);
          // Fetch logs for this variable/time
          const today = new Date();
          const start = new Date(today);
          start.setDate(today.getDate() - 14);
          const end = new Date(today);
          end.setDate(today.getDate() + 14);
          const startISO = start.toISOString().slice(0, 10) + "T00:00:00Z";
          const endISO = end.toISOString().slice(0, 10) + "T23:59:59Z";

          // Debug logging
          console.log(
            `Initial fetch: routine ${routine.id}, variable ${v.variable_id}, time ${timeIdx}`
          );

          const { data, error } = await supabase
            .from("logs")
            .select("*")
            .eq("user_id", user.id)
            .eq("variable_id", v.variable_id)
            .gte("created_at", startISO)
            .lte("created_at", endISO)
            .order("created_at", { ascending: false });

          // Debug logging
          console.log(
            `Initial fetch: Found ${data?.length || 0} logs for variable ${
              v.variable_id
            }`
          );
          if (error) {
            console.error(
              `Error fetching logs for variable ${v.variable_id}:`,
              error
            );
          }

          newLogs[routine.id][`${timeIdx}_${v.variable_id}`] = data || [];
        }
      }
    }
    console.log("Initial logs object:", newLogs);
    setLogsByRoutineVarTime(newLogs);
  }

  function openCreateDialog() {
    setEditingRoutine(null);
    setForm({
      routine_name: "",
      notes: "",
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      times: [
        {
          time_of_day: defaultTime(),
          time_name: "",
          is_active: true,
          display_order: 0,
          variables: [],
        },
      ],
    });
    setDialogOpen(true);
  }

  function openEditDialog(routine: any) {
    setEditingRoutine(routine);
    setForm({
      routine_name: routine.routine_name,
      notes: routine.notes || "",
      weekdays: routine.weekdays,
      times: (routine.times || []).map((t: any, i: number) => ({
        time_of_day: t.time_of_day.slice(0, 5),
        time_name: t.time_name || "",
        is_active: t.is_active,
        display_order: t.display_order,
        variables: (t.variables || []).map((v: any) => ({
          variable_id: v.variable_id,
          default_value: v.default_value,
          default_unit: v.default_unit,
          display_order: v.display_order,
        })),
      })),
    });
    setDialogOpen(true);
  }

  function handleFormChange(field: string, value: any) {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  }

  function handleTimeChange(idx: number, field: string, value: any) {
    setForm((prev: any) => {
      const times = [...prev.times];
      times[idx] = { ...times[idx], [field]: value };
      return { ...prev, times };
    });
  }

  function handleAddTime() {
    setForm((prev: any) => ({
      ...prev,
      times: [
        ...prev.times,
        {
          time_of_day: defaultTime(),
          time_name: "",
          is_active: true,
          display_order: prev.times.length,
          variables: [],
        },
      ],
    }));
  }

  function handleRemoveTime(idx: number) {
    setForm((prev: any) => {
      const times = prev.times.filter((_: any, i: number) => i !== idx);
      return { ...prev, times };
    });
  }

  function handleAddVariableToTime(timeIdx: number, variable: Variable) {
    setForm((prev: any) => {
      const times = [...prev.times];
      if (
        !times[timeIdx].variables.find(
          (v: any) => v.variable_id === variable.id
        )
      ) {
        times[timeIdx].variables.push({
          variable_id: variable.id,
          default_value: "",
          default_unit: variable.canonical_unit || "",
          display_order: times[timeIdx].variables.length,
        });
      }
      return { ...prev, times };
    });
  }

  function handleRemoveVariableFromTime(timeIdx: number, variableId: string) {
    setForm((prev: any) => {
      const times = [...prev.times];
      times[timeIdx].variables = times[timeIdx].variables.filter(
        (v: any) => v.variable_id !== variableId
      );
      return { ...prev, times };
    });
  }

  function handleVariableValueChange(
    timeIdx: number,
    variableId: string,
    field: string,
    value: any
  ) {
    setForm((prev: any) => {
      const times = [...prev.times];
      times[timeIdx].variables = times[timeIdx].variables.map((v: any) =>
        v.variable_id === variableId ? { ...v, [field]: value } : v
      );
      return { ...prev, times };
    });
  }

  function handleAssignVariableToAllTimes(variable: Variable) {
    setForm((prev: any) => {
      const times = prev.times.map((t: any) => {
        if (!t.variables.find((v: any) => v.variable_id === variable.id)) {
          return {
            ...t,
            variables: [
              ...t.variables,
              {
                variable_id: variable.id,
                default_value: "",
                default_unit: variable.canonical_unit || "",
                display_order: t.variables.length,
              },
            ],
          };
        }
        return t;
      });
      return { ...prev, times };
    });
  }

  async function handleSave() {
    if (!user) return;
    const trimmedName = (form.routine_name || "").trim();
    if (!trimmedName) {
      setMessage({
        type: "error",
        text: "Routine name cannot be empty or whitespace.",
      });
      return;
    }
    const payload = {
      user_id: user.id,
      routine_name: trimmedName,
      notes: form.notes,
      weekdays: `{${form.weekdays.join(",")}}`,
      times: form.times.map((t: any, i: number) => ({
        time_of_day: t.time_of_day,
        time_name: t.time_name,
        is_active: t.is_active,
        display_order: i,
        variables: t.variables.map((v: any, j: number) => ({
          variable_id: v.variable_id,
          default_value: v.default_value,
          default_unit: v.default_unit,
          display_order: j,
        })),
      })),
    };
    setLoading(true);
    // Validate all variables before saving
    for (const time of form.times) {
      for (const v of time.variables) {
        const variable = allVariables.find((vv) => vv.id === v.variable_id);
        const rules = variable?.validation_rules;
        const val = parseFloat(v.default_value);
        if (rules) {
          if (
            (rules.min !== undefined && val < rules.min) ||
            (rules.max !== undefined && val > rules.max) ||
            (rules.scaleMin !== undefined && val < rules.scaleMin) ||
            (rules.scaleMax !== undefined && val > rules.scaleMax)
          ) {
            setMessage({
              type: "error",
              text: `Default value for ${
                variable?.label || v.variable_id
              } is out of range.`,
            });
            setLoading(false);
            return;
          }
        }
      }
    }
    const { error } = await supabase.rpc(
      editingRoutine ? "update_routine" : "create_routine",
      editingRoutine
        ? { p_routine_id: editingRoutine.id, p_routine_data: payload }
        : { p_routine_data: payload }
    );
    // If new routine, fetch it and generate planned logs
    if (!editingRoutine && !error && user?.id) {
      // Fetch the new routine with times/variables
      const { data: routines } = await supabase.rpc("get_user_routines", {
        p_user_id: user.id,
      });
      // Find the routine with the same name and notes (most recently created)
      const newRoutine = (routines || []).find(
        (r: any) =>
          r.routine_name === form.routine_name && r.notes === form.notes
      );
      if (newRoutine) {
        await generateAllLogsForRoutine(
          { ...form, id: newRoutine.id },
          user.id
        );
      }
      setSnackbar({
        open: true,
        message: `Routine "${form.routine_name}" created successfully! Historical and planned logs for the past and next 2 weeks have been generated.`,
      });
    }
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({
        type: "success",
        text: `Routine ${editingRoutine ? "updated" : "created"} successfully`,
      });
      setDialogOpen(false);
      loadRoutines();
    }
  }

  async function handleDeleteRoutine(routineId: string) {
    if (!window.confirm("Delete this routine?")) return;
    setLoading(true);
    await supabase.rpc("delete_routine", { p_routine_id: routineId });
    setLoading(false);
    loadRoutines();
  }

  async function handleDuplicateRoutine(routine: any) {
    if (!user) return;
    // Deep copy the routine, remove IDs, and update name
    const newRoutine = {
      ...routine,
      routine_name: `Copy of ${routine.routine_name}`,
      // Remove id and any DB-specific fields
      id: undefined,
      times: (routine.times || []).map((t: any) => ({
        ...t,
        time_id: undefined,
        variables: (t.variables || []).map((v: any) => ({ ...v })),
      })),
    };
    // Prepare payload for create_routine
    const payload = {
      user_id: user.id,
      routine_name: newRoutine.routine_name,
      notes: newRoutine.notes || "",
      weekdays: `{${newRoutine.weekdays.join(",")}}`,
      times: newRoutine.times.map((t: any, i: number) => ({
        time_of_day: t.time_of_day,
        time_name: t.time_name,
        is_active: t.is_active,
        display_order: i,
        variables: t.variables.map((v: any, j: number) => ({
          variable_id: v.variable_id,
          default_value: v.default_value,
          default_unit: v.default_unit,
          display_order: j,
        })),
      })),
    };
    setLoading(true);
    const { error } = await supabase.rpc("create_routine", {
      p_routine_data: payload,
    });
    // If routine created successfully, generate logs for it
    if (!error && user?.id) {
      // Fetch the new routine with times/variables
      const { data: routines } = await supabase.rpc("get_user_routines", {
        p_user_id: user.id,
      });
      // Find the routine with the same name (most recently created)
      const newRoutine = (routines || []).find(
        (r: any) => r.routine_name === newRoutine.routine_name
      );
      if (newRoutine) {
        await generateAllLogsForRoutine(
          { ...newRoutine, times: newRoutine.times },
          user.id
        );
      }
    }
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Routine duplicated successfully" });
      loadRoutines();
    }
  }

  async function handleSavePlannedLog(
    routineId: string,
    timeIdx: number,
    variableId: string
  ) {
    // Save the planned log edit for a variable in a routine/time
    const routine = routines.find((r) => r.id === routineId);
    if (!routine || !user) return;
    const edit = plannedEdits[routineId]?.[`${timeIdx}_${variableId}`];
    if (!edit) return;
    // Update the routine in the DB
    const updatedTimes = (routine.times || []).map((t: any, idx: number) => {
      if (idx !== timeIdx) return t;
      return {
        ...t,
        variables: (t.variables || []).map((v: any) =>
          v.variable_id === variableId
            ? {
                ...v,
                default_value: edit.default_value,
                default_unit: edit.default_unit,
              }
            : v
        ),
      };
    });
    // Prepare payload
    const payload = {
      user_id: user.id,
      routine_name: routine.routine_name,
      notes: routine.notes,
      weekdays: `{${routine.weekdays.join(",")}}`,
      times: updatedTimes.map((t: any, i: number) => ({
        time_of_day: t.time_of_day,
        time_name: t.time_name,
        is_active: t.is_active,
        display_order: i,
        variables: t.variables.map((v: any, j: number) => ({
          variable_id: v.variable_id,
          default_value: v.default_value,
          default_unit: v.default_unit,
          display_order: j,
        })),
      })),
    };
    setLoading(true);
    const { error } = await supabase.rpc("update_routine", {
      p_routine_id: routineId,
      p_routine_data: payload,
    });
    setLoading(false);
    if (error) {
      setSnackbar({
        open: true,
        message: `Error saving planned log: ${error.message}`,
      });
    } else {
      setSnackbar({
        open: true,
        message: `Planned log updated for ${routine.routine_name}`,
      });
      loadRoutines();
    }
  }

  async function handleSaveLogEdit(logId: string, value: string) {
    await supabase.from("logs").update({ value: value }).eq("id", logId);
    setEditingLogId(null);
    setEditLogValue((prev) => ({ ...prev, [logId]: "" }));
    // Refetch logs
    setExpandedPlanned((prev) => ({ ...prev })); // trigger useEffect
  }
  async function handleDeleteLog(logId: string) {
    await supabase.from("logs").delete().eq("id", logId);
    setEditingLogId(null);
    setEditLogValue((prev) => ({ ...prev, [logId]: "" }));
    setExpandedPlanned((prev) => ({ ...prev })); // trigger useEffect
  }

  // UI
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Routines
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={openCreateDialog}
        sx={{ mb: 2 }}
      >
        Add Routine
      </Button>
      {routines.map((routine) => (
        <Paper key={routine.id} sx={{ p: 2, mb: 3, background: "#222" }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h6">{routine.routine_name}</Typography>
            <Box>
              <IconButton onClick={() => openEditDialog(routine)}>
                <Edit />
              </IconButton>
              <IconButton onClick={() => handleDuplicateRoutine(routine)}>
                <ContentCopy />
              </IconButton>
              <IconButton onClick={() => handleDeleteRoutine(routine.id)}>
                <Delete />
              </IconButton>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {routine.notes}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <b>Weekdays:</b>{" "}
            {routine.weekdays
              .map((d: number) => weekdays.find((w) => w.value === d)?.label)
              .join(", ")}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle2" sx={{ mb: 1, flex: 1 }}>
              Routine Logs (Historical & Future)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              {(() => {
                const totalLogs = Object.values(
                  logsByRoutineVarTime[routine.id] || {}
                ).reduce((sum: number, logs: any[]) => sum + logs.length, 0);
                return `${totalLogs} logs (past & future 2 weeks)`;
              })()}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={async () => {
                if (user?.id) {
                  console.log("Testing log generation for routine:", routine);
                  await generateAllLogsForRoutine(routine, user.id);
                  setMessage({
                    type: "success",
                    text: `Logs regenerated for routine "${routine.routine_name}"`,
                  });
                  // Refresh logs
                  await fetchAllRoutineLogs([routine]);
                }
              }}
              sx={{ mr: 1 }}
            >
              Test Generate Logs
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={async () => {
                if (user?.id) {
                  await generateAllLogsForRoutine(routine, user.id);
                  setMessage({
                    type: "success",
                    text: `Logs regenerated for routine "${routine.routine_name}"`,
                  });
                  // Refresh logs
                  const fetchLogs = async () => {
                    let newLogs: Record<string, Record<string, any[]>> = {};
                    for (const [timeIdx, time] of (
                      routine.times || []
                    ).entries()) {
                      for (const v of time.variables || []) {
                        const today = new Date();
                        const start = new Date(today);
                        start.setDate(today.getDate() - 14);
                        const end = new Date(today);
                        end.setDate(today.getDate() + 14);
                        const startISO =
                          start.toISOString().slice(0, 10) + "T00:00:00Z";
                        const endISO =
                          end.toISOString().slice(0, 10) + "T23:59:59Z";
                        const { data } = await supabase
                          .from("logs")
                          .select("*")
                          .eq("user_id", user.id)
                          .eq("variable_id", v.variable_id)
                          .gte("created_at", startISO)
                          .lte("created_at", endISO)
                          .order("created_at", { ascending: false });
                        newLogs[routine.id] = newLogs[routine.id] || {};
                        newLogs[routine.id][`${timeIdx}_${v.variable_id}`] =
                          data || [];
                      }
                    }
                    setLogsByRoutineVarTime((prev) => ({
                      ...prev,
                      ...newLogs,
                    }));
                  };
                  fetchLogs();
                }
              }}
              sx={{ mr: 1 }}
            >
              Regenerate Logs
            </Button>
            <IconButton
              onClick={() =>
                setExpandedPlanned((prev) => ({
                  ...prev,
                  [routine.id]: !prev[routine.id],
                }))
              }
              size="small"
              aria-label={expandedPlanned[routine.id] ? "Collapse" : "Expand"}
            >
              {expandedPlanned[routine.id] ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          {expandedPlanned[routine.id] && (
            <>
              {(routine.times || []).map((time: any, timeIdx: number) => (
                <Box
                  key={time.time_id || timeIdx}
                  sx={{ mb: 2, background: "#181818", borderRadius: 2, p: 2 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                    {time.time_name || timeString(time.time_of_day)} (
                    {timeString(time.time_of_day)})
                  </Typography>
                  {(time.variables || []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No variables assigned.
                    </Typography>
                  ) : (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      {(time.variables || []).map((v: any) => {
                        const variable = allVariables.find(
                          (vv) => vv.id === v.variable_id
                        );
                        const editKey = `${timeIdx}_${v.variable_id}`;
                        const planned = plannedEdits[routine.id]?.[editKey] || {
                          default_value: v.default_value,
                          default_unit: v.default_unit,
                        };
                        const logs =
                          logsByRoutineVarTime[routine.id]?.[editKey] || [];
                        return (
                          <Box
                            key={v.variable_id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              background: "#232323",
                              borderRadius: 1,
                              p: 1,
                            }}
                          >
                            <Typography sx={{ minWidth: 120 }}>
                              {variable?.label || v.variable_id}
                            </Typography>
                            <TextField
                              label="Default Value"
                              value={planned.default_value}
                              onChange={(e) =>
                                setPlannedEdits((prev) => ({
                                  ...prev,
                                  [routine.id]: {
                                    ...(prev[routine.id] || {}),
                                    [editKey]: {
                                      ...planned,
                                      default_value: e.target.value,
                                    },
                                  },
                                }))
                              }
                              sx={{ width: 100 }}
                            />
                            <TextField
                              label="Unit"
                              value={planned.default_unit}
                              onChange={(e) =>
                                setPlannedEdits((prev) => ({
                                  ...prev,
                                  [routine.id]: {
                                    ...(prev[routine.id] || {}),
                                    [editKey]: {
                                      ...planned,
                                      default_unit: e.target.value,
                                    },
                                  },
                                }))
                              }
                              sx={{ width: 80 }}
                            />
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() =>
                                handleSavePlannedLog(
                                  routine.id,
                                  timeIdx,
                                  v.variable_id
                                )
                              }
                            >
                              Save
                            </Button>
                            {/* Log history for this variable/time */}
                            <Box sx={{ ml: 2 }}>
                              <Typography
                                variant="caption"
                                sx={{ color: "#FFD600", fontWeight: 700 }}
                              >
                                Log History (Past & Future 2 Weeks)
                              </Typography>
                              {logs.length === 0 ? (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  No logs found for this variable/time.
                                </Typography>
                              ) : (
                                <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
                                  {logs.map((log: any) => {
                                    const logDate = new Date(log.created_at);
                                    const today = new Date();
                                    const isHistorical = logDate < today;
                                    const isToday =
                                      logDate.toDateString() ===
                                      today.toDateString();

                                    return (
                                      <Box
                                        key={log.id}
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 1,
                                          py: 0.5,
                                          borderBottom: "1px solid #444",
                                          background: isToday
                                            ? "#2a2a2a"
                                            : "transparent",
                                          borderRadius: isToday ? 1 : 0,
                                          px: isToday ? 1 : 0,
                                        }}
                                      >
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            minWidth: 100,
                                            color: isHistorical
                                              ? "#888"
                                              : "#FFD600",
                                            fontWeight: isToday ? 700 : 400,
                                          }}
                                        >
                                          {log.created_at.slice(0, 10)}
                                          {isToday && " (Today)"}
                                          {isHistorical && " (Past)"}
                                        </Typography>
                                        {editingLogId === log.id ? (
                                          <>
                                            <TextField
                                              value={
                                                editLogValue[log.id] ??
                                                log.value
                                              }
                                              onChange={(e) =>
                                                setEditLogValue((prev) => ({
                                                  ...prev,
                                                  [log.id]: e.target.value,
                                                }))
                                              }
                                              sx={{ width: 80, mr: 1 }}
                                            />
                                            <Button
                                              size="small"
                                              onClick={() =>
                                                handleSaveLogEdit(
                                                  log.id,
                                                  editLogValue[log.id] ??
                                                    log.value
                                                )
                                              }
                                            >
                                              Save
                                            </Button>
                                            <Button
                                              size="small"
                                              onClick={() =>
                                                setEditingLogId(null)
                                              }
                                            >
                                              Cancel
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            <Typography
                                              variant="body2"
                                              sx={{ minWidth: 80 }}
                                            >
                                              {log.value}
                                            </Typography>
                                            <Button
                                              size="small"
                                              onClick={() => {
                                                setEditingLogId(log.id);
                                                setEditLogValue((prev) => ({
                                                  ...prev,
                                                  [log.id]: log.value,
                                                }));
                                              }}
                                            >
                                              Edit
                                            </Button>
                                          </>
                                        )}
                                        <Button
                                          size="small"
                                          color="error"
                                          onClick={() =>
                                            handleDeleteLog(log.id)
                                          }
                                        >
                                          Delete
                                        </Button>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              ))}
            </>
          )}
          {(routine.times || []).map((time: any, i: number) => (
            <Box
              key={time.time_id || i}
              sx={{ mb: 2, p: 1, background: "#181818", borderRadius: 2 }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <AccessTime fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {time.time_name || timeString(time.time_of_day)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {timeString(time.time_of_day)}
                </Typography>
              </Box>
              <Box sx={{ ml: 4 }}>
                {(time.variables || []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No variables assigned.
                  </Typography>
                ) : (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {(time.variables || []).map((v: any) => (
                      <Chip key={v.variable_id} label={v.variable_name} />
                    ))}
                  </Box>
                )}
              </Box>
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
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Weekdays</InputLabel>
            <Select
              multiple
              value={form?.weekdays || []}
              onChange={(e) => handleFormChange("weekdays", e.target.value)}
              renderValue={(selected) =>
                (selected as number[])
                  .map((d) => weekdays.find((w) => w.value === d)?.label)
                  .join(", ")
              }
            >
              {weekdays.map((w) => (
                <MenuItem key={w.value} value={w.value}>
                  <Checkbox checked={form?.weekdays?.includes(w.value)} />
                  <ListItemText primary={w.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Times of Day
          </Typography>
          {form?.times?.map((time: any, idx: number) => (
            <Paper key={idx} sx={{ p: 2, mb: 2, background: "#181818" }}>
              <Box display="flex" alignItems="center" gap={2}>
                <TextField
                  label="Time"
                  type="time"
                  value={time.time_of_day}
                  onChange={(e) =>
                    handleTimeChange(idx, "time_of_day", e.target.value)
                  }
                  sx={{ width: 120 }}
                  inputProps={{ step: 60 }}
                />
                <TextField
                  label="Label (optional)"
                  value={time.time_name}
                  onChange={(e) =>
                    handleTimeChange(idx, "time_name", e.target.value)
                  }
                  sx={{ width: 180 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={time.is_active}
                      onChange={(e) =>
                        handleTimeChange(idx, "is_active", e.target.checked)
                      }
                    />
                  }
                  label="Active"
                />
                <IconButton onClick={() => handleRemoveTime(idx)}>
                  <Delete />
                </IconButton>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" sx={{ mb: 1 }}>
                These values will be <b>autologged</b> for this time:
              </Typography>
              {(time.variables || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No variables assigned.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  {(time.variables || []).map((v: any) => {
                    const variable = allVariables.find(
                      (vv) => vv.id === v.variable_id
                    );
                    return (
                      <Box
                        key={v.variable_id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          background: "#222",
                          borderRadius: 1,
                          p: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, minWidth: 120 }}
                        >
                          {variable?.label || v.variable_id}
                        </Typography>
                        <TextField
                          label="Default Value"
                          value={v.default_value}
                          onChange={(e) =>
                            handleVariableValueChange(
                              idx,
                              v.variable_id,
                              "default_value",
                              e.target.value
                            )
                          }
                          sx={{ width: 120 }}
                          type={
                            variable?.data_type === "continuous"
                              ? "number"
                              : "text"
                          }
                          inputProps={{
                            min: variable?.validation_rules?.min,
                            max: variable?.validation_rules?.max,
                            required: variable?.validation_rules?.required,
                            step:
                              variable?.data_type === "continuous"
                                ? "any"
                                : undefined,
                          }}
                          error={(() => {
                            const val = parseFloat(v.default_value);
                            const rules = variable?.validation_rules;
                            if (!v.default_value && rules?.required)
                              return true;
                            if (rules?.min !== undefined && val < rules.min)
                              return true;
                            if (rules?.max !== undefined && val > rules.max)
                              return true;
                            if (
                              rules?.scaleMin !== undefined &&
                              val < rules.scaleMin
                            )
                              return true;
                            if (
                              rules?.scaleMax !== undefined &&
                              val > rules.scaleMax
                            )
                              return true;
                            return false;
                          })()}
                          helperText={(() => {
                            const val = parseFloat(v.default_value);
                            const rules = variable?.validation_rules;
                            if (!v.default_value && rules?.required)
                              return "Required";
                            if (rules?.min !== undefined && val < rules.min)
                              return `Min: ${rules.min}`;
                            if (rules?.max !== undefined && val > rules.max)
                              return `Max: ${rules.max}`;
                            if (
                              rules?.scaleMin !== undefined &&
                              val < rules.scaleMin
                            )
                              return `Min: ${rules.scaleMin}`;
                            if (
                              rules?.scaleMax !== undefined &&
                              val > rules.scaleMax
                            )
                              return `Max: ${rules.scaleMax}`;
                            if (rules?.required) return "Required";
                            if (
                              rules?.min !== undefined &&
                              rules?.max !== undefined
                            )
                              return `Range: ${rules.min} - ${rules.max}`;
                            return undefined;
                          })()}
                        />
                        <TextField
                          label="Unit"
                          value={v.default_unit}
                          onChange={(e) =>
                            handleVariableValueChange(
                              idx,
                              v.variable_id,
                              "default_unit",
                              e.target.value
                            )
                          }
                          sx={{ width: 80 }}
                        />
                        <IconButton
                          onClick={() =>
                            handleRemoveVariableFromTime(idx, v.variable_id)
                          }
                          size="small"
                        >
                          <Close />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              )}
              <Box display="flex" gap={1} alignItems="center" sx={{ mb: 1 }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Add Variable</InputLabel>
                  <Select
                    value=""
                    label="Add Variable"
                    onChange={(e) => {
                      const variable = allVariables.find(
                        (v) => v.id === e.target.value
                      );
                      if (variable) handleAddVariableToTime(idx, variable);
                    }}
                  >
                    {(allVariables || [])
                      .filter(
                        (v) =>
                          !(time.variables || []).find(
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
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    (allVariables || [])
                      .filter(
                        (v) =>
                          !(time.variables || []).find(
                            (vv: any) => vv.variable_id === v.id
                          )
                      )
                      .forEach((v) => handleAddVariableToTime(idx, v));
                  }}
                >
                  Add All
                </Button>
              </Box>
            </Paper>
          ))}
          <Button
            variant="outlined"
            onClick={handleAddTime}
            startIcon={<Add />}
          >
            Add Time
          </Button>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Assign Variable to All Times
          </Typography>
          <Box display="flex" gap={1} alignItems="center" sx={{ mb: 2 }}>
            <Autocomplete
              sx={{ minWidth: 250 }}
              options={(allVariables || []).filter((v) => {
                // Only show variables not already assigned to all times
                if (!form?.times?.length) return true;
                return !form.times.every((t: any) =>
                  (t.variables || []).some((vv: any) => vv.variable_id === v.id)
                );
              })}
              getOptionLabel={(option) => option.label}
              value={addAllVar}
              onChange={(_, newValue) => setAddAllVar(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Select Variable" />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />
            <Button
              variant="outlined"
              disabled={!addAllVar}
              onClick={() => {
                if (addAllVar) {
                  handleAssignVariableToAllTimes(addAllVar);
                  setAddAllVar(null);
                }
              }}
            >
              Add to All Times
            </Button>
          </Box>
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
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <MuiAlert
          onClose={() => setSnackbar({ open: false, message: "" })}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}
