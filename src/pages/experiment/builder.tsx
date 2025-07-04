import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supaBase";
import { LOG_LABELS } from "@/utils/logLabels";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CreatableSelect from "react-select/creatable";
import makeAnimated from "react-select/animated";
import Tooltip from "../../components/Tooltip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import CelebrationIcon from "@mui/icons-material/Celebration";
import { Container, Box, Tabs, Tab } from "@mui/material";
import { useUser } from "../_app";

// Helper: map of variable value to emoji
const useEmojiMap = (
  userVars: { label: string; icon?: string }[],
  pendingVariable: string,
  pendingEmoji: string
): Record<string, string> => {
  const emojiMap: Record<string, string> = {};
  userVars.forEach((opt) => {
    if (opt.icon) emojiMap[opt.label] = opt.icon;
  });
  if (pendingVariable) emojiMap[pendingVariable] = pendingEmoji;
  return emojiMap;
};

const makeOptionLabelComponent =
  (emojiMap: Record<string, string>) => (props: unknown) => {
    const { data } = props as { data: { label: string; value: string } };
    return (
      <span className="flex items-center gap-2">
        <span>{emojiMap[data.value] || "🆕"}</span>
        <Tooltip text={data.label}>{data.label}</Tooltip>
      </span>
    );
  };

