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
  const [activeExperiment, setActiveExperiment] = useState<any>(null);
  const [experimentLogsToday, setExperimentLogsToday] = useState<LogEntry[]>(
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

  // Load experiment from localStorage
  useEffect(() => {
    try {
      const exp = localStorage.getItem("activeExperiment");
      if (exp) {
        const parsed = JSON.parse(exp);
        if (
          !parsed.variable ||
          !parsed.start_date ||
          !parsed.end_date ||
          !parsed.frequency
        ) {
          setExpError(
            "Experiment data is incomplete. Please set up your experiment again."
          );
          setActiveExperiment(null);
        } else {
          setActiveExperiment(parsed);
          setExpError("");
        }
      } else {
        setActiveExperiment(null);
        setExpError("");
      }
    } catch (e) {
      setExpError(
        "Failed to load experiment. Please set up your experiment again."
      );
      setActiveExperiment(null);
    }
  }, []);

  // If experiment is active, filter logs for today and the experiment variable
  useEffect(() => {
    if (!activeExperiment) return;
    const today = new Date();
    const logsToday = logs.filter(
      (log) =>
        log.label === activeExperiment.variable &&
        new Date(log.date).toDateString() === today.toDateString()
    );
    setExperimentLogsToday(logsToday);
  }, [logs, activeExperiment]);

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
      activeExperiment &&
      activeExperiment.time_intervals &&
      activeExperiment.time_intervals.length > 0
    ) {
      // Try to match current time to an interval
      const now = new Date();
      const hour = now.getHours();
      let defaultInterval = activeExperiment.time_intervals[0];
      for (const interval of activeExperiment.time_intervals) {
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
  }, [activeExperiment, date]);

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

    if (
      activeExperiment &&
      experimentLogsToday.length >= activeExperiment.frequency
    ) {
      setSuccessMessage("");
      setShowSuccess(false);
      alert(
        `You have reached the maximum number of logs for today in this experiment.`
      );
      return;
    }

    if (
      activeExperiment &&
      activeExperiment.time_intervals &&
      activeExperiment.time_intervals.length > 0
    ) {
      if (!selectedInterval) {
        setExpError("Please select a time interval to log for.");
        return;
      }
    }

    try {
      const { data, error } = await supabase.from("daily_logs").insert([
        {
          user_id: user.id,
          date: date.toISOString(),
          label: activeExperiment ? activeExperiment.variable : label.value,
          value,
          notes:
            (notes ? notes + "\n" : "") +
            (selectedInterval ? `Interval: ${selectedInterval}` : ""),
        },
      ]);

      if (error) {
        setSuccessMessage("");
        setShowSuccess(false);
        setExpError("Failed to save log: " + error.message);
      } else {
        setSuccessMessage("✔️ Log saved!");
        setShowSuccess(true);
        setValue("");
        setNotes("");
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
        {activeExperiment && (
          <Alert severity="info" className="mb-6">
            <div className="font-semibold mb-1">Experiment Active:</div>
            <div>
              Variable: <b>{activeExperiment.variable}</b>
            </div>
            <div>
              Date Range:{" "}
              {new Date(activeExperiment.start_date).toLocaleDateString()} to{" "}
              {new Date(activeExperiment.end_date).toLocaleDateString()}
            </div>
            <div>Frequency: {activeExperiment.frequency} logs/day</div>
            <div className="mt-2 text-sm text-gray-700">
              Progress today: {experimentLogsToday.length} /{" "}
              {activeExperiment.frequency}
            </div>
            <Button
              size="small"
              variant="outlined"
              className="mt-2"
              onClick={() => {
                localStorage.removeItem("activeExperiment");
                setActiveExperiment(null);
              }}
            >
              Clear Experiment
            </Button>
          </Alert>
        )}
        {!activeExperiment && (
          <Alert severity="warning" className="mb-4">
            No experiment is active. You can log freely or{" "}
            <Link
              href="/experiment/designer"
              className="underline text-purple-700"
            >
              design an experiment
            </Link>
            .
          </Alert>
        )}
        <form
          className="flex flex-col space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            submitLog();
          }}
        >
          {/* Variable Selection with Tabs */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Choose Variable to Log
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Select from predefined variables or search for custom ones
            </Typography>

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
                      color={label.value === varName ? "primary" : "default"}
                      variant={label.value === varName ? "filled" : "outlined"}
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
                  sx={{ mb: 1, display: "flex", alignItems: "center", gap: 2 }}
                >
                  <Typography variant="subtitle2" color="primary">
                    {Object.entries(groupedVariables)[tabValue - 1]?.[0]}
                  </Typography>
                  <Chip
                    label={`$ {
                      Object.entries(groupedVariables)[tabValue - 1]?.[1]?.filter((v) => getVariableSharingStatus(v.label)).length
                    }/$ {
                      Object.entries(groupedVariables)[tabValue - 1]?.[1]?.length
                    } shared`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  {Object.entries(groupedVariables)[tabValue - 1]?.[1]?.map(
                    (varItem) => (
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
                          label.value === varItem.label ? "primary" : "default"
                        }
                        variant={
                          label.value === varItem.label ? "filled" : "outlined"
                        }
                        clickable
                      />
                    )
                  )}
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
                      setLabel(newValue as { label: string; value: string });
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

            <Typography variant="caption" color="textSecondary">
              Selected: <strong>{label.value || "None"}</strong>
            </Typography>
          </Box>
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
          <div className="mb-2">
            <DatePicker
              selected={date}
              onChange={(d: Date | null) => {
                if (d) setDate(d);
              }}
              minDate={
                activeExperiment
                  ? new Date(activeExperiment.start_date)
                  : undefined
              }
              maxDate={
                activeExperiment
                  ? new Date(activeExperiment.end_date)
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
          {activeExperiment &&
            activeExperiment.time_intervals &&
            activeExperiment.time_intervals.length > 0 && (
              <div className="mb-4">
                <TextField
                  select
                  label="Which interval are you logging for?"
                  value={selectedInterval}
                  onChange={(e) => setSelectedInterval(e.target.value)}
                  fullWidth
                  SelectProps={{ native: true }}
                >
                  {activeExperiment.time_intervals.map((interval: string) => (
                    <option key={interval} value={interval}>
                      {interval}
                    </option>
                  ))}
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
      </Paper>
    </Container>
  );
}
