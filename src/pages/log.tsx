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
import { FaTag, FaStickyNote, FaGlobe, FaLock } from "react-icons/fa";
import {
  searchVariables,
  validateVariableValue,
  createVariableLog,
} from "@/utils/variableUtils";
import { Variable } from "@/types/variables";
import ValidatedInput from "@/components/ValidatedInput";
import DropdownInput from "@/components/DropdownInput";
import Link from "next/link";
import {
  Container,
  Box,
  Tabs,
  Tab,
  Chip,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useUser } from "../pages/_app";
import SearchIcon from "@mui/icons-material/Search";
import "react-datepicker/dist/react-datepicker.css";
import { LinearProgress } from "@mui/material";
import { LOG_LABELS } from "@/utils/logLabels";

// Helper function to validate variable value
const validateValue = (
  label: string,
  value: string
): { isValid: boolean; error?: string } => {
  // Basic validation - you can expand this based on your needs
  if (!value || value.trim() === "") {
    return { isValid: false, error: "Value cannot be empty" };
  }

  // Check if it's a number for numeric variables
  const numericValue = parseFloat(value);
  if (!isNaN(numericValue)) {
    if (numericValue < 0 || numericValue > 100) {
      return { isValid: false, error: "Value must be between 0 and 100" };
    }
    return { isValid: true };
  }

  // For non-numeric values, just check if it's not empty
  return {
    isValid: value.trim().length > 0,
    error: value.trim().length > 0 ? undefined : "Value cannot be empty",
  };
};

// Dynamic variable options will be loaded from the database

interface LogEntry {
  id: number;
  date: string;
  variable: string;
  value: string;
  notes?: string;
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
  const { user, loading: userLoading } = useUser();
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
  const [selectedInterval, setSelectedInterval] = useState<string>("");
  const [pendingVariable, setPendingVariable] = useState("");
  const [pendingEmoji, setPendingEmoji] = useState("🆕");
  const [isValueValid, setIsValueValid] = useState<boolean>(true);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [variableSettings, setVariableSettings] = useState<any[]>([]);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [isLogPrivate, setIsLogPrivate] = useState(false);
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
      if (log.date === currentDate) {
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

  // Group variables by category for better organization
  const groupedVariables = variables.reduce((acc, variable) => {
    const category = variable.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(variable);
    return acc;
  }, {} as Record<string, Variable[]>);

  // Load all active experiments from localStorage
  useEffect(() => {
    try {
      const expArr = localStorage.getItem("activeExperiments");
      if (expArr) {
        const parsed = JSON.parse(expArr);
        if (Array.isArray(parsed)) {
          setActiveExperiments(parsed);
        } else {
          setActiveExperiments([]);
        }
      } else {
        setActiveExperiments([]);
      }
    } catch (e) {
      setActiveExperiments([]);
    }
  }, []);

  // For each experiment, check if today's logs are complete
  useEffect(() => {
    if (!activeExperiments.length) return;
    const today = new Date();
    const logsByExp: Record<string, LogEntry[]> = {};
    const needsLogs: any[] = [];
    activeExperiments.forEach((exp) => {
      const logsToday = logs.filter(
        (log) =>
          log.variable === exp.variable &&
          new Date(log.date).toDateString() === today.toDateString()
      );
      logsByExp[exp.variable] = logsToday;
      if (logsToday.length < exp.frequency) {
        needsLogs.push(exp);
      }
    });
    setExperimentsLogsToday(logsByExp);
    setExperimentsNeedingLogs(needsLogs);
  }, [logs, activeExperiments]);

  // Fetch user variables on load
  useEffect(() => {
    async function fetchAndSortVariables() {
      // 1. Fetch all logs
      const { data: logs } = await supabase
        .from("daily_logs")
        .select("variable");
      // Count occurrences of each label
      const logCounts: Record<string, number> = {};
      (logs || []).forEach((row: any) => {
        if (row.variable)
          logCounts[row.variable] = (logCounts[row.variable] || 0) + 1;
      });

      // 2. Fetch user variables (with icon)
      const { data: userVars } = await supabase
        .from("user_variables")
        .select("label, icon");

      // 3. Merge with LOG_LABELS
      const allVars = [
        ...LOG_LABELS.map((l) => l.label),
        ...(userVars?.map((u) => u.label) || []),
      ];
      const uniqueVars = Array.from(new Set(allVars));

      // 4. Attach log counts
      const varWithCounts = uniqueVars.map((label) => ({
        label,
        value: label,
        count: logCounts[label] || 0,
        icon: getVariableIcon(label, userVars || []),
      }));

      // 5. Sort by count descending and limit to 15
      varWithCounts.sort((a, b) => b.count - a.count);
      setLabelOptions(varWithCounts.slice(0, 15));
    }
    fetchAndSortVariables();
  }, []);

  // When experiment or date changes, set default interval
  useEffect(() => {
    if (
      activeExperiments.length > 0 &&
      activeExperiments[0].time_intervals &&
      activeExperiments[0].time_intervals.length > 0
    ) {
      // Try to match current time to an interval
      const now = new Date();
      const hour = now.getHours();
      let defaultInterval = activeExperiments[0].time_intervals[0];
      for (const interval of activeExperiments[0].time_intervals) {
        // Preset logic
        if (interval === "Morning" && hour >= 5 && hour < 12)
          defaultInterval = interval;
        if (interval === "Afternoon" && hour >= 12 && hour < 17)
          defaultInterval = interval;
        if (interval === "Evening" && hour >= 17 && hour < 22)
          defaultInterval = interval;
        if (interval === "Night" && (hour >= 22 || hour < 5))
          defaultInterval = interval;
        // Custom interval: try to parse e.g. '13:00–15:00'
        const match = interval.match(/(\d{1,2}):(\d{2})[–-](\d{1,2}):(\d{2})/);
        if (match) {
          const start = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
          const end = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);
          const nowMins = hour * 60 + now.getMinutes();
          if (nowMins >= start && nowMins <= end) defaultInterval = interval;
        }
      }
      setSelectedInterval(defaultInterval);
    }
  }, [activeExperiments, date]);

