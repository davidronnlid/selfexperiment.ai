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
import { LOG_LABELS, validateValue } from "@/utils/logLabels";
import ValidatedInput from "@/components/ValidatedInput";
import DropdownInput from "@/components/DropdownInput";
import Link from "next/link";
import { Container, Box, Tabs, Tab, Chip } from "@mui/material";
import { useUser } from "../pages/_app";
import SearchIcon from "@mui/icons-material/Search";

const LABEL_OPTIONS = [
  "Mood",
  "Energy",
  "Focus",
  "Stress",
  "Caffeine (mg)",
  "Alcohol (units)",
  "Creativity",
  "Pain Level",
];

interface LogEntry {
  id: number;
  date: string;
  label: string;
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
  const [labelOptions, setLabelOptions] = useState(
    LABEL_OPTIONS.map((opt) => ({ label: opt, value: opt }))
  );
  const [label, setLabel] = useState({
    label: LABEL_OPTIONS[0],
    value: LABEL_OPTIONS[0],
  });
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

  // Group variables by category for better organization
  const groupedVariables = {
    "Mental & Emotional": LOG_LABELS.filter((v) =>
      [
        "Stress",
        "Cognitive Control",
        "Anxiety Before Bed",
        "Mood",
        "Emotional Event",
      ].includes(v.label)
    ),
    "Sleep & Recovery": LOG_LABELS.filter((v) =>
      [
        "Sleep Time",
        "Fell Asleep Time",
        "Sleep Duration",
        "Sleep Quality",
        "Naps",
      ].includes(v.label)
    ),
    "Physical Health": LOG_LABELS.filter((v) =>
      [
        "Exercise",
        "Illness/Symptoms",
        "Body Temp (subjective)",
        "Menstrual Phase",
      ].includes(v.label)
    ),
    "Substances & Diet": LOG_LABELS.filter((v) =>
      [
        "Caffeine (mg)",
        "Alcohol (units)",
        "Nicotine",
        "Cannabis/THC",
        "Medications/Supplements",
        "Big Meal Late",
        "Late Sugar Intake",
        "Intermittent Fasting",
        "Hydration",
      ].includes(v.label)
    ),
    Environment: LOG_LABELS.filter((v) =>
      [
        "Room Temp",
        "Light Exposure",
        "Noise Disturbances",
        "Travel/Jet Lag",
        "Altitude Change",
      ].includes(v.label)
    ),
    "Oura Data": [
      {
        label: "Heart Rate",
        type: "number",
        description: "Resting heart rate data",
        icon: "❤️",
      },
      {
        label: "Sleep Score",
        type: "number",
        description: "Oura sleep score",
        icon: "😴",
      },
      {
        label: "Readiness Score",
        type: "number",
        description: "Oura readiness score",
        icon: "⚡",
      },
      {
        label: "Activity Score",
        type: "number",
        description: "Oura activity score",
        icon: "🏃",
      },
      {
        label: "Deep Sleep",
        type: "number",
        description: "Deep sleep duration",
        icon: "🌙",
      },
      {
        label: "REM Sleep",
        type: "number",
        description: "REM sleep duration",
        icon: "💭",
      },
      {
        label: "Light Sleep",
        type: "number",
        description: "Light sleep duration",
        icon: "😌",
      },
    ],
  };

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
          log.label === exp.variable &&
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
      const { data: logs } = await supabase.from("daily_logs").select("label");
      // Count occurrences of each label
      const logCounts: Record<string, number> = {};
      (logs || []).forEach((row: any) => {
        if (row.label) logCounts[row.label] = (logCounts[row.label] || 0) + 1;
      });

      // 2. Fetch user variables (with icon)
      const { data: userVars } = await supabase
        .from("user_variables")
        .select("label, icon");

