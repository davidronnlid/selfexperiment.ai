import React, { useState, useEffect, useMemo } from "react";
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
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  Snackbar,
  Alert,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { Add, Delete, Edit, AccessTime, Sort } from "@mui/icons-material";
import { useUser } from "@/pages/_app";
import { supabase } from "@/utils/supaBase";
import { getVariables } from "@/utils/variableUtils";
import { Variable } from "@/types/variables";
import {
  validateVariableValue,
  type ValidationResult,
} from "@/utils/variableValidation";
import { format } from "date-fns";
import { generatePlannedRoutineLogs } from "@/utils/batchRoutineLogging";
import { PlannedRoutineLog } from "@/utils/batchRoutineLogging";
import BatchRoutineLoggingModal from "./BatchRoutineLoggingModal";
import VariableUnitSelector from "./VariableUnitSelector";

const weekdays = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const timeString = (time: string): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
};

const formatDefaultValue = (value: any, unit: string, variableInfo: any): string => {
  if (!value) return "Not set";
  
  const valueStr = String(value);
  
  // Special formatting for score units
  if (unit === "score" || variableInfo?.default_display_unit === "score" || 
      variableInfo?.label?.toLowerCase().includes("score")) {
    return unit ? `Score ${valueStr}` : `Score ${valueStr}`;
  }
  
  // Regular formatting
  return unit ? `${valueStr} ${unit}` : valueStr;
};

