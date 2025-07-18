import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/utils/supaBase";
import DatePicker from "react-datepicker";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Autocomplete from "@mui/material/Autocomplete";
import InputAdornment from "@mui/material/InputAdornment";
import {
  FaTag,
  FaStickyNote,
  FaGlobe,
  FaLock,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import {
  validateVariableValue,
  createVariableLog,
} from "@/utils/variableUtils";
import { Variable } from "@/types/variables";
import ValidatedInput from "@/components/ValidatedInput";
import DropdownInput from "@/components/DropdownInput";
import ConstrainedInput from "@/components/ConstrainedInput";
import ValidatedVariableInput from "@/components/ValidatedVariableInput";
import VariableCreationDialog from "@/components/VariableCreationDialog";
import Link from "next/link";
import {
  Container,
  Box,
  Tabs,
  Tab,
  Chip,
  FormControlLabel,
  Checkbox,
  IconButton,
} from "@mui/material";
import { useUser } from "../_app";
import SearchIcon from "@mui/icons-material/Search";
import "react-datepicker/dist/react-datepicker.css";
import { LinearProgress } from "@mui/material";
import { LOG_LABELS, validateValue } from "@/utils/logLabels";
import {
  validateVariableValue as validateWithConstraints,
  getConstraintsText,
  type Variable as ValidationVariable,
} from "@/utils/variableValidation";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { useRouter } from "next/router";
import {
  Collapse,
  Card,
  CardHeader,
  CardContent,
  CardActions,
} from "@mui/material";

// Dynamic variable options will be loaded from the database

interface DataPointEntry {
  id: number;
  date: string; // Now contains full timestamp (ISO string)
  variable: string;
  variable_id?: string; // UUID field for new data_points table
  value: string;
  notes?: string;
  created_at?: string; // Also a full timestamp
}

// Helper to get icon for a variable
const getVariableIcon = (label: string, userVars: any[]) => {
  const found = LOG_LABELS.find((opt) => opt.label === label);
  if (found) return found.icon || "📝";
  const userVar = userVars.find((v: any) => v.label === label);
  return userVar?.icon || "🆕";
};

// Helper: map of variable value to emoji
const useEmojiMap = (
  userVars: any[],
  pendingVariable: string,
  pendingEmoji: string
): Record<string, string> => {
  const emojiMap: Record<string, string> = {};
  // Only use icon from userVars (not LABEL_OPTIONS)
  userVars
    .filter((opt) => typeof opt === "object" && opt !== null)
    .forEach((opt) => {
      if (opt.icon) emojiMap[opt.label] = opt.icon;
    });
  if (pendingVariable) emojiMap[pendingVariable] = pendingEmoji;
  return emojiMap;
};

// Helper for variable name and link
function VariableNameLink({
  log,
  variables,
}: {
  log: any;
  variables: Variable[];
}) {
  let variableSlug = log.variable;
  let variableLabel = log.variable;
  if (log.variable_id && variables && Array.isArray(variables)) {
    const foundVar = variables.find((v) => v.id === log.variable_id);
    if (foundVar) {
      variableSlug = foundVar.slug;
      variableLabel = foundVar.label;
    }
  }
  if (!variableSlug) variableSlug = log.variable_id || "unknown-variable";
  if (!variableLabel) variableLabel = log.variable_id || "unknown-variable";
  return (
    <Link
      href={`/variable/${encodeURIComponent(variableSlug)}`}
      passHref
      style={{
        color: "#FFD700",
        textDecoration: "underline",
        fontWeight: 500,
        fontSize: "0.85em",
        marginLeft: 4,
      }}
      title={`View variable: ${variableLabel}`}
    >
      {variableLabel}
    </Link>
  );
}

export default function ManualTrackPage() {
  const { user, loading: userLoading, refreshUser, username } = useUser();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const [tabValue, setTabValue] = useState(0);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [variablesLoading, setVariablesLoading] = useState(true);
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(
    null
  );
  const [value, setValue] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [activeExperiments, setActiveExperiments] = useState<any[]>([]);
  const [experimentsLogsToday, setExperimentsLogsToday] = useState<
    Record<string, DataPointEntry[]>
  >({});
  const [experimentsNeedingLogs, setExperimentsNeedingLogs] = useState<any[]>(
    []
  );
  const [logs, setLogs] = useState<DataPointEntry[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [expError, setExpError] = useState("");
  const [experimentValues, setExperimentValues] = useState<
    Record<string, string>
  >({});
  const [experimentNotes, setExperimentNotes] = useState<
    Record<string, string>
  >({});
  const [selectedInterval, setSelectedInterval] = useState<string>("");
  const [pendingVariable, setPendingVariable] = useState("");
  const [pendingEmoji, setPendingEmoji] = useState("🆕");
  const [isValueValid, setIsValueValid] = useState<boolean>(true);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [variableSettings, setVariableSettings] = useState<any[]>([]);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [isLogPrivate, setIsLogPrivate] = useState(false); // false = public (default), true = private
  const [editExperimentLog, setEditExperimentLog] =
    useState<DataPointEntry | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [maxLogsWarning, setMaxLogsWarning] = useState(false);
  const [maxLogsWarningMsg, setMaxLogsWarningMsg] = useState("");
  const [experimentProgress, setExperimentProgress] = useState(0);
  const [loggingStreak, setLoggingStreak] = useState(0);
  const [totalExperimentDays, setTotalExperimentDays] = useState(0);
  const [labelOptions, setLabelOptions] = useState<any[]>([]);
  const [independentVariable, setIndependentVariable] = useState<string>("");
  const [dependentVariable, setDependentVariable] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [editingDate, setEditingDate] = useState<Date>(new Date());
  const [editingValidationError, setEditingValidationError] =
    useState<string>("");
  const [editingIsValid, setEditingIsValid] = useState<boolean>(true);

  // New variable creation state
  const [showVariableCreationDialog, setShowVariableCreationDialog] =
    useState(false);
  const [newVariableName, setNewVariableName] = useState("");
  const [pendingVariableSelection, setPendingVariableSelection] = useState<
    string | null
  >(null);

  // Add state to control visibility of the Active Experiments card
  const [showActiveExperiments, setShowActiveExperiments] = useState(true);

  const [routineSnackbar, setRoutineSnackbar] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });

  const [logHistoryOpen, setLogHistoryOpen] = useState<{
    [key: string]: boolean;
  }>({});
  const [logHistory, setLogHistory] = useState<{ [key: string]: any[] }>({});
  // Add state for editing log values in history
  const [logHistoryEdit, setLogHistoryEdit] = useState<{
    [key: string]: { [logId: string]: string | null };
  }>({});

  const [todaysPlannedLogs, setTodaysPlannedLogs] = useState<any[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch routine names for auto logs
  const [routineNames, setRoutineNames] = useState<Record<string, string>>({});

  // Enhanced grouping function that uses fetched routine names
  const groupLogsBySourceWithNames = (logs: any[]) => {
    const grouped: Record<string, any> = {
      manual: {
        sourceName: "Manual Data Points",
        logs: [],
      },
      auto: {
        sourceName: "Auto-Tracked Data Points",
        routines: {} as Record<string, any>,
      },
    };

    logs.forEach((log) => {
      const source =
        log.source && Array.isArray(log.source) ? log.source[0] : log.source;

      if (source === "routine" || source === "auto") {
        // This is an auto log - group by routine
        const routineId = log.routine_id || log.context?.routine_id;
        const routineName =
          routineNames[routineId] ||
          log.context?.routine_name ||
          `Routine ${routineId}`;

        if (routineId) {
          if (!grouped.auto.routines[routineId]) {
            grouped.auto.routines[routineId] = {
              routineName: routineName,
              routineId: routineId,
              logs: [],
            };
          }
          grouped.auto.routines[routineId].logs.push(log);
        } else {
          // Auto log without routine ID - put in general auto
          grouped.auto.logs = grouped.auto.logs || [];
          grouped.auto.logs.push(log);
        }
      } else {
        // Manual log
        grouped.manual.logs.push(log);
      }
    });

    return grouped;
  };

  // Merge manual and planned logs for display
  const allLogs = useMemo(() => {
    return [
      ...logs.map((log) => ({ ...log, _source: "manual" })),
      ...todaysPlannedLogs.map((log) => ({ ...log, _source: "planned" })),
    ].sort((a, b) => {
      // Use logged_at or date for sorting
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      return bDate.getTime() - aDate.getTime();
    });
  }, [logs, todaysPlannedLogs]);

  const groupedLogs = useMemo(() => {
    return groupLogsBySourceWithNames(allLogs);
  }, [allLogs, routineNames]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setVariablesLoading(true);
    (async () => {
      try {
        console.log("Starting data fetch for log page...");

        // Parallelize all database calls
        const [variablesRes, logsRes, experimentsRes, routinesRes] =
          await Promise.all([
            supabase.from("variables").select("*").eq("is_active", true),
            supabase.from("data_points").select("*").eq("user_id", user.id),
            supabase
              .from("experiments")
              .select("*")
              .eq("user_id", user.id)
              .gte("end_date", new Date().toISOString().split("T")[0]),
            supabase
              .from("routines")
              .select("id, routine_name")
              .eq("user_id", user.id),
          ]);

        console.log("Data fetch completed, processing results...");

        // Debug: Log the variables response
        console.log("Variables response:", variablesRes);
        console.log("Variables data:", variablesRes.data);
        console.log("Variables error:", variablesRes.error);
        console.log("Variables count:", variablesRes.data?.length || 0);

        // Debug: Log each variable
        if (variablesRes.data && variablesRes.data.length > 0) {
          console.log("First 3 variables:");
          variablesRes.data.slice(0, 3).forEach((variable, index) => {
            console.log(
              `${index + 1}. ${variable.icon} ${variable.label} (${
                variable.id
              })`
            );
          });
        } else {
          console.log("No variables found in response");
        }

        // Set basic data
        setVariables(variablesRes.data || []);
        setRoutines([]); // Empty for now since we removed the RPC call
        setActiveExperiments(experimentsRes.data || []);
        setLabelOptions(variablesRes.data || []);

        // Process routine names
        const routineNameMap: Record<string, string> = {};
        (routinesRes.data || []).forEach((routine: any) => {
          routineNameMap[routine.id] = routine.routine_name;
        });

        setRoutineNames(routineNameMap);

        console.log(
          "Variables state set, count:",
          (variablesRes.data || []).length
        );

        // Set empty planned logs for now
        setTodaysPlannedLogs([]);

        // Process experiments filtering using existing logs data
        if (experimentsRes.data && logsRes.data) {
          const now = new Date();
          const pad = (n: number) => n.toString().padStart(2, "0");
          const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
            now.getDate()
          )}`; // Get YYYY-MM-DD format in local time
          const todaysLogs = logsRes.data.filter(
            (log: any) => log.date && log.date.startsWith(today)
          );

          // Set only today's data points for the Today's Data Points section
          setLogs(todaysLogs);

          const filtered = filterExperimentsNeedingLogs(
            experimentsRes.data,
            todaysLogs
          );
          setExperimentsNeedingLogs(filtered);
        } else {
          // If no logs data, set empty array
          setLogs([]);
        }

        console.log("Data processing completed");
        setVariablesLoading(false);
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setVariablesLoading(false);
        setLoading(false);
      }
    })();
  }, [user]);

  // Helper function to get variable name from variable_id
  const getVariableNameFromLog = (log: DataPointEntry): string => {
    // If log has variable_id, look up the variable in the variables array
    if (log.variable_id && variables.length > 0) {
      const variable = variables.find((v) => v.id === log.variable_id);
      if (variable) {
        return variable.label;
      }
    }
    // Fallback to the legacy variable field
    return log.variable || "Unknown Variable";
  };

  // Helper function to get variable slug from variable_id
  const getVariableSlugFromLog = (log: DataPointEntry): string => {
    // If log has variable_id, look up the variable in the variables array
    if (log.variable_id && variables.length > 0) {
      const variable = variables.find((v) => v.id === log.variable_id);
      if (variable) {
        return variable.slug;
      }
    }
    // Fallback to the legacy variable field
    return log.variable || "unknown-variable";
  };

  // Helper function to get variable icon from log
  const getVariableIconFromLog = (log: DataPointEntry): string => {
    // If log has variable_id, look up the variable in the variables array
    if (log.variable_id && variables.length > 0) {
      const variable = variables.find((v) => v.id === log.variable_id);
      if (variable) {
        return variable.icon || "📝";
      }
    }
    // Fallback to LOG_LABELS for legacy logs
    const logLabel = LOG_LABELS.find((label) => label.label === log.variable);
    return logLabel?.icon || "📝";
  };

  // Validation function for edit form
  const validateEditValue = (
    value: string,
    log: DataPointEntry
  ): { isValid: boolean; error?: string } => {
    if (!value.trim()) {
      return { isValid: false, error: "Value is required" };
    }

    // First try database validation if we have variable_id
    if (log.variable_id && variables.length > 0) {
      const variable = variables.find((v) => v.id === log.variable_id);
      if (variable) {
        const result = validateWithConstraints(
          value,
          variable as ValidationVariable
        );
        if (!result.isValid) {
          return { isValid: false, error: result.error };
        }
      }
    }

    // Fallback to LOG_LABELS validation for legacy logs
    const logLabel = LOG_LABELS.find((label) => label.label === log.variable);
    if (logLabel) {
      const result = validateValue(logLabel.label, value);
      if (!result.isValid) {
        return { isValid: false, error: result.error };
      }
    }

    return { isValid: true };
  };

  // Calculate experiment progress
  const calculateExperimentProgress = () => {
    if (experimentsNeedingLogs.length === 0) return;

    const experiment = experimentsNeedingLogs[0];
    const startDate = new Date(experiment.start_date);
    const endDate = new Date(experiment.end_date);
    const today = new Date();

    const totalDays =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
    const daysPassed =
      Math.ceil(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    setTotalExperimentDays(totalDays);
    setExperimentProgress(Math.min((daysPassed / totalDays) * 100, 100));
  };

  // Check and refresh user state if needed
  useEffect(() => {
    const checkUserState = async () => {
      if (!userLoading && !user) {
        console.log("LogPage: User state is undefined, attempting refresh...");
        try {
          await refreshUser();
        } catch (error) {
          console.error("LogPage: Failed to refresh user state:", error);
        }
      }
    };

    checkUserState();
  }, [user, userLoading, refreshUser]);

  // Calculate logging streak
  const calculateLoggingStreak = async () => {
    if (!user || experimentsNeedingLogs.length === 0 || !logs.length) return;

    const experiment = experimentsNeedingLogs[0];
    const experimentVariable = variables.find(
      (v) => v.label === experiment.variable
    );
    if (!experimentVariable) return;

    // Use existing logs data instead of making a new database call
    const recentLogs = logs
      .filter(
        (log) =>
          log.variable_id === experimentVariable.id ||
          log.variable === experiment.variable
      )
      .filter((log) => log.date && log.date >= experiment.start_date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    if (!recentLogs || recentLogs.length === 0) {
      setLoggingStreak(0);
      return;
    }

    let streak = 0;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}`; // Get YYYY-MM-DD format in local time
    let currentDate = today;

    for (const log of recentLogs) {
      // Extract just the date part from the timestamp
      const logDate = log.date.split("T")[0];
      if (logDate === currentDate) {
        streak++;
        const date = new Date(currentDate);
        date.setDate(date.getDate() - 1);
        currentDate = date.toISOString().split("T")[0];
      } else {
        break;
      }
    }

    setLoggingStreak(streak);
  };

  // Check if current time is within any of the experiment's time intervals
  const isCurrentTimeInIntervals = (timeIntervals: any): boolean => {
    // If no intervals specified, experiment is always active
    if (!timeIntervals || timeIntervals.length === 0) {
      return true;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes from midnight

    // Check if current time falls within any interval
    return timeIntervals.some((interval: any) => {
      if (typeof interval === "string") {
        // Handle legacy string format (e.g., "21:00")
        return true; // For now, accept legacy format
      }

      if (interval.start && interval.end) {
        // Parse time intervals
        const startParts = interval.start.split(":");
        const endParts = interval.end.split(":");

        if (startParts.length !== 2 || endParts.length !== 2) {
          return false; // Invalid time format
        }

        const startMinutes =
          parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

        // Handle cases where end time is before start time (crosses midnight)
        if (endMinutes < startMinutes) {
          return currentTime >= startMinutes || currentTime <= endMinutes;
        } else {
          return currentTime >= startMinutes && currentTime <= endMinutes;
        }
      }

      return false; // Invalid interval format
    });
  };

  // Filter experiments that still need logs today
  const filterExperimentsNeedingLogs = (
    experiments: any[],
    todaysLogs: DataPointEntry[]
  ) => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}`; // Get YYYY-MM-DD format in local time

    return experiments.filter((experiment) => {
      // Find the variable objects for comparison
      const independentVariable = variables.find(
        (v) => v.label === experiment.variable
      );
      const dependentVariable = variables.find(
        (v) => v.label === (experiment.effect || experiment.dependent_variable)
      );

      // Count how many logs for the independent variable were made today
      const independentLogsToday = todaysLogs.filter(
        (log) =>
          (log.variable_id === independentVariable?.id ||
            log.variable === experiment.variable) &&
          log.date.startsWith(today)
      ).length;

      // Count how many logs for the dependent variable were made today
      const dependentLogsToday = dependentVariable
        ? todaysLogs.filter(
            (log) =>
              (log.variable_id === dependentVariable.id ||
                log.variable ===
                  (experiment.effect || experiment.dependent_variable)) &&
              log.date.startsWith(today)
          ).length
        : 0;

      // Check if we haven't reached the required frequency for today for either variable
      const independentNeedsMoreLogs =
        independentLogsToday < (experiment.frequency || 1);
      const dependentNeedsMoreLogs = dependentVariable
        ? dependentLogsToday < (experiment.frequency || 1)
        : false;

      // Check if current time is within the experiment's time intervals
      const inTimeInterval = isCurrentTimeInIntervals(
        experiment.time_intervals
      );

      // Only include if we need more logs for either variable and we're in time interval
      return (
        (independentNeedsMoreLogs || dependentNeedsMoreLogs) && inTimeInterval
      );
    });
  };

  // Calculate progress when experiments load
  useEffect(() => {
    calculateExperimentProgress();
    calculateLoggingStreak();
  }, [experimentsNeedingLogs, user]);

  const fetchLogs = async () => {
    if (!user) return;

    // Calculate start of today in local time as string
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}`; // Get YYYY-MM-DD format in local time

    // Fetch more logs since we'll filter in JavaScript
    const { data } = await supabase
      .from("data_points")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(200);

    // Filter logs to today's date using JavaScript since date is stored as text
    const todaysLogs = (data || []).filter(
      (log) => log.date && log.date.startsWith(today)
    );

    setLogs(todaysLogs);

    // Also refresh experiments filtering
    if (todaysLogs && activeExperiments.length > 0) {
      const filtered = filterExperimentsNeedingLogs(
        activeExperiments,
        todaysLogs
      );
      setExperimentsNeedingLogs(filtered);
    }
  };

  const submitLog = async () => {
    if (!user || !selectedVariable || !value.trim()) {
      setExpError("Please select a variable and enter a value");
      return;
    }

    // Enhanced validation using the new validation system
    let isValid = true;
    let errorMessage = "";

    // First try the new validation system with database constraints
    const validationResult = validateWithConstraints(
      value,
      selectedVariable as ValidationVariable
    );
    if (!validationResult.isValid) {
      isValid = false;
      errorMessage = validationResult.error || "Invalid value";
    }

    // Fallback to LOG_LABELS validation for backward compatibility
    if (isValid) {
      const logLabelValidation = validateValue(selectedVariable.label, value);
      if (!logLabelValidation.isValid) {
        isValid = false;
        errorMessage = logLabelValidation.error || "Invalid value";
      }
    }

    if (!isValid) {
      setExpError(errorMessage);
      return;
    }

    setSubmitting(true);
    setExpError("");

    try {
      // Use the selected date and time directly, but store as local time string (not UTC)
      const selectedDateTime = new Date(date);
      const pad = (n: number) => n.toString().padStart(2, "0");
      const localDateString = `${selectedDateTime.getFullYear()}-${pad(
        selectedDateTime.getMonth() + 1
      )}-${pad(selectedDateTime.getDate())}T${pad(
        selectedDateTime.getHours()
      )}:${pad(selectedDateTime.getMinutes())}:${pad(
        selectedDateTime.getSeconds()
      )}`;

      const logData = {
        user_id: user.id,
        variable_id: selectedVariable.id,
        value: value.trim(),
        notes: notes.trim() || null,
        created_at: localDateString, // store as local time string
        date: localDateString, // store as local time string for display
        source: ["manual"],
      };

      const { data, error } = await supabase
        .from("data_points")
        .insert([logData])
        .select();

      if (error) {
        throw error;
      }

      // Success
      setSuccessMessage(
        `Successfully logged ${selectedVariable.label}: ${value}`
      );
      setShowSuccess(true);

      // Reset form
      setSelectedVariable(null);
      setValue("");
      setNotes("");

      // Refresh logs
      await fetchLogs();

      // Refresh experiments filtering in case this log affects experiment requirements
      await refreshExperimentsFiltering();
    } catch (error) {
      console.error("Error saving log:", error);
      setExpError("Failed to save log: " + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitExperimentLog = async (
    experimentVariableName: string,
    logValue: string,
    logNotes: string
  ) => {
    if (!user || !experimentVariableName || !logValue.trim()) {
      setExpError(`Please enter a value for ${experimentVariableName}`);
      return;
    }

    // Find variable by label
    const variable = variables.find((v) => v.label === experimentVariableName);
    if (!variable) {
      setExpError("Variable not found");
      return;
    }

    // Validate the value using the proper validation function
    const validation = validateValue(experimentVariableName, logValue);
    if (!validation.isValid) {
      setExpError(validation.error || "Invalid value");
      return;
    }

    setSubmitting(true);
    setExpError("");

    try {
      const selectedDateTime = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const localDateString = `${selectedDateTime.getFullYear()}-${pad(
        selectedDateTime.getMonth() + 1
      )}-${pad(selectedDateTime.getDate())}T${pad(
        selectedDateTime.getHours()
      )}:${pad(selectedDateTime.getMinutes())}:${pad(
        selectedDateTime.getSeconds()
      )}`;
      const logData = {
        user_id: user.id,
        variable_id: variable.id,
        value: logValue.trim(),
        notes: logNotes.trim() || null,
        created_at: localDateString,
        date: localDateString,
        source: ["manual"],
      };

      const { data, error } = await supabase
        .from("data_points")
        .insert([logData])
        .select();

      if (error) {
        throw error;
      }

      // Clear the form
      setExperimentValues((prev) => ({
        ...prev,
        [experimentVariableName]: "",
      }));
      setExperimentNotes((prev) => ({
        ...prev,
        [experimentVariableName]: "",
      }));

      // Refresh today's logs and experiments
      await fetchLogs();
      setSuccessMessage(`Successfully logged ${experimentVariableName}!`);
      setShowSuccess(true);
    } catch (error) {
      console.error("Error logging experiment data:", error);
      setExpError("Failed to log experiment data. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitExperimentLogs = async (
    variablesToLog: Array<{
      name: string;
      value: string;
      notes: string;
    }>
  ) => {
    if (!user) return;

    // Map variable names to variable objects
    const selectedDateTime = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const localDateString = `${selectedDateTime.getFullYear()}-${pad(
      selectedDateTime.getMonth() + 1
    )}-${pad(selectedDateTime.getDate())}T${pad(
      selectedDateTime.getHours()
    )}:${pad(selectedDateTime.getMinutes())}:${pad(
      selectedDateTime.getSeconds()
    )}`;
    const logDataArray = variablesToLog
      .map((variable) => {
        const variableObj = variables.find((v) => v.label === variable.name);
        return {
          user_id: user.id,
          variable_id: variableObj?.id,
          value: variable.value.trim(),
          notes: variable.notes.trim() || null,
          created_at: localDateString,
          date: localDateString,
          source: ["manual"],
        };
      })
      .filter((log) => log.variable_id);

    if (logDataArray.length === 0) return;

    const { data, error } = await supabase
      .from("data_points")
      .insert(logDataArray)
      .select();

    if (error) {
      setExpError("Failed to log experiment data. Please try again.");
      return;
    }

    // Success - show success message
    const variableNames = logDataArray.map((log) => {
      const experimentVariable = variables.find(
        (v) => v.id === log.variable_id
      );
      return experimentVariable?.label || log.variable_id;
    });

    setSuccessMessage(
      `Successfully logged ${variableNames.join(" and ")} for your experiment!`
    );
    setShowSuccess(true);

    // Refresh logs and experiments filtering
    await fetchLogs();
    await refreshExperimentsFiltering();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Privacy settings loading temporarily disabled - using new universal variables system
  useEffect(() => {
    if (!user) return;
    // TODO: Implement privacy settings with new universal variables schema
    setVariableSettings([]);
    setPrivacyLoading(false);
  }, [user]);

  const getVariableSharingStatus = (variableName: string) => {
    const setting = variableSettings.find(
      (s) => s.variable_name === variableName
    );
    return setting?.sharing_level || "private";
  };

  // Function to refresh experiments filtering
  const refreshExperimentsFiltering = async () => {
    if (!user) return;

    try {
      // Reload today's data points
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate()
      )}`; // Get YYYY-MM-DD format in local time

      // Fetch more logs since we'll filter in JavaScript
      const { data } = await supabase
        .from("data_points")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      // Filter logs to today's date using JavaScript since date is stored as text
      const todaysLogs = (data || []).filter(
        (log) => log.date && log.date.startsWith(today)
      );

      if (todaysLogs) {
        setLogs(todaysLogs);

        // Refilter experiments based on updated logs
        const filtered = filterExperimentsNeedingLogs(
          activeExperiments,
          todaysLogs
        );
        setExperimentsNeedingLogs(filtered);
      }
    } catch (error) {
      console.error("Error refreshing experiments:", error);
    }
  };

  // Handle log editing
  const handleEditLog = (log: DataPointEntry) => {
    setEditingLogId(log.id);
    setEditingValue(log.value);
    setEditingNotes(log.notes || "");
    setEditingDate(new Date(log.date));
    setEditingValidationError("");
    setEditingIsValid(true);
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditingValue("");
    setEditingNotes("");
    setEditingDate(new Date());
    setEditingValidationError("");
    setEditingIsValid(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLogId) return;

    // Find the log being edited
    const log = logs.find((l) => l.id === editingLogId);
    if (!log) return;

    // Validate the value
    const validation = validateEditValue(editingValue, log);
    if (!validation.isValid) {
      setEditingValidationError(validation.error || "Invalid value");
      setEditingIsValid(false);
      return;
    }

    const { error } = await supabase
      .from("data_points")
      .update({ value: editingValue, notes: editingNotes })
      .eq("id", editingLogId);
    if (!error) {
      setEditingLogId(null);
      setEditingValue("");
      setEditingNotes("");
      setEditingValidationError("");
      setEditingIsValid(true);
      await fetchLogs();
      setSuccessMessage("Log updated successfully!");
      setShowSuccess(true);
    } else {
      setExpError("Failed to update log. Please try again.");
    }
  };

  // Handle log deletion
  const handleDeleteLog = async (logId: number) => {
    if (!confirm("Are you sure you want to delete this log?")) return;
    const { error } = await supabase
      .from("data_points")
      .delete()
      .eq("id", logId);
    if (!error) {
      await fetchLogs();
      setSuccessMessage("Log deleted successfully!");
      setShowSuccess(true);
    } else {
      setExpError("Failed to delete log. Please try again.");
    }
  };

  // Helper function to capitalize first letter of each word
  const capitalizeVariableName = (name: string): string => {
    return name
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Handle new variable creation
  const handleVariableCreated = (newVariable: any) => {
    // Add to variables list
    setVariables((prev) => [...prev, newVariable]);

    // Select the new variable
    setSelectedVariable(newVariable);

    // Clear pending selection
    setPendingVariableSelection(null);
    setNewVariableName("");

    // Close dialog
    setShowVariableCreationDialog(false);
  };

  // Handle autocomplete change to detect new variables
  const handleVariableChange = (event: any, value: any) => {
    if (typeof value === "string") {
      // User typed a new variable name
      const capitalizedName = capitalizeVariableName(value);
      setNewVariableName(capitalizedName);
      setPendingVariableSelection(capitalizedName);
      setShowVariableCreationDialog(true);
      setSelectedVariable(null);
    } else if (value) {
      // User selected an existing variable
      setSelectedVariable(value);
      setPendingVariableSelection(null);
      setNewVariableName("");
    } else {
      // User cleared the selection
      setSelectedVariable(null);
      setPendingVariableSelection(null);
      setNewVariableName("");
    }
  };

  // Add state for routines and logs:
  const [routineLogs, setRoutineLogs] = useState<
    Record<string, Record<string, any>>
  >({}); // routineId -> variableId -> log
  const [routineEditValues, setRoutineEditValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [routineEditing, setRoutineEditing] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [routineSaving, setRoutineSaving] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [routineValidationErrors, setRoutineValidationErrors] = useState<
    Record<string, Record<string, string>>
  >({});
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);

  const formatTime = (time: string) => {
    if (!time) return "Not set";
    try {
      const d = new Date(`1970-01-01T${time}`);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return time;
    }
  };

  const handleOpenLogHistory = async (variableId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("data_points")
      .select("*")
      .eq("user_id", user.id)
      .eq("variable_id", variableId)
      .order("created_at", { ascending: false })
      .limit(50);
    setLogHistory((prev) => ({ ...prev, [variableId]: data || [] }));
    setLogHistoryOpen((prev) => ({
      ...prev,
      [variableId]: true,
    }));
  };

  const handleCloseLogHistory = (variableId: string) => {
    setLogHistoryOpen((prev) => ({ ...prev, [variableId]: false }));
  };

  // Add state for editing log values in history
  const handleEditLogHistory = (
    variableId: string,
    logId: string,
    value: string
  ) => {
    setLogHistoryEdit((prev) => ({
      ...prev,
      [variableId]: { ...prev[variableId], [logId]: value },
    }));
  };

  const handleSaveLogHistory = async (variableId: string, log: any) => {
    const { error } = await supabase
      .from("data_points")
      .update({ value: logHistoryEdit[variableId][log.id] })
      .eq("id", log.id);
    if (!error) {
      await handleOpenLogHistory(variableId);
      setSuccessMessage("Log updated successfully!");
      setShowSuccess(true);
    } else {
      setExpError("Failed to update log. Please try again.");
    }
  };

  const handleDeleteLogHistory = async (variableId: string, logId: string) => {
    if (!confirm("Are you sure you want to delete this log?")) return;
    const { error } = await supabase
      .from("data_points")
      .delete()
      .eq("id", logId);
    if (!error) {
      await handleOpenLogHistory(variableId);
      setSuccessMessage("Log deleted successfully!");
      setShowSuccess(true);
    } else {
      setExpError("Failed to delete log. Please try again.");
    }
  };

  if (userLoading || variablesLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Loading variables and data points...
          </Typography>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Fetching variables, experiments, and today's data points
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">
          Please log in to access the tracking feature.
        </Alert>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="md"
      sx={{ py: { xs: 3, sm: 5 }, px: { xs: 2, sm: 3 } }}
    >
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        align="center"
        sx={{
          fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
          mb: { xs: 3, sm: 4, md: 5 },
        }}
      >
        📝 Manual Tracking
      </Typography>

      {/* Active Experiments */}
      {showActiveExperiments && experimentsNeedingLogs.length > 0 && (
        <Box sx={{ mb: { xs: 4, sm: 5, md: 6 }, position: "relative" }}>
          <Typography
            variant="h5"
            sx={{
              mb: { xs: 3, sm: 4 },
              display: "flex",
              alignItems: "center",
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
            }}
          >
            🧪 Active Experiments
            <IconButton
              aria-label="Close"
              size="small"
              onClick={() => setShowActiveExperiments(false)}
              sx={{
                ml: 2,
                color: "white",
                background: "rgba(0,0,0,0.15)",
                "&:hover": { background: "rgba(0,0,0,0.25)" },
              }}
            >
              <span style={{ fontSize: 18, fontWeight: "bold" }}>×</span>
            </IconButton>
          </Typography>

          {experimentsNeedingLogs.map((experiment, index) => (
            <Paper
              key={`${experiment.id}-${index}`}
              elevation={3}
              sx={{
                p: { xs: 2.5, sm: 3 },
                mb: { xs: 3, sm: 4 },
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderRadius: 3,
              }}
            >
              <Box
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    mb: { xs: 2, sm: 2.5 },
                    fontWeight: "bold",
                    fontSize: { xs: "1rem", sm: "1.1rem" },
                  }}
                >
                  📝 Log your experiment variables for today
                </Typography>

                {(() => {
                  // First try exact match, then try without units in parentheses
                  let experimentVariable = LOG_LABELS.find(
                    (label) => label.label === experiment.variable
                  );

                  if (!experimentVariable) {
                    const cleanVariableName = experiment.variable.replace(
                      /\s*\([^)]*\)\s*$/,
                      ""
                    );
                    experimentVariable = LOG_LABELS.find(
                      (label) => label.label === cleanVariableName
                    );
                  }

                  if (experimentVariable?.constraints) {
                    const { constraints } = experimentVariable;
                    let constraintText = "";

                    if (
                      constraints.min !== undefined &&
                      constraints.max !== undefined
                    ) {
                      constraintText = `${constraints.min}${
                        constraints.unit ? ` ${constraints.unit}` : ""
                      } - ${constraints.max}${
                        constraints.unit ? ` ${constraints.unit}` : ""
                      }`;
                    } else if (
                      constraints.scaleMin !== undefined &&
                      constraints.scaleMax !== undefined
                    ) {
                      constraintText = `${constraints.scaleMin} - ${constraints.scaleMax}`;
                    }

                    if (constraintText) {
                      return (
                        <Typography
                          variant="caption"
                          sx={{
                            mb: { xs: 2, sm: 2.5 },
                            opacity: 0.8,
                            fontStyle: "italic",
                            display: "block",
                            fontSize: { xs: "0.75rem", sm: "0.8rem" },
                          }}
                        >
                          Range: {constraintText}
                        </Typography>
                      );
                    }
                  }
                  return null;
                })()}

                {/* Quick Experiment Logging Form */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: { xs: 2.5, sm: 3 },
                  }}
                >
                  {/* Independent Variable Section */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      gap: { xs: 2, sm: 2.5 },
                      alignItems: { xs: "stretch", sm: "flex-start" },
                    }}
                  >
                    <ConstrainedInput
                      label={experiment.variable}
                      value={experimentValues[experiment.variable] || ""}
                      onChange={(newValue) =>
                        setExperimentValues((prev) => ({
                          ...prev,
                          [experiment.variable]: newValue,
                        }))
                      }
                      placeholder={`Enter ${(() => {
                        // First try exact match, then try without units in parentheses
                        let experimentVariable = LOG_LABELS.find(
                          (label) => label.label === experiment.variable
                        );

                        if (!experimentVariable) {
                          const cleanVariableName = experiment.variable.replace(
                            /\s*\([^)]*\)\s*$/,
                            ""
                          );
                          experimentVariable = LOG_LABELS.find(
                            (label) => label.label === cleanVariableName
                          );
                        }

                        const displayName =
                          experimentVariable?.label ||
                          experiment.variable.replace(/\s*\([^)]*\)\s*$/, "");
                        const unit = experimentVariable?.constraints?.unit;
                        return displayName + (unit ? ` (${unit})` : "");
                      })()} value...`}
                      variant="outlined"
                      size="small"
                      fullWidth={isMobile}
                      sx={{
                        flex: { xs: "none", sm: 1 },
                        "& .MuiOutlinedInput-root": {
                          backgroundColor: "#ffffff",
                          color: "#333",
                          fontSize: { xs: "0.9rem", sm: "1rem" },
                          padding: { xs: "2px", sm: "4px" },
                          "& fieldset": {
                            borderColor: "rgba(255,255,255,0.5)",
                          },
                          "&:hover fieldset": {
                            borderColor: "rgba(255,255,255,0.7)",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#ffd700",
                          },
                          "& input": {
                            color: "#333",
                            padding: { xs: "10px 12px", sm: "12px 14px" },
                          },
                          "& input::placeholder": {
                            color: "#999",
                            opacity: 1,
                          },
                        },
                      }}
                    />

                    <TextField
                      size="small"
                      multiline
                      rows={1}
                      fullWidth={isMobile}
                      value={experimentNotes[experiment.variable] || ""}
                      onChange={(e) =>
                        setExperimentNotes((prev) => ({
                          ...prev,
                          [experiment.variable]: e.target.value,
                        }))
                      }
                      placeholder="Notes (optional)"
                      variant="outlined"
                      sx={{
                        flex: { xs: "none", sm: 1 },
                        "& .MuiOutlinedInput-root": {
                          backgroundColor: "#ffffff",
                          color: "#333",
                          fontSize: { xs: "0.9rem", sm: "1rem" },
                          "& fieldset": {
                            borderColor: "rgba(255,255,255,0.5)",
                          },
                          "&:hover fieldset": {
                            borderColor: "rgba(255,255,255,0.7)",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#ffd700",
                            borderWidth: "2px",
                          },
                          "& textarea": {
                            color: "#333",
                            padding: { xs: "10px 12px", sm: "12px 14px" },
                          },
                          "& textarea::placeholder": {
                            color: "#999",
                            opacity: 1,
                          },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FaStickyNote
                              color="#666"
                              size={isMobile ? "12" : "14"}
                            />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>

                  {/* Dependent Variable Section */}
                  {(experiment.effect || experiment.dependent_variable) && (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        gap: { xs: 2, sm: 2.5 },
                        alignItems: { xs: "stretch", sm: "flex-start" },
                      }}
                    >
                      <ConstrainedInput
                        label={
                          experiment.effect || experiment.dependent_variable
                        }
                        value={
                          experimentValues[
                            experiment.effect || experiment.dependent_variable
                          ] || ""
                        }
                        onChange={(newValue) =>
                          setExperimentValues((prev) => ({
                            ...prev,
                            [experiment.effect ||
                            experiment.dependent_variable]: newValue,
                          }))
                        }
                        placeholder={`Enter ${(() => {
                          const depVar =
                            experiment.effect || experiment.dependent_variable;
                          // First try exact match, then try without units in parentheses
                          let experimentVariable = LOG_LABELS.find(
                            (label) => label.label === depVar
                          );

                          if (!experimentVariable) {
                            const cleanVariableName = depVar.replace(
                              /\s*\([^)]*\)\s*$/,
                              ""
                            );
                            experimentVariable = LOG_LABELS.find(
                              (label) => label.label === cleanVariableName
                            );
                          }

                          const displayName =
                            experimentVariable?.label ||
                            depVar.replace(/\s*\([^)]*\)\s*$/, "");
                          const unit = experimentVariable?.constraints?.unit;
                          return displayName + (unit ? ` (${unit})` : "");
                        })()} value...`}
                        variant="outlined"
                        size="small"
                        fullWidth={isMobile}
                        sx={{
                          flex: { xs: "none", sm: 1 },
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: "#ffffff",
                            color: "#333",
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                            "& fieldset": {
                              borderColor: "rgba(255,255,255,0.5)",
                            },
                            "&:hover fieldset": {
                              borderColor: "rgba(255,255,255,0.7)",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#ffd700",
                              borderWidth: "2px",
                            },
                            "& input": {
                              color: "#333",
                              padding: { xs: "10px 12px", sm: "12px 14px" },
                            },
                            "& input::placeholder": {
                              color: "#999",
                              opacity: 1,
                            },
                          },
                        }}
                      />

                      <TextField
                        size="small"
                        multiline
                        rows={1}
                        fullWidth={isMobile}
                        value={
                          experimentNotes[
                            experiment.effect || experiment.dependent_variable
                          ] || ""
                        }
                        onChange={(e) =>
                          setExperimentNotes((prev) => ({
                            ...prev,
                            [experiment.effect ||
                            experiment.dependent_variable]: e.target.value,
                          }))
                        }
                        placeholder="Notes (optional)"
                        variant="outlined"
                        sx={{
                          flex: { xs: "none", sm: 1 },
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: "#ffffff",
                            color: "#333",
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                            "& fieldset": {
                              borderColor: "rgba(255,255,255,0.5)",
                            },
                            "&:hover fieldset": {
                              borderColor: "rgba(255,255,255,0.7)",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#ffd700",
                              borderWidth: "2px",
                            },
                            "& textarea": {
                              color: "#333",
                              padding: { xs: "10px 12px", sm: "12px 14px" },
                            },
                            "& textarea::placeholder": {
                              color: "#999",
                              opacity: 1,
                            },
                          },
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <FaStickyNote
                                color="#666"
                                size={isMobile ? "12" : "14"}
                              />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                  )}

                  {/* Log Button */}
                  <Box sx={{ mt: { xs: 1, sm: 2 } }}>
                    <Button
                      onClick={async () => {
                        const independentValue =
                          experimentValues[experiment.variable] || "";
                        const independentNotes =
                          experimentNotes[experiment.variable] || "";
                        const dependentVariable =
                          experiment.effect || experiment.dependent_variable;
                        const dependentValue =
                          experimentValues[dependentVariable] || "";
                        const dependentNotes =
                          experimentNotes[dependentVariable] || "";

                        // Prepare variables array for submission
                        const variablesToLog = [
                          {
                            name: experiment.variable,
                            value: independentValue,
                            notes: independentNotes,
                          },
                        ];

                        if (dependentVariable) {
                          variablesToLog.push({
                            name: dependentVariable,
                            value: dependentValue,
                            notes: dependentNotes,
                          });
                        }

                        await submitExperimentLogs(variablesToLog);

                        if (!expError) {
                          setExperimentValues((prev) => ({
                            ...prev,
                            [experiment.variable]: "",
                            [dependentVariable]: "",
                          }));
                          setExperimentNotes((prev) => ({
                            ...prev,
                            [experiment.variable]: "",
                            [dependentVariable]: "",
                          }));

                          calculateExperimentProgress();
                          calculateLoggingStreak();
                        }
                      }}
                      disabled={
                        submitting ||
                        !experimentValues[experiment.variable]?.trim() ||
                        ((experiment.effect || experiment.dependent_variable) &&
                          !experimentValues[
                            experiment.effect || experiment.dependent_variable
                          ]?.trim())
                      }
                      variant="contained"
                      size="small"
                      fullWidth={isMobile}
                      sx={{
                        minWidth: { xs: "auto", sm: "auto" },
                        px: { xs: 3, sm: 4 },
                        py: { xs: 1.5, sm: 1.2 },
                        backgroundColor: "#ffd700",
                        color: "#333",
                        fontWeight: "bold",
                        fontSize: { xs: "0.95rem", sm: "1rem" },
                        borderRadius: 2,
                        "&:hover": {
                          backgroundColor: "#ffed4a",
                          transform: "translateY(-1px)",
                          boxShadow: "0 4px 12px rgba(255, 215, 0, 0.3)",
                        },
                        "&:disabled": {
                          backgroundColor: "rgba(255,215,0,0.5)",
                          color: "rgba(51,51,51,0.5)",
                        },
                        transition: "all 0.2s ease",
                      }}
                    >
                      {submitting ? "..." : "Log Both Variables"}
                    </Button>
                  </Box>
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    opacity: 0.8,
                    mt: { xs: 2, sm: 2.5 },
                    display: "block",
                    fontSize: { xs: "0.75rem", sm: "0.8rem" },
                  }}
                >
                  Target: {experiment.frequency || 1} log
                  {(experiment.frequency || 1) > 1 ? "s" : ""} per day (
                  {new Date(experiment.start_date).toLocaleDateString()} -{" "}
                  {new Date(experiment.end_date).toLocaleDateString()})
                </Typography>
              </Box>
            </Paper>
          ))}

          <Button
            component={Link}
            href="/experiment/active-experiments"
            variant="outlined"
            fullWidth={isMobile}
            sx={{
              color: "primary.main",
              borderColor: "primary.main",
              py: { xs: 2, sm: 1.5 },
              px: { xs: 3, sm: 4 },
              fontSize: { xs: "0.95rem", sm: "1rem" },
              fontWeight: 500,
              borderRadius: 2,
              "&:hover": {
                backgroundColor: "rgba(102, 126, 234, 0.1)",
                borderColor: "primary.main",
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)",
              },
              transition: "all 0.2s ease",
            }}
          >
            View All Active Experiments
          </Button>
        </Box>
      )}

      {/* Show experiments button even when all daily logs are complete */}
      {experimentsNeedingLogs.length === 0 && activeExperiments.length > 0 && (
        <Alert
          severity="success"
          sx={{
            mb: { xs: 3, sm: 4 },
            borderRadius: 2,
            p: { xs: 2, sm: 2.5 },
            "& .MuiAlert-message": {
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: { xs: "center", sm: "space-between" },
              width: "100%",
              gap: { xs: 2, sm: 0 },
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Great job! All experiment logs complete for today.
            </Typography>
          </Box>
          <Button
            component={Link}
            href="/experiment/active-experiments"
            size="small"
            variant="outlined"
            fullWidth={isMobile}
            sx={{
              ml: { xs: 0, sm: 2 },
              py: { xs: 1, sm: 0.75 },
              px: { xs: 2, sm: 2.5 },
              color: "success.main",
              borderColor: "success.main",
              "&:hover": {
                backgroundColor: "success.main",
                color: "white",
              },
            }}
          >
            View Experiments
          </Button>
        </Alert>
      )}

      {/* Show info about experiments outside time intervals */}
      {(() => {
        const experimentsOutsideTimeIntervals = activeExperiments.filter(
          (experiment) => {
            const now = new Date();
            const pad = (n: number) => n.toString().padStart(2, "0");
            const today = `${now.getFullYear()}-${pad(
              now.getMonth() + 1
            )}-${pad(now.getDate())}`; // Get YYYY-MM-DD format in local time
            const logsToday = logs.filter(
              (log) =>
                log.variable === experiment.variable &&
                log.date.startsWith(today)
            ).length;
            const needsMoreLogs = logsToday < (experiment.frequency || 1);
            const inTimeInterval = isCurrentTimeInIntervals(
              experiment.time_intervals
            );

            return needsMoreLogs && !inTimeInterval;
          }
        );

        if (experimentsOutsideTimeIntervals.length > 0) {
          return (
            <Alert
              severity="info"
              sx={{
                mb: 3,
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                🕐 {experimentsOutsideTimeIntervals.length} experiment
                {experimentsOutsideTimeIntervals.length > 1 ? "s" : ""} not
                showing due to time intervals
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {experimentsOutsideTimeIntervals
                  .map((exp) => {
                    const intervals = exp.time_intervals || [];
                    if (intervals.length === 0)
                      return `${exp.variable} (no intervals set)`;

                    const intervalStrings = intervals
                      .map((interval: any) => {
                        if (typeof interval === "string") return interval;
                        if (interval.start && interval.end) {
                          const formatTime = (time: string) => {
                            const [hours, minutes] = time.split(":");
                            const hour = parseInt(hours);
                            const ampm = hour >= 12 ? "PM" : "AM";
                            const displayHour =
                              hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                            return `${displayHour}:${minutes} ${ampm}`;
                          };
                          return `${formatTime(interval.start)} - ${formatTime(
                            interval.end
                          )}`;
                        }
                        return "unknown";
                      })
                      .join(", ");

                    return `${exp.variable} (${intervalStrings})`;
                  })
                  .join(", ")}
              </Typography>
            </Alert>
          );
        }
        return null;
      })()}

      {/* Success Message */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowSuccess(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Loading indicator for data refresh */}
      {submitting && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Saving your log...
          </Typography>
        </Box>
      )}

      {/* Error Message */}
      {expError && (
        <Alert severity="error" sx={{ mb: { xs: 3, sm: 4 } }}>
          {expError}
        </Alert>
      )}

      {/* Research Question Builder */}
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, mb: { xs: 4, sm: 5 } }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontSize: { xs: "1.1rem", sm: "1.25rem" },
            mb: { xs: 2, sm: 3 },
          }}
        >
          {experimentsNeedingLogs.length > 0
            ? "Log Any Other Variables"
            : "What are you tracking today?"}
        </Typography>

        {experimentsNeedingLogs.length > 0 && (
          <Alert severity="info" sx={{ mb: { xs: 3, sm: 4 } }}>
            <Typography
              variant="body2"
              sx={{ fontSize: { xs: "0.85rem", sm: "0.875rem" } }}
            >
              💡 <strong>Tip:</strong> Use the experiment card above to log your
              active experiment data quickly. This form is for tracking
              additional variables not part of your current experiment.
            </Typography>
          </Alert>
        )}

        {/* Variable Selection */}
        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
          {/* Popular Variables */}
          <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{
                fontSize: { xs: "0.9rem", sm: "0.875rem" },
                mb: { xs: 1.5, sm: 2 },
              }}
            >
              Popular Variables
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: { xs: 1, sm: 1.5 },
              }}
            >
              {variables.slice(0, 5).map((variable) => (
                <Chip
                  key={variable.id}
                  label={`${variable.icon || "📝"} ${variable.label}`}
                  onClick={() => setSelectedVariable(variable)}
                  color={
                    selectedVariable?.id === variable.id ? "primary" : "default"
                  }
                  variant={
                    selectedVariable?.id === variable.id ? "filled" : "outlined"
                  }
                  clickable
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    fontSize: { xs: "0.75rem", sm: "0.8125rem" },
                    height: { xs: "auto", sm: "auto" },
                    px: { xs: 1, sm: 1.5 },
                    py: { xs: 0.5, sm: 0.75 },
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    },
                    transition: "all 0.2s ease",
                  }}
                />
              ))}
            </Box>
          </Box>

          <Autocomplete
            options={variables}
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option.label
            }
            value={selectedVariable}
            onChange={handleVariableChange}
            freeSolo
            filterOptions={(options, { inputValue }) => {
              // Filter variables by label matching the input value
              return options.filter((option) =>
                option.label.toLowerCase().includes(inputValue.toLowerCase())
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search variables or type a new one..."
                size={isMobile ? "small" : "medium"}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    "&:hover fieldset": {
                      borderColor: "primary.main",
                    },
                    "&.Mui-focused fieldset": {
                      borderWidth: "2px",
                    },
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize={isMobile ? "small" : "medium"} />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1.5, sm: 2 },
                  py: { xs: 1.5, sm: 2 },
                  px: { xs: 2, sm: 2.5 },
                  "&:hover": {
                    backgroundColor: "rgba(25, 118, 210, 0.04)",
                  },
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>
                  {option.icon || "📝"}
                </span>
                <Box>
                  <Typography
                    variant="body1"
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    {option.label}
                  </Typography>
                  {option.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
                    >
                      {option.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          />
        </Box>

        {/* Selected Variable Display */}
        {selectedVariable && (
          <Box sx={{ mb: { xs: 2, sm: 3 } }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ fontSize: { xs: "0.9rem", sm: "0.875rem" } }}
            >
              Selected Variable
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: { xs: 2, sm: 2.5 },
                backgroundColor: "rgba(33, 150, 243, 0.1)",
                borderRadius: 2,
                border: "2px solid #2196f3",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>
                {selectedVariable.icon || "📝"}
              </span>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: { xs: "1.1rem", sm: "1.25rem" },
                    fontWeight: "bold",
                    color: "#2196f3",
                  }}
                >
                  {selectedVariable.label}
                </Typography>
                {selectedVariable.description && (
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: { xs: "0.8rem", sm: "0.875rem" },
                      color: "text.secondary",
                    }}
                  >
                    {selectedVariable.description}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Selected Variable Constraints */}
        {selectedVariable &&
          (() => {
            // Use the new validation system to get constraints text
            const constraintText = getConstraintsText(
              selectedVariable as ValidationVariable
            );

            if (constraintText) {
              return (
                <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#FFD700",
                      fontWeight: 500,
                      fontSize: { xs: "0.75rem", sm: "0.8rem" },
                      display: "block",
                      backgroundColor: "rgba(255, 215, 0, 0.1)",
                      padding: { xs: "6px 10px", sm: "8px 12px" },
                      borderRadius: 2,
                      border: "1px solid rgba(255, 215, 0, 0.3)",
                    }}
                  >
                    💡 {constraintText}
                  </Typography>
                </Box>
              );
            }
            return null;
          })()}

        {/* Value Input */}
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          {selectedVariable ? (
            <ValidatedVariableInput
              variable={selectedVariable as ValidationVariable}
              value={value}
              onChange={setValue}
              size={isMobile ? "small" : "medium"}
              fullWidth
              showConstraints={true} // We show constraints separately above
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& .MuiInputAdornment-root": {
                    "& .MuiSvgIcon-root": {
                      fontSize: isMobile ? "14px" : "16px",
                    },
                  },
                },
              }}
            />
          ) : (
            <ConstrainedInput
              label="Value"
              value={value}
              onChange={setValue}
              size={isMobile ? "small" : "medium"}
              placeholder="Enter the value..."
              variant="outlined"
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& .MuiInputAdornment-root": {
                    "& .MuiSvgIcon-root": {
                      fontSize: isMobile ? "14px" : "16px",
                    },
                  },
                },
              }}
            />
          )}
        </Box>

        {/* Notes */}
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Typography
            variant="subtitle2"
            gutterBottom
            sx={{ fontSize: { xs: "0.9rem", sm: "0.875rem" } }}
          >
            Notes (Optional)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={isMobile ? 2 : 3}
            size={isMobile ? "small" : "medium"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional context or notes..."
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FaStickyNote size={isMobile ? "14" : "16"} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Date and Time Picker */}
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Typography
            variant="subtitle2"
            gutterBottom
            sx={{ fontSize: { xs: "0.9rem", sm: "0.875rem" } }}
          >
            Date & Time
          </Typography>
          <DatePicker
            selected={date}
            onChange={(date: Date | null) => date && setDate(date)}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="yyyy-MM-dd HH:mm"
            customInput={
              <TextField
                fullWidth
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                InputProps={{
                  readOnly: true,
                }}
              />
            }
          />
        </Box>

        {/* Privacy Setting */}
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={!isLogPrivate} // Inverted: checked = public, unchecked = private
                onChange={(e) => setIsLogPrivate(!e.target.checked)}
                color="primary"
                size={isMobile ? "small" : "medium"}
              />
            }
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FaGlobe size={isMobile ? "14" : "16"} />
                <Typography
                  variant="body2"
                  sx={{ fontSize: { xs: "0.85rem", sm: "0.875rem" } }}
                >
                  Public log
                </Typography>
              </Box>
            }
          />
        </Box>

        {/* Error Display */}
        {expError && (
          <Box sx={{ mb: { xs: 2, sm: 3 } }}>
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {expError}
            </Alert>
          </Box>
        )}

        {/* Submit Button */}
        <Button
          onClick={submitLog}
          disabled={submitting || !selectedVariable || !value.trim()}
          variant="contained"
          fullWidth
          sx={{
            py: { xs: 1.5, sm: 2 },
            fontSize: { xs: "1rem", sm: "1.1rem" },
            fontWeight: "bold",
            backgroundColor: "#2196f3",
            "&:hover": {
              backgroundColor: "#1976d2",
            },
          }}
        >
          {submitting ? "Saving..." : "Save Log"}
        </Button>
      </Paper>

      {/* Today's Logs */}
      {allLogs.length > 0 && (
        <Paper
          elevation={6}
          sx={{
            p: { xs: 3, sm: 4 },
            background: "#18191A", // dark background for section
            borderRadius: 3,
            border: "2px solid #FFD700",
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontSize: { xs: "1.3rem", sm: "1.5rem" },
              fontWeight: "bold",
              color: "#FFD700",
              textAlign: "center",
              mb: 3,
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            📊 Today's Data Points
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: { xs: 3, sm: 4 },
            }}
          >
            {/* Manual Data Points Section */}
            {groupedLogs.manual && groupedLogs.manual.logs.length > 0 && (
              <Card className="mb-6 border border-border bg-surface">
                {/* Manual Data Points Header */}
                <CardHeader
                  className="border-b border-border bg-surface-light"
                  title={
                    <Typography
                      variant="h6"
                      className="text-white font-semibold"
                    >
                      ✍️ Manual Data Points
                    </Typography>
                  }
                />
                {/* Manual Data Points */}
                <CardContent className="p-0">
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: { xs: 2, sm: 2.5 },
                    }}
                  >
                    {groupedLogs.manual.logs.map((log: any) => (
                      <Box
                        key={log.id}
                        sx={{
                          p: { xs: 2.5, sm: 3 },
                          border: "2px solid #FFD700",
                          borderRadius: 3,
                          backgroundColor: "#222",
                          color: "#fff",
                          boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            boxShadow: "0 8px 25px rgba(255,215,0,0.3)",
                            transform: "translateY(-2px)",
                            borderColor: "#FFEA70",
                          },
                        }}
                      >
                        {editingLogId === log.id ? (
                          // Edit mode (only allow for manual data points)
                          log._source === "manual" ? (
                            <Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  mb: 3,
                                  pb: 2,
                                  borderBottom: "2px solid #e3f2fd",
                                }}
                              >
                                <Typography
                                  variant="subtitle1"
                                  fontWeight="bold"
                                  sx={{
                                    color: "#1976d2",
                                    fontSize: { xs: "1.1rem", sm: "1.2rem" },
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <FaEdit style={{ fontSize: "1rem" }} />
                                  Editing: {getVariableIconFromLog(log)}{" "}
                                  {getVariableNameFromLog(log)}
                                </Typography>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                  <IconButton
                                    onClick={handleSaveEdit}
                                    disabled={
                                      !editingIsValid || !editingValue.trim()
                                    }
                                    size="small"
                                    sx={{
                                      color: "#fff",
                                      backgroundColor:
                                        editingIsValid && editingValue.trim()
                                          ? "#4caf50"
                                          : "#999",
                                      borderRadius: "8px",
                                      padding: "8px",
                                      "&:hover": {
                                        backgroundColor:
                                          editingIsValid && editingValue.trim()
                                            ? "#45a049"
                                            : "#999",
                                        transform:
                                          editingIsValid && editingValue.trim()
                                            ? "scale(1.05)"
                                            : "none",
                                      },
                                      "&:disabled": {
                                        backgroundColor: "#999",
                                        color: "#666",
                                      },
                                      transition: "all 0.2s ease",
                                    }}
                                  >
                                    <FaCheck />
                                  </IconButton>
                                  <IconButton
                                    onClick={handleCancelEdit}
                                    size="small"
                                    sx={{
                                      color: "#fff",
                                      backgroundColor: "#f44336",
                                      borderRadius: "8px",
                                      padding: "8px",
                                      "&:hover": {
                                        backgroundColor: "#d32f2f",
                                        transform: "scale(1.05)",
                                      },
                                      transition: "all 0.2s ease",
                                    }}
                                  >
                                    <FaTimes />
                                  </IconButton>
                                </Box>
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 3,
                                }}
                              >
                                {/* Date Field */}
                                <Box>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      mb: 1.5,
                                      color: "#333",
                                      fontSize: "0.875rem",
                                      fontWeight: 600,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    📅 Date
                                  </Typography>
                                  <Box
                                    sx={{
                                      position: "relative",
                                      "& .datepicker-wrapper": {
                                        width: "100%",
                                      },
                                      "& .custom-datepicker": {
                                        width: "100%",
                                        padding: "12px 16px",
                                        fontSize: "14px",
                                        border: "2px solid #e0e0e0",
                                        borderRadius: "12px",
                                        backgroundColor: "#fff",
                                        color: "#333", // Add dark text color for better contrast
                                        fontFamily: "inherit",
                                        fontWeight: "500", // Make text slightly bolder
                                        transition: "all 0.3s ease",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                        "&:focus": {
                                          outline: "none",
                                          borderColor: "#1976d2",
                                          boxShadow:
                                            "0 4px 12px rgba(25,118,210,0.2)",
                                          color: "#1976d2", // Blue text when focused
                                        },
                                        "&:hover": {
                                          borderColor: "#1976d2",
                                          boxShadow:
                                            "0 4px 12px rgba(0,0,0,0.15)",
                                          color: "#1976d2", // Blue text on hover
                                        },
                                        "&::placeholder": {
                                          color: "#999", // Placeholder text color
                                          opacity: 1,
                                        },
                                      },
                                    }}
                                  >
                                    <DatePicker
                                      selected={editingDate}
                                      onChange={(date: Date | null) =>
                                        date && setEditingDate(date)
                                      }
                                      dateFormat="yyyy-MM-dd"
                                      className="custom-datepicker"
                                      wrapperClassName="datepicker-wrapper"
                                    />
                                  </Box>
                                </Box>

                                {/* Value Field */}
                                <TextField
                                  fullWidth
                                  label={`Value for ${getVariableNameFromLog(
                                    log
                                  )}`}
                                  value={editingValue}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    setEditingValue(newValue);

                                    // Real-time validation
                                    if (newValue.trim()) {
                                      const validation = validateEditValue(
                                        newValue,
                                        log
                                      );
                                      setEditingValidationError(
                                        validation.error || ""
                                      );
                                      setEditingIsValid(validation.isValid);
                                    } else {
                                      setEditingValidationError("");
                                      setEditingIsValid(true);
                                    }
                                  }}
                                  error={!editingIsValid}
                                  helperText={editingValidationError}
                                  sx={{
                                    "& .MuiInputLabel-root": {
                                      color: "#666",
                                      fontWeight: 500,
                                    },
                                    "& .MuiInputLabel-root.Mui-focused": {
                                      color: editingIsValid
                                        ? "#1976d2"
                                        : "#d32f2f",
                                    },
                                    "& .MuiInputLabel-root.Mui-error": {
                                      color: "#d32f2f",
                                    },
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: "12px",
                                      backgroundColor: "#fff",
                                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                      "& fieldset": {
                                        borderColor: editingIsValid
                                          ? "#e0e0e0"
                                          : "#d32f2f",
                                        borderWidth: "2px",
                                      },
                                      "&:hover fieldset": {
                                        borderColor: editingIsValid
                                          ? "#1976d2"
                                          : "#d32f2f",
                                      },
                                      "&.Mui-focused fieldset": {
                                        borderColor: editingIsValid
                                          ? "#1976d2"
                                          : "#d32f2f",
                                        boxShadow: editingIsValid
                                          ? "0 4px 12px rgba(25,118,210,0.2)"
                                          : "0 4px 12px rgba(211,47,47,0.2)",
                                      },
                                      "&.Mui-error fieldset": {
                                        borderColor: "#d32f2f",
                                      },
                                    },
                                    "& .MuiInputBase-input": {
                                      padding: "12px 16px",
                                      fontSize: "14px",
                                    },
                                    "& .MuiFormHelperText-root": {
                                      fontSize: "0.75rem",
                                      marginTop: "8px",
                                      marginLeft: "14px",
                                    },
                                    "& .MuiFormHelperText-root.Mui-error": {
                                      color: "#d32f2f",
                                    },
                                  }}
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <span style={{ fontSize: "1.1rem" }}>
                                          {getVariableIconFromLog(log)}
                                        </span>
                                      </InputAdornment>
                                    ),
                                  }}
                                />

                                {/* Notes Field */}
                                <TextField
                                  fullWidth
                                  label="Notes (Optional)"
                                  value={editingNotes}
                                  onChange={(e) =>
                                    setEditingNotes(e.target.value)
                                  }
                                  multiline
                                  rows={3}
                                  sx={{
                                    "& .MuiInputLabel-root": {
                                      color: "#666",
                                      fontWeight: 500,
                                    },
                                    "& .MuiInputLabel-root.Mui-focused": {
                                      color: "#1976d2",
                                    },
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: "12px",
                                      backgroundColor: "#fff",
                                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                      "& fieldset": {
                                        borderColor: "#e0e0e0",
                                        borderWidth: "2px",
                                      },
                                      "&:hover fieldset": {
                                        borderColor: "#1976d2",
                                      },
                                      "&.Mui-focused fieldset": {
                                        borderColor: "#1976d2",
                                        boxShadow:
                                          "0 4px 12px rgba(25,118,210,0.2)",
                                      },
                                    },
                                    "& .MuiInputBase-input": {
                                      padding: "12px 16px",
                                      fontSize: "14px",
                                    },
                                  }}
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment
                                        position="start"
                                        sx={{ alignSelf: "flex-start", mt: 1 }}
                                      >
                                        <span style={{ fontSize: "1.1rem" }}>
                                          💭
                                        </span>
                                      </InputAdornment>
                                    ),
                                  }}
                                />
                              </Box>
                            </Box>
                          ) : (
                            <Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Planned logs cannot be edited here.
                              </Typography>
                            </Box>
                          )
                        ) : (
                          // Display mode
                          <Box>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 1.5,
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                  flex: 1,
                                }}
                              >
                                <Link
                                  href={`/variable/${encodeURIComponent(
                                    (() => {
                                      // Get variable slug from log
                                      if (
                                        log.variable_id &&
                                        variables.length > 0
                                      ) {
                                        const variable = variables.find(
                                          (v) => v.id === log.variable_id
                                        );
                                        if (variable) {
                                          return variable.slug;
                                        }
                                      }
                                      return log.variable || "unknown-variable";
                                    })()
                                  )}`}
                                  style={{
                                    color: "#1976d2",
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Typography
                                    variant="subtitle1"
                                    fontWeight="bold"
                                    sx={{
                                      color: "#1976d2",
                                      fontSize: {
                                        xs: "1rem",
                                        sm: "1.1rem",
                                      },
                                    }}
                                  >
                                    {getVariableNameFromLog(log)}
                                  </Typography>
                                </Link>
                                <Typography
                                  variant="h5"
                                  sx={{
                                    color: "#00E676",
                                    fontWeight: "bold",
                                    fontSize: { xs: "1.3rem", sm: "1.5rem" },
                                    textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                  }}
                                >
                                  {log.value}
                                </Typography>
                                {log._source === "planned" && (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        ml: 0,
                                        color: "#FFD700",
                                        fontWeight: 600,
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.8rem",
                                        },
                                        backgroundColor:
                                          "rgba(255, 215, 0, 0.18)",
                                        px: 1,
                                        borderRadius: 1,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                      }}
                                    >
                                      ⏰ Planned
                                    </Typography>
                                    <VariableNameLink
                                      log={log}
                                      variables={variables}
                                    />
                                    {log.context && log.context.routine_id && (
                                      <>
                                        <span
                                          style={{
                                            color: "#FFD700",
                                            fontWeight: 500,
                                            fontSize: "0.85em",
                                            margin: "0 2px",
                                          }}
                                        >
                                          •
                                        </span>
                                        <Link
                                          href="/track/auto"
                                          passHref
                                          legacyBehavior
                                        >
                                          <a
                                            style={{
                                              color: "#FFD700",
                                              textDecoration: "underline",
                                              fontWeight: 500,
                                              fontSize: "0.85em",
                                            }}
                                            title={`View routine`}
                                          >
                                            {log.context.routine_name ||
                                              log.context.name}
                                          </a>
                                        </Link>
                                      </>
                                    )}
                                  </Box>
                                )}
                                {log._source !== "planned" && (
                                  <VariableNameLink
                                    log={log}
                                    variables={variables}
                                  />
                                )}
                              </Box>
                              {log._source === "manual" && (
                                <Box>
                                  <IconButton
                                    onClick={() => handleEditLog(log)}
                                    size="small"
                                    sx={{
                                      color: "#1976d2",
                                      mr: 1,
                                      "&:hover": {
                                        backgroundColor:
                                          "rgba(25, 118, 210, 0.1)",
                                        transform: "scale(1.1)",
                                      },
                                    }}
                                  >
                                    <FaEdit />
                                  </IconButton>
                                  <IconButton
                                    onClick={() => handleDeleteLog(log.id)}
                                    size="small"
                                    sx={{
                                      color: "#d32f2f",
                                      "&:hover": {
                                        backgroundColor:
                                          "rgba(211, 47, 47, 0.1)",
                                        transform: "scale(1.1)",
                                      },
                                    }}
                                  >
                                    <FaTrash />
                                  </IconButton>
                                </Box>
                              )}
                            </Box>
                            {log.notes && (
                              <Typography
                                variant="body2"
                                sx={{
                                  mb: 1,
                                  fontSize: { xs: "0.9rem", sm: "0.95rem" },
                                  color: "#fff",
                                  backgroundColor: "#333",
                                  padding: "8px 12px",
                                  borderRadius: 2,
                                  borderLeft: "4px solid #FFD700",
                                }}
                              >
                                💬 {log.notes}
                              </Typography>
                            )}
                            <Typography
                              variant="caption"
                              sx={{
                                fontStyle: "italic",
                                fontSize: { xs: "0.75rem", sm: "0.8rem" },
                                color: "#BBB",
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              🕐{" "}
                              {new Date(
                                log.date || log.created_at
                              ).toLocaleString()}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Auto Data Points Section */}
            {groupedLogs.auto &&
              Object.keys(groupedLogs.auto.routines).length > 0 && (
                <Card className="mb-6 border border-border bg-surface">
                  {/* Auto Data Points Header */}
                  <CardHeader
                    className="border-b border-border bg-surface-light"
                    title={
                      <Typography
                        variant="h6"
                        className="text-white font-semibold"
                      >
                        🤖 Auto-Tracked Data Points
                      </Typography>
                    }
                  />
                  {/* Auto Data Points by Routine */}
                  <CardContent className="p-0">
                    {Object.entries(groupedLogs.auto.routines).map(
                      ([routineId, routineData]) => (
                        <Box key={routineId} sx={{ p: { xs: 2, sm: 2.5 } }}>
                          {/* Routine Header */}
                          <Typography
                            variant="subtitle2"
                            sx={{
                              mb: 2,
                              color: "#FFD700",
                              fontWeight: 600,
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            📋{" "}
                            <Link
                              href="/track/auto"
                              style={{
                                color: "#FFD700",
                                textDecoration: "underline",
                                cursor: "pointer",
                              }}
                            >
                              {(routineData as any).routineName}
                            </Link>
                          </Typography>

                          {/* Logs for this routine */}
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: { xs: 2, sm: 2.5 },
                            }}
                          >
                            {(routineData as any).logs.map((log: any) => (
                              <Box
                                key={log.id}
                                sx={{
                                  p: { xs: 2.5, sm: 3 },
                                  border: "2px solid #FFD700",
                                  borderRadius: 3,
                                  backgroundColor: "#222",
                                  color: "#fff",
                                  boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                                  transition: "all 0.3s ease",
                                  "&:hover": {
                                    boxShadow: "0 8px 25px rgba(255,215,0,0.3)",
                                    transform: "translateY(-2px)",
                                    borderColor: "#FFEA70",
                                  },
                                }}
                              >
                                {editingLogId === log.id ? (
                                  // Edit mode for auto data points (same as manual data points)
                                  <Box>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        mb: 3,
                                      }}
                                    >
                                      <Typography
                                        variant="subtitle1"
                                        fontWeight="bold"
                                        sx={{
                                          color: "#1976d2",
                                          fontSize: {
                                            xs: "1rem",
                                            sm: "1.1rem",
                                          },
                                        }}
                                      >
                                        ✏️ Editing: 🤖{" "}
                                        {getVariableNameFromLog(log)}
                                      </Typography>
                                      <Box sx={{ display: "flex", gap: 1 }}>
                                        <IconButton
                                          onClick={handleSaveEdit}
                                          disabled={
                                            !editingIsValid ||
                                            !editingValue.trim()
                                          }
                                          size="small"
                                          sx={{
                                            color: "#00E676",
                                            "&:hover": {
                                              backgroundColor:
                                                "rgba(0, 230, 118, 0.1)",
                                            },
                                          }}
                                        >
                                          <FaCheck />
                                        </IconButton>
                                        <IconButton
                                          onClick={handleCancelEdit}
                                          size="small"
                                          sx={{
                                            color: "#d32f2f",
                                            "&:hover": {
                                              backgroundColor:
                                                "rgba(211, 47, 47, 0.1)",
                                            },
                                          }}
                                        >
                                          <FaTimes />
                                        </IconButton>
                                      </Box>
                                    </Box>

                                    <Box
                                      sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 3,
                                      }}
                                    >
                                      {/* Date Field */}
                                      <Box>
                                        <Typography
                                          variant="subtitle2"
                                          gutterBottom
                                          sx={{
                                            color: "#FFD700",
                                            fontWeight: 600,
                                            fontSize: {
                                              xs: "0.9rem",
                                              sm: "0.875rem",
                                            },
                                          }}
                                        >
                                          📅 Date
                                        </Typography>
                                        <Box
                                          sx={{
                                            position: "relative",
                                            "& .datepicker-wrapper": {
                                              width: "100%",
                                            },
                                            "& .custom-datepicker": {
                                              width: "100%",
                                              padding: "12px 16px",
                                              fontSize: "14px",
                                              border: "2px solid #e0e0e0",
                                              borderRadius: "12px",
                                              backgroundColor: "#fff",
                                              color: "#333",
                                              fontFamily: "inherit",
                                              fontWeight: "500",
                                              transition: "all 0.3s ease",
                                              boxShadow:
                                                "0 2px 8px rgba(0,0,0,0.1)",
                                              "&:focus": {
                                                outline: "none",
                                                borderColor: "#1976d2",
                                                boxShadow:
                                                  "0 4px 12px rgba(25,118,210,0.2)",
                                                color: "#1976d2",
                                              },
                                              "&:hover": {
                                                borderColor: "#1976d2",
                                                boxShadow:
                                                  "0 4px 12px rgba(0,0,0,0.15)",
                                                color: "#1976d2",
                                              },
                                              "&::placeholder": {
                                                color: "#999",
                                                opacity: 1,
                                              },
                                            },
                                          }}
                                        >
                                          <DatePicker
                                            selected={editingDate}
                                            onChange={(date: Date | null) =>
                                              date && setEditingDate(date)
                                            }
                                            showTimeSelect
                                            timeFormat="HH:mm"
                                            timeIntervals={15}
                                            dateFormat="yyyy-MM-dd HH:mm"
                                            className="custom-datepicker"
                                            wrapperClassName="datepicker-wrapper"
                                          />
                                        </Box>
                                      </Box>

                                      {/* Value Field */}
                                      <TextField
                                        fullWidth
                                        label={`Value for ${getVariableNameFromLog(
                                          log
                                        )}`}
                                        value={editingValue}
                                        onChange={(e) => {
                                          const newValue = e.target.value;
                                          setEditingValue(newValue);

                                          // Real-time validation
                                          if (newValue.trim()) {
                                            const validation =
                                              validateEditValue(newValue, log);
                                            setEditingValidationError(
                                              validation.error || ""
                                            );
                                            setEditingIsValid(
                                              validation.isValid
                                            );
                                          } else {
                                            setEditingValidationError("");
                                            setEditingIsValid(true);
                                          }
                                        }}
                                        error={!editingIsValid}
                                        helperText={editingValidationError}
                                        sx={{
                                          "& .MuiInputLabel-root": {
                                            color: "#666",
                                            fontWeight: 500,
                                          },
                                          "& .MuiInputLabel-root.Mui-focused": {
                                            color: editingIsValid
                                              ? "#1976d2"
                                              : "#d32f2f",
                                          },
                                          "& .MuiInputLabel-root.Mui-error": {
                                            color: "#d32f2f",
                                          },
                                          "& .MuiOutlinedInput-root": {
                                            borderRadius: "12px",
                                            backgroundColor: "#fff",
                                            boxShadow:
                                              "0 2px 8px rgba(0,0,0,0.1)",
                                            "& fieldset": {
                                              borderColor: editingIsValid
                                                ? "#e0e0e0"
                                                : "#d32f2f",
                                              borderWidth: "2px",
                                            },
                                            "&:hover fieldset": {
                                              borderColor: editingIsValid
                                                ? "#1976d2"
                                                : "#d32f2f",
                                            },
                                            "&.Mui-focused fieldset": {
                                              borderColor: editingIsValid
                                                ? "#1976d2"
                                                : "#d32f2f",
                                              boxShadow: editingIsValid
                                                ? "0 4px 12px rgba(25,118,210,0.2)"
                                                : "0 4px 12px rgba(211,47,47,0.2)",
                                            },
                                            "&.Mui-error fieldset": {
                                              borderColor: "#d32f2f",
                                            },
                                          },
                                          "& .MuiInputBase-input": {
                                            padding: "12px 16px",
                                            fontSize: "14px",
                                          },
                                          "& .MuiFormHelperText-root": {
                                            fontSize: "0.75rem",
                                            marginTop: "8px",
                                            marginLeft: "14px",
                                          },
                                          "& .MuiFormHelperText-root.Mui-error":
                                            {
                                              color: "#d32f2f",
                                            },
                                        }}
                                        InputProps={{
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <span
                                                style={{ fontSize: "1.1rem" }}
                                              >
                                                {getVariableIconFromLog(log)}
                                              </span>
                                            </InputAdornment>
                                          ),
                                        }}
                                      />

                                      {/* Notes Field */}
                                      <TextField
                                        fullWidth
                                        label="Notes (Optional)"
                                        value={editingNotes}
                                        onChange={(e) =>
                                          setEditingNotes(e.target.value)
                                        }
                                        multiline
                                        rows={3}
                                        sx={{
                                          "& .MuiInputLabel-root": {
                                            color: "#666",
                                            fontWeight: 500,
                                          },
                                          "& .MuiInputLabel-root.Mui-focused": {
                                            color: "#1976d2",
                                          },
                                          "& .MuiOutlinedInput-root": {
                                            borderRadius: "12px",
                                            backgroundColor: "#fff",
                                            boxShadow:
                                              "0 2px 8px rgba(0,0,0,0.1)",
                                            "& fieldset": {
                                              borderColor: "#e0e0e0",
                                              borderWidth: "2px",
                                            },
                                            "&:hover fieldset": {
                                              borderColor: "#1976d2",
                                            },
                                            "&.Mui-focused fieldset": {
                                              borderColor: "#1976d2",
                                              boxShadow:
                                                "0 4px 12px rgba(25,118,210,0.2)",
                                            },
                                          },
                                          "& .MuiInputBase-input": {
                                            padding: "12px 16px",
                                            fontSize: "14px",
                                          },
                                        }}
                                        InputProps={{
                                          startAdornment: (
                                            <InputAdornment
                                              position="start"
                                              sx={{
                                                alignSelf: "flex-start",
                                                mt: 1,
                                              }}
                                            >
                                              <span
                                                style={{ fontSize: "1.1rem" }}
                                              >
                                                💭
                                              </span>
                                            </InputAdornment>
                                          ),
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                ) : (
                                  // Display mode for auto logs
                                  <Box>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        mb: 1.5,
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 2,
                                          flex: 1,
                                        }}
                                      >
                                        <Link
                                          href={`/variable/${encodeURIComponent(
                                            (() => {
                                              // Get variable slug from log
                                              if (
                                                log.variable_id &&
                                                variables.length > 0
                                              ) {
                                                const variable = variables.find(
                                                  (v) =>
                                                    v.id === log.variable_id
                                                );
                                                if (variable) {
                                                  return variable.slug;
                                                }
                                              }
                                              return (
                                                log.variable ||
                                                "unknown-variable"
                                              );
                                            })()
                                          )}`}
                                          style={{
                                            color: "#1976d2",
                                            textDecoration: "underline",
                                            cursor: "pointer",
                                          }}
                                        >
                                          <Typography
                                            variant="subtitle1"
                                            fontWeight="bold"
                                            sx={{
                                              color: "#1976d2",
                                              fontSize: {
                                                xs: "1rem",
                                                sm: "1.1rem",
                                              },
                                            }}
                                          >
                                            {getVariableNameFromLog(log)}
                                          </Typography>
                                        </Link>
                                        <Typography
                                          variant="h5"
                                          sx={{
                                            color: "#00E676",
                                            fontWeight: "bold",
                                            fontSize: {
                                              xs: "1.3rem",
                                              sm: "1.5rem",
                                            },
                                            textShadow:
                                              "0 1px 2px rgba(0,0,0,0.1)",
                                          }}
                                        >
                                          {log.value}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            ml: 0,
                                            color: "#FFD700",
                                            fontWeight: 600,
                                            fontSize: {
                                              xs: "0.75rem",
                                              sm: "0.8rem",
                                            },
                                            backgroundColor:
                                              "rgba(255, 215, 0, 0.18)",
                                            px: 1,
                                            borderRadius: 1,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                          }}
                                        >
                                          🤖 Auto
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: "flex", gap: 1 }}>
                                        <IconButton
                                          onClick={() => handleEditLog(log)}
                                          size="small"
                                          sx={{
                                            color: "#1976d2",
                                            mr: 1,
                                            "&:hover": {
                                              backgroundColor:
                                                "rgba(25, 118, 210, 0.1)",
                                              transform: "scale(1.1)",
                                            },
                                          }}
                                        >
                                          <FaEdit />
                                        </IconButton>
                                        <IconButton
                                          onClick={() =>
                                            handleDeleteLog(log.id)
                                          }
                                          size="small"
                                          sx={{
                                            color: "#d32f2f",
                                            "&:hover": {
                                              backgroundColor:
                                                "rgba(211, 47, 47, 0.1)",
                                              transform: "scale(1.1)",
                                            },
                                          }}
                                        >
                                          <FaTrash />
                                        </IconButton>
                                      </Box>
                                    </Box>
                                    {log.notes && (
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          mb: 1,
                                          fontSize: {
                                            xs: "0.9rem",
                                            sm: "0.95rem",
                                          },
                                          color: "#fff",
                                          backgroundColor: "#333",
                                          padding: "8px 12px",
                                          borderRadius: 2,
                                          borderLeft: "4px solid #FFD700",
                                        }}
                                      >
                                        💬 {log.notes}
                                      </Typography>
                                    )}
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontStyle: "italic",
                                        fontSize: {
                                          xs: "0.75rem",
                                          sm: "0.8rem",
                                        },
                                        color: "#BBB",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                      }}
                                    >
                                      🕐{" "}
                                      {new Date(
                                        log.date || log.created_at
                                      ).toLocaleString()}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )
                    )}
                  </CardContent>
                </Card>
              )}
          </Box>
        </Paper>
      )}

      {/* Variable Creation Dialog */}
      <VariableCreationDialog
        open={showVariableCreationDialog}
        onClose={() => {
          setShowVariableCreationDialog(false);
          setPendingVariableSelection(null);
          setNewVariableName("");
        }}
        onVariableCreated={handleVariableCreated}
        initialVariableName={newVariableName}
        user={user}
      />

      <Snackbar
        open={routineSnackbar.open}
        autoHideDuration={3500}
        onClose={() => setRoutineSnackbar({ open: false, message: "" })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          {routineSnackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
