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

  // Load variables and experiments
  useEffect(() => {
    async function fetchAndSortVariables() {
      if (!user) return;

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
      } catch (error) {
        console.error("Error fetching variables:", error);
      } finally {
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
          setExperimentsNeedingLogs(experiments);
        }
      } catch (error) {
        console.error("Error loading experiments:", error);
      }
    }

    loadActiveExperiments();
  }, [user]);

  // Load today's logs
  useEffect(() => {
    async function loadTodaysLogs() {
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const { data: todaysLogs } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today);

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
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("created_at", { ascending: false });

    setLogs(data || []);
  };

  const submitLog = async () => {
    if (!user || !selectedVariable || !value.trim()) {
      setExpError("Please select a variable and enter a value");
      return;
    }

    setSubmitting(true);
    setExpError("");

    try {
      const logData = {
        user_id: user.id,
        variable: selectedVariable.label,
        value: value.trim(),
        notes: notes.trim() || null,
        date: date.toISOString().split("T")[0],
        created_at: new Date().toISOString(),
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
    } catch (error) {
      console.error("Error saving log:", error);
      setExpError("Failed to save log: " + (error as Error).message);
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

  if (userLoading) {
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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        📊 Log Your Data
      </Typography>

      {/* Active Experiment Progress */}
      {experimentsNeedingLogs.length > 0 && (
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center" }}
            >
              🧪 Active Experiment
            </Typography>
          </Box>

          <Typography variant="subtitle1" gutterBottom>
            Variable: {experimentsNeedingLogs[0].variable}
          </Typography>

          <Typography variant="body2" sx={{ mb: 2 }}>
            {new Date(
              experimentsNeedingLogs[0].start_date
            ).toLocaleDateString()}{" "}
            -{" "}
            {new Date(experimentsNeedingLogs[0].end_date).toLocaleDateString()}
          </Typography>

          <Typography variant="body2" sx={{ mb: 2 }}>
            Progress
          </Typography>
          <LinearProgress
            variant="determinate"
            value={experimentProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: "rgba(255,255,255,0.3)",
              "& .MuiLinearProgress-bar": {
                backgroundColor: "#ffd700",
              },
            }}
          />
          <Typography variant="body2" sx={{ textAlign: "right", mt: 1 }}>
            {Math.round(experimentProgress)}%
          </Typography>

          <Box
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 2,
            }}
          >
            <Typography variant="body1" sx={{ mb: 2, fontWeight: "bold" }}>
              📝 Ready to log your {experimentsNeedingLogs[0].variable}?
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
              Use the form below to record your{" "}
              {experimentsNeedingLogs[0].variable} data for today's experiment.
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Target: {experimentsNeedingLogs[0].frequency || 1} log
              {(experimentsNeedingLogs[0].frequency || 1) > 1 ? "s" : ""} per
              day
            </Typography>
          </Box>

          <Button
            component={Link}
            href="/active-experiments"
            variant="outlined"
            sx={{
              mt: 2,
              color: "white",
              borderColor: "white",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.1)",
                borderColor: "white",
              },
            }}
          >
            View All Active Experiments
          </Button>
        </Paper>
      )}

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
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          What are you logging today?
        </Typography>

        {/* Variable Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Select Variable
          </Typography>
          <Autocomplete
            options={variables}
            getOptionLabel={(option) => option.label}
            value={selectedVariable}
            onChange={(event, newValue) => {
              setSelectedVariable(newValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search for a variable..."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{ display: "flex", alignItems: "center", gap: 2 }}
              >
                <span>{option.icon}</span>
                <Box>
                  <Typography variant="body1">{option.label}</Typography>
                  {option.description && (
                    <Typography variant="caption" color="text.secondary">
                      {option.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          />
        </Box>

        {/* Popular Variables */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Popular Variables
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
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
                  />
                ) : null;
              }
            )}
          </Box>
        </Box>

        {/* Value Input */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Value
          </Typography>
          <TextField
            fullWidth
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter the value..."
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FaTag />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Notes */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Notes (Optional)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional context or notes..."
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FaStickyNote />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Date Picker */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Date
          </Typography>
          <DatePicker
            selected={date}
            onChange={(date) => date && setDate(date)}
            dateFormat="yyyy-MM-dd"
            customInput={
              <TextField
                fullWidth
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
              />
            }
          />
        </Box>

        {/* Privacy Setting */}
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isLogPrivate}
                onChange={(e) => setIsLogPrivate(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {isLogPrivate ? <FaLock /> : <FaGlobe />}
                <Typography variant="body2">
                  {isLogPrivate ? "Private log" : "Public log"}
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
            py: 2,
            fontSize: "1.1rem",
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
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            Today's Logs
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {logs.map((log) => (
              <Box
                key={log.id}
                sx={{
                  p: 2,
                  border: "1px solid #e0e0e0",
                  borderRadius: 2,
                  backgroundColor: "#f9f9f9",
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  {log.variable}: {log.value}
                </Typography>
                {log.notes && (
                  <Typography variant="body2" color="text.secondary">
                    {log.notes}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {new Date(log.date).toLocaleDateString()}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Container>
  );
}
