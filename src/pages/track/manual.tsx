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
  FaCheckCircle,
  FaUndo,
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
import VariableLabel from "@/components/VariableLabel";
import VariableUnitSelector from "@/components/VariableUnitSelector";
import ManualUnitSelector from "@/components/ManualUnitSelector";
import { saveUserUnitPreference } from "@/utils/userUnitPreferences";
import { useUserDisplayUnit } from "@/hooks/useUserDisplayUnit";
import Link from "next/link";
import {
  Container,
  Box,
  Tabs,
  Tab,
  Chip,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useUser } from "../_app";
import SearchIcon from "@mui/icons-material/Search";
import "react-datepicker/dist/react-datepicker.css";
import { LinearProgress, CircularProgress } from "@mui/material";
import { MenuItem } from "@mui/material";
import { LOG_LABELS, validateValue } from "@/utils/logLabels";
import {
  validateVariableValue as validateWithConstraints,
  getConstraintsText,
  type Variable as ValidationVariable,
} from "@/utils/variableValidation";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { useRouter } from "next/router";
import { uploadNotesImage, deleteNotesImage, compressImage, type UploadedImage, type ImageUploadProgress } from "@/utils/imageUpload";
import {
  Collapse,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  IconButton,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
} from "@mui/icons-material";

// Dynamic variable options will be loaded from the database

interface DataPointEntry {
  id: number;
  date: string; // Now contains full timestamp (ISO string)
  variable: string;
  variable_id?: string; // UUID field for new data_points table
  value: string;
  notes?: string;
  created_at?: string; // Also a full timestamp
  confirmed?: boolean;
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

// Helper for variable name and link - now using VariableLabel component
function VariableNameLink({
  log,
  variables,
}: {
  log: any;
  variables: Variable[];
}) {
  return (
    <VariableLabel
      variableId={log.variable_id}
      variableLabel={log.variable}
      variables={variables}
      color="#FFD700"
      fontWeight={500}
      fontSize="0.85em"
      sx={{ marginLeft: 0.5 }}
    />
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
  const [notesEverFocused, setNotesEverFocused] = useState(false); // Track if notes was ever focused
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedModalImage, setSelectedModalImage] = useState<{url: string, name: string} | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [selectedViewDate, setSelectedViewDate] = useState<Date>(new Date());
  const [activeExperiments, setActiveExperiments] = useState<any[]>([]);
  const [experimentsLogsToday, setExperimentsLogsToday] = useState<
    Record<string, DataPointEntry[]>
  >({});
  const [experimentsNeedingLogs, setExperimentsNeedingLogs] = useState<any[]>(
    []
  );
  const [dataPoints, setDataPoints] = useState<DataPointEntry[]>([]);
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

  // Notes and image upload state
  const [notesImages, setNotesImages] = useState<{id?: number, file?: File, url: string, uploading?: boolean, error?: string, name: string}[]>([]);
  const [notesCharCount, setNotesCharCount] = useState(0);
  const [notesFocused, setNotesFocused] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());

  // New variable creation state
  const [showVariableCreationDialog, setShowVariableCreationDialog] =
    useState(false);
  const [newVariableName, setNewVariableName] = useState("");
  const [pendingVariableSelection, setPendingVariableSelection] = useState<
    string | null
  >(null);

  // Add state to control visibility of the Active Experiments card
  const [showActiveExperiments, setShowActiveExperiments] = useState(true);

  // Unit selection state
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  
  // Track variables from landing page correlation intent
  const [nextVariableToSelect, setNextVariableToSelect] = useState<string | null>(null);

  // Get user's preferred display unit for the selected variable
  const {
    displayUnit,
    loading: displayUnitLoading,
    refetch: refetchDisplayUnit,
  } = useUserDisplayUnit(
    selectedVariable?.id || "",
    selectedVariable || undefined
  );