const getCurrentTimeString = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export default function RoutineManager() {
  const { user } = useUser();
  const [routines, setRoutines] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [allVariables, setAllVariables] = useState<Variable[]>([]);
  const [message, setMessage] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [routineToDelete, setRoutineToDelete] = useState<any>(null);
  const [dataHandlingOption, setDataHandlingOption] = useState<'keep' | 'delete' | 'archive'>('keep');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Validation state for individual variables in the form
  const [variableValidationErrors, setVariableValidationErrors] = useState<
    Record<number, string>
  >({});

  // Sorting state
  const [sortBy, setSortBy] = useState<"variables" | "time">("variables");

  // Batch tracking state
  const [batchLoggingOpen, setBatchLoggingOpen] = useState(false);
  const [batchStartDate, setBatchStartDate] = useState<Date>(new Date());
  const [batchEndDate, setBatchEndDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 6); // Default to 1 week
    return date;
  });
  const [plannedLogs, setPlannedLogs] = useState<PlannedRoutineLog[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);

  // Batch tracking filters
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<string[]>([]);
  const [selectedVariableIds, setSelectedVariableIds] = useState<string[]>([]);
  const [selectedTimeIds, setSelectedTimeIds] = useState<string[]>([]);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);

  // Load all routines
  async function loadRoutines() {
    if (!user?.id) return;
    setLoading(true);

    try {
      console.log("Loading routines for user:", user.id);
      
      // First, get all routines for the user
      const { data: routinesData, error: routinesError } = await supabase
        .from("routines")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (routinesError) {
        console.error("Error loading routines:", routinesError);
        setRoutines([]);
        setLoading(false);
        return;
      }

      console.log("Found routines:", routinesData?.length || 0, routinesData);

      if (!routinesData || routinesData.length === 0) {
        setRoutines([]);
        setLoading(false);
        return;
      }

      // Then, get all routine_variables for these routines
      const routineIds = routinesData.map((r) => r.id);
      console.log("Looking for routine variables for routine IDs:", routineIds);

      // First try without the join to see if basic data loads
      const { data: variablesData, error: variablesError } = await supabase
        .from("routine_variables")
        .select("*")
        .in("routine_id", routineIds);

      // If that works, get the variable info separately
      let variableInfoMap: Record<string, any> = {};
      if (variablesData && variablesData.length > 0) {
        const variableIds = [...new Set(variablesData.map((rv: any) => rv.variable_id))];
        const { data: variableInfos, error: varInfoError } = await supabase
          .from("variables")
          .select("id, label, slug, default_display_unit, data_type")
          .in("id", variableIds);
        
        if (varInfoError) {
          console.error("Error loading variable info:", varInfoError);
        }
        
        if (!varInfoError && variableInfos) {
          console.log("Loaded variable infos:", variableInfos);
          variableInfoMap = variableInfos.reduce((acc: Record<string, any>, v: any) => {
            acc[v.id] = v;
            return acc;
          }, {});
          console.log("Created variable info map:", variableInfoMap);
        }
      }

      if (variablesError) {
        console.error("Error loading routine variables:", variablesError);
        console.error("Full error details:", {
          message: variablesError.message,
          details: variablesError.details,
          hint: variablesError.hint,
          code: variablesError.code
        });
      }

      console.log("Found routine variables:", variablesData?.length || 0);
      console.log("Sample routine variable data:", variablesData?.[0]);
      console.log("Variable info map:", variableInfoMap);

              // Combine the data
        const routinesWithVariables = routinesData.map((routine) => {
          console.log(`\n🔧 Processing routine: "${routine.routine_name}" (ID: ${routine.id})`);
          
          const routineVariables = (variablesData || [])
            .filter((rv) => rv.routine_id === routine.id)
            .map((rv) => {
              const variableInfo = variableInfoMap[rv.variable_id];
              const actualVariable = allVariables.find(v => v.id === rv.variable_id);
              console.log(`  📋 Processing variable:`, {
                variable_id: rv.variable_id,
                variable_info_exists: !!variableInfo,
                actual_variable_exists: !!actualVariable,
                variable_name: actualVariable?.label || variableInfo?.label,
                all_variables_count: allVariables.length,
                default_value: rv.default_value,
                times: rv.times,
                weekdays: rv.weekdays
              });

              // Parse times if it's a JSON string, otherwise use as-is
              let times = rv.times;
              if (typeof times === "string") {
                try {
                  times = JSON.parse(times);
                } catch (error) {
                  console.error("Failed to parse times JSON:", error);
                  times = [];
                }
              }

              // Ensure times is always an array
              if (!Array.isArray(times)) {
                times = times ? [times] : [];
              }

              // Parse weekdays if it's a JSON string, otherwise use as-is
              let weekdays = rv.weekdays;
              if (typeof weekdays === "string") {
                try {
                  weekdays = JSON.parse(weekdays);
                } catch (error) {
                  console.error("Failed to parse weekdays JSON:", error);
                  weekdays = [1, 2, 3, 4, 5, 6, 7];
                }
              }

              // Ensure weekdays is always an array
              if (!Array.isArray(weekdays)) {
                weekdays = [1, 2, 3, 4, 5, 6, 7];
              }

              const variableConfig = {
                id: rv.id,
                variable_id: rv.variable_id,
                variable_name: actualVariable?.label || variableInfo?.label || `Unknown Variable (ID: ${rv.variable_id})`,
                variable_slug: actualVariable?.slug || variableInfo?.slug || "",
                default_value: rv.default_value,
                default_unit: rv.default_unit || actualVariable?.default_display_unit || variableInfo?.default_display_unit || "",
                weekdays: weekdays,
                times: times,
              };
              
              if (!actualVariable && !variableInfo) {
                console.warn(`⚠️ Variable not found in allVariables or variableInfoMap for variable_id: ${rv.variable_id}`);
                console.warn(`AllVariables count:`, allVariables.length);
                console.warn(`VariableInfoMap keys:`, Object.keys(variableInfoMap));
              }

              console.log(`  ✅ Final variable config:`, variableConfig);
              return variableConfig;
            });

          console.log(`  📊 Total variables for routine "${routine.routine_name}": ${routineVariables.length}`);
          console.log(`  📋 AllVariables available: ${allVariables.length}`);

        // Count unique time slots
        const uniqueTimes = new Set();
        routineVariables.forEach((variable) => {
          if (Array.isArray(variable.times)) {
            variable.times.forEach((timeObj) => {
              if (typeof timeObj === 'string') {
                uniqueTimes.add(timeObj);
              } else if (timeObj && timeObj.time) {
                uniqueTimes.add(timeObj.time);
              }
            });
          }
        });

        const routineWithVars = {
          ...routine,
          routine_name: routine.routine_name || routine.name,
          variables: routineVariables,
          timeSlotCount: uniqueTimes.size,
        };

        console.log(`Routine "${routineWithVars.routine_name}" configured with:`, {
          variables: routineVariables.length,
          timeSlots: uniqueTimes.size,
          uniqueTimes: Array.from(uniqueTimes)
        });

        return routineWithVars;
      });

      console.log("Final routines with variables:", routinesWithVariables);
      setRoutines(routinesWithVariables);
    } catch (error) {
      console.error("Unexpected error loading routines:", error);
      setRoutines([]);
    }

    setLoading(false);
  }

  async function loadVariables() {
    if (!user?.id) return;
    try {
      console.log("🔄 Loading all variables...");
      // Don't pass userId to get ALL active variables (including system variables)
      const variables = await getVariables();
      console.log("✅ Loaded variables:", variables.length);
      console.log("Sample variables:", variables.slice(0, 3).map(v => ({ id: v.id, label: v.label })));
      setAllVariables(variables);
    } catch (error) {
      console.error("Error loading variables:", error);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadRoutines();
    loadVariables();
  }, [user]);

  if (!user) return null;

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
    // Find the routine to delete
    const routine = routines.find(r => r.id === routineId);
    if (!routine) {
      setSnackbar({ 
        open: true, 
        message: "Routine not found" 
      });
      return;
    }
    
    // Check how many data points are associated with this routine
    const { data: routineDataPoints, error: dataError } = await supabase
      .from("data_points")
      .select("id")
      .eq("routine_id", routineId);
    
    const dataPointCount = routineDataPoints?.length || 0;
    
    // Open the delete confirmation modal
    setRoutineToDelete({ ...routine, dataPointCount });
    setDataHandlingOption('keep'); // Default to keeping data
    setDeleteModalOpen(true);
  }

  async function confirmDeleteRoutine() {
    if (!routineToDelete) return;
    
    setDeleteLoading(true);
    
    try {
      // Handle data based on user's choice
      if (dataHandlingOption === 'delete') {
        // Delete all data points that were created by this routine
        const { error: dataError } = await supabase
          .from("data_points")
          .delete()
          .eq("routine_id", routineToDelete.id);
        
        if (dataError) {
          console.error("Error deleting routine data:", dataError);
        }
      } else if (dataHandlingOption === 'archive') {
        // Update data points to mark them as archived (change source to 'archived_routine')
        const { error: archiveError } = await supabase
          .from("data_points")
          .update({ source: "archived_routine" })
          .eq("routine_id", routineToDelete.id);
        
        if (archiveError) {
          console.error("Error archiving routine data:", archiveError);
        }
      }
      // If 'keep' option, do nothing with the data - it stays as is
      
      // Delete routine_variables first
      const { error: variablesError } = await supabase
        .from("routine_variables")
        .delete()
        .eq("routine_id", routineToDelete.id);
      
      if (variablesError) {
        console.log("Warning: Could not delete routine variables:", variablesError.message);
      }
      
      // Delete the routine itself
      const { error: routineError } = await supabase
        .from("routines")
        .delete()
        .eq("id", routineToDelete.id);
      
      if (routineError) {
        throw new Error(`Failed to delete routine: ${routineError.message}`);
      }
      
      // Show appropriate success message
      let successMessage = "Routine deleted successfully!";
      if (dataHandlingOption === 'keep') {
        successMessage += " Your tracked data has been preserved.";
      } else if (dataHandlingOption === 'archive') {
        successMessage += " Your tracked data has been archived.";
      } else if (dataHandlingOption === 'delete') {
        successMessage += " All routine data has been removed.";
      }
      
      setSnackbar({ 
        open: true, 
        message: successMessage
      });
      
      // Close modal and refresh
      setDeleteModalOpen(false);
      setRoutineToDelete(null);
      await loadRoutines();
      
    } catch (error) {
      console.error("Error deleting routine:", error);
      setSnackbar({ 
        open: true, 
        message: `Failed to delete routine: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setDeleteLoading(false);
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

  // Get filtered variables based on selected routines
  const availableVariables = useMemo(() => {
    const variableMap = new Map();
    const routinesToCheck =
      selectedRoutineIds.length > 0
        ? routines.filter((r) => selectedRoutineIds.includes(r.id))
        : routines;

    routinesToCheck.forEach((routine) => {
      if (Array.isArray(routine.variables)) {
        routine.variables.forEach((v: any) => {
          if (!variableMap.has(v.variable_id)) {
            variableMap.set(v.variable_id, {
              id: v.variable_id,
              name: v.variable_name,
              slug: v.variable_slug,
            });
          }
        });
      }
    });
    return Array.from(variableMap.values());
  }, [routines, selectedRoutineIds]);

  // Get filtered times based on selected routines and variables
  const availableTimes = useMemo(() => {
    const timeMap = new Map();
    const routinesToCheck =
      selectedRoutineIds.length > 0
        ? routines.filter((r) => selectedRoutineIds.includes(r.id))
        : routines;

    routinesToCheck.forEach((routine) => {
      if (Array.isArray(routine.variables)) {
        routine.variables.forEach((v: any) => {
          // Only include this variable's times if it matches our selected variables
          const variableMatches =
            selectedVariableIds.length === 0 ||
            selectedVariableIds.includes(v.variable_id);

          if (variableMatches && Array.isArray(v.times)) {
            v.times.forEach((time: any) => {
              const timeKey = `${routine.id}_${time.time}_${v.variable_id}`;
              if (!timeMap.has(timeKey)) {
                timeMap.set(timeKey, {
                  id: timeKey,
                  time_of_day: time.time,
                  time_name: time.name,
                  routine_name: routine.routine_name,
                  variable_name: v.variable_name,
                });
              }
            });
          }
        });
      }
    });
    return Array.from(timeMap.values());
  }, [routines, selectedRoutineIds, selectedVariableIds]);

  const handleOpenBatchLogging = () => {
    // Clear any previous success message
    setBatchSuccessMessage(null);
    
    // Start with all routines
    let filteredRoutines = routines;

    console.log("=== BATCH TRACKING DEBUG ===");
    console.log("All routines:", routines.length);
    console.log("Available variables count:", allVariables.length);
    console.log("Selected routine IDs:", selectedRoutineIds);
    console.log("Selected variable IDs:", selectedVariableIds);
    console.log("Selected time IDs:", selectedTimeIds);
    console.log("Selected weekdays:", selectedWeekdays);
    console.log(
      "Date range:",
      format(batchStartDate, "yyyy-MM-dd"),
      "to",
      format(batchEndDate, "yyyy-MM-dd")
    );

    // Check if we have any routines with variables
    if (routines.length === 0) {
      setMessage({
        type: "error",
        text: "No routines found. Please create a routine first."
      });
      return;
    }

    const routinesWithVariables = routines.filter(r => r.variables && r.variables.length > 0);
    if (routinesWithVariables.length === 0) {
      setMessage({
        type: "error", 
        text: "No routines with variables found. Please add variables to your routines first."
      });
      return;
    }

    console.log("Routines with variables:", routinesWithVariables.length);

    // Filter by selected routines if any are selected
    if (selectedRoutineIds.length > 0) {
      filteredRoutines = filteredRoutines.filter((r) =>
        selectedRoutineIds.includes(r.id)
      );
      console.log("After routine filter:", filteredRoutines.length);
    }

    // Filter variables and times if any are selected
    if (selectedVariableIds.length > 0 || selectedTimeIds.length > 0) {
      filteredRoutines = filteredRoutines
        .map((routine) => {
          console.log(`Processing routine: ${routine.routine_name} with ${routine.variables?.length || 0} variables`);

          // Filter variables for this routine
          const filteredVariables = (routine.variables || []).filter(
            (variable: any) => {
              console.log(`Checking variable: ${variable.variable_name} (ID: ${variable.variable_id})`);

              // Check if variable should be included
              const variableIncluded =
                selectedVariableIds.length === 0 ||
                selectedVariableIds.includes(variable.variable_id);

              if (!variableIncluded) {
                console.log("Variable excluded by filter");
                return false;
              }

              // If times are selected, filter the variable's times
              if (selectedTimeIds.length > 0) {
                const filteredTimes = (variable.times || []).filter(
                  (time: any) => {
                    const timeId = `${routine.id}_${time.time}_${variable.variable_id}`;
                    return selectedTimeIds.includes(timeId);
                  }
                );

                // Only include variable if it has matching times
                if (filteredTimes.length > 0) {
                  variable.times = filteredTimes;
                  return true;
                }
                console.log("Variable excluded - no matching times");
                return false;
              }

              return true;
            }
          );

          console.log(`Filtered variables for routine: ${filteredVariables.length}`);

          return {
            ...routine,
            variables: filteredVariables,
          };
        })
        .filter((routine) => routine.variables && routine.variables.length > 0);
    }

    // Filter by selected weekdays if any are selected
    if (selectedWeekdays.length > 0) {
      filteredRoutines = filteredRoutines
        .map((routine) => {
          console.log(`Filtering weekdays for routine: ${routine.routine_name}`);
          
          const filteredVariables = (routine.variables || []).map((variable: any) => {
            // Filter the variable's weekdays to only include selected ones
            if (variable.weekdays && Array.isArray(variable.weekdays)) {
              const originalWeekdays = variable.weekdays;
              const filteredWeekdays = variable.weekdays.filter((day: number) => 
                selectedWeekdays.includes(day)
              );
              
              console.log(`Variable ${variable.variable_name}: ${originalWeekdays} -> ${filteredWeekdays}`);
              
              // Only include the variable if it has matching weekdays
              if (filteredWeekdays.length > 0) {
                return {
                  ...variable,
                  weekdays: filteredWeekdays
                };
              }
            }
            return null;
          }).filter(Boolean); // Remove null entries
          
          return {
            ...routine,
            variables: filteredVariables,
          };
        })
        .filter((routine) => routine.variables && routine.variables.length > 0);
      
      console.log("After weekday filter:", filteredRoutines.length);
    }

    console.log("Final filtered routines:", filteredRoutines.length);

    if (filteredRoutines.length === 0) {
      setMessage({
        type: "error",
        text: "No routines match your selected filters. Please adjust your filters or create routines with variables."
      });
      return;
    }

    // Generate planned logs for the selected date range
    const startDateStr = format(batchStartDate, "yyyy-MM-dd");
    const endDateStr = format(batchEndDate, "yyyy-MM-dd");

    const planned = generatePlannedRoutineLogs(
      filteredRoutines,
      startDateStr,
      endDateStr
    );

    console.log("Generated planned logs:", planned.length);
    console.log("First few planned logs:", planned.slice(0, 3));
    console.log("=== END DEBUG ===");

    if (planned.length === 0) {
      setMessage({
        type: "warning",
        text: "No data points will be generated for the selected date range and filters. This might be because the routines don't run on the selected weekdays within your date range, or no variables match your current filters."
      });
      return;
    }

    setPlannedLogs(planned);
    setBatchLoggingOpen(true);
  };

  const handleBatchLogConfirm = async (selectedLogs: PlannedRoutineLog[]) => {
    setBatchLoading(true);
    setBatchSuccessMessage(null); // Clear any previous success message

    try {
      const response = await fetch("/api/routines/batch-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          logs: selectedLogs,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.created > 0) {
          // Success - logs were actually created
          const successMessage = `Successfully created ${result.created} data points!` +
            (result.skipped > 0 ? ` (${result.skipped} already existed)` : "");
          
          setBatchSuccessMessage(successMessage);
          setSnackbar({
            open: true,
            message: successMessage,
          });
        } else {
          // No logs were created - show appropriate message
          let message = "";
          if (result.skipped > 0) {
            message = `No new logs created. ${result.skipped} logs already existed for the selected date range.`;
          } else {
            message = "No logs were created. Please check your filters and date range.";
          }
          
          setBatchSuccessMessage(message);
          setSnackbar({
            open: true,
            message: message,
          });
        }
        setBatchLoggingOpen(false);
      } else {
        const error = await response.json();
        const errorMessage = `Error creating data points: ${error.error}`;
        setBatchSuccessMessage(errorMessage);
        setSnackbar({
          open: true,
          message: errorMessage,
        });
      }
    } catch (error) {
      console.error("Error creating batch data points:", error);
      const errorMessage = "Error creating data points. Please try again.";
      setBatchSuccessMessage(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
      });
    } finally {
      setBatchLoading(false);
    }
  };

  // Clear dependent selections when parent selections change
  useEffect(() => {
    // When routines change, clear variables and times if they're no longer available
    const availableVariableIds = availableVariables.map((v) => v.id);
    const filteredVariableIds = selectedVariableIds.filter((id) =>
      availableVariableIds.includes(id)
    );

    if (filteredVariableIds.length !== selectedVariableIds.length) {
      setSelectedVariableIds(filteredVariableIds);
    }
  }, [selectedRoutineIds, availableVariables]);

  useEffect(() => {
    // When variables change, clear times if they're no longer available
    const availableTimeIds = availableTimes.map((t) => t.id);
    const filteredTimeIds = selectedTimeIds.filter((id) =>
      availableTimeIds.includes(id)
    );

    if (filteredTimeIds.length !== selectedTimeIds.length) {
      setSelectedTimeIds(filteredTimeIds);
    }
  }, [selectedVariableIds, availableTimes]);

  // Sorting functions
  const sortedRoutines = useMemo(() => {
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

      {loading && <Typography>Loading routines...</Typography>}

      {!loading &&
        sortedRoutines.map((routine) => (
          <Paper key={routine.id} sx={{ p: 3, mb: 3, background: "#222", borderRadius: 2 }}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
                  {routine.routine_name}
                </Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                  <Chip
                    size="small"
                    label={`${routine.timeSlotCount || 0} time slot${routine.timeSlotCount !== 1 ? "s" : ""}`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={`${routine.variables?.length || 0} variable${routine.variables?.length !== 1 ? "s" : ""}`}
                    color="secondary"
                    variant="outlined"
                  />
                  {sortBy === "time" && getEarliestTime(routine) && (
                    <Chip
                      size="small"
                      label={`Earliest: ${timeString(getEarliestTime(routine) || "")}`}
                      color="info"
                      variant="outlined"
                    />
                  )}
                </Box>

                {routine.variables && routine.variables.length > 0 && (
                  <Typography
                    variant="body2"
                    color="primary.light"
                    sx={{ mt: 1, fontWeight: 500, fontSize: "0.9rem" }}
                  >
                    📝 Auto-tracks:{" "}
                    {routine.variables
                      .map((v: any) => {
                        // Try to get the actual variable name from allVariables
                        const actualVariable = allVariables.find(av => av.id === v.variable_id);
                        return actualVariable?.label || v.variable_name;
                      })
                      .slice(0, 3)
                      .join(", ")}
                    {routine.variables.length > 3 && ` and ${routine.variables.length - 3} more`}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <IconButton 
                  onClick={() => openEditDialog(routine)}
                  size="small"
                  sx={{ 
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" }
                  }}
                >
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton 
                  onClick={() => handleDeleteRoutine(routine.id)}
                  size="small"
                  sx={{ 
                    backgroundColor: "rgba(255, 0, 0, 0.1)",
                    "&:hover": { backgroundColor: "rgba(255, 0, 0, 0.2)" }
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            
            {routine.notes && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: "italic" }}>
                💬 {routine.notes}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              📊 Variables Configuration ({routine.variables?.length || 0})
            </Typography>

            {(routine.variables || []).length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {routine.variables.map((variable: any, index: number) => (
                  <Box
                    key={variable.id || index}
                    sx={{
                      p: 2.5,
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      borderRadius: 2,
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.light" }}>
                        📈 {(() => {
                          const actualVar = allVariables.find(v => v.id === variable.variable_id);
                          return actualVar?.label || variable.variable_name;
                        })()}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          🎯 Default Value:
                        </Typography>
                        <Typography variant="body1" sx={{ 
                          backgroundColor: "rgba(76, 175, 80, 0.2)", 
                          px: 1.5, 
                          py: 0.5, 
                          borderRadius: 1,
                          fontWeight: 600,
                          display: "inline-block"
                        }}>
                          {(() => {
                            const variableInfo = allVariables.find(v => v.id === variable.variable_id);
                            return formatDefaultValue(
                              variable.default_value, 
                              variable.default_unit, 
                              variableInfo
                            );
                          })()}
                        </Typography>
                      </Box>

                      {variable.times?.length > 0 && (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            ⏰ Tracking Times:
                          </Typography>
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {variable.times.map((timeObj: any, timeIndex: number) => {
                              const timeValue = typeof timeObj === 'string' ? timeObj : timeObj?.time;
                              return (
                                <Chip
                                  key={timeIndex}
                                  size="small"
                                  label={timeString(timeValue || "")}
                                  color="warning"
                                  variant="filled"
                                  sx={{ fontWeight: 600 }}
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                    </Box>

                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        📅 Active Days:
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {(variable.weekdays || []).map((d: number) => {
                          const day = weekdays.find((w) => w.value === d);
                          return (
                            <Chip
                              key={d}
                              size="small"
                              label={day?.label?.substring(0, 3) || d}
                              color="info"
                              variant="outlined"
                              sx={{ fontSize: "0.75rem" }}
                            />
                          );
                        })}
                      </Box>
                    </Box>

                    {(!variable.times || variable.times.length === 0) && (
                      <Box sx={{ 
                        mt: 1, 
                        p: 1, 
                        backgroundColor: "rgba(255, 152, 0, 0.1)", 
                        borderRadius: 1,
                        border: "1px solid rgba(255, 152, 0, 0.3)"
                      }}>
                        <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600 }}>
                          ⚠️ No times configured - variable won't be auto-tracked
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ 
                p: 3, 
                textAlign: "center", 
                backgroundColor: "rgba(255, 152, 0, 0.1)", 
                borderRadius: 2,
                border: "2px dashed rgba(255, 152, 0, 0.3)"
              }}>
                <Typography variant="body1" color="warning.main" sx={{ fontWeight: 600, mb: 1 }}>
                  ⚠️ No variables configured for this routine
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click the edit button to add variables, set default values, and configure tracking times.
                </Typography>
              </Box>
            )}
          </Paper>
        ))}

      {/* Batch Log Routines Section */}
      <Paper sx={{ p: 3, mt: 4, background: "#1e1e1e" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <AccessTime />
          <Typography variant="h6">Batch Track Routines</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create data points for selected routines, variables, and times across
          a date range. Choose specific filters and then generate data points
          with default values for confirmation later.
        </Typography>

        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Filters (leave empty to include all):
        </Typography>

        {/* Debug Section - Show current state */}
        <Box sx={{ mb: 2, p: 2, backgroundColor: "rgba(33, 150, 243, 0.1)", borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Current State:</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Chip label={`${routines.length} routines loaded`} size="small" color="info" />
            <Chip label={`${allVariables.length} variables available`} size="small" color="info" />
            <Chip label={`${availableVariables.length} routine variables`} size="small" color="secondary" />
            <Chip label={`${availableTimes.length} time slots`} size="small" color="secondary" />
          </Box>
          {availableVariables.length === 0 && (
            <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: "block" }}>
              ⚠️ No variables found in routines. Make sure your routines have variables configured.
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
          {/* Routine Filter */}
          <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Routines</InputLabel>
              <Select
                multiple
                value={selectedRoutineIds}
                onChange={(e) =>
                  setSelectedRoutineIds(e.target.value as string[])
                }
                label="Select Routines"
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((routineId) => {
                      const routine = routines.find((r) => r.id === routineId);
                      return (
                        <Chip
                          key={routineId}
                          label={routine?.routine_name || routineId}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {routines.map((routine) => (
                  <MenuItem key={routine.id} value={routine.id}>
                    <Checkbox
                      checked={selectedRoutineIds.includes(routine.id)}
                    />
                    <ListItemText primary={routine.routine_name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Variable Filter */}
          <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Variables</InputLabel>
              <Select
                multiple
                value={selectedVariableIds}
                onChange={(e) =>
                  setSelectedVariableIds(e.target.value as string[])
                }
                label="Select Variables"
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((variableId) => {
                      const variable = availableVariables.find(
                        (v) => v.id === variableId
                      );
                      return (
                        <Chip
                          key={variableId}
                          label={variable?.name || variableId}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {availableVariables.map((variable) => (
                  <MenuItem key={variable.id} value={variable.id}>
                    <Checkbox
                      checked={selectedVariableIds.includes(variable.id)}
                    />
                    <ListItemText primary={variable.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Time Filter */}
          <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Times</InputLabel>
              <Select
                multiple
                value={selectedTimeIds}
                onChange={(e) => setSelectedTimeIds(e.target.value as string[])}
                label="Select Times"
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((timeId) => {
                      const time = availableTimes.find((t) => t.id === timeId);
                      return (
                        <Chip
                          key={timeId}
                          label={`${time?.time_of_day}${
                            time?.time_name ? ` (${time.time_name})` : ""
                          }`}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {availableTimes.map((time) => (
                  <MenuItem key={time.id} value={time.id}>
                    <Checkbox checked={selectedTimeIds.includes(time.id)} />
                    <ListItemText
                      primary={`${time.time_of_day}${
                        time.time_name ? ` (${time.time_name})` : ""
                      }`}
                      secondary={`${time.routine_name} - ${time.variable_name}`}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Day of Week Filter */}
          <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Days</InputLabel>
              <Select
                multiple
                value={selectedWeekdays}
                onChange={(e) => setSelectedWeekdays(e.target.value as number[])}
                label="Select Days"
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((dayValue) => {
                      const day = weekdays.find((d) => d.value === dayValue);
                      return (
                        <Chip
                          key={dayValue}
                          label={day?.label || dayValue}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {weekdays.map((day) => (
                  <MenuItem key={day.value} value={day.value}>
                    <Checkbox checked={selectedWeekdays.includes(day.value)} />
                    <ListItemText primary={day.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Clear Filters */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setSelectedRoutineIds([]);
              setSelectedVariableIds([]);
              setSelectedTimeIds([]);
              setSelectedWeekdays([]);
            }}
          >
            Clear All Filters
          </Button>
        </Box>

        {/* Date Range */}
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 3 }}>
          <TextField
            label="From"
            type="date"
            value={format(batchStartDate, "yyyy-MM-dd")}
            onChange={(e) => setBatchStartDate(new Date(e.target.value))}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="To"
            type="date"
            value={format(batchEndDate, "yyyy-MM-dd")}
            onChange={(e) => setBatchEndDate(new Date(e.target.value))}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleOpenBatchLogging}
            startIcon={<AccessTime />}
            disabled={routines.length === 0 || allVariables.length === 0}
          >
            Preview & Generate Data Points
          </Button>
          
          {/* Test button for debugging */}
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              console.log("=== DEBUG INFO ===");
              console.log("Routines:", routines);
              console.log("AllVariables:", allVariables);
              console.log("Available Variables:", availableVariables);
              console.log("Available Times:", availableTimes);
              
              // Test data generation with a simple example
              if (routines.length > 0) {
                const testLogs = generatePlannedRoutineLogs(
                  routines.slice(0, 1), // Just first routine
                  format(new Date(), "yyyy-MM-dd"), // Today
                  format(new Date(), "yyyy-MM-dd")  // Today
                );
                console.log("Test generated data points:", testLogs);
                setMessage({
                  type: "info",
                  text: `Debug: Found ${routines.length} routines, ${allVariables.length} variables. Generated ${testLogs.length} test data points. Check console for details.`
                });
              } else {
                setMessage({
                  type: "warning",
                  text: "No routines found for testing. Please create a routine first."
                });
              }
            }}
          >
            🐛 Debug Info
          </Button>
        </Box>
      </Paper>

      {/* Batch Success Message */}
      {batchSuccessMessage && (
        <Alert
          severity={batchSuccessMessage.includes("Successfully") ? "success" : batchSuccessMessage.includes("Error") ? "error" : "info"}
          sx={{ mt: 2, mb: 2 }}
          onClose={() => setBatchSuccessMessage(null)}
        >
          {batchSuccessMessage}
        </Alert>
      )}

      {/* Dialogs */}
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

                  <Box sx={{ width: 120 }}>
                    <VariableUnitSelector
                      variableId={variable.variable_id}
                      userId={user?.id || ""}
                      currentUnit={variable.default_unit}
                      onUnitChange={(unitId, unitGroup) =>
                        handleVariableChange(idx, "default_unit", unitId)
                      }
                      label="Unit"
                      size="small"
                    />
                  </Box>

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
                        const newTime = { time: getCurrentTimeString() };
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

      <BatchRoutineLoggingModal
        open={batchLoggingOpen}
        onClose={() => setBatchLoggingOpen(false)}
        plannedLogs={plannedLogs}
        onConfirm={handleBatchLogConfirm}
        loading={batchLoading}
      />

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
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Modal */}
      <Dialog 
        open={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Delete color="error" />
            <Typography variant="h6">Delete Routine</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete <strong>"{routineToDelete?.routine_name}"</strong>?
          </Typography>
          
          {routineToDelete?.dataPointCount > 0 ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This routine has created <strong>{routineToDelete.dataPointCount} data points</strong>. 
                What would you like to do with this tracked data?
              </Typography>
              
              <FormControl component="fieldset" fullWidth>
                <RadioGroup
                  value={dataHandlingOption}
                  onChange={(e) => setDataHandlingOption(e.target.value as 'keep' | 'delete' | 'archive')}
                >
                  <FormControlLabel 
                    value="keep" 
                    control={<Radio />} 
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          Keep all tracked data ({routineToDelete.dataPointCount} data points)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Your historical data will remain unchanged and accessible
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel 
                    value="archive" 
                    control={<Radio />} 
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          Archive tracked data ({routineToDelete.dataPointCount} data points)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Data will be marked as archived but still accessible
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel 
                    value="delete" 
                    control={<Radio />} 
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight="medium" color="error">
                          Delete all tracked data ({routineToDelete.dataPointCount} data points)
                        </Typography>
                        <Typography variant="caption" color="error">
                          This will permanently remove all data created by this routine
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              This routine hasn't created any data points yet, so only the routine configuration will be removed.
            </Typography>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button 
            onClick={() => setDeleteModalOpen(false)}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteRoutine}
            variant="contained" 
            color="error"
            disabled={deleteLoading}
            startIcon={deleteLoading ? null : <Delete />}
          >
            {deleteLoading ? "Deleting..." : "Delete Routine"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
