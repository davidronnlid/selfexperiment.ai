import { useState, useEffect, useRef } from "react";
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
  searchVariables,
  validateVariableValue,
  createVariableLog,
} from "@/utils/variableUtils";
import { Variable } from "@/types/variables";
import ValidatedInput from "@/components/ValidatedInput";
import DropdownInput from "@/components/DropdownInput";
import ConstrainedInput from "@/components/ConstrainedInput";
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
import { useUser } from "../pages/_app";
import SearchIcon from "@mui/icons-material/Search";
import "react-datepicker/dist/react-datepicker.css";
import { LinearProgress } from "@mui/material";
import { LOG_LABELS, validateValue } from "@/utils/logLabels";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { useRouter } from "next/router";

// Dynamic variable options will be loaded from the database

interface LogEntry {
  id: number;
  date: string; // Now contains full timestamp (ISO string)
  variable: string;
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

export default function LogPage() {
  const { user, loading: userLoading, refreshUser } = useUser();
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
    Record<string, LogEntry[]>
  >({});
  const [experimentsNeedingLogs, setExperimentsNeedingLogs] = useState<any[]>(
    []
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);
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
  const [editExperimentLog, setEditExperimentLog] = useState<LogEntry | null>(
    null
  );
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

  // New variable creation state
  const [showVariableCreationDialog, setShowVariableCreationDialog] =
    useState(false);
  const [newVariableName, setNewVariableName] = useState("");
  const [pendingVariableSelection, setPendingVariableSelection] = useState<
    string | null
  >(null);

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
    if (!user || experimentsNeedingLogs.length === 0) return;

    const experiment = experimentsNeedingLogs[0];
    const { data: recentLogs } = await supabase
      .from("daily_logs")
      .select("date")
      .eq("user_id", user.id)
      .eq("variable", experiment.variable)
      .gte("date", experiment.start_date)
      .order("date", { ascending: false })
      .limit(30);

    if (!recentLogs || recentLogs.length === 0) {
      setLoggingStreak(0);
      return;
    }

    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
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
    todaysLogs: LogEntry[]
  ) => {
    const today = new Date().toISOString().split("T")[0];

    return experiments.filter((experiment) => {
      // Count how many logs for the independent variable were made today
      const independentLogsToday = todaysLogs.filter(
        (log) =>
          log.variable === experiment.variable && log.date.startsWith(today)
      ).length;

      // Count how many logs for the dependent variable were made today
      const dependentVariable =
        experiment.effect || experiment.dependent_variable;
      const dependentLogsToday = dependentVariable
        ? todaysLogs.filter(
            (log) =>
              log.variable === dependentVariable && log.date.startsWith(today)
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

  // Load variables and experiments
  useEffect(() => {
    async function fetchAndSortVariables() {
      if (!user) return;

      console.log("Starting to fetch variables...");
      setVariablesLoading(true);
      try {
        // Get all variables from LOG_LABELS
        const allVariables = LOG_LABELS.map((label) => ({
          id: label.label,
          slug: label.label.toLowerCase().replace(/\s+/g, "-"),
          label: label.label,
          data_type: "continuous" as const,
          source_type: "manual" as const,
          icon: label.icon || "📝",
          description: label.description || "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
        }));

        // Get user's custom variables
        const { data: userVars } = await supabase
          .from("user_variables")
          .select("*")
          .eq("user_id", user.id);

        if (userVars) {
          userVars.forEach((userVar) => {
            if (!allVariables.find((v) => v.label === userVar.label)) {
              allVariables.push({
                id: userVar.id,
                slug: userVar.label.toLowerCase().replace(/\s+/g, "-"),
                label: userVar.label,
                data_type: "continuous" as const,
                source_type: "manual" as const,
                icon: userVar.icon || "🆕",
                description: userVar.description || "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_active: true,
              });
            }
          });
        }

        // Get usage frequency for sorting
        const { data: logs } = await supabase
          .from("daily_logs")
          .select("variable")
          .eq("user_id", user.id);

        const usageCount: Record<string, number> = {};
        logs?.forEach((log) => {
          usageCount[log.variable] = (usageCount[log.variable] || 0) + 1;
        });

        // Sort by usage frequency
        allVariables.sort((a, b) => {
          const aCount = usageCount[a.label] || 0;
          const bCount = usageCount[b.label] || 0;
          return bCount - aCount;
        });

        setVariables(allVariables);
        setLabelOptions(allVariables);
        console.log(
          "Variables loaded successfully, count:",
          allVariables.length
        );
      } catch (error) {
        console.error("Error fetching variables:", error);
      } finally {
        console.log("Setting variablesLoading to false");
        setVariablesLoading(false);
      }
    }

    fetchAndSortVariables();
  }, [user]);

  // Load active experiments
  useEffect(() => {
    async function loadActiveExperiments() {
      if (!user) return;

      try {
        const { data: experiments } = await supabase
          .from("experiments")
          .select("*")
          .eq("user_id", user.id)
          .gte("end_date", new Date().toISOString().split("T")[0]);

        if (experiments) {
          setActiveExperiments(experiments);

          // Get today's logs to properly filter experiments
          const today = new Date().toISOString().split("T")[0];
          const startOfDay = `${today}T00:00:00.000Z`;
          const endOfDay = `${today}T23:59:59.999Z`;

          const { data: todaysLogs } = await supabase
            .from("daily_logs")
            .select("*")
            .eq("user_id", user.id)
            .gte("date", startOfDay)
            .lte("date", endOfDay)
            .order("created_at", { ascending: false });

          // Filter experiments based on today's logs
          const filtered = filterExperimentsNeedingLogs(
            experiments,
            todaysLogs || []
          );
          setExperimentsNeedingLogs(filtered);
        }
      } catch (error) {
        console.error("Error loading experiments:", error);
      }
    }

    loadActiveExperiments();
  }, [user]); // Remove logs dependency to prevent infinite loops

  // Load today's logs
  useEffect(() => {
    async function loadTodaysLogs() {
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;

      const { data: todaysLogs } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startOfDay)
        .lte("date", endOfDay)
        .order("created_at", { ascending: false });

      if (todaysLogs) {
        setLogs(todaysLogs);
      }
    }

    loadTodaysLogs();
  }, [user]);

  // Calculate progress when experiments load
  useEffect(() => {
    calculateExperimentProgress();
    calculateLoggingStreak();
  }, [experimentsNeedingLogs, user]);

  const fetchLogs = async () => {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startOfDay)
      .lte("date", endOfDay)
      .order("created_at", { ascending: false });

    setLogs(data || []);

    // Also refresh experiments filtering
    if (data && activeExperiments.length > 0) {
      const filtered = filterExperimentsNeedingLogs(activeExperiments, data);
      setExperimentsNeedingLogs(filtered);
    }
  };

  const submitLog = async () => {
    if (!user || !selectedVariable || !value.trim()) {
      setExpError("Please select a variable and enter a value");
      return;
    }

    // Validate the value using the proper validation function
    const validation = validateValue(selectedVariable.label, value);
    if (!validation.isValid) {
      setExpError(validation.error || "Invalid value");
      return;
    }

    setSubmitting(true);
    setExpError("");

    try {
      // Use the selected date and time directly
      const selectedDateTime = new Date(date);

      const logData = {
        user_id: user.id,
        variable: selectedVariable.label,
        value: value.trim(),
        notes: notes.trim() || null,
        date: selectedDateTime.toISOString(), // Store the selected date and time
        created_at: new Date().toISOString(), // Created at is always current time
      };

      const { data, error } = await supabase
        .from("daily_logs")
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

    // Validate the value using the proper validation function
    const validation = validateValue(experimentVariableName, logValue);
    if (!validation.isValid) {
      setExpError(validation.error || "Invalid value");
      return;
    }

    setSubmitting(true);
    setExpError("");

    try {
      const logData = {
        user_id: user.id,
        variable: experimentVariableName,
        value: logValue.trim(),
        notes: logNotes.trim() || null,
        date: new Date().toISOString(), // Use current time for experiment logging
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("daily_logs")
        .insert([logData])
        .select();

      if (error) {
        throw error;
      }

      // Success - show success message
      const displayName = (() => {
        const experimentVariable = LOG_LABELS.find(
          (label) => label.label === experimentVariableName
        );

        if (!experimentVariable) {
          // Try stripping units from variable name (e.g., "Caffeine (mg)" -> "Caffeine")
          const cleanVariableName = experimentVariableName.replace(
            /\s*\([^)]*\)\s*$/,
            ""
          );
          const cleanExperimentVariable = LOG_LABELS.find(
            (label) => label.label === cleanVariableName
          );

          if (cleanExperimentVariable) {
            const displayName = cleanExperimentVariable.label;
            const unit = cleanExperimentVariable.constraints?.unit;
            return displayName + (unit ? ` (${unit})` : "");
          }
        }

        // Display the clean variable name (without units from the stored name)
        const displayName =
          experimentVariable?.label ||
          experimentVariableName.replace(/\s*\([^)]*\)\s*$/, "");
        const unit = experimentVariable?.constraints?.unit;
        return displayName + (unit ? ` (${unit})` : "");
      })();

      setSuccessMessage(
        `Successfully logged ${displayName} for your experiment!`
      );
      setShowSuccess(true);

      // Refresh logs and experiments filtering
      await fetchLogs();
      await refreshExperimentsFiltering();
    } catch (error) {
      console.error("Error saving experiment log:", error);
      setExpError("Failed to log your experiment data. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitExperimentLogs = async (
    variables: Array<{
      name: string;
      value: string;
      notes: string;
    }>
  ) => {
    if (!user || variables.length === 0) {
      setExpError("Please enter values for your experiment variables");
      return;
    }

    // Validate that all variables have values
    const missingVariables = variables.filter((v) => !v.value.trim());
    if (missingVariables.length > 0) {
      setExpError("Please enter values for all experiment variables");
      return;
    }

    // Validate each variable's value using the proper validation function
    for (const variable of variables) {
      const validation = validateValue(variable.name, variable.value);
      if (!validation.isValid) {
        setExpError(`${variable.name}: ${validation.error || "Invalid value"}`);
        return;
      }
    }

    setSubmitting(true);
    setExpError("");

    try {
      const logDataArray = variables.map((variable) => ({
        user_id: user.id,
        variable: variable.name,
        value: variable.value.trim(),
        notes: variable.notes.trim() || null,
        date: new Date().toISOString(), // Use current time for experiment logging
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("daily_logs")
        .insert(logDataArray)
        .select();

      if (error) {
        throw error;
      }

      // Success - show success message
      const variableNames = variables.map((v) => {
        const experimentVariable = LOG_LABELS.find(
          (label) => label.label === v.name
        );

        if (!experimentVariable) {
          // Try stripping units from variable name (e.g., "Caffeine (mg)" -> "Caffeine")
          const cleanVariableName = v.name.replace(/\s*\([^)]*\)\s*$/, "");
          const cleanExperimentVariable = LOG_LABELS.find(
            (label) => label.label === cleanVariableName
          );

          if (cleanExperimentVariable) {
            const displayName = cleanExperimentVariable.label;
            const unit = cleanExperimentVariable.constraints?.unit;
            return displayName + (unit ? ` (${unit})` : "");
          }
        }

        // Display the clean variable name (without units from the stored name)
        const displayName =
          experimentVariable?.label || v.name.replace(/\s*\([^)]*\)\s*$/, "");
        const unit = experimentVariable?.constraints?.unit;
        return displayName + (unit ? ` (${unit})` : "");
      });

      setSuccessMessage(
        `Successfully logged ${variableNames.join(
          " and "
        )} for your experiment!`
      );
      setShowSuccess(true);

      // Refresh logs and experiments filtering
      await fetchLogs();
      await refreshExperimentsFiltering();
    } catch (error) {
      console.error("Error saving experiment logs:", error);
      setExpError("Failed to log your experiment data. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Load privacy settings
  useEffect(() => {
    const loadPrivacySettings = async () => {
      if (!user) return;

      setPrivacyLoading(true);
      const { data } = await supabase
        .from("variable_sharing_settings")
        .select("*")
        .eq("user_id", user.id);

      setVariableSettings(data || []);
      setPrivacyLoading(false);
    };

    loadPrivacySettings();
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
      // Reload today's logs
      const today = new Date().toISOString().split("T")[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;

      const { data: todaysLogs } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startOfDay)
        .lte("date", endOfDay)
        .order("created_at", { ascending: false });

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
  const handleEditLog = (log: LogEntry) => {
    setEditingLogId(log.id);
    setEditingValue(log.value);
    setEditingNotes(log.notes || "");
    setEditingDate(new Date(log.date));
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditingValue("");
    setEditingNotes("");
    setEditingDate(new Date());
  };

  const handleSaveEdit = async () => {
    if (!editingLogId || !editingValue.trim()) return;

    try {
      const { error } = await supabase
        .from("daily_logs")
        .update({
          value: editingValue.trim(),
          notes: editingNotes.trim() || null,
          date: editingDate.toISOString(),
        })
        .eq("id", editingLogId);

      if (error) throw error;

      // Refresh logs
      await fetchLogs();
      setEditingLogId(null);
      setEditingValue("");
      setEditingNotes("");
      setEditingDate(new Date());

      setSuccessMessage("Log updated successfully!");
      setShowSuccess(true);
    } catch (error) {
      console.error("Error updating log:", error);
      setExpError("Failed to update log");
    }
  };

  // Handle log deletion
  const handleDeleteLog = async (logId: number) => {
    if (!confirm("Are you sure you want to delete this log?")) return;

    try {
      const { error } = await supabase
        .from("daily_logs")
        .delete()
        .eq("id", logId);

      if (error) throw error;

      // Refresh logs
      await fetchLogs();
    } catch (error) {
      console.error("Error deleting log:", error);
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

  if (userLoading || variablesLoading) {
    console.log(
      "LogPage: userLoading =",
      userLoading,
      "variablesLoading =",
      variablesLoading
    );
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">
          Please log in to access the logging feature.
        </Alert>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="md"
      sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}
    >
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        align="center"
        sx={{
          fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
          mb: { xs: 2, sm: 3 },
        }}
      >
        📊 Log Your Data
      </Typography>

      {/* Active Experiments */}
      {experimentsNeedingLogs.length > 0 && (
        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
          <Typography
            variant="h5"
            sx={{
              mb: { xs: 2, sm: 3 },
              display: "flex",
              alignItems: "center",
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
            }}
          >
            🧪 Active Experiments
          </Typography>

          {experimentsNeedingLogs.map((experiment, index) => (
            <Paper
              key={`${experiment.id}-${index}`}
              elevation={2}
              sx={{
                p: { xs: 2, sm: 2 },
                mb: 2,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    mb: 1,
                    fontWeight: "bold",
                    fontSize: { xs: "0.9rem", sm: "1rem" },
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
                            mb: 1,
                            opacity: 0.8,
                            fontStyle: "italic",
                            display: "block",
                            fontSize: { xs: "0.7rem", sm: "0.75rem" },
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
                    gap: 2,
                  }}
                >
                  {/* Independent Variable Section */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      gap: { xs: 1, sm: 1.5 },
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
                        gap: { xs: 1, sm: 1.5 },
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
                      px: { xs: 2, sm: 2 },
                      py: { xs: 1, sm: 0.5 },
                      backgroundColor: "#ffd700",
                      color: "#333",
                      fontWeight: "bold",
                      fontSize: { xs: "0.9rem", sm: "0.875rem" },
                      "&:hover": {
                        backgroundColor: "#ffed4a",
                      },
                      "&:disabled": {
                        backgroundColor: "rgba(255,215,0,0.5)",
                        color: "rgba(51,51,51,0.5)",
                      },
                    }}
                  >
                    {submitting ? "..." : "Log Both Variables"}
                  </Button>
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    opacity: 0.8,
                    mt: 1,
                    display: "block",
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
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
              py: { xs: 1.5, sm: 1 },
              "&:hover": {
                backgroundColor: "rgba(102, 126, 234, 0.1)",
                borderColor: "primary.main",
              },
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
            mb: 3,
            borderRadius: 2,
            "& .MuiAlert-message": {
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: { xs: "center", sm: "space-between" },
              width: "100%",
              gap: { xs: 1, sm: 0 },
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
            const today = new Date().toISOString().split("T")[0];
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

      {/* Error Message */}
      {expError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {expError}
        </Alert>
      )}

      {/* Research Question Builder */}
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, mb: { xs: 3, sm: 4 } }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ fontSize: { xs: "1.1rem", sm: "1.25rem" } }}
        >
          {experimentsNeedingLogs.length > 0
            ? "Log Any Other Variables"
            : "What are you logging today?"}
        </Typography>

        {experimentsNeedingLogs.length > 0 && (
          <Alert severity="info" sx={{ mb: { xs: 2, sm: 3 } }}>
            <Typography
              variant="body2"
              sx={{ fontSize: { xs: "0.85rem", sm: "0.875rem" } }}
            >
              💡 <strong>Tip:</strong> Use the experiment card above to log your
              active experiment data quickly. This form is for logging
              additional variables not part of your current experiment.
            </Typography>
          </Alert>
        )}

        {/* Variable Selection */}
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          {/* Popular Variables */}
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ fontSize: { xs: "0.9rem", sm: "0.875rem" } }}
            >
              Popular Variables
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: { xs: 0.5, sm: 1 },
              }}
            >
              {["Mood", "Energy", "Sleep Quality", "Stress", "Exercise"].map(
                (varName) => {
                  const variable = variables.find((v) => v.label === varName);
                  return variable ? (
                    <Chip
                      key={varName}
                      label={`${variable.icon} ${varName}`}
                      onClick={() => setSelectedVariable(variable)}
                      color={
                        selectedVariable?.label === varName
                          ? "primary"
                          : "default"
                      }
                      variant={
                        selectedVariable?.label === varName
                          ? "filled"
                          : "outlined"
                      }
                      clickable
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        fontSize: { xs: "0.7rem", sm: "0.8125rem" },
                        height: { xs: "auto", sm: "auto" },
                      }}
                    />
                  ) : null;
                }
              )}
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
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search variables or type a new one..."
                size={isMobile ? "small" : "medium"}
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
                  gap: { xs: 1, sm: 2 },
                  py: { xs: 1, sm: 1.5 },
                }}
              >
                <span>{option.icon}</span>
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

        {/* Selected Variable Constraints */}
        {selectedVariable &&
          (() => {
            // Find the LOG_LABELS entry for constraint info
            const logLabel = LOG_LABELS.find(
              (label) => label.label === selectedVariable.label
            );
            const constraints = logLabel?.constraints;

            if (constraints) {
              let constraintText = "";

              if (
                constraints.min !== undefined &&
                constraints.max !== undefined
              ) {
                constraintText = `Range: ${constraints.min}${
                  constraints.unit ? ` ${constraints.unit}` : ""
                } - ${constraints.max}${
                  constraints.unit ? ` ${constraints.unit}` : ""
                }`;
              } else if (
                constraints.scaleMin !== undefined &&
                constraints.scaleMax !== undefined
              ) {
                constraintText = `Scale: ${constraints.scaleMin} - ${constraints.scaleMax}`;
              }

              if (constraintText) {
                return (
                  <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#FFD700",
                        fontWeight: 500,
                        fontSize: { xs: "0.75rem", sm: "0.8rem" },
                        display: "block",
                        backgroundColor: "rgba(255, 215, 0, 0.1)",
                        padding: "4px 8px",
                        borderRadius: 1,
                        border: "1px solid rgba(255, 215, 0, 0.3)",
                      }}
                    >
                      💡 {constraintText}
                    </Typography>
                  </Box>
                );
              }
            }
            return null;
          })()}

        {/* Value Input */}
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <ConstrainedInput
            label={selectedVariable?.label || "Value"}
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
      {logs.length > 0 && (
        <Paper
          elevation={6}
          sx={{
            p: { xs: 3, sm: 4 },
            background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
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
            📊 Today's Logs
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: { xs: 2, sm: 2.5 },
            }}
          >
            {logs.map((log) => (
              <Box
                key={log.id}
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  border: "2px solid #FFD700",
                  borderRadius: 3,
                  backgroundColor: "#ffffff",
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
                  // Edit mode
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
                        Editing: {log.variable}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton
                          onClick={handleSaveEdit}
                          size="small"
                          sx={{
                            color: "#fff",
                            backgroundColor: "#4caf50",
                            borderRadius: "8px",
                            padding: "8px",
                            "&:hover": {
                              backgroundColor: "#45a049",
                              transform: "scale(1.05)",
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
                      sx={{ display: "flex", flexDirection: "column", gap: 3 }}
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
                              fontFamily: "inherit",
                              transition: "all 0.3s ease",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                              "&:focus": {
                                outline: "none",
                                borderColor: "#1976d2",
                                boxShadow: "0 4px 12px rgba(25,118,210,0.2)",
                              },
                              "&:hover": {
                                borderColor: "#1976d2",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
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
                        label="Value"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
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
                              boxShadow: "0 4px 12px rgba(25,118,210,0.2)",
                            },
                          },
                          "& .MuiInputBase-input": {
                            padding: "12px 16px",
                            fontSize: "14px",
                          },
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <span style={{ fontSize: "1.1rem" }}>💯</span>
                            </InputAdornment>
                          ),
                        }}
                      />

                      {/* Notes Field */}
                      <TextField
                        fullWidth
                        label="Notes (Optional)"
                        value={editingNotes}
                        onChange={(e) => setEditingNotes(e.target.value)}
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
                              boxShadow: "0 4px 12px rgba(25,118,210,0.2)",
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
                              <span style={{ fontSize: "1.1rem" }}>💭</span>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                  </Box>
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
                        <Typography
                          variant="subtitle1"
                          fontWeight="bold"
                          sx={{
                            color: "#1976d2",
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                            cursor: "pointer",
                            textDecoration: "underline",
                            "&:hover": {
                              color: "#0d47a1",
                            },
                          }}
                          onClick={() =>
                            router.push(
                              `/variable/${encodeURIComponent(log.variable)}`
                            )
                          }
                        >
                          {log.variable}
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{
                            color: "#2e7d32",
                            fontWeight: "bold",
                            fontSize: { xs: "1.3rem", sm: "1.5rem" },
                            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                          }}
                        >
                          {log.value}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton
                          onClick={() => handleEditLog(log)}
                          size="small"
                          sx={{
                            color: "#1976d2",
                            mr: 1,
                            "&:hover": {
                              backgroundColor: "rgba(25, 118, 210, 0.1)",
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
                              backgroundColor: "rgba(211, 47, 47, 0.1)",
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
                          fontSize: { xs: "0.9rem", sm: "0.95rem" },
                          color: "#666",
                          backgroundColor: "#f5f5f5",
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
                        color: "#888",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      🕐 {new Date(log.date).toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
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
    </Container>
  );
}
