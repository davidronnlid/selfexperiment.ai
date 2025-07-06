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
import { Container, Box, Tabs, Tab, Menu, MenuItem } from "@mui/material";
import { useUser } from "../_app";
import Autocomplete from "@mui/material/Autocomplete";
import TimeIntervalSelector from "../../components/TimeIntervalSelector";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

// Custom hook for typewriter effect
const useTypewriter = (text: string, speed: number = 80) => {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!text) {
      setDisplayText("");
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setDisplayText("");

    // Add a small delay before starting to type
    const startDelay = setTimeout(() => {
      let index = 0;
      const timer = setInterval(() => {
        setDisplayText(text.slice(0, index + 1));
        index++;

        if (index >= text.length) {
          clearInterval(timer);
          setIsTyping(false);
        }
      }, speed);

      return () => clearInterval(timer);
    }, 200); // 200ms delay before starting

    return () => {
      clearTimeout(startDelay);
      setIsTyping(false);
    };
  }, [text, speed]);

  return { displayText, isTyping };
};

// Interactive Variable Selector Component
const VariableSelector = ({
  label,
  value,
  options,
  onSelect,
  disabled = false,
  getVariableDisplayName,
  placeholderVariable = "",
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (variable: string) => void;
  disabled?: boolean;
  getVariableDisplayName: (variable: string) => string;
  placeholderVariable?: string;
}) => {
  const handleSelect = (_event: any, newValue: string | null) => {
    if (newValue) {
      onSelect(newValue);
    }
  };

  // Use typewriter effect for cycling variables
  const { displayText: typedPlaceholder, isTyping } = useTypewriter(
    placeholderVariable ? getVariableDisplayName(placeholderVariable) : "",
    80 // typing speed in milliseconds
  );

  // Add typing cursor effect
  const displayPlaceholder = value
    ? label
    : placeholderVariable
    ? `${typedPlaceholder}${isTyping ? "▎" : ""}`
    : label;

  return (
    <Box sx={{ display: "inline-block", minWidth: { xs: 180, md: 220 } }}>
      <Autocomplete
        value={value || undefined}
        options={options}
        getOptionLabel={(option) => getVariableDisplayName(option)}
        onChange={handleSelect}
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={displayPlaceholder}
            variant="outlined"
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "black",
                borderRadius: 1,
                border: "1px solid white",
                transition: "all 0.3s ease-in-out",
                minHeight: "48px",
                "& fieldset": {
                  border: "none",
                },
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  border: "1px solid white",
                },
                "&.Mui-focused": {
                  backgroundColor: "rgba(0, 0, 0, 0.9)",
                  border: "1px solid white",
                },
              },
              "& .MuiOutlinedInput-input": {
                color: value ? "white" : "rgba(255, 255, 255, 0.7)",
                fontWeight: 600,
                fontSize: { xs: "0.9rem", md: "0.95rem" },
                padding: { xs: "10px 14px", md: "12px 16px" },
                textAlign: "center",
                lineHeight: 1.3,
                fontStyle: value ? "normal" : "italic",
                "&::placeholder": {
                  color: "rgba(255, 255, 255, 0.6)",
                  opacity: 1,
                  fontWeight: 500,
                  fontSize: { xs: "0.85rem", md: "0.9rem" },
                },
              },
              "& .MuiAutocomplete-inputRoot": {
                alignItems: "center",
              },
              "& .MuiSvgIcon-root": {
                color: "white",
              },
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} style={{ color: "white", backgroundColor: "black" }}>
            {getVariableDisplayName(option)}
          </li>
        )}
        componentsProps={{
          paper: {
            style: {
              maxHeight: 400,
              width: "auto",
              minWidth: 250,
              borderRadius: 8,
              backgroundColor: "black",
              border: "1px solid white",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
              overflow: "auto",
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE/Edge
            },
            sx: {
              "&::-webkit-scrollbar": {
                display: "none", // Chrome/Safari
              },
            },
          },
          popper: {
            style: {
              zIndex: 1300,
            },
          },
        }}
        disableClearable
        openOnFocus
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
      />
    </Box>
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
  const [variable, setVariable] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [experimentDays, setExperimentDays] = useState(30); // Number of days for the experiment
  const [frequency, setFrequency] = useState(1);
  const [editingDays, setEditingDays] = useState(false);
  const [tempDays, setTempDays] = useState(30);
  const [showFrequencyMenu, setShowFrequencyMenu] = useState(false);
  const [showDaysMenu, setShowDaysMenu] = useState(false);
  const [frequencyAnchorEl, setFrequencyAnchorEl] =
    useState<null | HTMLElement>(null);
  const [daysAnchorEl, setDaysAnchorEl] = useState<null | HTMLElement>(null);
  const [showCustomDaysModal, setShowCustomDaysModal] = useState(false);
  const [customDaysInput, setCustomDaysInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null);
  const [effect, setEffect] = useState("Average RHR");
  const [timeIntervals, setTimeIntervals] = useState<
    Array<{ start: string; end: string; label?: string }>
  >([]);
  const [missingDataStrategy, setMissingDataStrategy] = useState(
    "Ignore missing data"
  );
  const [dependentVar, setDependentVar] = useState("");

  // Cycling variables state
  const [cyclingVariable1, setCyclingVariable1] = useState("");
  const [cyclingVariable2, setCyclingVariable2] = useState("");
  const cyclingInterval = useRef<NodeJS.Timeout | null>(null);

  const missingDataOptions = [
    { value: "Ignore missing data", label: "Skip missing days (recommended)" },
    { value: "Impute previous", label: "Fill in with your last value" },
    { value: "Impute average", label: "Fill in with your average value" },
  ];

  // Calculate end date automatically based on experiment days
  const endDate = new Date(
    startDate.getTime() + (experimentDays - 1) * 24 * 60 * 60 * 1000
  );

  // Helper function to get units for a variable
  const getVariableUnits = (variableName: string): string => {
    const logLabel = LOG_LABELS.find((l) => l.label === variableName);
    if (!logLabel?.constraints) return "";

    if (logLabel.constraints.unit) {
      return ` (${logLabel.constraints.unit})`;
    }
    return "";
  };

  // Helper function to get display name with units
  const getVariableDisplayName = (variableName: string): string => {
    return variableName + getVariableUnits(variableName);
  };

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
        "Caffeine",
        "Alcohol",
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
  const numberOfDays = experimentDays;
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
    setTempDays(experimentDays);
  }, [experimentDays]);

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
        ...(userVars?.map((u: any) => u.label) || []),
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

  const userVars = variableOptions.filter(
    (opt: any) => typeof opt === "object" && opt !== null && opt.icon
  );

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
    !variableOptions.some(
      (opt: any) => (typeof opt === "string" ? opt : opt.value) === variable
    )
  ) {
    selectOptions.push({ label: variable, value: variable });
  }

  // Helper function to get a random variable that's not the excluded one
  const getRandomVariable = (excludeVariable: string = ""): string => {
    const availableVariables = selectOptions
      .map((opt) => opt.label)
      .filter((label) => label !== excludeVariable);

    if (availableVariables.length === 0) return "";

    const randomIndex = Math.floor(Math.random() * availableVariables.length);
    return availableVariables[randomIndex];
  };

  // Initialize cycling variables when selectOptions becomes available
  useEffect(() => {
    if (
      !variable &&
      !dependentVar &&
      selectOptions.length > 1 &&
      !cyclingVariable1 &&
      !cyclingVariable2
    ) {
      const var1 = getRandomVariable();
      const var2 = getRandomVariable(var1);
      setCyclingVariable1(var1);
      setCyclingVariable2(var2);
    }
  }, [
    selectOptions,
    variable,
    dependentVar,
    cyclingVariable1,
    cyclingVariable2,
  ]);

  // Set up cycling interval when both variables are empty
  useEffect(() => {
    if (!variable && !dependentVar && selectOptions.length > 1) {
      // Set up interval to cycle through variables every 6 seconds (allowing time for typewriter effect)
      cyclingInterval.current = setInterval(() => {
        const newVar1 = getRandomVariable();
        const newVar2 = getRandomVariable(newVar1);
        setCyclingVariable1(newVar1);
        setCyclingVariable2(newVar2);
      }, 6000);
    } else {
      // Clear cycling if user has selected variables
      if (cyclingInterval.current) {
        clearInterval(cyclingInterval.current);
        cyclingInterval.current = null;
      }
      setCyclingVariable1("");
      setCyclingVariable2("");
    }

    // Cleanup interval on unmount
    return () => {
      if (cyclingInterval.current) {
        clearInterval(cyclingInterval.current);
        cyclingInterval.current = null;
      }
    };
  }, [variable, dependentVar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (redirectTimeout.current) clearTimeout(redirectTimeout.current);

    if (!variable || !dependentVar) {
      setError("Please select both variables for your experiment.");
      return;
    }

    if (variable === dependentVar) {
      setError("Please select two different variables for your experiment.");
      return;
    }

    if (!user || !user.id) {
      setError("You must be logged in to create an experiment.");
      return;
    }
    if (experimentDays < 2 || experimentDays > 365) {
      setError("Experiment duration must be between 2 and 365 days.");
      return;
    }
    if (frequency < 1 || frequency > 5) {
      setError("Frequency must be between 1 and 5 per day.");
      return;
    }
    setLoading(true);

    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
      setError("Request timed out. Please try again.");
    }, 15000); // 15 second timeout

    try {
      const experimentData = {
        user_id: user.id,
        variable,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        frequency,
        effect: dependentVar,
        dependent_variable: dependentVar,
        time_intervals: timeIntervals,
        missing_data_strategy: missingDataStrategy,
      };

      console.log("Inserting experiment with data:", experimentData);

      const { data, error: supaError } = await supabase
        .from("experiments")
        .insert([experimentData])
        .select()
        .single();

      // Clear the timeout since we got a response
      clearTimeout(loadingTimeout);

      if (supaError) {
        console.error("Supabase error:", supaError);
        setError(`Database error: ${supaError.message}`);
        setLoading(false);
        return;
      }
      if (!data) {
        setError("No response from server. Please try again.");
        setLoading(false);
        clearTimeout(loadingTimeout);
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
        effect: dependentVar,
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
      clearTimeout(loadingTimeout);
      redirectTimeout.current = setTimeout(() => router.push("/log"), 1200);
    } catch (err) {
      clearTimeout(loadingTimeout);
      console.error("Unexpected error in experiment creation:", err);
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

  const handleCustomDaysSubmit = () => {
    const days = Number(customDaysInput);
    if (!isNaN(days) && days >= 2 && days <= 365) {
      setExperimentDays(days);
      setShowCustomDaysModal(false);
      setCustomDaysInput("");
    } else {
      // Keep modal open but could add error state here
    }
  };

  const handleCustomDaysCancel = () => {
    setShowCustomDaysModal(false);
    setCustomDaysInput("");
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        🧪 Build a Self-Experiment
      </Typography>
      <Typography
        variant="h6"
        color="textSecondary"
        align="center"
        sx={{ mb: 4 }}
      >
        Start with a question that matters to you.
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
            {/* Research Question */}
            <Box
              sx={{
                mb: 2,
                p: 3,
                backgroundColor: "grey.900",
                color: "white",
                borderRadius: 2,
                border: "2px solid",
                borderColor: "grey.700",
                boxShadow: 2,
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: "center",
                justifyContent: "center",
                gap: { xs: 2, md: 1 },
                flexWrap: "wrap",
                position: "relative",
              }}
            >
              {/* Cycling indicator */}
              {!variable &&
                !dependentVar &&
                cyclingVariable1 &&
                cyclingVariable2 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: -12,
                      right: 16,
                      backgroundColor: "rgba(255, 215, 0, 0.95)",
                      color: "black",
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      zIndex: 10,
                      boxShadow: 2,
                    }}
                  >
                    💡 Click to choose variables
                  </Box>
                )}
              <Typography
                variant="h6"
                component="span"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "1rem", md: "1.25rem" },
                  lineHeight: 1.2,
                }}
              >
                Does
              </Typography>

              <Box sx={{ mx: { xs: 0, md: 1 } }}>
                <VariableSelector
                  label="Variable 1"
                  value={variable}
                  options={selectOptions
                    .map((opt) => opt.label)
                    .filter((label) => label !== dependentVar)}
                  onSelect={setVariable}
                  getVariableDisplayName={getVariableDisplayName}
                  placeholderVariable={cyclingVariable1}
                />
              </Box>

              <Typography
                variant="h6"
                component="span"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "1rem", md: "1.25rem" },
                  lineHeight: 1.2,
                  textAlign: "center",
                }}
              >
                cause an effect on
              </Typography>

              <Box sx={{ mx: { xs: 0, md: 1 } }}>
                <VariableSelector
                  label="Variable 2"
                  value={dependentVar}
                  options={selectOptions
                    .map((opt) => opt.label)
                    .filter((label) => label !== variable)}
                  onSelect={setDependentVar}
                  getVariableDisplayName={getVariableDisplayName}
                  placeholderVariable={cyclingVariable2}
                />
              </Box>

              <Typography
                variant="h6"
                component="span"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "1rem", md: "1.25rem" },
                  lineHeight: 1.2,
                }}
              >
                ?
              </Typography>
            </Box>
          </Box>

          {/* Experiment Configuration */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h6"
              sx={{
                mb: 3,
                p: 3,
                backgroundColor: "grey.800",
                color: "white",
                borderRadius: 2,
                fontWeight: 600,
                textAlign: "center",
                boxShadow: 2,
              }}
            >
              To get a{" "}
              <Box
                component="span"
                onClick={() => {
                  // Cycle through power levels by adjusting days to hit the right thresholds
                  const currentTotalPoints = experimentDays * frequency;
                  if (currentTotalPoints < 10) {
                    // Currently Low, go to Medium (need >= 10 points)
                    setExperimentDays(Math.ceil(10 / frequency));
                  } else if (currentTotalPoints < 30) {
                    // Currently Medium, go to High (need >= 30 points)
                    setExperimentDays(Math.ceil(30 / frequency));
                  } else {
                    // Currently High, go to Low (need < 10 points)
                    setExperimentDays(Math.max(2, Math.floor(9 / frequency)));
                  }
                }}
                sx={{
                  fontWeight: 700,
                  color: "white",
                  backgroundColor:
                    powerLevel === "High"
                      ? "green"
                      : powerLevel === "Medium"
                      ? "orange"
                      : "red",
                  padding: "4px 8px",
                  borderRadius: 1,
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor:
                      powerLevel === "High"
                        ? "rgba(0, 128, 0, 0.8)"
                        : powerLevel === "Medium"
                        ? "rgba(255, 165, 0, 0.8)"
                        : "rgba(255, 0, 0, 0.8)",
                  },
                }}
              >
                {powerLevel.toUpperCase()}
              </Box>{" "}
              confidence answer, you will log{" "}
              <Box
                component="span"
                onClick={(e) => {
                  setFrequencyAnchorEl(e.currentTarget);
                  setShowFrequencyMenu(true);
                }}
                sx={{
                  fontWeight: 700,
                  color: "white",
                  backgroundColor: "black",
                  padding: "4px 8px",
                  borderRadius: 1,
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                  },
                }}
              >
                {frequency}
              </Box>{" "}
              {frequency === 1 ? "time" : "times"} per day for{" "}
              {editingDays ? (
                <TextField
                  type="number"
                  value={tempDays}
                  onChange={(e) => setTempDays(Number(e.target.value))}
                  onBlur={() => {
                    if (tempDays >= 2 && tempDays <= 365) {
                      setExperimentDays(tempDays);
                    } else {
                      setTempDays(experimentDays);
                    }
                    setEditingDays(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (tempDays >= 2 && tempDays <= 365) {
                        setExperimentDays(tempDays);
                      } else {
                        setTempDays(experimentDays);
                      }
                      setEditingDays(false);
                    } else if (e.key === "Escape") {
                      setTempDays(experimentDays);
                      setEditingDays(false);
                    }
                  }}
                  autoFocus
                  size="small"
                  inputProps={{ min: 2, max: 365 }}
                  sx={{
                    width: 80,
                    "& .MuiInputBase-root": {
                      fontSize: "inherit",
                      fontWeight: 700,
                      color: "white",
                      backgroundColor: "black",
                      borderRadius: 1,
                    },
                    "& .MuiInputBase-input": {
                      textAlign: "center",
                      padding: "4px 8px",
                      color: "white",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "white",
                    },
                  }}
                />
              ) : (
                <Box
                  component="span"
                  onClick={(e) => {
                    setDaysAnchorEl(e.currentTarget);
                    setShowDaysMenu(true);
                  }}
                  sx={{
                    fontWeight: 700,
                    color: "white",
                    backgroundColor: "black",
                    padding: "4px 8px",
                    borderRadius: 1,
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                    },
                  }}
                >
                  {experimentDays}
                </Box>
              )}{" "}
              days.
            </Typography>

            {/* Frequency Selection Menu */}
            <Menu
              anchorEl={frequencyAnchorEl}
              open={showFrequencyMenu}
              onClose={() => {
                setShowFrequencyMenu(false);
                setFrequencyAnchorEl(null);
              }}
              PaperProps={{
                sx: {
                  borderRadius: 2,
                  boxShadow: 3,
                  minWidth: 200,
                },
              }}
            >
              {[1, 2, 3, 4, 5].map((freq) => (
                <MenuItem
                  key={freq}
                  onClick={() => {
                    setFrequency(freq);
                    setShowFrequencyMenu(false);
                    setFrequencyAnchorEl(null);
                  }}
                  selected={frequency === freq}
                  sx={{
                    py: 1.5,
                    justifyContent: "center",
                    fontWeight: frequency === freq ? 600 : 400,
                  }}
                >
                  {freq} {freq === 1 ? "time" : "times"} per day
                </MenuItem>
              ))}
            </Menu>

            {/* Days Selection Menu */}
            <Menu
              anchorEl={daysAnchorEl}
              open={showDaysMenu}
              onClose={() => {
                setShowDaysMenu(false);
                setDaysAnchorEl(null);
              }}
              PaperProps={{
                sx: {
                  borderRadius: 2,
                  boxShadow: 3,
                  minWidth: 250,
                  maxHeight: 400,
                },
              }}
            >
              {/* Common presets */}
              {[7, 14, 21, 30, 45, 60, 90, 120, 180, 365].map((days) => (
                <MenuItem
                  key={days}
                  onClick={() => {
                    setExperimentDays(days);
                    setShowDaysMenu(false);
                    setDaysAnchorEl(null);
                  }}
                  selected={experimentDays === days}
                  sx={{
                    py: 1.5,
                    justifyContent: "space-between",
                    fontWeight: experimentDays === days ? 600 : 400,
                  }}
                >
                  <span>{days} days</span>
                  <span style={{ fontSize: "0.8rem", color: "gray" }}>
                    {days === 7
                      ? "1 week"
                      : days === 14
                      ? "2 weeks"
                      : days === 21
                      ? "3 weeks"
                      : days === 30
                      ? "1 month"
                      : days === 45
                      ? "6 weeks"
                      : days === 60
                      ? "2 months"
                      : days === 90
                      ? "3 months"
                      : days === 120
                      ? "4 months"
                      : days === 180
                      ? "6 months"
                      : days === 365
                      ? "1 year"
                      : ""}
                  </span>
                </MenuItem>
              ))}
              <MenuItem
                onClick={() => {
                  setShowDaysMenu(false);
                  setDaysAnchorEl(null);
                  setCustomDaysInput(experimentDays.toString());
                  setShowCustomDaysModal(true);
                }}
                sx={{
                  py: 1.5,
                  justifyContent: "center",
                  fontStyle: "italic",
                  borderTop: "1px solid",
                  borderColor: "divider",
                }}
              >
                Enter custom number...
              </MenuItem>
            </Menu>
          </Box>
          {/* Advanced Settings */}
          <Box sx={{ mb: 4 }}>
            <Accordion
              sx={{
                borderRadius: 2,
                boxShadow: 1,
                border: "1px solid",
                borderColor: "divider",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: "grey.800",
                  borderRadius: "8px 8px 0 0",
                  color: "white",
                  "& .MuiSvgIcon-root": {
                    color: "white",
                  },
                }}
              >
                <Typography variant="h6" sx={{ color: "white" }}>
                  Advanced Settings
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 3 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <TimeIntervalSelector
                    intervals={timeIntervals}
                    onChange={setTimeIntervals}
                    maxIntervals={frequency}
                  />
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
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
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ mt: 1, display: "block" }}
                    >
                      Choose how missing data should be handled in your
                      experiment analysis.
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Custom Date Range
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      <DatePicker
                        selected={startDate}
                        onChange={(date) => date && setStartDate(date)}
                        className="border px-3 py-2 rounded"
                        dateFormat="yyyy-MM-dd"
                        minDate={new Date()}
                      />
                      <Typography variant="body2" color="textSecondary">
                        to
                      </Typography>
                      <DatePicker
                        selected={endDate}
                        onChange={() => {}} // Read-only, calculated from start date + experiment days
                        className="border px-3 py-2 rounded"
                        dateFormat="yyyy-MM-dd"
                        disabled
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ mt: 1, display: "block" }}
                    >
                      By default, experiments start today. Use this to set a
                      custom date range.
                    </Typography>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>

          {/* Start Experiment Button */}
          <Box sx={{ textAlign: "center" }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{
                background: "linear-gradient(45deg, #FFD700 30%, #FFEA70 90%)",
                color: "black",
                width: "100%",
                maxWidth: 400,
                py: 2,
                fontSize: "1.125rem",
                fontWeight: "bold",
                borderRadius: 2,
                boxShadow: 3,
                textTransform: "none",
                "&:hover": {
                  background:
                    "linear-gradient(45deg, #FFD700 30%, #FFEA70 90%)",
                  transform: "translateY(-1px)",
                  boxShadow: 4,
                },
                "&:active": {
                  transform: "translateY(0)",
                },
              }}
            >
              {loading ? "Saving..." : "Start Experiment"}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Custom Days Modal */}
      <Dialog
        open={showCustomDaysModal}
        onClose={handleCustomDaysCancel}
        PaperProps={{
          sx: {
            backgroundColor: "grey.800",
            color: "white",
            borderRadius: 2,
            minWidth: 400,
          },
        }}
      >
        <DialogTitle sx={{ color: "white", backgroundColor: "grey.900" }}>
          Enter Custom Duration
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" sx={{ mb: 2, color: "grey.300" }}>
            Enter number of days (2-365):
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="number"
            value={customDaysInput}
            onChange={(e) => setCustomDaysInput(e.target.value)}
            inputProps={{ min: 2, max: 365 }}
            error={
              Boolean(customDaysInput) &&
              (isNaN(Number(customDaysInput)) ||
                Number(customDaysInput) < 2 ||
                Number(customDaysInput) > 365)
            }
            helperText={
              customDaysInput &&
              (isNaN(Number(customDaysInput)) ||
                Number(customDaysInput) < 2 ||
                Number(customDaysInput) > 365)
                ? "Please enter a valid number between 2 and 365"
                : ""
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "black",
                color: "white",
                "& fieldset": {
                  borderColor: "white",
                },
                "&:hover fieldset": {
                  borderColor: "white",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main",
                },
              },
              "& .MuiInputBase-input": {
                color: "white",
              },
              "& .MuiFormHelperText-root": {
                color: "error.main",
              },
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCustomDaysSubmit();
              } else if (e.key === "Escape") {
                handleCustomDaysCancel();
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: "grey.900" }}>
          <Button
            onClick={handleCustomDaysCancel}
            sx={{
              color: "grey.300",
              "&:hover": {
                backgroundColor: "grey.700",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCustomDaysSubmit}
            variant="contained"
            disabled={
              !customDaysInput ||
              isNaN(Number(customDaysInput)) ||
              Number(customDaysInput) < 2 ||
              Number(customDaysInput) > 365
            }
            sx={{
              backgroundColor: "primary.main",
              "&:hover": {
                backgroundColor: "primary.dark",
              },
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

ExperimentDesigner.displayName = "ExperimentDesigner";