  // Call fetchLogs on mount
  useEffect(() => {
    fetchLogs();
  }, []);

  // Debounced effect for live emoji suggestion
  useEffect(() => {
    if (!pendingVariable.trim() || pendingVariable.length > 25) {
      setPendingEmoji("🆕");
      return;
    }
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(async () => {
      try {
        const gptRes = await fetch("/api/gpt-emoji", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variable: pendingVariable }),
        });
        if (gptRes.ok) {
          const gptData = await gptRes.json();
          if (gptData.emoji) setPendingEmoji(gptData.emoji);
        } else {
          setPendingEmoji("🆕");
        }
      } catch {
        setPendingEmoji("🆕");
      }
    }, 400); // 400ms debounce
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [pendingVariable]);

  // Only pass userVars (not LABEL_OPTIONS) to useEmojiMap
  const userVars = labelOptions.filter(
    (opt: unknown) => typeof opt === "object" && opt !== null
  );
  const emojiMap = useEmojiMap(userVars, pendingVariable, pendingEmoji);
  // Build options for CreatableSelect (label/value only)
  const selectOptions: { label: string; value: string }[] = labelOptions.map(
    (opt: unknown) => {
      if (typeof opt === "string") {
        return { label: opt, value: opt };
      } else if (
        typeof opt === "object" &&
        opt !== null &&
        "label" in opt &&
        "value" in opt
      ) {
        return {
          label: (opt as { label: string }).label,
          value: (opt as { value: string }).value,
        };
      } else {
        return { label: "", value: "" };
      }
    }
  );
  if (
    pendingVariable &&
    !labelOptions.some((opt: unknown) => {
      if (typeof opt === "string") return opt === pendingVariable;
      if (typeof opt === "object" && opt !== null && "value" in opt)
        return (opt as { value: string }).value === pendingVariable;
      return false;
    })
  ) {
    selectOptions.push({ label: pendingVariable, value: pendingVariable });
  }

  // Define fetchLogs to fetch logs from Supabase (must be after user is defined)
  const fetchLogs = async () => {
    if (!user) return;
    const { data: logs } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    setLogs(logs || []);
  };

  const submitLog = async () => {
    if (submitting) return; // Prevent double submission

    if (!user) {
      setExpError("You must be logged in to log data.");
      return;
    }

    setSubmitting(true);
    setExpError(""); // Clear any previous errors

    // Determine the variable name to use
    const variableToLog =
      experimentsNeedingLogs.length > 0
        ? experimentsNeedingLogs[0].variable
        : dependentVariable; // The variable we're tracking/measuring

    if (!variableToLog || variableToLog.length > 25) {
      setExpError(
        "Please select a variable to log. Variable name must be under 25 characters."
      );
      setSubmitting(false);
      return;
    }

    if (!value || value.trim() === "") {
      setExpError("Please enter a value to log.");
      setSubmitting(false);
      return;
    }

    // Validate the value using our constraint system
    const validation = validateValue(variableToLog, value);
    if (!validation.isValid) {
      setExpError(validation.error || "Invalid value");
      setSubmitting(false);
      return;
    }

    // Only enforce frequency limit for the experiment variable
    if (
      experimentsNeedingLogs.length > 0 &&
      variableToLog === experimentsNeedingLogs[0].variable &&
      experimentsLogsToday[experimentsNeedingLogs[0].variable].length >=
        experimentsNeedingLogs[0].frequency
    ) {
      setSuccessMessage("");
      setShowSuccess(false);
      setMaxLogsWarningMsg(
        "You have reached the maximum number of logs for today for this experiment variable. Once your active experiment is complete, you will be able to log this variable as often as you like."
      );
      setMaxLogsWarning(true);
      setSubmitting(false);
      return;
    }

    if (
      experimentsNeedingLogs.length > 0 &&
      experimentsNeedingLogs[0].time_intervals &&
      experimentsNeedingLogs[0].time_intervals.length > 0
    ) {
      if (!selectedInterval) {
        setExpError("Please select a time interval to log for.");
        setSubmitting(false);
        return;
      }
    }

    try {
      // Insert log with user_id
      const { data, error } = await supabase
        .from("daily_logs")
        .insert([
          {
            user_id: user.id,
            date: date.toISOString(),
            variable: variableToLog,
            value,
            notes:
              (notes ? notes + "\n" : "") +
              (independentVariable
                ? `Independent Variable: ${independentVariable}\n`
                : "") +
              (selectedInterval ? `Interval: ${selectedInterval}` : ""),
          },
        ])
        .select();

      if (error) {
        setSuccessMessage("");
        setShowSuccess(false);
        setExpError("Failed to save log: " + error.message);
      } else {
        // Insert or update log_privacy_settings for this log
        if (data && data[0] && data[0].id) {
          await supabase.from("log_privacy_settings").upsert({
            user_id: user.id,
            log_id: data[0].id,
            is_hidden: isLogPrivate,
          });
        }
        setSuccessMessage("✔️ Log saved!");
        setShowSuccess(true);
        setValue("");
        setNotes("");
        setIsLogPrivate(false);
        fetchLogs();
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (err) {
      setExpError(
        "Unexpected error: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Load privacy settings for variable sharing
  useEffect(() => {
    const loadPrivacySettings = async () => {
      if (!user) return;
      setPrivacyLoading(true);
      const { data: varSettings, error: varError } = await supabase
        .from("variable_sharing_settings")
        .select("*")
        .eq("user_id", user.id);
      if (!varError) setVariableSettings(varSettings || []);
      setPrivacyLoading(false);
    };
    loadPrivacySettings();
  }, [user]);

  const getVariableSharingStatus = (variableName: string) => {
    const setting = variableSettings.find(
      (s) => s.variable_name === variableName
    );
    return setting?.is_shared ?? false;
  };

  // Add flag to require experiment logging first
  const mustLogExperimentFirst = !!(
    experimentsNeedingLogs.length > 0 &&
    experimentsLogsToday[experimentsNeedingLogs[0].variable].length <
      experimentsNeedingLogs[0].frequency
  );

  // If mustLogExperimentFirst, force dependent variable to experiment variable
  useEffect(() => {
    if (mustLogExperimentFirst && experimentsNeedingLogs.length > 0) {
      setDependentVariable(experimentsNeedingLogs[0].variable);
    }
  }, [mustLogExperimentFirst, experimentsNeedingLogs]);

  // If experiment frequency is 1 and log exists, prefill edit state
  useEffect(() => {
    if (
      experimentsNeedingLogs.length > 0 &&
      experimentsNeedingLogs[0].frequency === 1 &&
      experimentsLogsToday[experimentsNeedingLogs[0].variable].length === 1
    ) {
      setEditExperimentLog(
        experimentsLogsToday[experimentsNeedingLogs[0].variable][0]
      );
      setEditValue(
        experimentsLogsToday[experimentsNeedingLogs[0].variable][0].value
      );
      setEditNotes(
        experimentsLogsToday[experimentsNeedingLogs[0].variable][0].notes || ""
      );
    } else {
      setEditExperimentLog(null);
      setEditValue("");
      setEditNotes("");
    }
  }, [experimentsNeedingLogs, experimentsLogsToday]);

  // Add edit handler
  const handleEditExperimentLog = async () => {
    if (!editExperimentLog) return;
    if (!editValue) {
      setExpError("Value cannot be empty.");
      return;
    }
    const validation = validateValue(editExperimentLog.variable, editValue);
    if (!validation.isValid) {
      setExpError(validation.error || "Invalid value");
      return;
    }
    const { error } = await supabase
      .from("daily_logs")
      .update({ value: editValue, notes: editNotes })
      .eq("id", editExperimentLog.id);
    if (error) {
      setExpError("Failed to update log: " + error.message);
    } else {
      setExpError("");
      setSuccessMessage("Log updated!");
      setShowSuccess(true);
      fetchLogs();
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  // Search/filter logic for variables
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    // Combine all variable options (labelOptions + groupedVariables)
    const allVars = [
      ...labelOptions,
      ...Object.values(groupedVariables).flat(),
    ];
    // Remove duplicates by label
    const uniqueVars = Array.from(
      new Map(
        allVars.map((v) => [typeof v === "string" ? v : v.label, v])
      ).values()
    );
    const filtered = uniqueVars.filter((v) => {
      const label = typeof v === "string" ? v : v.label;
      return label.toLowerCase().includes(searchTerm.toLowerCase());
    });
    setSearchResults(filtered);
  }, [searchTerm, labelOptions, groupedVariables]);

  // Add to useEffect for fetching experiments
  useEffect(() => {
    if (experimentsNeedingLogs.length > 0) {
      calculateExperimentProgress();
      calculateLoggingStreak();
    }
  }, [experimentsNeedingLogs, user]);

  if (userLoading) return <div>Loading...</div>;
  if (!user) return <div>You must be logged in to use the log page.</div>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        📝 Log Now
      </Typography>

      <Typography
        variant="h6"
        color="textSecondary"
        align="center"
        sx={{ mb: 4 }}
      >
        Track your variables and observations
      </Typography>

      <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: "auto" }}>
        {expError && (
          <Alert severity="error" className="mb-4">
            {expError}
          </Alert>
        )}
        {/* Only show experiment prompt if quota not met */}
        {experimentsNeedingLogs.length > 0 &&
          experimentsLogsToday[experimentsNeedingLogs[0].variable].length <
            experimentsNeedingLogs[0].frequency && (
            <Box sx={{ mb: 4 }}>
              {/* Enhanced Experiment Progress Section */}
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  mb: 3,
                  background:
                    "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
                  color: "white",
                  borderRadius: 3,
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    🧪 Experiment Active
                  </Typography>
                </Box>

                <Typography variant="body1" sx={{ mb: 1 }}>
                  Variable:{" "}
                  <strong>{experimentsNeedingLogs[0].variable}</strong>
                </Typography>

                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  {new Date(
                    experimentsNeedingLogs[0].start_date
                  ).toLocaleDateString()}{" "}
                  -{" "}
                  {new Date(
                    experimentsNeedingLogs[0].end_date
                  ).toLocaleDateString()}
                </Typography>

                {/* Progress Bar */}
                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2">Progress</Typography>
                    <Typography variant="body2">
                      {Math.round(experimentProgress)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={experimentProgress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "rgba(255,255,255,0.3)",
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: "#ffd700",
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>

                {/* Stats Row */}
                <Box sx={{ display: "flex", gap: 3 }}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: "bold", color: "#ffd700" }}
                    >
                      {loggingStreak}
                    </Typography>
                    <Typography variant="caption">Day Streak</Typography>
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: "bold", color: "#ffd700" }}
                    >
                      {experimentsLogsToday[experimentsNeedingLogs[0].variable]
                        ?.length || 0}
                    </Typography>
                    <Typography variant="caption">Today's Logs</Typography>
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: "bold", color: "#ffd700" }}
                    >
                      {experimentsNeedingLogs[0].frequency}
                    </Typography>
                    <Typography variant="caption">Target/Day</Typography>
                  </Box>
                </Box>

                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const confirmed = confirm(
                      "Are you sure you want to clear this experiment?"
                    );
                    if (confirmed) {
                      localStorage.removeItem("activeExperiments");
                      setActiveExperiments([]);
                      setExperimentsNeedingLogs([]);
                    }
                  }}
                  sx={{
                    mt: 2,
                    borderColor: "rgba(255,255,255,0.5)",
                    color: "white",
                    "&:hover": {
                      borderColor: "#ffd700",
                      backgroundColor: "rgba(255,215,0,0.1)",
                    },
                  }}
                >
                  Clear Experiment
                </Button>
              </Paper>

              {/* Warning Alert */}
              <Alert
                severity="warning"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  "& .MuiAlert-message": {
                    fontSize: "0.95rem",
                    fontWeight: 500,
                  },
                }}
              >
                Please log your experiment variable (
                {experimentsNeedingLogs[0].variable}) before logging other
                variables.
              </Alert>
            </Box>
          )}
        {/* Show a message if experiment quota is complete for today */}
        {experimentsNeedingLogs.length > 0 &&
          experimentsLogsToday[experimentsNeedingLogs[0].variable].length >=
            experimentsNeedingLogs[0].frequency && (
            <Alert severity="success" className="mb-6">
              <div className="font-semibold mb-1">
                Experiment Complete for Today
              </div>
              <div>
                You have completed all required logs for your active experiment
                variable today. You can now log any other variables freely. Come
                back tomorrow to continue your experiment!
              </div>
              <Button
                size="small"
                variant="outlined"
                className="mt-2"
                onClick={() => {
                  window.location.href = "/experiment/active-experiments";
                }}
              >
                View Active Experiments
              </Button>
            </Alert>
          )}
        {/* Only force experiment logging if quota not met */}
        {mustLogExperimentFirst &&
          experimentsNeedingLogs.length > 0 &&
          experimentsLogsToday[experimentsNeedingLogs[0].variable].length <
            experimentsNeedingLogs[0].frequency && (
            <Alert severity="warning" className="mb-4">
              Please log your experiment variable (
              <b>{experimentsNeedingLogs[0].variable}</b>) before logging other
              variables.
            </Alert>
          )}
        {/* Show a message if all experiment quotas are complete for today but there are active experiments */}
        {activeExperiments.length > 0 &&
          experimentsNeedingLogs.length === 0 && (
            <Alert severity="success" className="mb-4">
              <div>
                All required logs for your active experiments are complete for
                today. You can log freely or view your active experiments.
              </div>
              <Button
                size="small"
                variant="outlined"
                sx={{ mt: 1 }}
                onClick={() => {
                  window.location.href = "/experiment/active-experiments";
                }}
              >
                View Active Experiments
              </Button>
            </Alert>
          )}
        {/* Only show 'No experiment is active' if there are truly no active experiments */}
        {activeExperiments.length === 0 && (
          <Alert severity="warning" className="mb-4">
            No experiment is active. You can log freely or{" "}
            <Link
              href="/experiment/builder"
              className="underline text-purple-700"
            >
              design an experiment
            </Link>
            .
          </Alert>
        )}
        {mustLogExperimentFirst &&
        experimentsNeedingLogs.length > 0 &&
        experimentsNeedingLogs[0].frequency === 1 &&
        experimentsLogsToday[experimentsNeedingLogs[0].variable].length === 1 &&
        editExperimentLog ? (
          <Box sx={{ mb: 4 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              You have already logged your experiment variable for today. You
              can edit it below:
            </Alert>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Edit Log for {editExperimentLog.variable} (
              {new Date(editExperimentLog.date).toLocaleDateString()})
            </Typography>
            <ValidatedInput
              label={editExperimentLog.variable}
              value={editValue}
              onChange={setEditValue}
              onValidationChange={setIsValueValid}
              showValidation={true}
            />
            <TextField
              label="Notes (optional)"
              variant="outlined"
              fullWidth
              multiline
              minRows={3}
              className="mb-2"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add any context or observations..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FaStickyNote className="text-purple-400" />
                  </InputAdornment>
                ),
              }}
              sx={{ mt: 2, mb: 2 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleEditExperimentLog}
              disabled={!isValueValid}
            >
              Save Changes
            </Button>
          </Box>
        ) : null}
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                fontWeight: "bold",
                color: "primary.main",
                mb: 2,
              }}
            >
              🔬 Hypothesis Builder
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                mb: 3,
                fontSize: "1.1rem",
                lineHeight: 1.6,
              }}
            >
              Construct your research question by selecting variables
            </Typography>

            {/* Hypothesis Sentence Builder */}
            <Box
              sx={{
                p: 3,
                backgroundColor: "grey.50",
                borderRadius: 2,
                border: "2px solid",
                borderColor: "primary.main",
                mb: 3,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  color: "primary.main",
                  mb: 2,
                  textAlign: "center",
                }}
              >
                Research Question
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: "medium" }}>
                  Does
                </Typography>
                <Box
                  sx={{
                    minWidth: 150,
                    p: 1,
                    backgroundColor: independentVariable
                      ? "primary.light"
                      : "white",
                    border: "2px solid",
                    borderColor: independentVariable
                      ? "primary.main"
                      : "grey.300",
                    borderRadius: 1,
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: "bold",
                      color: independentVariable
                        ? "primary.main"
                        : "text.secondary",
                    }}
                  >
                    {independentVariable || "VARIABLE"}
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: "medium" }}>
                  impact
                </Typography>
                <Box
                  sx={{
                    minWidth: 150,
                    p: 1,
                    backgroundColor: dependentVariable
                      ? "secondary.light"
                      : "white",
                    border: "2px solid",
                    borderColor: dependentVariable
                      ? "secondary.main"
                      : "grey.300",
                    borderRadius: 1,
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: "bold",
                      color: dependentVariable
                        ? "secondary.main"
                        : "text.secondary",
                    }}
                  >
                    {dependentVariable || "VARIABLE"}
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: "medium" }}>
                  ?
                </Typography>
              </Box>
            </Box>

            {/* Variable Selection */}
            <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
              {/* Independent Variable Selection */}
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ mb: 1, fontWeight: "medium", color: "primary.main" }}
                >
                  📈 Independent Variable (What might cause change?)
                </Typography>
                <Autocomplete
                  freeSolo
                  options={labelOptions}
                  getOptionLabel={(option) =>
                    typeof option === "string" ? option : option.label || ""
                  }
                  value={independentVariable}
                  onChange={(event, newValue) => {
                    if (typeof newValue === "string") {
                      setIndependentVariable(newValue);
                    } else if (newValue && newValue.label) {
                      setIndependentVariable(newValue.label);
                    } else {
                      setIndependentVariable("");
                    }
                  }}
                  onInputChange={(event, newInputValue) => {
                    setIndependentVariable(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select independent variable"
                      variant="outlined"
                      fullWidth
                      placeholder="e.g., Sleep, Exercise, Caffeine..."
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box
                      component="li"
                      {...props}
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <span>{option.icon || "📝"}</span>
                      <span>{option.label}</span>
                      {option.count && (
                        <Chip
                          label={`${option.count} logs`}
                          size="small"
                          variant="outlined"
                          sx={{ ml: "auto" }}
                        />
                      )}
                    </Box>
                  )}
                />
              </Box>

              {/* Dependent Variable Selection */}
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ mb: 1, fontWeight: "medium", color: "secondary.main" }}
                >
                  📊 Dependent Variable (What are you measuring?)
                </Typography>
                <Autocomplete
                  freeSolo
                  options={labelOptions}
                  getOptionLabel={(option) =>
                    typeof option === "string" ? option : option.label || ""
                  }
                  value={dependentVariable}
                  onChange={(event, newValue) => {
                    if (typeof newValue === "string") {
                      setDependentVariable(newValue);
                    } else if (newValue && newValue.label) {
                      setDependentVariable(newValue.label);
                    } else {
                      setDependentVariable("");
                    }
                  }}
                  onInputChange={(event, newInputValue) => {
                    setDependentVariable(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select dependent variable"
                      variant="outlined"
                      fullWidth
                      placeholder="e.g., Mood, Energy, Focus..."
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box
                      component="li"
                      {...props}
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <span>{option.icon || "📝"}</span>
                      <span>{option.label}</span>
                      {option.count && (
                        <Chip
                          label={`${option.count} logs`}
                          size="small"
                          variant="outlined"
                          sx={{ ml: "auto" }}
                        />
                      )}
                    </Box>
                  )}
                />
              </Box>
            </Box>

            {/* Quick Select Popular Variables */}
            {labelOptions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, fontWeight: "medium" }}
                >
                  🔥 Popular Variables
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {labelOptions.slice(0, 8).map((option) => (
                    <Chip
                      key={option.label}
                      label={`${option.icon || "📝"} ${option.label}`}
                      onClick={() => {
                        // Smart assignment: if no dependent variable, set it; otherwise set independent
                        if (!dependentVariable) {
                          setDependentVariable(option.label);
                        } else if (!independentVariable) {
                          setIndependentVariable(option.label);
                        } else {
                          // Both are set, replace dependent variable
                          setDependentVariable(option.label);
                        }
                      }}
                      variant="outlined"
                      color="default"
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "primary.light",
                          color: "white",
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* Enhanced Form Fields with Better Spacing */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Context Display */}
            {(independentVariable || dependentVariable) && (
              <Box
                sx={{
                  p: 2,
                  backgroundColor: "info.light",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "info.main",
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                  📝 You're logging:{" "}
                  <strong>
                    {dependentVariable || "Select dependent variable"}
                  </strong>
                  {independentVariable && (
                    <>
                      <br />
                      🔍 To test if: <strong>{independentVariable}</strong> has
                      an impact
                    </>
                  )}
                </Typography>
              </Box>
            )}

            {/* Value Input */}
            <Box>
              {(() => {
                const variable = LOG_LABELS.find(
                  (v) => v.label === dependentVariable
                );
                const isDropdown = variable?.type === "dropdown";

                if (isDropdown && variable?.options) {
                  return (
                    <DropdownInput
                      label={
                        dependentVariable || "Select dependent variable first"
                      }
                      value={value}
                      onChange={setValue}
                      onValidationChange={setIsValueValid}
                      showValidation={true}
                    />
                  );
                } else {
                  return (
                    <ValidatedInput
                      label={
                        dependentVariable || "Select dependent variable first"
                      }
                      value={value}
                      onChange={setValue}
                      onValidationChange={setIsValueValid}
                      showValidation={true}
                    />
                  );
                }
              })()}
            </Box>

            {/* Notes Field */}
            <Box>
              <TextField
                label="Notes (optional)"
                variant="outlined"
                fullWidth
                multiline
                minRows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Add context about ${
                  dependentVariable || "your measurement"
                }${
                  independentVariable
                    ? ` and how ${independentVariable} might have influenced it`
                    : ""
                }...`}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaStickyNote className="text-purple-400" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Privacy Toggle */}
            <Box
              sx={{
                p: 2,
                backgroundColor: "grey.50",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "grey.300",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isLogPrivate}
                    onChange={(e) => setIsLogPrivate(e.target.checked)}
                    sx={{ color: "primary.main" }}
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <FaLock size={14} />
                    <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                      Hide this log from others (private)
                    </Typography>
                  </Box>
                }
              />
            </Box>

            {/* Enhanced Date/Time Picker */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, fontWeight: "medium" }}
              >
                📅 Date & Time
              </Typography>
              <Box
                sx={{
                  "& .react-datepicker-wrapper": {
                    width: "100%",
                  },
                  "& .react-datepicker__input-container input": {
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontFamily: "inherit",
                    backgroundColor: "#fff",
                    transition: "border-color 0.2s ease",
                    "&:focus": {
                      outline: "none",
                      borderColor: "#1976d2",
                      boxShadow: "0 0 0 2px rgba(25, 118, 210, 0.2)",
                    },
                  },
                }}
              >
                <DatePicker
                  selected={date}
                  onChange={(d: Date | null) => {
                    if (d) setDate(d);
                  }}
                  minDate={
                    experimentsNeedingLogs.length > 0
                      ? new Date(experimentsNeedingLogs[0].start_date)
                      : undefined
                  }
                  maxDate={
                    experimentsNeedingLogs.length > 0
                      ? new Date(experimentsNeedingLogs[0].end_date)
                      : new Date()
                  }
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={5}
                  timeCaption="Time"
                  dateFormat="yyyy-MM-dd HH:mm"
                  disabled={false}
                  placeholderText="Select date and time"
                />
              </Box>
            </Box>

            {/* Time Interval Selection */}
            {experimentsNeedingLogs.length > 0 &&
              experimentsNeedingLogs[0].time_intervals &&
              experimentsNeedingLogs[0].time_intervals.length > 0 && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, fontWeight: "medium" }}
                  >
                    ⏰ Logging Interval
                  </Typography>
                  <TextField
                    select
                    label="Which interval are you logging for?"
                    value={selectedInterval}
                    onChange={(e) => setSelectedInterval(e.target.value)}
                    fullWidth
                    SelectProps={{ native: true }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  >
                    {experimentsNeedingLogs[0].time_intervals.map(
                      (interval: string) => (
                        <option key={interval} value={interval}>
                          {interval}
                        </option>
                      )
                    )}
                  </TextField>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    You can only log for the intervals you selected in your
                    experiment.
                  </Typography>
                </Box>
              )}

            {/* Enhanced Submit Button */}
            <Button
              variant="contained"
              disabled={
                !isValueValid ||
                (!dependentVariable && experimentsNeedingLogs.length === 0) ||
                !independentVariable ||
                !value.trim() ||
                submitting
              }
              onClick={submitLog}
              sx={{
                background: "linear-gradient(45deg, #FFD700 30%, #FFEA70 90%)",
                color: "black",
                width: "100%",
                py: 2.5,
                fontSize: "1.2rem",
                fontWeight: "bold",
                borderRadius: 3,
                boxShadow: "0 4px 15px rgba(255, 215, 0, 0.3)",
                mt: 2,
                "&:hover": {
                  background:
                    "linear-gradient(45deg, #FFD700 30%, #FFEA70 90%)",
                  boxShadow: "0 6px 20px rgba(255, 215, 0, 0.4)",
                  transform: "translateY(-1px)",
                },
                "&:disabled": {
                  opacity: 0.5,
                  cursor: "not-allowed",
                  transform: "none",
                },
              }}
            >
              {submitting ? "⏳ Submitting..." : "🔬 Log Data Point"}
            </Button>
          </Box>
        </Paper>
        <Snackbar
          open={showSuccess}
          autoHideDuration={2000}
          onClose={() => setShowSuccess(false)}
          message={successMessage}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        />
        <Snackbar
          open={maxLogsWarning}
          autoHideDuration={5000}
          onClose={() => setMaxLogsWarning(false)}
          message={maxLogsWarningMsg}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          ContentProps={{
            sx: { background: "#f59e42", color: "black", fontWeight: 500 },
          }}
        />
      </Paper>
    </Container>
  );
}