      // 3. Merge with LOG_LABELS
      const allVars = [
        ...LABEL_OPTIONS.map((l) => l),
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
    if (!user) {
      setExpError("You must be logged in to log data.");
      return;
    }
    if (!label.value || label.value.length > 25) {
      alert("Label must be under 25 characters.");
      return;
    }

    // Validate the value using our constraint system
    const validation = validateValue(label.value, value);
    if (!validation.isValid) {
      setExpError(validation.error || "Invalid value");
      return;
    }

    // Only enforce frequency limit for the experiment variable
    if (
      experimentsNeedingLogs.length > 0 &&
      label.value === experimentsNeedingLogs[0].variable &&
      experimentsLogsToday[experimentsNeedingLogs[0].variable].length >=
        experimentsNeedingLogs[0].frequency
    ) {
      setSuccessMessage("");
      setShowSuccess(false);
      setMaxLogsWarningMsg(
        "You have reached the maximum number of logs for today for this experiment variable. Once your active experiment is complete, you will be able to log this variable as often as you like."
      );
      setMaxLogsWarning(true);
      return;
    }

    if (
      experimentsNeedingLogs.length > 0 &&
      experimentsNeedingLogs[0].time_intervals &&
      experimentsNeedingLogs[0].time_intervals.length > 0
    ) {
      if (!selectedInterval) {
        setExpError("Please select a time interval to log for.");
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
            label:
              experimentsNeedingLogs.length > 0
                ? experimentsNeedingLogs[0].variable
                : label.value,
            value,
            notes:
              (notes ? notes + "\n" : "") +
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
        .from("app_variable_sharing_settings")
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

  // If mustLogExperimentFirst, force label to experiment variable
  useEffect(() => {
    if (mustLogExperimentFirst && experimentsNeedingLogs.length > 0) {
      setLabel({
        label: experimentsNeedingLogs[0].variable,
        value: experimentsNeedingLogs[0].variable,
      });
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
    const validation = validateValue(editExperimentLog.label, editValue);
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
            <Alert severity="info" className="mb-6">
              <div className="font-semibold mb-1">Experiment Active:</div>
              <div>
                Variable: <b>{experimentsNeedingLogs[0].variable}</b>
              </div>
              <div>
                Date Range:{" "}
                {new Date(
                  experimentsNeedingLogs[0].start_date
                ).toLocaleDateString()}{" "}
                to{" "}
                {new Date(
                  experimentsNeedingLogs[0].end_date
                ).toLocaleDateString()}
              </div>
              <div>
                Frequency: {experimentsNeedingLogs[0].frequency} logs/day
              </div>
              <div className="mt-2 text-sm text-gray-700">
                Progress today:{" "}
                {
                  experimentsLogsToday[experimentsNeedingLogs[0].variable]
                    .length
                }{" "}
                / {experimentsNeedingLogs[0].frequency}
              </div>
              <Button
                size="small"
                variant="outlined"
                className="mt-2"
                onClick={() => {
                  localStorage.removeItem("activeExperiments");
                  setActiveExperiments([]);
                }}
              >
                Clear Experiment
              </Button>
            </Alert>
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
              Edit Log for {editExperimentLog.label} (
              {new Date(editExperimentLog.date).toLocaleDateString()})
            </Typography>
            <ValidatedInput
              label={editExperimentLog.label}
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
        <form
          className="flex flex-col space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            submitLog();
          }}
        >
          {/* Variable selection header text */}
          {/* Ensure all instructional text is removed as requested */}
          {!mustLogExperimentFirst && logs.length > 0 && !searchTerm.trim() && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Your Most Logged Variables
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {labelOptions.slice(0, 7).map((opt) => {
                  const fullVar = LOG_LABELS.find(
                    (l) => l.label.toLowerCase() === opt.label.toLowerCase()
                  );
                  return (
                    <Chip
                      key={opt.label}
                      label={opt.label}
                      onClick={() =>
                        setLabel(
                          fullVar
                            ? { label: fullVar.label, value: fullVar.label }
                            : { label: opt.label, value: opt.value }
                        )
                      }
                      color={label.value === opt.value ? "primary" : "default"}
                      variant={
                        label.value === opt.value ? "filled" : "outlined"
                      }
                      clickable
                      size="small"
                      sx={{ fontSize: 13, height: 28 }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}
          {/* Search Bar for All Variables */}
          {!mustLogExperimentFirst && (
            <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <SearchIcon color="action" fontSize="small" />
              <TextField
                size="small"
                variant="outlined"
                placeholder="Search all variables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ flex: 1, minWidth: 0 }}
                inputProps={{ style: { fontSize: 14, padding: 6 } }}
              />
            </Box>
          )}
          {/* Show search results if searching */}
          {!mustLogExperimentFirst && searchTerm.trim() && (
            <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
              {searchResults.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No variables found.
                </Typography>
              ) : (
                searchResults.map((opt) => (
                  <Chip
                    key={typeof opt === "string" ? opt : opt.label}
                    label={typeof opt === "string" ? opt : opt.label}
                    onClick={() =>
                      setLabel({
                        label: typeof opt === "string" ? opt : opt.label,
                        value: typeof opt === "string" ? opt : opt.label,
                      })
                    }
                    color={
                      label.value ===
                      (typeof opt === "string" ? opt : opt.label)
                        ? "primary"
                        : "default"
                    }
                    variant={
                      label.value ===
                      (typeof opt === "string" ? opt : opt.label)
                        ? "filled"
                        : "outlined"
                    }
                    size="small"
                    clickable
                    sx={{ fontSize: 13, height: 28 }}
                  />
                ))
              )}
            </Box>
          )}
          {/* Variable Selection with Tabs */}
          {!searchTerm.trim() && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Choose Variable to Log
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Select from predefined variables or search for custom ones
              </Typography>

              {/* Hide variable selection UI if mustLogExperimentFirst */}
              {!mustLogExperimentFirst && (
                <>
                  <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                    <Tabs
                      value={tabValue}
                      onChange={handleTabChange}
                      aria-label="variable categories"
                    >
                      <Tab label="Quick Select" />
                      <Tab label="Mental & Emotional" />
                      <Tab label="Sleep & Recovery" />
                      <Tab label="Physical Health" />
                      <Tab label="Substances & Diet" />
                      <Tab label="Environment" />
                      <Tab label="Oura Data" />
                      <Tab label="Search" />
                    </Tabs>
                  </Box>

                  {/* Quick Select Tab */}
                  {tabValue === 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ mb: 2 }}
                      >
                        Popular variables to log:
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                        {[
                          "Stress",
                          "Sleep Quality",
                          "Exercise",
                          "Caffeine (mg)",
                          "Mood",
                        ].map((varName) => (
                          <Chip
                            key={varName}
                            label={varName}
                            onClick={() =>
                              setLabel({ label: varName, value: varName })
                            }
                            color={
                              label.value === varName ? "primary" : "default"
                            }
                            variant={
                              label.value === varName ? "filled" : "outlined"
                            }
                            clickable
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Category Tabs */}
                  {tabValue >= 1 && tabValue <= 6 && (
                    <Box sx={{ mb: 3 }}>
                      {/* Per-category shared counter */}
                      <Box
                        sx={{
                          mb: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Typography variant="subtitle2" color="primary">
                          {Object.entries(groupedVariables)[tabValue - 1]?.[0]}
                        </Typography>
                        <Chip
                          label={`${
                            Object.entries(groupedVariables)[
                              tabValue - 1
                            ]?.[1]?.filter((v) =>
                              getVariableSharingStatus(v.label)
                            ).length
                          }/${
                            Object.entries(groupedVariables)[tabValue - 1]?.[1]
                              ?.length
                          } shared`}
                          onClick={() => (window.location.href = "/profile")}
                          style={{
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                        {Object.entries(groupedVariables)[
                          tabValue - 1
                        ]?.[1]?.map((varItem) => (
                          <Chip
                            key={varItem.label}
                            label={
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <span>{varItem.icon}</span>
                                <span>{varItem.label}</span>
                                {getVariableSharingStatus(varItem.label) ? (
                                  <FaGlobe color="green" />
                                ) : (
                                  <FaLock color="grey" />
                                )}
                              </Box>
                            }
                            onClick={() =>
                              setLabel({
                                label: varItem.label,
                                value: varItem.label,
                              })
                            }
                            color={
                              label.value === varItem.label
                                ? "primary"
                                : "default"
                            }
                            variant={
                              label.value === varItem.label
                                ? "filled"
                                : "outlined"
                            }
                            clickable
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Search Tab */}
                  {tabValue === 7 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ mb: 2 }}
                      >
                        Search or create a custom variable:
                      </Typography>
                      <Autocomplete
                        options={labelOptions}
                        getOptionLabel={(opt) =>
                          typeof opt === "string" ? opt : opt.label
                        }
                        value={label}
                        onChange={(_, newValue) => {
                          if (newValue && !Array.isArray(newValue)) {
                            setLabel(
                              newValue as { label: string; value: string }
                            );
                            setPendingVariable("");
                          } else {
                            setLabel({ label: "", value: "" });
                            setPendingVariable("");
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Search variables..."
                            variant="outlined"
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  <FaTag className="text-purple-500" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Box>
                  )}
                </>
              )}

              <Typography variant="caption" color="textSecondary">
                Selected: <strong>{label.value || "None"}</strong>
              </Typography>
            </Box>
          )}
          {(() => {
            const variable = LOG_LABELS.find((v) => v.label === label.value);
            const isDropdown = variable?.type === "dropdown";

            if (isDropdown && variable?.options) {
              return (
                <DropdownInput
                  label={label.value}
                  value={value}
                  onChange={setValue}
                  onValidationChange={setIsValueValid}
                  showValidation={true}
                />
              );
            } else {
              return (
                <ValidatedInput
                  label={label.value}
                  value={value}
                  onChange={setValue}
                  onValidationChange={setIsValueValid}
                  showValidation={true}
                />
              );
            }
          })()}
          <TextField
            label="Notes (optional)"
            variant="outlined"
            fullWidth
            multiline
            minRows={3}
            className="mb-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any context or observations..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FaStickyNote className="text-purple-400" />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <input
              type="checkbox"
              id="log-private-toggle"
              checked={isLogPrivate}
              onChange={(e) => setIsLogPrivate(e.target.checked)}
            />
            <label htmlFor="log-private-toggle">
              Hide this log from others (private)
            </label>
          </Box>
          <div className="mb-2">
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
              className="w-full border px-3 py-2 rounded"
              dateFormat="yyyy-MM-dd HH:mm"
              disabled={false}
            />
          </div>
          {experimentsNeedingLogs.length > 0 &&
            experimentsNeedingLogs[0].time_intervals &&
            experimentsNeedingLogs[0].time_intervals.length > 0 && (
              <div className="mb-4">
                <TextField
                  select
                  label="Which interval are you logging for?"
                  value={selectedInterval}
                  onChange={(e) => setSelectedInterval(e.target.value)}
                  fullWidth
                  SelectProps={{ native: true }}
                >
                  {experimentsNeedingLogs[0].time_intervals.map(
                    (interval: string) => (
                      <option key={interval} value={interval}>
                        {interval}
                      </option>
                    )
                  )}
                </TextField>
                <div className="text-xs text-gray-500 mt-1">
                  You can only log for the intervals you selected in your
                  experiment.
                </div>
              </div>
            )}
          <Button
            type="submit"
            variant="contained"
            disabled={!isValueValid}
            sx={{
              background: "linear-gradient(45deg, #9333EA 30%, #EC4899 90%)",
              color: "white",
              width: "100%",
              py: 2,
              fontSize: "1.125rem",
              fontWeight: "bold",
              borderRadius: 2,
              boxShadow: 3,
              mt: 3,
              "&:hover": {
                background: "linear-gradient(45deg, #7C3AED 30%, #DB2777 90%)",
              },
              "&:disabled": {
                opacity: 0.5,
                cursor: "not-allowed",
              },
            }}
          >
            Submit
          </Button>
        </form>
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