export default function ExperimentDesigner() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const animatedComponents = makeAnimated();
  const [tabValue, setTabValue] = useState(0);
  const [variableOptions, setVariableOptions] = useState(
    LOG_LABELS.map((opt) => ({ label: opt.label, value: opt.label }))
  );
  const [variable, setVariable] = useState(LOG_LABELS[0].label);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
  );
  const [frequency, setFrequency] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null);
  const [dependentVar, setDependentVar] = useState("Average RHR");
  const [timeIntervals, setTimeIntervals] = useState<string[]>(["21:00"]);
  const [customInterval, setCustomInterval] = useState("");
  const [missingDataStrategy, setMissingDataStrategy] = useState(
    "Ignore missing data"
  );
  const intervalPresets = ["Morning", "Afternoon", "Evening", "Night"];
  const missingDataOptions = [
    { value: "Ignore missing data", label: "Skip missing days (recommended)" },
    { value: "Impute previous", label: "Fill in with your last value" },
    { value: "Impute average", label: "Fill in with your average value" },
  ];
  const [pendingVariable, setPendingVariable] = useState("");
  const [pendingEmoji, setPendingEmoji] = useState("🆕");
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

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

  // Calculate total data points and power level
  const numberOfDays = useMemo(() => {
    return (
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
    );
  }, [startDate, endDate]);
  const totalPoints = numberOfDays * frequency;
  let powerLevel: "Low" | "Medium" | "High" = "Low";
  let powerColor = "bg-red-200 text-red-800";
  if (totalPoints >= 30) {
    powerLevel = "High";
    powerColor = "bg-green-200 text-green-800";
  } else if (totalPoints >= 10) {
    powerLevel = "Medium";
    powerColor = "bg-yellow-200 text-yellow-900";
  }
  const tooltipText =
    "Statistical power is a rough estimate of how reliable your experiment's conclusions will be. More data points (logs) increase reliability. Aim for at least 30 for best results.";

  useEffect(() => {
    async function fetchAndSortVariables() {
      const { data: logs } = await supabase.from("daily_logs").select("label");
      const logCounts: Record<string, number> = {};
      (logs || []).forEach((row: any) => {
        if (row.label) logCounts[row.label] = (logCounts[row.label] || 0) + 1;
      });
      const { data: userVars } = await supabase
        .from("user_variables")
        .select("label");
      const allVars = [
        ...LOG_LABELS.map((l) => l.label),
        ...(userVars?.map((u) => u.label) || []),
      ];
      const uniqueVars = Array.from(new Set(allVars));
      const varWithCounts = uniqueVars.map((label) => ({
        label,
        value: label,
        count: logCounts[label] || 0,
      }));
      varWithCounts.sort((a, b) => b.count - a.count);
      setVariableOptions(varWithCounts);
    }
    fetchAndSortVariables();
  }, []);

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
    }, 400);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [pendingVariable]);

  const userVars = variableOptions.filter(
    (opt: any) => typeof opt === "object" && opt !== null && opt.icon
  );
  const emojiMap = useEmojiMap(userVars, pendingVariable, pendingEmoji);
  const selectOptions: { label: string; value: string }[] = variableOptions.map(
    (opt: any) => {
      if (typeof opt === "string") {
        return { label: opt, value: opt };
      } else {
        return { label: opt.label, value: opt.value };
      }
    }
  );
  if (
    pendingVariable &&
    !variableOptions.some(
      (opt: any) =>
        (typeof opt === "string" ? opt : opt.value) === pendingVariable
    )
  ) {
    selectOptions.push({ label: pendingVariable, value: pendingVariable });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (redirectTimeout.current) clearTimeout(redirectTimeout.current);
    if (endDate <= startDate) {
      setError("End date must be after start date.");
      return;
    }
    if (!user) {
      setError("You must be logged in to create an experiment.");
      return;
    }
    const days =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
    if (days < 2 || days > 30) {
      setError("Time range must be between 2 and 30 days.");
      return;
    }
    if (frequency < 1 || frequency > 10) {
      setError("Frequency must be between 1 and 10 per day.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: supaError } = await supabase
        .from("experiments")
        .insert([
          {
            user_id: user.id,
            variable,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            frequency,
            dependent_variable: dependentVar,
            time_intervals: timeIntervals,
            missing_data_strategy: missingDataStrategy,
          },
        ])
        .select()
        .single();
      if (supaError) {
        setError(supaError.message);
        setLoading(false);
        return;
      }
      if (!data) {
        setError("No response from server. Please try again.");
        setLoading(false);
        return;
      }
      // Store in localStorage for client-side filtering
      let activeExperiments = [];
      try {
        activeExperiments = JSON.parse(
          localStorage.getItem("activeExperiments") || "[]"
        );
      } catch {}
      activeExperiments.push({
        id: data.id,
        variable,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        frequency,
        dependent_variable: dependentVar,
        time_intervals: timeIntervals,
        missing_data_strategy: missingDataStrategy,
      });
      localStorage.setItem(
        "activeExperiments",
        JSON.stringify(activeExperiments)
      );
      setSuccess(
        "Experiment started! You can now track multiple experiments at once."
      );
      setLoading(false);
      redirectTimeout.current = setTimeout(() => router.push("/log"), 1200);
    } catch (err) {
      setError(
        "Unexpected error: " +
          (err instanceof Error ? err.message : String(err))
      );
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        🧪 Design a Self-Experiment
      </Typography>
      <Typography
        variant="h6"
        color="textSecondary"
        align="center"
        sx={{ mb: 4 }}
      >
        Choose variables to experiment with and track their effects
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CelebrationIcon className="text-green-600" />
            {success}
          </Box>
        </Alert>
      )}
      <Paper elevation={3} sx={{ p: 4 }}>
        <form onSubmit={handleSubmit}>
          {/* Variable Selection with Tabs */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Choose Your Variable
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Select from predefined variables or create your own
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
                <Tab label="Custom" />
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
                  Popular variables to get started:
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
                      onClick={() => setVariable(varName)}
                      color={variable === varName ? "primary" : "default"}
                      variant={variable === varName ? "filled" : "outlined"}
                      clickable
                    />
                  ))}
                </Box>
              </Box>
            )}
            {/* Category Tabs */}
            {tabValue >= 1 && tabValue <= 6 && (
              <Box sx={{ mb: 3 }}>
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
                          </Box>
                        }
                        onClick={() => setVariable(varItem.label)}
                        color={
                          variable === varItem.label ? "primary" : "default"
                        }
                        variant={
                          variable === varItem.label ? "filled" : "outlined"
                        }
                        clickable
                      />
                    )
                  )}
                </Box>
              </Box>
            )}
            {/* Custom Tab */}
            {tabValue === 7 && (
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ mb: 2 }}
                >
                  Create a custom variable:
                </Typography>
                <CreatableSelect
                  isClearable={false}
                  components={{
                    ...animatedComponents,
                    Option: makeOptionLabelComponent(emojiMap),
                  }}
                  options={selectOptions}
                  getOptionLabel={(opt) => opt.label}
                  getOptionValue={(opt) => opt.value}
                  formatCreateLabel={(inputValue) => (
                    <span className="flex items-center gap-2">
                      <span>{pendingEmoji}</span>
                      <span>
                        Create "<b>{inputValue}</b>"
                      </span>
                    </span>
                  )}
                  value={{ label: variable, value: variable }}
                  onInputChange={(inputValue: string, actionMeta: any) => {
                    if (actionMeta.action === "input-change") {
                      setPendingVariable(inputValue);
                    }
                  }}
                  onChange={(newValue) => {
                    if (
                      newValue &&
                      !Array.isArray(newValue) &&
                      typeof newValue === "object" &&
                      "value" in newValue
                    ) {
                      setVariable(newValue.value);
                      setPendingVariable("");
                    }
                  }}
                  onCreateOption={async (inputValue) => {
                    if (!inputValue.trim()) return;
                    if (inputValue.length > 25) return;
                    if (variableOptions.some((opt) => opt.value === inputValue))
                      return;
                    const icon = pendingEmoji || "🆕";
                    const newOption = {
                      label: inputValue,
                      value: inputValue,
                      icon,
                    };
                    setVariableOptions((prev) => [...prev, newOption]);
                    setVariable(inputValue);
                    setPendingVariable("");
                    try {
                      await supabase
                        .from("user_variables")
                        .insert([{ label: inputValue, icon }]);
                    } catch (e) {}
                  }}
                  placeholder="Select or create variable..."
                  className="mb-1"
                />
              </Box>
            )}
            <Typography variant="caption" color="textSecondary">
              Selected: <strong>{variable}</strong>
            </Typography>
          </Box>
          <div>
            <Typography variant="subtitle1" className="mb-2">
              Time Range
            </Typography>
            <div className="flex gap-2 items-center">
              <DatePicker
                selected={startDate}
                onChange={(date) => date && setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                className="border px-3 py-2 rounded"
                dateFormat="yyyy-MM-dd"
              />
              <span>to</span>
              <DatePicker
                selected={endDate}
                onChange={(date) => date && setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                className="border px-3 py-2 rounded"
                dateFormat="yyyy-MM-dd"
              />
            </div>
            <Typography variant="caption" className="text-gray-500 mt-1">
              (2–30 days)
            </Typography>
          </div>
          <div>
            <Typography variant="subtitle1" className="mb-2">
              Frequency per day
            </Typography>
            <TextField
              type="number"
              inputProps={{ min: 1, max: 10 }}
              className="w-24"
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              size="small"
            />
            <span className="ml-2 text-xs text-gray-500">logs/day</span>
          </div>
          <div className="mb-4">
            <Typography variant="subtitle2" className="mb-1">
              Statistical Power
            </Typography>
            <Tooltip text={tooltipText}>
              <LinearProgress
                variant="determinate"
                value={Math.min((totalPoints / 30) * 100, 100)}
                className="h-3 rounded-full bg-gray-200"
                color={
                  powerLevel === "High"
                    ? "success"
                    : powerLevel === "Medium"
                    ? "warning"
                    : "error"
                }
              />
            </Tooltip>
            <Chip
              label={powerLevel + " Power"}
              className={powerColor + " ml-2"}
              size="small"
            />
          </div>
          <Accordion className="rounded-lg shadow-none border border-gray-200">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Advanced Settings</Typography>
            </AccordionSummary>
            <AccordionDetails className="space-y-4">
              <div>
                <Typography variant="subtitle2">Dependent Variable</Typography>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="dependentVar"
                      value="Average RHR"
                      checked={dependentVar === "Average RHR"}
                      onChange={() => setDependentVar("Average RHR")}
                    />
                    Average RHR
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="dependentVar"
                      value="Lowest RHR"
                      checked={dependentVar === "Lowest RHR"}
                      onChange={() => setDependentVar("Lowest RHR")}
                    />
                    Lowest RHR
                  </label>
                </div>
                <Typography variant="caption" className="text-gray-500 mt-1">
                  The experiment will assess whether your selected variable has
                  an effect on this outcome.
                </Typography>
              </div>
              {frequency > 1 && (
                <div>
                  <Typography variant="subtitle2">
                    Logging Time Intervals{" "}
                    <span className="text-xs text-gray-500">(optional)</span>
                  </Typography>
                  <div className="flex flex-wrap gap-2 mb-2 mt-1">
                    {intervalPresets.map((preset) => (
                      <Chip
                        key={preset}
                        label={preset}
                        clickable
                        color={
                          timeIntervals.includes(preset) ? "primary" : "default"
                        }
                        onClick={() =>
                          setTimeIntervals((prev) =>
                            prev.includes(preset)
                              ? prev.filter((i) => i !== preset)
                              : [...prev, preset]
                          )
                        }
                        className="cursor-pointer"
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <TextField
                      type="text"
                      className="w-48"
                      placeholder="Custom interval (e.g. 13:00–15:00)"
                      value={customInterval}
                      onChange={(e) => setCustomInterval(e.target.value)}
                      size="small"
                    />
                    <Button
                      type="button"
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        if (
                          customInterval.trim() &&
                          !timeIntervals.includes(customInterval.trim())
                        ) {
                          setTimeIntervals((prev) => [
                            ...prev,
                            customInterval.trim(),
                          ]);
                          setCustomInterval("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <Typography variant="caption" className="text-gray-500 mt-1">
                    By selecting time intervals, you are defining when you
                    expect yourself to log each day. The current time will be
                    the default, and you'll pick which interval you're logging
                    for.
                  </Typography>
                  {timeIntervals.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {timeIntervals.map((interval) => (
                        <Chip
                          key={interval}
                          label={interval}
                          color="secondary"
                          onDelete={() =>
                            setTimeIntervals((prev) =>
                              prev.filter((i) => i !== interval)
                            )
                          }
                          className="text-xs"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div>
                <Typography variant="subtitle2">
                  Missing Data Handling
                </Typography>
                <TextField
                  select
                  value={missingDataStrategy}
                  onChange={(e) => setMissingDataStrategy(e.target.value)}
                  fullWidth
                  SelectProps={{ native: true }}
                  size="small"
                >
                  {missingDataOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </TextField>
                <Typography variant="caption" className="text-gray-500 mt-1">
                  Choose how missing data should be handled in your experiment
                  analysis.
                </Typography>
              </div>
            </AccordionDetails>
          </Accordion>
          <Button
            type="submit"
            variant="contained"
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
            }}
          >
            {loading ? "Saving..." : "Start Experiment"}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}

ExperimentDesigner.displayName = "ExperimentDesigner";
