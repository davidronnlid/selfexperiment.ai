import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supaBase";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CreatableSelect from "react-select/creatable";
import makeAnimated from "react-select/animated";
import Tooltip from "../components/Tooltip";
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
import { useUser } from "./_app";
import Autocomplete from "@mui/material/Autocomplete";
import TimeIntervalSelector from "../components/TimeIntervalSelector";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

// Custom hook for typewriter effect
const useTypewriter = (text: string, shouldType: boolean, speed: number = 100) => {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!text || !shouldType) {
      if (!shouldType) {
        setDisplayText(text);
        setIsTyping(false);
      }
      return;
    }

    setIsTyping(true);
    setDisplayText("");

    let index = 0;
    const timer = setInterval(() => {
      setDisplayText(text.slice(0, index + 1));
      index++;

      if (index >= text.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, speed);

    return () => {
      clearInterval(timer);
      setIsTyping(false);
    };
  }, [text, shouldType, speed]);

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
  shouldType = false,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (variable: string) => void;
  disabled?: boolean;
  getVariableDisplayName: (variable: string) => string;
  placeholderVariable?: string;
  shouldType?: boolean;
}) => {
  const handleSelect = (_event: any, newValue: string | null) => {
    if (newValue) {
      onSelect(newValue);
    }
  };

  // Use typewriter effect for cycling variables
  const { displayText: typedPlaceholder, isTyping } = useTypewriter(
    placeholderVariable ? getVariableDisplayName(placeholderVariable) : "",
    shouldType,
    100 // typing speed in milliseconds
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

export default function LandingPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const animatedComponents = makeAnimated();
  const [tabValue, setTabValue] = useState(0);
  const [variableOptions, setVariableOptions] = useState<any[]>([]);
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
  const [isTyping1, setIsTyping1] = useState(false);
  const [isTyping2, setIsTyping2] = useState(false);

  const missingDataOptions = [
    { value: "Ignore missing data", label: "Skip missing days (recommended)" },
    { value: "Impute previous", label: "Fill in with your last value" },
    { value: "Impute average", label: "Fill in with your average value" },
  ];

  // Calculate end date automatically based on experiment days
  const endDate = new Date(
    startDate.getTime() + (experimentDays - 1) * 24 * 60 * 60 * 1000
  );

  // Helper function to get display name (simplified for correlation analysis)
  const getVariableDisplayName = (variableName: string): string => {
    return variableName;
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
      try {
        // Fetch all variables from the variables table
        const { data: variables, error } = await supabase
          .from("variables")
          .select("id, label, slug, data_type, is_active")
          .eq("is_active", true)
          .order("label", { ascending: true });

        if (error) {
          console.error("Error fetching variables:", error);
          // Log the specific error for debugging
          console.log("Supabase error details:", error);
          // If there's an error, use fallback variables
          throw new Error("Failed to fetch variables from database");
        }

        // Only proceed if we have variables
        if (!variables || variables.length === 0) {
          console.log("No variables found in database");
          throw new Error("No variables available");
        }

        // Get log counts for each variable if we have access
        let logCounts: Record<string, number> = {};
        try {
          const { data: logs } = await supabase.from("data_points").select("variable_id");
          (logs || []).forEach((row: any) => {
            if (row.variable_id) {
              logCounts[row.variable_id] = (logCounts[row.variable_id] || 0) + 1;
            }
          });
        } catch (logError) {
          console.log("Could not fetch log counts, using default counts");
        }

        // Create variable options with counts
        const varWithCounts = variables.map((variable, index) => ({
          label: variable.label,
          value: variable.label,
          id: variable.id,
          slug: variable.slug,
          data_type: variable.data_type,
          count: logCounts[variable.id] || Math.max(50 - index * 2, 5), // Fallback count
        }));

        // Sort by count (most logged first) then alphabetically
        varWithCounts.sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.label.localeCompare(b.label);
        });

        setVariableOptions(varWithCounts);
        console.log(`✅ Loaded ${varWithCounts.length} variables successfully`);
      } catch (error) {
        console.error("Error in fetchAndSortVariables:", error);
        // Use fallback variables if everything fails
        const fallbackVariables = [
          { label: "Sleep Quality", value: "Sleep Quality", id: "1", slug: "sleep-quality", data_type: "numeric", count: 45 },
          { label: "Weight", value: "Weight", id: "2", slug: "weight", data_type: "numeric", count: 42 },
          { label: "Mood", value: "Mood", id: "3", slug: "mood", data_type: "numeric", count: 38 },
          { label: "Exercise Duration", value: "Exercise Duration", id: "4", slug: "exercise-duration", data_type: "numeric", count: 35 },
          { label: "Heart Rate", value: "Heart Rate", id: "5", slug: "heart-rate", data_type: "numeric", count: 33 },
          { label: "Steps", value: "Steps", id: "6", slug: "steps", data_type: "numeric", count: 31 },
          { label: "Stress Level", value: "Stress Level", id: "7", slug: "stress-level", data_type: "numeric", count: 27 },
          { label: "Hydration", value: "Hydration", id: "8", slug: "hydration", data_type: "numeric", count: 25 },
        ];
        setVariableOptions(fallbackVariables);
      }
    }
    fetchAndSortVariables();
  }, []);

  const selectOptions: { label: string; value: string }[] = variableOptions.map(
    (opt: any) => ({
      label: opt.label,
      value: opt.value,
    })
  );

  // Add current variable if it's not in the options
  if (variable && !variableOptions.some((opt: any) => opt.value === variable)) {
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
      // Start cycling immediately
      const startCycling = () => {
        const newVar1 = getRandomVariable();
        const newVar2 = getRandomVariable(newVar1);
        
        // Start typing animation for variable 1
        setIsTyping1(true);
        setCyclingVariable1(newVar1);
        
        // Start typing animation for variable 2 after a small delay
        setTimeout(() => {
          setIsTyping2(true);
          setCyclingVariable2(newVar2);
        }, 500);
        
        // Stop typing animations after 3 seconds
        setTimeout(() => {
          setIsTyping1(false);
          setIsTyping2(false);
        }, 3000);
      };
      
      // Start immediately
      startCycling();
      
      // Set up interval to cycle every 5 seconds (3s typing + 2s pause)
      cyclingInterval.current = setInterval(startCycling, 5000);
    } else {
      // Clear cycling if user has selected variables
      if (cyclingInterval.current) {
        clearInterval(cyclingInterval.current);
        cyclingInterval.current = null;
      }
      setCyclingVariable1("");
      setCyclingVariable2("");
      setIsTyping1(false);
      setIsTyping2(false);
    }

    // Cleanup interval on unmount
    return () => {
      if (cyclingInterval.current) {
        clearInterval(cyclingInterval.current);
        cyclingInterval.current = null;
      }
    };
  }, [variable, dependentVar, selectOptions.length]);

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
      redirectTimeout.current = setTimeout(
        () => router.push("/track/manual"),
        1200
      );
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
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
      {/* Hero Section */}
      <Box 
        sx={{ 
          textAlign: 'center',
          mb: 8,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '200px',
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #ffd700, transparent)',
            borderRadius: '2px',
          }
        }}
      >
        <Typography 
          variant="h1" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{
            background: 'linear-gradient(135deg, #ffd700 0%, #ffea70 50%, #ffd700 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 800,
            fontSize: { xs: '2.5rem', md: '4rem', lg: '4.5rem' },
            mb: 3,
            letterSpacing: '-0.02em',
            lineHeight: { xs: 1.1, md: 1.05 },
            textShadow: '0 4px 8px rgba(0,0,0,0.2)',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -10,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '60px',
              height: '3px',
              background: 'linear-gradient(90deg, #ffd700, #ffea70)',
              borderRadius: '2px',
            }
          }}
        >
          Your Health Data, Your Insights
        </Typography>
        
        <Typography
          variant="h4"
          color="textSecondary"
          align="center"
          sx={{ 
            mb: 4,
            fontWeight: 400,
            color: '#e0e0e0',
            maxWidth: '700px',
            mx: 'auto',
            fontSize: { xs: '1.25rem', md: '1.5rem' },
            lineHeight: 1.4,
            letterSpacing: '0.01em',
            opacity: 0.95
          }}
        >
          Track health data → Find patterns & correlations → Get insights
        </Typography>
        

      </Box>

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
      {/* Interactive Demo Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(0, 0, 0, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: { xs: 2, md: 4 },
          border: '1px solid rgba(255, 215, 0, 0.2)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 215, 0, 0.1)',
          p: { xs: 4, md: 6 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.5), transparent)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -50,
            right: -50,
            width: 100,
            height: 100,
            background: 'radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }
        }}
      >
        <form onSubmit={handleSubmit}>


          {/* Variable Selection */}
          <Box sx={{ mb: 6 }}>
            {/* Research Question */}
            <Box
              sx={{
                mb: 4,
                p: { xs: 3, md: 4 },
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(26, 26, 26, 0.8) 100%)',
                color: "white",
                borderRadius: 3,
                border: "1px solid rgba(255, 215, 0, 0.3)",
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: "center",
                justifyContent: "center",
                gap: { xs: 3, md: 2 },
                flexWrap: "wrap",
                position: "relative",
                backdropFilter: 'blur(10px)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.6), transparent)',
                }
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
                Does Your
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
                  shouldType={isTyping1}
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
                Correlate with Your
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
                  shouldType={isTyping2}
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

          {/* Professional CTA Section */}
          <Box sx={{ textAlign: "center", mt: 8 }}>
            {/* Main CTA Button */}
            <Box
              sx={{
                position: 'relative',
                display: 'inline-block',
                mb: 4
              }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  // Store selected variables in localStorage for post-auth redirect
                  if (variable || dependentVar) {
                    const correlationIntent = {
                      variable1: variable || cyclingVariable1,
                      variable2: dependentVar || cyclingVariable2,
                      timestamp: Date.now()
                    };
                    localStorage.setItem('correlationIntent', JSON.stringify(correlationIntent));
                  }
                  // Redirect to auth page with signup intent
                  router.push('/auth?mode=signup');
                }}
                sx={{
                  background: "linear-gradient(135deg, #ffd700 0%, #ffea70 50%, #ffd700 100%)",
                  color: "black",
                  width: "100%",
                  maxWidth: 500,
                  py: { xs: 3, md: 4 },
                  px: { xs: 4, md: 6 },
                  fontSize: { xs: "1.1rem", md: "1.3rem" },
                  fontWeight: 700,
                  borderRadius: 4,
                  boxShadow: "0 16px 48px rgba(255, 215, 0, 0.3), 0 0 0 1px rgba(255, 215, 0, 0.2)",
                  textTransform: "none",
                  position: "relative",
                  overflow: "hidden",
                  letterSpacing: '0.01em',
                  border: '2px solid transparent',
                  backgroundClip: 'padding-box',
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: "-100%",
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                    transition: "left 0.6s ease",
                  },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)",
                    borderRadius: 4,
                    pointerEvents: 'none',
                  },
                  "&:hover": {
                    background: "linear-gradient(135deg, #ffea70 0%, #ffd700 50%, #ffea70 100%)",
                    transform: "translateY(-3px)",
                    boxShadow: "0 20px 60px rgba(255, 215, 0, 0.4), 0 0 0 1px rgba(255, 215, 0, 0.3)",
                    "&::before": {
                      left: "100%",
                    },
                  },
                  "&:active": {
                    transform: "translateY(-1px)",
                  },
                }}
              >
                🚀 Start Tracking - Free
              </Button>
            </Box>
            

          </Box>

        </form>
      </Box>

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

LandingPage.displayName = "LandingPage";