  // Redirect unauthenticated users to the auth page to avoid 401 loops
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/auth");
    }
  }, [userLoading, user, router]);

  // Update selected unit when display unit changes or variable changes
  useEffect(() => {
    if (displayUnit) {
      setSelectedUnit(displayUnit);
    } else if (selectedVariable) {
      // Reset unit when variable changes but no preferred unit is set
      setSelectedUnit("");
    }
  }, [displayUnit, selectedVariable]);

  // Initialize character count
  useEffect(() => {
    setNotesCharCount(notes.length);
  }, [notes]);

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
  const groupDataPointsBySourceWithNames = (dataPoints: any[]) => {
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

    dataPoints.forEach((log) => {
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

  // Merge manual and planned data points for display
  const allDataPoints = useMemo(() => {
    return [
      ...dataPoints.map((log) => ({ ...log, _source: "manual" })),
      ...todaysPlannedLogs.map((log) => ({ ...log, _source: "planned" })),
    ].sort((a, b) => {
      // Use logged_at or date for sorting
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      return bDate.getTime() - aDate.getTime();
    });
  }, [dataPoints, todaysPlannedLogs]);

  const groupedDataPoints = useMemo(() => {
    return groupDataPointsBySourceWithNames(allDataPoints);
  }, [allDataPoints, routineNames]);

  useEffect(() => {
    if (!user) {
      console.log("No user found, skipping data fetch");
      return;
    }
    
    console.log("User authenticated, starting data fetch for user:", user.id);
    setLoading(true);
    setVariablesLoading(true);
    (async () => {
      try {
        console.log("Starting data fetch for log page...");

        // Test database connection first
        try {
          const { data: testData, error: testError } = await supabase
            .from("variables")
            .select("count")
            .limit(1);
          
          if (testError) {
            console.error("Database connection test failed:", testError);
          } else {
            console.log("Database connection test successful");
          }
        } catch (testError) {
          console.error("Database connection test failed:", testError);
        }

        // Parallelize all database calls with timeout handling
        const timeoutMs = 5000; // 5 second timeout for each call
        
        const variablesPromise = supabase.from("variables").select("*").eq("is_active", true);
        const logsPromise = supabase.from("data_points").select("*").eq("user_id", user.id);
        const experimentsPromise = supabase
          .from("experiments")
          .select("*")
          .eq("user_id", user.id)
          .gte("end_date", new Date().toISOString().split("T")[0]);
        const routinesPromise = supabase
          .from("routines")
          .select("id, routine_name")
          .eq("user_id", user.id);

        // Add timeout to each promise
        const withTimeout = <T>(promise: Promise<T>, ms: number, name: string): Promise<T> => {
          return Promise.race([
            promise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms)
            )
          ]);
        };

        const [variablesRes, logsRes, experimentsRes, routinesRes] =
          await Promise.allSettled([
            withTimeout(variablesPromise, timeoutMs, "Variables fetch"),
            withTimeout(logsPromise, timeoutMs, "Logs fetch"),
            withTimeout(experimentsPromise, timeoutMs, "Experiments fetch"),
            withTimeout(routinesPromise, timeoutMs, "Routines fetch"),
          ]);

        // Handle results with fallbacks
        const variablesRes_processed = variablesRes.status === 'fulfilled' ? variablesRes.value : { data: [], error: new Error('Variables fetch failed') };
        const logsRes_processed = logsRes.status === 'fulfilled' ? logsRes.value : { data: [], error: new Error('Logs fetch failed') };
        const experimentsRes_processed = experimentsRes.status === 'fulfilled' ? experimentsRes.value : { data: [], error: new Error('Experiments fetch failed') };
        const routinesRes_processed = routinesRes.status === 'fulfilled' ? routinesRes.value : { data: [], error: new Error('Routines fetch failed') };

        console.log("Data fetch completed, processing results...");

        // Debug: Log the variables response
        console.log("Variables response:", variablesRes_processed);
        console.log("Variables data:", variablesRes_processed.data);
        console.log("Variables error:", variablesRes_processed.error);
        console.log("Variables count:", variablesRes_processed.data?.length || 0);

        // Debug: Log each variable
        if (variablesRes_processed.data && variablesRes_processed.data.length > 0) {
          console.log("First 3 variables:");
          variablesRes_processed.data.slice(0, 3).forEach((variable, index) => {
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
        const loadedVariables = variablesRes_processed.data || [];
        
        // Debug logging for Broccoli variable
        const broccoliVar = loadedVariables.find(v => v.label === 'Broccoli');
        if (broccoliVar) {
          console.log('🥦 Debug: Broccoli variable loaded:', {
            id: broccoliVar.id,
            label: broccoliVar.label,
            validation_rules: broccoliVar.validation_rules,
            data_type: broccoliVar.data_type,
            created_at: broccoliVar.created_at
          });
        }
        
        setVariables(loadedVariables);
        setRoutines([]); // Empty for now since we removed the RPC call
        setActiveExperiments(experimentsRes_processed.data || []);
        setLabelOptions(loadedVariables);

        // Process routine names
        const routineNameMap: Record<string, string> = {};
        (routinesRes_processed.data || []).forEach((routine: any) => {
          routineNameMap[routine.id] = routine.routine_name;
        });

        setRoutineNames(routineNameMap);

        console.log(
          "Variables state set, count:",
          (variablesRes_processed.data || []).length
        );

        // Set empty planned data points for now
        setTodaysPlannedLogs([]);

        // Process experiments filtering using existing data points
        if (experimentsRes_processed.data && logsRes_processed.data) {
          const now = new Date();
          const pad = (n: number) => n.toString().padStart(2, "0");
          const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
            now.getDate()
          )}`; // Get YYYY-MM-DD format in local time
          const todaysLogs = logsRes_processed.data.filter(
            (log: any) => log.date && log.date.startsWith(today)
          );

          // Set only today's data points for the Today's Data Points section
          setDataPoints(todaysLogs);

          const filtered = filterExperimentsNeedingLogs(
            experimentsRes_processed.data,
            todaysLogs
          );
          setExperimentsNeedingLogs(filtered);
        } else {
          // If no data points, set empty array
          setDataPoints([]);
        }

        // Additional debugging for variables
        if (variablesRes_processed.error) {
          console.error("Variables error details:", variablesRes_processed.error);
        }
        if (variablesRes_processed.data && variablesRes_processed.data.length === 0) {
          console.warn("No variables found - this might indicate a database connection issue");
        }

        console.log("Data processing completed");
        setVariablesLoading(false);
        setLoading(false);
      } catch (error) {
        console.error("Error in main data fetch:", error);
        setVariablesLoading(false);
        setLoading(false);
        // Set fallback data to prevent complete failure
        setVariables([]);
        setDataPoints([]);
        setActiveExperiments([]);
        setExperimentsNeedingLogs([]);
      }
    })();
  }, [user]);

  // Handle variable pre-selection from landing page correlation intent
  useEffect(() => {
    if (variables.length > 0 && router.isReady) {
      const { var1, var2 } = router.query;
      
      // First try URL parameters (from auth redirect)
      if (var1) {
        const firstVar = variables.find(v => v.label === var1);
        if (firstVar) {
          setSelectedVariable(firstVar);
          console.log('Pre-selected variable 1 from URL:', firstVar.label);
          
          if (var2) {
            setNextVariableToSelect(var2 as string);
            console.log('Will select variable 2 after logging:', var2);
          }
          
          // Clear the query parameters to clean up the URL
          const { var1: _, var2: __, ...cleanQuery } = router.query;
          router.replace({
            pathname: router.pathname,
            query: cleanQuery
          }, undefined, { shallow: true });
          
          // Clear localStorage after using it
          localStorage.removeItem('correlationIntent');
          return;
        }
      }
      
      // Fallback to localStorage (for page refreshes or direct navigation)
      try {
        const storedIntent = localStorage.getItem('correlationIntent');
        if (storedIntent) {
          const intent = JSON.parse(storedIntent);
          const now = Date.now();
          const maxAge = 30 * 60 * 1000; // 30 minutes
          
          // Check if the intent is still fresh
          if (intent.timestamp && (now - intent.timestamp) < maxAge) {
            const firstVar = variables.find(v => v.label === intent.variable1);
            if (firstVar) {
              setSelectedVariable(firstVar);
              console.log('Pre-selected variable 1 from localStorage:', firstVar.label);
              
              if (intent.variable2) {
                setNextVariableToSelect(intent.variable2);
                console.log('Will select variable 2 after logging:', intent.variable2);
              }
              
              // Clear localStorage after using it
              localStorage.removeItem('correlationIntent');
            }
          } else {
            // Clear expired intent
            localStorage.removeItem('correlationIntent');
          }
        }
      } catch (error) {
        console.error('Error reading correlation intent from localStorage:', error);
        localStorage.removeItem('correlationIntent');
      }
    }
  }, [variables, router]);

  // Handle auto-selection when variables are loaded after nextVariableToSelect is set
  useEffect(() => {
    if (nextVariableToSelect && variables.length > 0) {
      const nextVar = variables.find(v => v.label === nextVariableToSelect);
      if (nextVar) {
        setSelectedVariable(nextVar);
        console.log('Auto-selected next variable after variables loaded:', nextVar.label);
        
        // Show a success message to prompt the user
        setSuccessMessage(`Great! Now let's log data for ${nextVar.label}`);
        setShowSuccess(true);
        
        // Clear the next variable so it only happens once
        setNextVariableToSelect(null);
      }
    }
  }, [nextVariableToSelect, variables]);

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
    if (!user || experimentsNeedingLogs.length === 0 || !dataPoints.length) return;

    const experiment = experimentsNeedingLogs[0];
    const experimentVariable = variables.find(
      (v) => v.label === experiment.variable
    );
    if (!experimentVariable) return;

    // Use existing logs data instead of making a new database call
    const recentLogs = dataPoints
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

      // Count how many data points for the independent variable were made today
      const independentLogsToday = todaysLogs.filter(
        (log) =>
          (log.variable_id === independentVariable?.id ||
            log.variable === experiment.variable) &&
          log.date.startsWith(today)
      ).length;

      // Count how many data points for the dependent variable were made today
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

      // Only include if we need more data points for either variable and we're in time interval
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

  // Fetch logs when selectedViewDate changes
  useEffect(() => {
    if (user) {
      fetchDataPoints(selectedViewDate);
    }
  }, [selectedViewDate, user]);

  const fetchDataPoints = async (targetDate?: Date) => {
    if (!user) return;

    const dateToUse = targetDate || selectedViewDate;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const dateString = `${dateToUse.getFullYear()}-${pad(
      dateToUse.getMonth() + 1
    )}-${pad(dateToUse.getDate())}`; // Get YYYY-MM-DD format in local time

    // Helper function for timeout handling
    const withTimeout = <T>(promise: Promise<T>, ms: number, name: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms)
        )
      ]);
    };

    try {
      // Fetch more data points since we'll filter in JavaScript with timeout
      const logsPromise = supabase
        .from("data_points")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(200);

      const { data } = await withTimeout(logsPromise, 5000, "Logs fetch");

      // Filter data points to the selected date using JavaScript since date is stored as text
      const selectedDateLogs = (data || []).filter(
        (log) => log.date && log.date.startsWith(dateString)
      );

      setDataPoints(selectedDateLogs);

      // Also refresh experiments filtering
      if (selectedDateLogs && activeExperiments.length > 0) {
        const filtered = filterExperimentsNeedingLogs(
          activeExperiments,
           selectedDateLogs
        );
        setExperimentsNeedingLogs(filtered);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      setDataPoints([]);
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
        display_unit: selectedUnit || null, // Include the selected unit
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
        `Successfully logged ${selectedVariable.label}: ${value}${
          selectedUnit ? ` ${selectedUnit}` : ""
        }`
      );
      setShowSuccess(true);

      // Associate uploaded images with the new data point
      const uploadedImageIds = notesImages
        .filter(img => img.id && !img.uploading)
        .map(img => img.id!)
        .filter(id => id !== undefined);

      if (uploadedImageIds.length > 0 && data[0]) {
        try {
          const { associateImagesWithDataPoint } = await import("@/utils/imageUpload");
          await associateImagesWithDataPoint(uploadedImageIds, data[0].id, user.id);
        } catch (error) {
          console.error('Failed to associate images with data point:', error);
          // Don't fail the whole submission if image association fails
        }
      }

      // Reset form
      setSelectedVariable(null);
      setValue("");
      setNotes("");
      setNotesImages([]);
      setNotesEverFocused(false); // Reset notes focus state
      setImageModalOpen(false); // Close any open image modal
      setSelectedModalImage(null);
      setSelectedUnit("");

      // Auto-select next variable if we have one from correlation intent
      console.log('Checking for next variable to select:', nextVariableToSelect);
      console.log('Variables loaded:', variables.length);
      if (nextVariableToSelect && variables.length > 0) {
        const nextVar = variables.find(v => v.label === nextVariableToSelect);
        console.log('Found next variable:', nextVar);
        if (nextVar) {
          setSelectedVariable(nextVar);
          console.log('Auto-selected next variable:', nextVar.label);
          
          // Show a success message to prompt the user
          setSuccessMessage(`Great! Now let's log data for ${nextVar.label}`);
          setShowSuccess(true);
          
          // Clear the next variable so it only happens once
          setNextVariableToSelect(null);
        } else {
          console.log('Next variable not found in variables list:', nextVariableToSelect);
          console.log('Available variables:', variables.map(v => v.label));
        }
      } else if (nextVariableToSelect && variables.length === 0) {
        console.log('Variables not loaded yet, will retry auto-selection later');
      }

      // Refresh data points
      await fetchDataPoints(selectedViewDate);

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

      // Get user's preferred unit for this variable
      let preferredUnit = null;
      try {
        const { getUserDisplayUnit } = await import("@/utils/variableUtils");
        const userUnit = await getUserDisplayUnit(
          user.id,
          variable.id,
          variable
        );
        if (userUnit) {
          preferredUnit = userUnit;
        }
      } catch (error) {
        console.warn(
          `Failed to get user preferred unit for variable ${variable.id}:`,
          error
        );
      }

      const logData = {
        user_id: user.id,
        variable_id: variable.id,
        value: logValue.trim(),
        display_unit: preferredUnit,
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

      // Refresh today's data points and experiments
      await fetchDataPoints(selectedViewDate);
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
    // Create log data array with user preferred units
    const logDataArray = [];

    for (const variable of variablesToLog) {
      const variableObj = variables.find((v) => v.label === variable.name);
      if (!variableObj?.id) continue;

      // Get user's preferred unit for this variable
      let preferredUnit = null;
      try {
        const { getUserDisplayUnit } = await import("@/utils/variableUtils");
        const userUnit = await getUserDisplayUnit(
          user.id,
          variableObj.id,
          variableObj
        );
        if (userUnit) {
          preferredUnit = userUnit;
        }
      } catch (error) {
        console.warn(
          `Failed to get user preferred unit for variable ${variableObj.id}:`,
          error
        );
      }

      logDataArray.push({
        user_id: user.id,
        variable_id: variableObj.id,
        value: variable.value.trim(),
        display_unit: preferredUnit,
        notes: variable.notes.trim() || null,
        created_at: localDateString,
        date: localDateString,
        source: ["manual"],
      });
    }

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

    // Refresh data points and experiments filtering
    await fetchDataPoints();
    await refreshExperimentsFiltering();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDateChange = async (newDate: Date | null) => {
    if (newDate) {
      setSelectedViewDate(newDate);
      await fetchDataPoints(newDate);
    }
  };

  const goToPreviousDay = async () => {
    const previousDay = new Date(selectedViewDate);
    previousDay.setDate(previousDay.getDate() - 1);
    await handleDateChange(previousDay);
  };

  const goToNextDay = async () => {
    const nextDay = new Date(selectedViewDate);
    nextDay.setDate(nextDay.getDate() + 1);
    await handleDateChange(nextDay);
  };

  const goToToday = async () => {
    const today = new Date();
    await handleDateChange(today);
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
        setDataPoints(todaysLogs);

        // Refilter experiments based on updated data points
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
      .update({ value: editingValue, notes: editingNotes, confirmed: true })
      .eq("id", editingLogId);
    if (!error) {
      setEditingLogId(null);
      setEditingValue("");
      setEditingNotes("");
      setEditingValidationError("");
      setEditingIsValid(true);
    await fetchDataPoints();
      setSuccessMessage("Log updated successfully!");
      setShowSuccess(true);
    } else {
      setExpError("Failed to update log. Please try again.");
    }
  };

  // Confirm or unconfirm an auto-tracked data point
  const handleToggleConfirm = async (log: DataPointEntry) => {
    try {
      const newConfirmed = !log.confirmed;
      const { error } = await supabase
        .from("data_points")
        .update({ confirmed: newConfirmed })
        .eq("id", log.id);
      if (error) throw error;
      await fetchDataPoints();
      setSuccessMessage(newConfirmed ? "Marked as confirmed" : "Marked as unconfirmed");
      setShowSuccess(true);
    } catch (e) {
      console.error("Failed to toggle confirm:", e);
      setExpError("Failed to update confirmation status.");
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
    await fetchDataPoints();
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
    console.log("Variable change event:", { value, type: typeof value, variablesCount: variables.length });
    
    if (typeof value === "string") {
      // User typed a new variable name
      const capitalizedName = capitalizeVariableName(value);
      console.log("Creating new variable:", capitalizedName);
      setNewVariableName(capitalizedName);
      setPendingVariableSelection(capitalizedName);
      setShowVariableCreationDialog(true);
      setSelectedVariable(null);
    } else if (value) {
      // User selected an existing variable
      console.log("Selected existing variable:", value.label);
      setSelectedVariable(value);
      setPendingVariableSelection(null);
      setNewVariableName("");
    } else {
      // User cleared the selection
      console.log("Cleared variable selection");
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
            Loading your personalized health tracking interface...
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
        📝 Track Manually
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

      {/* Manual Tracking Form */}
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, mb: { xs: 4, sm: 5 } }}>


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
          <Autocomplete
            options={variables}
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option.label
            }
            value={selectedVariable}
            onChange={handleVariableChange}
            freeSolo
            clearOnEscape
            disableClearable={false}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select or search variable"
                placeholder="Type to search..."
                variant="outlined"
                fullWidth
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {selectedVariable && (
                        <IconButton
                          component={Link}
                          href={`/variable/${selectedVariable.slug}`}
                          size="small"
                          sx={{
                            color: "primary.main",
                            mr: 0.5,
                            "&:hover": {
                              backgroundColor: "rgba(25, 118, 210, 0.08)",
                            },
                          }}
                          title="View analytics & details for this variable"
                        >
                          📊
                        </IconButton>
                      )}
                      {params.InputProps.endAdornment}
                    </Box>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}
              >
                <span>{option.icon || "📝"}</span>
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {option.label}
                  </Typography>
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

        {/* Compact Input Row */}
        {selectedVariable && (
          <Box sx={{ mb: 2 }}>
            {/* Input & Unit Row */}
            <Box 
              sx={{ 
                display: "flex", 
                gap: 1.5,
                alignItems: "flex-start",
                flexDirection: { xs: "column", sm: "row" }
              }}
            >
              {/* Value Input - Takes most space */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <ValidatedVariableInput
                  variable={selectedVariable as ValidationVariable}
                  value={value}
                  onChange={setValue}
                  selectedUnit={selectedUnit}
                  fullWidth
                  showConstraints={false}
                  size={isMobile ? "small" : "medium"}
                />
              </Box>

              {/* Unit Selector - Compact */}
              <Box sx={{ width: { xs: "100%", sm: "160px" } }}>
                <ManualUnitSelector
                  variableId={selectedVariable.id}
                  userId={user?.id || ""}
                  currentDisplayUnit={displayUnit}
                  selectedUnit={selectedUnit}
                  onUnitChange={(unitId) => {
                    setSelectedUnit(unitId);
                  }}
                  onDefaultUnitChange={async (unitId, unitGroup) => {
                    // Save as new default unit preference using centralized utility
                    if (!user?.id) return;
                    
                    try {
                      const { success, error } = await saveUserUnitPreference(
                        user.id,
                        selectedVariable.id,
                        unitId,
                        unitGroup
                      );
                      
                      if (success) {
                        // Refresh the display unit to reflect the new preference
                        await refetchDisplayUnit();
                      } else {
                        console.error("Failed to save unit preference:", error);
                      }
                    } catch (err) {
                      console.error("Error setting default unit:", err);
                    }
                  }}
                  disabled={displayUnitLoading}
                  label="Unit"
                  size={isMobile ? "small" : "medium"}
                />
              </Box>


            </Box>


          </Box>
        )}

        {/* Fallback for no variable selected */}
        {!selectedVariable && (
          <Box sx={{ mb: 2 }}>
            <TextField
              label="Value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Select a variable first..."
              variant="outlined"
              fullWidth
              disabled
              size={isMobile ? "small" : "medium"}
            />
          </Box>
        )}

        {/* Notes */}
        <Box sx={{ mb: 2 }}>
          {/* Inline images preview above notes field */}
          {notesImages.length > 0 && (
            <Box sx={{ mb: 1, p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                📎 Attached Images ({notesImages.length})
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {notesImages.map((image, index) => (
                  <Box
                    key={image.id || index}
                    sx={{
                      position: "relative",
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: image.error ? "error.main" : "divider",
                      cursor: image.uploading || image.error ? "default" : "pointer",
                    }}
                    onClick={() => {
                      if (!image.uploading && !image.error) {
                        setSelectedModalImage({
                          url: image.url,
                          name: image.name
                        });
                        setImageModalOpen(true);
                      }
                    }}
                  >
                    <img
                      src={image.url}
                      alt={`Thumbnail ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: image.uploading ? 0.5 : 1,
                      }}
                    />
                    {image.uploading && (
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(0,0,0,0.3)",
                        }}
                      >
                        <CircularProgress size={12} sx={{ color: "white" }} />
                      </Box>
                    )}
                    {image.error && (
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(255,0,0,0.3)",
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "white", fontSize: "8px" }}>
                          !
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <TextField
            label="Notes (Optional)"
            fullWidth
            multiline
            minRows={1}
            maxRows={8}
            value={notes}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue.length <= 1000) {
                setNotes(newValue);
                setNotesCharCount(newValue.length);
              }
            }}
            onFocus={() => {
              setNotesFocused(true);
              setNotesEverFocused(true); // Mark that notes has been focused at least once
            }}
            onBlur={() => {
              // Keep focused state if there are images or text
              if (notes.trim() === "" && notesImages.length === 0) {
                setNotesFocused(false);
              }
            }}
            placeholder="Add context or notes..."
            variant="outlined"
            inputProps={{
              maxLength: 1000,
            }}
            helperText={`${notesCharCount}/1000 characters${notesImages.length > 0 ? ` • ${notesImages.length} image${notesImages.length !== 1 ? 's' : ''} attached` : ''}`}
            sx={{
              "& .MuiFormHelperText-root": {
                color: notesCharCount > 900 ? "warning.main" : "text.secondary",
              },
            }}
          />
          
          {/* Image Upload - Show when notes has been focused, has content, or has images */}
          {(notesFocused || notesEverFocused || notes.trim() !== "" || notesImages.length > 0) && (
            <Box sx={{ mt: 1 }}>
              <input
                accept="image/*"
                style={{ display: "none" }}
                id="notes-image-upload"
                multiple
                type="file"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (!user) return;

                  for (const file of files) {
                    const tempId = `temp-${Date.now()}-${Math.random()}`;
                    
                    // Add to UI immediately with loading state
                    setNotesImages(prev => [...prev, {
                      id: undefined,
                      file,
                      url: URL.createObjectURL(file),
                      uploading: true,
                      name: file.name
                    }]);

                    try {
                      // Compress image if it's large
                      const compressedFile = await compressImage(file);
                      
                      // Upload to Supabase (without data point ID for now)
                      const uploadedImage = await uploadNotesImage(
                        compressedFile,
                        user.id,
                        undefined, // Will associate with data point when form is submitted
                        (progress) => {
                          // Could add progress UI here if desired
                          console.log(`Upload progress: ${progress.progress}%`);
                        }
                      );

                      // Update the image entry with uploaded data
                      setNotesImages(prev => prev.map(img => 
                        img.file === file 
                          ? { ...img, id: uploadedImage.id, uploading: false, url: uploadedImage.imageUrl }
                          : img
                      ));

                    } catch (error) {
                      console.error('Upload failed:', error);
                      // Update with error state
                      setNotesImages(prev => prev.map(img => 
                        img.file === file 
                          ? { ...img, uploading: false, error: error instanceof Error ? error.message : 'Upload failed' }
                          : img
                      ));
                    }
                  }
                  
                  // Clear the input
                  e.target.value = '';
                }}
              />
              <label htmlFor="notes-image-upload">
                <Button
                  component="span"
                  variant="outlined"
                  size="small"
                  startIcon={<span>📷</span>}
                  sx={{ mr: 1, mb: 1 }}
                  disabled={!user}
                >
                  Add Images
                </Button>
              </label>

            </Box>
          )}
        </Box>

        {/* Date and Time */}
        <Box sx={{ mb: 2 }}>
          <DatePicker
            selected={date}
            onChange={(date: Date | null) => date && setDate(date)}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="yyyy-MM-dd HH:mm"
            className="manual-track-datepicker"
            customInput={
              <TextField
                label="Date & Time"
                fullWidth
                variant="outlined"
                InputProps={{ 
                  readOnly: true,
                  sx: {
                    color: 'white',
                    '& input': {
                      color: 'white !important',
                      fontSize: '1rem',
                      fontWeight: 500
                    }
                  }
                }}
                sx={{
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: '#FFD700'
                    }
                  },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: '#FFD700',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FFD700',
                    },
                  },
                }}
              />
            }
          />
        </Box>

        {/* Error Display */}
        {expError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {expError}
          </Alert>
        )}

        {/* Submit Button & Navigation */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Button
            onClick={submitLog}
            disabled={submitting || !selectedVariable || !value.trim()}
            variant="contained"
            fullWidth
            size="large"
            sx={{ py: 1.5 }}
          >
            {submitting ? "Saving..." : "Save Data Point"}
          </Button>
          
          
        </Box>
      </Paper>

      {/* Today's Data Points */}
      {allDataPoints.length > 0 && (
        <Paper
          elevation={6}
          sx={{
            p: { xs: 3, sm: 4 },
            background: "#18191A", // dark background for section
            borderRadius: 3,
            border: "2px solid #FFD700",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 3,
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
                textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                mb: 2,
              }}
            >
              📊 Tracked data points
            </Typography>

            {/* Date Navigation */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                mb: 1.5,
                p: 1.5,
                borderRadius: 1.5,
                backgroundColor: "rgba(255, 215, 0, 0.08)",
                border: "1px solid rgba(255, 215, 0, 0.2)",
                maxWidth: "fit-content",
                mx: "auto",
              }}
            >
              <IconButton
                onClick={goToPreviousDay}
                size="small"
                sx={{
                  color: "#FFD700",
                  p: 0.5,
                  "&:hover": {
                    backgroundColor: "rgba(255, 215, 0, 0.15)",
                  },
                }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>

              <DatePicker
                selected={selectedViewDate}
                onChange={handleDateChange}
                dateFormat="MMM dd, yyyy"
                customInput={
                  <TextField
                    variant="outlined"
                    size="small"
                    sx={{
                      width: "120px",
                      "& .MuiOutlinedInput-root": {
                        color: "#FFD700",
                        borderColor: "rgba(255, 215, 0, 0.4)",
                        fontSize: "0.875rem",
                        "&:hover": {
                          borderColor: "#FFD700",
                        },
                        "&.Mui-focused": {
                          borderColor: "#FFD700",
                        },
                      },
                      "& .MuiInputBase-input": {
                        padding: "6px 12px",
                        fontSize: "0.875rem",
                      },
                    }}
                  />
                }
              />

              <IconButton
                onClick={goToNextDay}
                disabled={
                  selectedViewDate.toDateString() === new Date().toDateString()
                }
                size="small"
                sx={{
                  color: "#FFD700",
                  p: 0.5,
                  "&:hover": {
                    backgroundColor: "rgba(255, 215, 0, 0.15)",
                  },
                  "&:disabled": {
                    color: "rgba(255, 215, 0, 0.3)",
                  },
                }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>

              <IconButton
                onClick={goToToday}
                size="small"
                sx={{
                  color: "#FFD700",
                  p: 0.5,
                  "&:hover": {
                    backgroundColor: "rgba(255, 215, 0, 0.15)",
                  },
                }}
              >
                <TodayIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Date Display */}
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255, 215, 0, 0.7)",
                fontSize: "0.8rem",
                textAlign: "center",
                mb: 1,
              }}
            >
              {selectedViewDate.toDateString() === new Date().toDateString()
                ? "Today's Data Points"
                : `Data Points for ${selectedViewDate.toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}`}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: { xs: 3, sm: 4 },
            }}
          >
            {/* Manual Data Points Section */}
            {groupedDataPoints.manual && groupedDataPoints.manual.logs.length > 0 && (
              <Card className="mb-6 border border-border bg-surface">
                {/* Manual Data Points Header */}
                <CardHeader
                  className="border-b border-border bg-surface-light"
                  title={
                    <Typography
                      variant="h6"
                      className="text-white font-semibold"
                    >
                      ✍️ Manually Tracked Data Points
                    </Typography>
                  }
                />
                {/* Manual Data Points */}
                <CardContent className="p-0">
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: { xs: 1.5, sm: 2 },
                    }}
                  >
                    {groupedDataPoints.manual.logs.map((log: any) => (
                      <Box
                        key={log.id}
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          border: "1px solid #FFD700",
                          borderRadius: 2,
                          backgroundColor: "#222",
                          color: "#fff",
                          boxShadow: "0 3px 12px rgba(0,0,0,0.1)",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            boxShadow: "0 4px 16px rgba(255,215,0,0.2)",
                            transform: "translateY(-1px)",
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
                                  <VariableLabel
                                    variableId={log.variable_id}
                                    variableLabel={log.variable}
                                    variables={variables}
                                    color="#1976d2"
                                    fontWeight="bold"
                                    disableLink={true}
                                  />
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
                                {(() => {
                                  // Render dropdown for boolean/categorical variables with options
                                  let variableObj: any = null;
                                  if (log.variable_id && variables.length > 0) {
                                    variableObj = variables.find((v) => v.id === log.variable_id);
                                  }
                                  const isBoolean = variableObj?.data_type === 'boolean';
                                  const hasOptions = Array.isArray(variableObj?.validation_rules?.options) && variableObj.validation_rules.options.length > 0;
                                  if (isBoolean || hasOptions) {
                                    const options = isBoolean
                                      ? ['true', 'false']
                                      : (variableObj.validation_rules.options as string[]);
                                    return (
                                      <TextField
                                        fullWidth
                                        select
                                        label={`Value for ${variableObj?.label || log.variable || 'Unknown Variable'}`}
                                        value={editingValue}
                                        onChange={(e) => {
                                          const newValue = e.target.value;
                                          setEditingValue(newValue);
                                          const validation = validateEditValue(newValue, log);
                                          setEditingValidationError(validation.error || '');
                                          setEditingIsValid(validation.isValid);
                                        }}
                                        error={!editingIsValid}
                                        helperText={editingValidationError}
                                      >
                                        {options.map((opt) => (
                                          <MenuItem key={opt} value={opt}>
                                            {opt}
                                          </MenuItem>
                                        ))}
                                      </TextField>
                                    );
                                  }
                                  return (
                                    <TextField
                                      fullWidth
                                      label={`Value for ${(() => {
                                    if (
                                      log.variable_id &&
                                      variables.length > 0
                                    ) {
                                      const variable = variables.find(
                                        (v) => v.id === log.variable_id
                                      );
                                      if (variable) return variable.label;
                                    }
                                    return log.variable || "Unknown Variable";
                                      })()}`}
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
                                  );
                                })()}

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
                                mb: 1,
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                  flex: 1,
                                }}
                              >
                                <VariableLabel
                                  variableId={log.variable_id}
                                  variableLabel={log.variable}
                                  variables={variables}
                                  variant="subtitle2"
                                  color="#1976d2"
                                  fontWeight="bold"
                                  sx={{
                                    fontSize: { xs: "0.9rem", sm: "1rem" },
                                  }}
                                />
                                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                                  <Typography
                                    variant="h6"
                                    sx={{
                                      color: "#00E676",
                                      fontWeight: "bold",
                                      fontSize: { xs: "1.1rem", sm: "1.3rem" },
                                      textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                    }}
                                  >
                                    {log.value}
                                  </Typography>
                                  {log.display_unit && (
                                    <Typography
                                      variant="subtitle2"
                                      sx={{
                                        color: "#FFD700",
                                        fontWeight: 600,
                                        fontSize: { xs: "0.9rem", sm: "1rem" },
                                      }}
                                    >
                                      {log.display_unit}
                                    </Typography>
                                  )}
                                </Box>
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
                                          xs: "0.7rem",
                                          sm: "0.75rem",
                                        },
                                        backgroundColor:
                                          "rgba(255, 215, 0, 0.15)",
                                        px: 0.75,
                                        py: 0.25,
                                        borderRadius: 0.75,
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
                                   {/* Confirm/Unconfirm toggle for manual entries */}
                                   {typeof log.data_point?.confirmed === "boolean" ? (
                                     log.data_point.confirmed ? (
                                       <Button
                                         variant="outlined"
                                         size="small"
                                         sx={{ ml: 1, color: '#f59e0b', borderColor: '#f59e0b', '&:hover': { backgroundColor: 'rgba(245,158,11,0.1)' } }}
                                         onClick={async () => {
                                           await supabase
                                             .from("data_points")
                                             .update({ confirmed: false })
                                             .eq("id", log.id);
                                           // refresh local state
                                           setDataPoints((prev:any[]) => prev.map((l:any)=> l.id===log.id ? { ...l, data_point:{...(l.data_point||{}), confirmed:false} } : l));
                                         }}
                                       >
                                         Unconfirm
                                       </Button>
                                     ) : (
                                       <Button
                                         variant="outlined"
                                         size="small"
                                         sx={{ ml: 1, color: '#10b981', borderColor: '#10b981', '&:hover': { backgroundColor: 'rgba(16,185,129,0.1)' } }}
                                         onClick={async () => {
                                           await supabase
                                             .from("data_points")
                                             .update({ confirmed: true })
                                             .eq("id", log.id);
                                           setDataPoints((prev:any[]) => prev.map((l:any)=> l.id===log.id ? { ...l, data_point:{...(l.data_point||{}), confirmed:true} } : l));
                                         }}
                                       >
                                         Confirm
                                       </Button>
                                     )
                                   ) : null}
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
            {groupedDataPoints.auto &&
              Object.keys(groupedDataPoints.auto.routines).length > 0 && (
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
                    {Object.entries(groupedDataPoints.auto.routines).map(
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
                              gap: { xs: 1.5, sm: 2 },
                            }}
                          >
                            {(routineData as any).logs.map((log: any) => (
                              <Box
                                key={log.id}
                                sx={{
                                  p: { xs: 2, sm: 2.5 },
                                  border: "1px solid #FFD700",
                                  borderRadius: 2,
                                  backgroundColor: "#222",
                                  color: "#fff",
                                  boxShadow: "0 3px 12px rgba(0,0,0,0.1)",
                                  transition: "all 0.2s ease",
                                  "&:hover": {
                                    boxShadow: "0 4px 16px rgba(255,215,0,0.2)",
                                    transform: "translateY(-1px)",
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
                                        <VariableLabel
                                          variableId={log.variable_id}
                                          variableLabel={log.variable}
                                          variables={variables}
                                          color="#1976d2"
                                          fontWeight="bold"
                                          disableLink={true}
                                        />
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
                                        label={`Value for ${(() => {
                                          if (
                                            log.variable_id &&
                                            variables.length > 0
                                          ) {
                                            const variable = variables.find(
                                              (v) => v.id === log.variable_id
                                            );
                                            if (variable) return variable.label;
                                          }
                                          return (
                                            log.variable || "Unknown Variable"
                                          );
                                        })()}`}
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
                                        mb: 1,
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 1.5,
                                          flex: 1,
                                        }}
                                      >
                                        <VariableLabel
                                          variableId={log.variable_id}
                                          variableLabel={log.variable}
                                          variables={variables}
                                          variant="subtitle2"
                                          color="#1976d2"
                                          fontWeight="bold"
                                          sx={{
                                            fontSize: {
                                              xs: "0.9rem",
                                              sm: "1rem",
                                            },
                                          }}
                                        />
                                        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                                          <Typography
                                            variant="h6"
                                            sx={{
                                              color: "#00E676",
                                              fontWeight: "bold",
                                              fontSize: {
                                                xs: "1.1rem",
                                                sm: "1.3rem",
                                              },
                                              textShadow:
                                                "0 1px 2px rgba(0,0,0,0.1)",
                                            }}
                                          >
                                            {log.value}
                                          </Typography>
                                          {log.display_unit && (
                                            <Typography
                                              variant="subtitle2"
                                              sx={{
                                                color: "#FFD700",
                                                fontWeight: 600,
                                                fontSize: {
                                                  xs: "0.9rem",
                                                  sm: "1rem",
                                                },
                                              }}
                                            >
                                              {log.display_unit}
                                            </Typography>
                                          )}
                                        </Box>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            ml: 0,
                                            color: (log as any).confirmed ? "#10b981" : "#f59e0b",
                                            fontWeight: 700,
                                            fontSize: {
                                              xs: "0.7rem",
                                              sm: "0.75rem",
                                            },
                                            backgroundColor: (log as any).confirmed
                                              ? "rgba(16,185,129,0.15)"
                                              : "rgba(245,158,11,0.15)",
                                            px: 0.75,
                                            py: 0.25,
                                            borderRadius: 0.75,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                          }}
                                        >
                                          {(log as any).confirmed ? "Confirmed" : "Pending"}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: "flex", gap: 1 }}>
                                        <IconButton
                                          onClick={() => handleToggleConfirm(log as any)}
                                          size="small"
                                          sx={{
                                            color: (log as any).confirmed ? "#f59e0b" : "#10b981",
                                            mr: 1,
                                            "&:hover": {
                                              backgroundColor: (log as any).confirmed
                                                ? "rgba(245,158,11,0.1)"
                                                : "rgba(16,185,129,0.1)",
                                              transform: "scale(1.1)",
                                            },
                                          }}
                                          title={(log as any).confirmed ? "Unconfirm" : "Confirm"}
                                        >
                                          {(log as any).confirmed ? <FaUndo /> : <FaCheckCircle color="#10b981" />}
                                        </IconButton>
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

      {/* Image Modal */}
      <Dialog
        open={imageModalOpen}
        onClose={() => {
          setImageModalOpen(false);
          setSelectedModalImage(null);
        }}
        maxWidth="lg"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: "transparent",
            boxShadow: "none",
            overflow: "visible",
          },
        }}
      >
        <DialogContent
          sx={{
            padding: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
            backgroundColor: "transparent",
          }}
        >
          {selectedModalImage && (
            <Box
              sx={{
                position: "relative",
                maxWidth: "90vw",
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <img
                src={selectedModalImage.url}
                alt={selectedModalImage.name}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "8px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  color: "white",
                  backgroundColor: "rgba(0,0,0,0.7)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  textAlign: "center",
                }}
              >
                {selectedModalImage.name}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: "center",
            backgroundColor: "transparent",
            pt: 0,
          }}
        >
          <Button
            onClick={() => {
              setImageModalOpen(false);
              setSelectedModalImage(null);
            }}
            variant="contained"
            sx={{
              backgroundColor: "rgba(0,0,0,0.8)",
              color: "white",
              "&:hover": {
                backgroundColor: "rgba(0,0,0,0.9)",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
