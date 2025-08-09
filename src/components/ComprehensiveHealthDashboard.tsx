import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  IconButton,
  Collapse,
  Grid,
  TextField,
  InputAdornment,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from "@mui/material";
import { Line, Bar, Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js";
import { supabase } from "@/utils/supaBase";
import { format, parseISO } from "date-fns";
import {
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  Sync as SyncIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Timeline as TimelineIcon,
  Favorite as HeartIcon,
  BedOutlined as BedIcon,
  MonitorWeight as ScaleIcon,
  FitnessCenter as FitnessIcon,
  LocalFireDepartment as LocalFireDepartmentIcon,
  Apple as AppleIcon,
  PushPin as PinIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import VariableLabel from "./VariableLabel";
import AppleHealthConnectionDialog from "./AppleHealthConnectionDialog";
import { useRouter } from "next/router";
import { mapAppleHealthDataPoints } from "@/utils/appleHealthMapping";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface HealthData {
  id: string;
  source: "oura" | "withings" | "manual" | "routine" | "auto" | "apple_health";
  variable: string;
  date: string;
  value: number | string | null;
  user_id: string;
  created_at?: string;
  unit?: string;
}

interface HealthIntegrationProps {
  userId: string;
}

interface VariableStats {
  average: number;
  min: number;
  max: number;
  latest: number;
  trend: "up" | "down" | "stable";
  changePercentage: number;
  streak: number;
  totalLogs: number;
}

// Variable labels and colors
const VARIABLE_LABELS: { [key: string]: string } = {
  // Oura variables
  readiness_score: "Readiness Score",
  sleep_score: "Sleep Score",
  total_sleep_duration: "Total Sleep Duration",
  rem_sleep_duration: "REM Sleep Duration",
  deep_sleep_duration: "Deep Sleep Duration",
  efficiency: "Sleep Efficiency",
  sleep_latency: "Sleep Latency",
  temperature_deviation: "Temperature Deviation",
  temperature_trend_deviation: "Temperature Trend Deviation",
  hr_lowest_true: "Lowest Heart Rate",
  hr_average_true: "Average Heart Rate",

  // Withings variables
  weight: "Weight (kg)",
  fat_free_mass_kg: "Fat-Free Mass (kg)",
  fat_ratio: "Fat Ratio (%)",
  fat_mass_weight_kg: "Fat Mass (kg)",
  muscle_mass_kg: "Muscle Mass (kg)",
  hydration_kg: "Hydration (kg)",
  bone_mass_kg: "Bone Mass (kg)",

  // Manual variables (common ones)
  mood: "Mood",
  sleep_quality: "Sleep Quality",
  stress: "Stress Level",
  energy: "Energy Level",
  hydration: "Hydration",
  exercise: "Exercise",
  weight_manual: "Weight (Manual)",
  steps: "Steps",
  calories: "Calories",
  water_intake: "Water Intake",
};

const VARIABLE_COLORS: { [key: string]: string } = {
  // Oura colors
  readiness_score: "#10b981",
  sleep_score: "#3b82f6",
  total_sleep_duration: "#8b5cf6",
  rem_sleep_duration: "#f59e0b",
  deep_sleep_duration: "#ef4444",
  efficiency: "#06b6d4",
  sleep_latency: "#84cc16",
  temperature_deviation: "#f97316",
  temperature_trend_deviation: "#ec4899",
  hr_lowest_true: "#dc2626",
  hr_average_true: "#16a34a",

  // Withings colors
  weight: "#3b82f6",
  fat_free_mass_kg: "#10b981",
  fat_ratio: "#f59e0b",
  fat_mass_weight_kg: "#ef4444",
  muscle_mass_kg: "#8b5cf6",
  hydration_kg: "#06b6d4",
  bone_mass_kg: "#84cc16",

  // Manual colors
  mood: "#ec4899",
  sleep_quality: "#8b5cf6",
  stress: "#ef4444",
  energy: "#f59e0b",
  hydration: "#06b6d4",
  exercise: "#10b981",
  weight_manual: "#3b82f6",
  steps: "#84cc16",
  calories: "#f97316",
  water_intake: "#06b6d4",
};

const VARIABLE_ICONS: { [key: string]: React.ReactNode } = {
  // Oura icons
  readiness_score: <HeartIcon />,
  sleep_score: <BedIcon />,
  total_sleep_duration: <BedIcon />,
  rem_sleep_duration: <BedIcon />,
  deep_sleep_duration: <BedIcon />,
  efficiency: <TimelineIcon />,
  sleep_latency: <TimelineIcon />,
  temperature_deviation: <TrendingUpIcon />,
  temperature_trend_deviation: <TrendingUpIcon />,
  hr_lowest_true: <HeartIcon />,
  hr_average_true: <HeartIcon />,

  // Withings icons
  weight: <ScaleIcon />,
  fat_free_mass_kg: <FitnessIcon />,
  fat_ratio: <TrendingUpIcon />,
  fat_mass_weight_kg: <TrendingUpIcon />,
  muscle_mass_kg: <FitnessIcon />,
  hydration_kg: <TrendingUpIcon />,
  bone_mass_kg: <FitnessIcon />,

  // Manual icons
  mood: <HeartIcon />,
  sleep_quality: <BedIcon />,
  stress: <TrendingUpIcon />,
  energy: <LocalFireDepartmentIcon />,
  hydration: <TrendingUpIcon />,
  exercise: <FitnessIcon />,
  weight_manual: <ScaleIcon />,
  steps: <TimelineIcon />,
  calories: <LocalFireDepartmentIcon />,
  water_intake: <TrendingUpIcon />,
};

export default function ComprehensiveHealthDashboard({
  userId,
}: HealthIntegrationProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HealthData[]>([]);
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(
    new Set()
  );
  const [ouraConnected, setOuraConnected] = useState(false);
  const [withingsConnected, setWithingsConnected] = useState(false);
  const [appleHealthConnected, setAppleHealthConnected] = useState(false);
  const [syncingOura, setSyncingOura] = useState(false);
  const [syncingWithings, setSyncingWithings] = useState(false);
  const [syncingAppleHealth, setSyncingAppleHealth] = useState(false);
  const [appleHealthDialogOpen, setAppleHealthDialogOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<string>("");
  const [variableLabels, setVariableLabels] = useState<Record<string, string>>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [variableSlugs, setVariableSlugs] = useState<Record<string, string>>(
    {}
  );
  const [withingsSyncMessage, setWithingsSyncMessage] = useState<string>("");
  const [showWithingsSyncMessage, setShowWithingsSyncMessage] = useState(false);
  const [ouraSyncMessage, setOuraSyncMessage] = useState<string>("");
  const [showOuraSyncMessage, setShowOuraSyncMessage] = useState(false);
  const [appleSyncMessage, setAppleSyncMessage] = useState<string>("");
  const [showAppleSyncMessage, setShowAppleSyncMessage] = useState(false);

  // Add state for pinned variables and correlation
  const [pinnedVariables, setPinnedVariables] = useState<string[]>([]);
  const [showCorrelation, setShowCorrelation] = useState(false);
  const [timeRange, setTimeRange] = useState<string>("30"); // Default to 30 days

  // Define chart options at component level to avoid recreation
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: "index" as const,
          intersect: false,
        },
      },
      scales: {
        y: {
          beginAtZero: false,
        },
      },
    }),
    []
  );

  // Utility function to get variable color
  const getVariableColor = useCallback((variable: string) => {
    const colors = [
      "#3b82f6", // Blue
      "#ef4444", // Red
      "#10b981", // Green
      "#f59e0b", // Amber
      "#8b5cf6", // Purple
      "#ec4899", // Pink
      "#06b6d4", // Cyan
      "#84cc16", // Lime
      "#f97316", // Orange
      "#6b7280", // Gray
    ];

    let hash = 0;
    for (let i = 0; i < variable.length; i++) {
      hash = variable.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Get variable label with fallback
  const getVariableLabel = useCallback(
    (variable: string) => {
      // Check if we have a slug mapping
      const slug = variableSlugs[variable];
      if (slug) return slug;

      // Fallback formatting
      return variable
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    },
    [variableSlugs]
  );

  // Get variable icon
  const getVariableIcon = useCallback((variable: string) => {
    return VARIABLE_ICONS[variable] || <TrendingUpIcon />;
  }, []);

  // Utility functions
  const formatDateWithYear = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return {
        year: format(date, "yyyy"),
        month: format(date, "MMM d"),
        formatted: format(date, "MMM d, yyyy"),
      };
    } catch {
      return {
        year: "Unknown",
        month: dateString,
        formatted: dateString,
      };
    }
  };

  // Memoize unique variables
  const uniqueVariables = useMemo(() => {
    const variables = new Set(data.map((item) => item.variable));
    return Array.from(variables).sort();
  }, [data]);

  // Calculate variable statistics
  const calculateStats = useCallback(
    (variableData: HealthData[]): VariableStats => {
      const values = variableData
        .map((d) => d.value)
        .filter((v): v is number => {
          if (v === null || v === undefined) return false;
          const num = typeof v === "string" ? parseFloat(v) : v;
          return !isNaN(num) && typeof num === "number";
        })
        .map((v) => (typeof v === "string" ? parseFloat(v) : v));

      if (values.length === 0) {
        return {
          average: 0,
          min: 0,
          max: 0,
          latest: 0,
          trend: "stable",
          changePercentage: 0,
          streak: 0,
          totalLogs: 0,
        };
      }

      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const latest = values[values.length - 1];

      // Calculate trend (compare first half vs second half)
      const midpoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midpoint);
      const secondHalf = values.slice(midpoint);

      const firstHalfAvg =
        firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

      const changePercentage = firstHalfAvg
        ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
        : 0;

      let trend: "up" | "down" | "stable" = "stable";
      if (Math.abs(changePercentage) > 5) {
        trend = changePercentage > 0 ? "up" : "down";
      }

      // Calculate streak (consecutive days with data)
      let streak = 0;
      const sortedData = [...variableData].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      if (sortedData.length > 0) {
        let lastDate = new Date();
        for (const item of sortedData) {
          const itemDate = new Date(item.date);
          const daysDiff =
            Math.abs(lastDate.getTime() - itemDate.getTime()) /
            (1000 * 60 * 60 * 24);
          if (daysDiff <= 1.5) {
            streak++;
            lastDate = itemDate;
          } else {
            break;
          }
        }
      }

      return {
        average,
        min,
        max,
        latest,
        trend,
        changePercentage,
        streak,
        totalLogs: values.length,
      };
    },
    []
  );

  // Get data for a specific variable
  const getVariableData = useCallback(
    (variable: string) => {
      // Calculate the start date based on selected time range
      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setTime(startDate.getTime() - days * 24 * 60 * 60 * 1000);

      return data
        .filter((item) => 
          item.variable === variable && 
          new Date(item.date) >= startDate
        )
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    },
    [data, timeRange]
  );

  // Format value based on variable type
  const formatValue = useCallback(
    (variable: string, value: number | string | null | undefined) => {
      // Guard against undefined or null value
      if (value === null || value === undefined) {
        return "N/A";
      }

      // Convert to number if it's a string
      let numericValue: number;
      if (typeof value === "string") {
        numericValue = parseFloat(value);
        if (isNaN(numericValue)) {
          return "N/A";
        }
      } else if (typeof value === "number") {
        numericValue = value;
        if (isNaN(numericValue)) {
          return "N/A";
        }
      } else {
        return "N/A";
      }

      // Guard against undefined or null variable
      if (!variable || typeof variable !== "string") {
        return numericValue.toString();
      }

      if (variable.includes("duration")) {
        const hours = Math.floor(numericValue / 3600);
        const minutes = Math.floor((numericValue % 3600) / 60);
        return `${hours}h ${minutes}m`;
      }
      if (
        variable.includes("ratio") ||
        variable.includes("efficiency") ||
        variable.includes("score")
      ) {
        return `${numericValue.toFixed(1)}%`;
      }
      if (
        variable.includes("weight") ||
        variable.includes("mass") ||
        variable === "weight"
      ) {
        return `${numericValue.toFixed(1)} kg`;
      }
      if (variable.includes("temperature")) {
        return `${numericValue.toFixed(2)}°C`;
      }
      if (variable.includes("hr_")) {
        return `${Math.round(numericValue)} bpm`;
      }
      if (variable === "steps") {
        return `${Math.round(numericValue)} steps`;
      }
      if (variable === "calories") {
        return `${Math.round(numericValue)} cal`;
      }
      if (variable === "water_intake") {
        return `${numericValue.toFixed(1)} L`;
      }
      return numericValue.toFixed(1);
    },
    []
  );

  // Fetch all health data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch Oura data (select only existing columns)
      const { data: ouraData, error: ouraError } = await supabase
        .from("oura_variable_data_points")
        .select("id, user_id, date, variable_id, value, created_at, updated_at")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(20000); // Set high limit to get all records

      if (ouraError) {
        console.error("Error fetching Oura data:", ouraError);
      }

      // Fetch Withings data (select only existing columns)
      const { data: withingsData, error: withingsError } = await supabase
        .from("withings_variable_data_points")
        .select("id, user_id, date, variable_id, value, created_at, updated_at")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(5000); // Set high limit for Withings data

      if (withingsError) {
        console.error("Error fetching Withings data:", withingsError);
      }

      // Fetch manual data points (select only existing columns)
      const { data: manualData, error: manualError } = await supabase
        .from("data_points")
        .select(
          "id, user_id, date, variable_id, value, notes, created_at, source"
        )
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(1000); // Set limit for manual data

      if (manualError) {
        console.error("Error fetching manual data:", manualError);
      }

      // Combine and transform data
      const combinedData: HealthData[] = [
        ...(ouraData || []).map((item) => ({
          id: item.id,
          source: "oura" as const,
          variable: item.variable_id,
          date: item.date,
          value:
            typeof item.value === "string"
              ? parseFloat(item.value) || 0
              : item.value || 0, // Handle string and null values
          user_id: item.user_id,
          created_at: item.created_at,
        })),
        ...(withingsData || []).map((item) => ({
          id: item.id,
          source: "withings" as const,
          variable: item.variable_id,
          date: item.date,
          value:
            typeof item.value === "string"
              ? parseFloat(item.value) || 0
              : item.value || 0, // Handle string and null values
          user_id: item.user_id,
          created_at: item.created_at,
        })),
        ...(manualData || []).map((item) => ({
          id: item.id,
          source: "manual" as const,
          variable: item.variable_id || "unknown",
          date: item.date,
          value:
            typeof item.value === "string"
              ? parseFloat(item.value) || 0
              : item.value || 0, // Handle string and null values
          user_id: item.user_id,
          created_at: item.created_at,
          unit: undefined, // unit not available in selected columns
        })),
      ];

      console.log("[ComprehensiveHealthDashboard] Fetched data:", {
        oura: ouraData?.length || 0,
        withings: withingsData?.length || 0,
        manual: manualData?.length || 0,
        total: combinedData.length,
      });

      setData(combinedData);
    } catch (error) {
      console.error("Error fetching health data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Check connection status
  const checkConnections = useCallback(async () => {
    try {
      // Check Oura connection
      const { data: ouraTokens } = await supabase
        .from("oura_tokens")
        .select("access_token")
        .eq("user_id", userId)
        .limit(1);

      setOuraConnected(!!ouraTokens && ouraTokens.length > 0);

      // Check Withings connection. The table has no `id` column; query by `user_id`.
      const { data: withingsTokens } = await supabase
        .from("withings_tokens")
        .select("user_id")
        .eq("user_id", userId)
        .limit(1);

      setWithingsConnected(!!withingsTokens && withingsTokens.length > 0);

      // Check Apple Health connection
      const { data: appleHealthTokens } = await supabase
        .from("apple_health_tokens")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      setAppleHealthConnected(!!appleHealthTokens && appleHealthTokens.length > 0);
    } catch (error) {
      console.error("Error checking connections:", error);
    }
  }, [userId]);

  // Oura incremental sync with confirmation message
  const syncOura = async () => {
    try {
      setSyncingOura(true);
      const response = await fetch("/api/oura/sync-incremental", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: userId, startYear: 2020, clearExisting: false }),
      });

      if (response.ok) {
        const result = await response.json();
        await fetchData();
        const upserted = result.data?.totalUpserted || result.data?.upserted || 0;
        setOuraSyncMessage(
          upserted > 0
            ? `Oura sync completed: ${upserted} new data points`
            : "Oura sync completed: no new data"
        );
        setShowOuraSyncMessage(true);
      } else {
        console.error("Oura sync error:", await response.text());
      }
    } catch (error) {
      console.error("Error syncing Oura data:", error);
    } finally {
      setSyncingOura(false);
    }
  };

  // Withings incremental sync (since last period)
  const syncWithings = async () => {
    try {
      setSyncingWithings(true);
      const response = await fetch("/api/withings/sync-incremental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          await fetchData();
          const upserted = result.data?.totalUpserted || result.data?.upserted || 0;
          setWithingsSyncMessage(
            upserted > 0
              ? `Withings sync completed: ${upserted} new data points`
              : "Withings sync completed: no new data"
          );
          setShowWithingsSyncMessage(true);
        } else {
          console.error("Withings sync failed:", result.error);
        }
      } else {
        console.error("Failed to sync Withings data");
      }
    } catch (error) {
      console.error("Error syncing Withings data:", error);
    } finally {
      setSyncingWithings(false);
    }
  };

  // Apple Health sync with confirmation message
  const syncAppleHealth = async () => {
    try {
      setSyncingAppleHealth(true);
      const response = await fetch("/api/applehealth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const upserted = result.data?.totalUpserted || result.updated_statistics?.total_data_points || 0;
        setAppleSyncMessage(
          upserted > 0
            ? `Apple Health sync completed: ${upserted} new data points`
            : "Apple Health sync completed"
        );
        setShowAppleSyncMessage(true);
        await fetchData();
      } else {
        const errorData = await response.json();
        console.error("Apple Health sync error:", errorData);
      }
    } catch (error) {
      console.error("Error syncing Apple Health data:", error);
    } finally {
      setSyncingAppleHealth(false);
    }
  };

  // Connect to Apple Health
  const connectAppleHealth = async () => {
    setAppleHealthDialogOpen(true);
  };

  // Pin/Unpin variables
  const togglePinVariable = (variable: string) => {
    setPinnedVariables(prev => {
      const newPinned = prev.includes(variable) 
        ? prev.filter(v => v !== variable)
        : [...prev, variable];
      
      // Show correlation when exactly 2 variables are pinned
      setShowCorrelation(newPinned.length === 2);
      
      return newPinned;
    });
  };

  // Clear all pinned variables
  const clearPinnedVariables = () => {
    setPinnedVariables([]);
    setShowCorrelation(false);
  };

  // Calculate correlation between two variables
  const calculateCorrelation = (var1Data: HealthData[], var2Data: HealthData[]) => {
    // Find common dates
    const var1Map = new Map(var1Data.map(d => [d.date, Number(d.value) || 0]));
    const var2Map = new Map(var2Data.map(d => [d.date, Number(d.value) || 0]));
    
    const commonDates = [...var1Map.keys()].filter(date => var2Map.has(date));
    
    if (commonDates.length < 3) return null; // Need at least 3 points for meaningful correlation
    
    const pairs = commonDates.map(date => ({
      x: var1Map.get(date) || 0,
      y: var2Map.get(date) || 0,
    }));
    
    // Calculate Pearson correlation coefficient
    const n = pairs.length;
    const sumX = pairs.reduce((sum, p) => sum + p.x, 0);
    const sumY = pairs.reduce((sum, p) => sum + p.y, 0);
    const sumXY = pairs.reduce((sum, p) => sum + (p.x * p.y), 0);
    const sumX2 = pairs.reduce((sum, p) => sum + (p.x * p.x), 0);
    const sumY2 = pairs.reduce((sum, p) => sum + (p.y * p.y), 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator === 0) return null;
    
    return numerator / denominator;
  };

  // Toggle metric expansion
  const toggleMetricExpansion = (variable: string) => {
    const newExpanded = new Set(expandedMetrics);
    if (newExpanded.has(variable)) {
      newExpanded.delete(variable);
    } else {
      newExpanded.add(variable);
    }
    setExpandedMetrics(newExpanded);
  };

  // Available metrics
  const availableMetrics = useMemo(() => {
    const metrics = uniqueVariables.filter((variable) => {
      const variableData = getVariableData(variable);
      return variableData.length > 0;
    });
    return metrics;
  }, [uniqueVariables, getVariableData]);

  // Filter and sort available metrics based on search query
  const filteredAndSortedMetrics = useMemo(() => {
    const query = searchQuery.toLowerCase();

    // Start with pinned variables (always show them first)
    const pinnedAvailable = pinnedVariables.filter(variable => 
      availableMetrics.includes(variable)
    );

    if (!searchQuery.trim()) {
      // If no search query, show pinned first, then all others
      const unpinnedMetrics = availableMetrics.filter(variable => 
        !pinnedVariables.includes(variable)
      );
      return [...pinnedAvailable, ...unpinnedMetrics];
    }

    // Create a scoring system for better search results
    const scoredMetrics = availableMetrics.map((variable) => {
      const label = getVariableLabel(variable).toLowerCase();
      const variableLower = variable.toLowerCase();

      let score = 0;

      // Pinned variables get bonus score
      if (pinnedVariables.includes(variable)) {
        score += 10000; // High bonus for pinned variables
      }

      // Exact matches get highest score
      if (label === query || variableLower === query) {
        score += 1000;
      }
      // Starts with query gets high score
      else if (label.startsWith(query) || variableLower.startsWith(query)) {
        score += 500;
      }
      // Contains query gets medium score
      else if (label.includes(query) || variableLower.includes(query)) {
        score += 100;
      }
      // Partial word matches get lower score
      else if (
        label.split(" ").some((word) => word.startsWith(query)) ||
        variableLower.split("_").some((word) => word.startsWith(query))
      ) {
        score += 50;
      }

      return { variable, score };
    });

    // Sort by score (highest first) and filter out non-matches
    return scoredMetrics
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.variable);
  }, [availableMetrics, searchQuery, getVariableLabel, pinnedVariables]);

  // Fetch data with proper joins
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        console.log("[ComprehensiveHealthDashboard] Starting data fetch for user:", userId);

        // Fetch variable labels from the variables table
        console.log("[ComprehensiveHealthDashboard] Fetching variables...");
        const { data: variablesData, error: variablesError } = await supabase
          .from("variables")
          .select("id, label, slug")
          .eq("is_active", true);

        if (variablesError) {
          console.error(
            "[ComprehensiveHealthDashboard] Variables fetch error:",
            {
              code: variablesError.code,
              message: variablesError.message,
              details: variablesError.details,
              hint: variablesError.hint,
            }
          );
        } else {
          console.log(
            `[ComprehensiveHealthDashboard] ✅ Fetched ${
              variablesData?.length || 0
            } variables`
          );
          // Create a mapping of variable IDs to labels
          const labelsMap: Record<string, string> = {};
          const slugsMap: Record<string, string> = {};
          variablesData?.forEach((variable) => {
            labelsMap[variable.id] = variable.label;
            labelsMap[variable.slug] = variable.label; // Also map by slug for backward compatibility
            slugsMap[variable.id] = variable.slug; // Map variable ID to slug for navigation
          });
          setVariableLabels(labelsMap);
          setVariableSlugs(slugsMap);
        }

        // Fetch Oura data with variable joins - Using pagination to get all records
        let ouraData: any[] = [];
        let ouraError: any = null;

        try {
          // Fetch all Oura data using pagination (Supabase has 1000 record limit per query)
          let from = 0;
          const limit = 1000;
          let hasMore = true;
          let pageCount = 0;

          console.log(
            `[ComprehensiveHealthDashboard] Starting Oura pagination for user: ${userId}`
          );

          while (hasMore) {
            pageCount++;
            console.log(
              `[ComprehensiveHealthDashboard] Fetching Oura page ${pageCount} (records ${from}-${
                from + limit - 1
              })`
            );

            const { data: pageData, error: pageError } = await supabase
              .from("oura_variable_data_points")
              .select(
                `
                id, 
                user_id, 
                date, 
                variable_id, 
                value, 
                created_at,
                variables!inner(id, slug, label)
              `
              )
              .eq("user_id", userId)
              .order("date", { ascending: false })
              .range(from, from + limit - 1);

            if (pageError) {
              console.error(
                `[ComprehensiveHealthDashboard] Oura page ${pageCount} error:`,
                pageError
              );
              console.error(`[ComprehensiveHealthDashboard] Error details:`, {
                code: pageError.code,
                message: pageError.message,
                details: pageError.details,
                hint: pageError.hint,
              });
              ouraError = pageError;
              break;
            }

            console.log(
              `[ComprehensiveHealthDashboard] Oura page ${pageCount} success: ${
                pageData?.length || 0
              } records`
            );

            if (pageData && pageData.length > 0) {
              ouraData = [...ouraData, ...pageData];

              if (pageData.length < limit) {
                hasMore = false; // Last page
                console.log(
                  `[ComprehensiveHealthDashboard] Oura pagination complete - last page reached`
                );
              } else {
                from += limit;
              }
            } else {
              hasMore = false;
              console.log(
                `[ComprehensiveHealthDashboard] Oura pagination complete - no more data`
              );
            }

            // Safety limit to prevent infinite loops
            if (from > 20000) {
              hasMore = false;
              console.warn(
                `[ComprehensiveHealthDashboard] Oura pagination stopped at safety limit (20,000 records)`
              );
            }
          }

          console.log(
            `[ComprehensiveHealthDashboard] ✅ Fetched ${ouraData.length} Oura records via pagination (${pageCount} pages)`
          );
        } catch (error) {
          console.error(
            `[ComprehensiveHealthDashboard] Oura pagination failed:`,
            error
          );
          ouraError = error;
        }

        if (ouraError) {
          console.error(
            "[ComprehensiveHealthDashboard] ❌ Oura join query failed, trying fallback:",
            ouraError
          );

          // Fallback: try fetching without variable joins using pagination
          try {
            console.log(
              "[ComprehensiveHealthDashboard] 🔄 Starting Oura fallback pagination (no joins)..."
            );
            let fallbackOuraData: Array<{
              id: string;
              user_id: string;
              date: string;
              variable_id: string;
              value: number | string | null;
              created_at: string;
            }> = [];
            let from = 0;
            const limit = 1000;
            let hasMore = true;
            let fallbackPageCount = 0;

            while (hasMore) {
              fallbackPageCount++;
              console.log(
                `[ComprehensiveHealthDashboard] Fallback page ${fallbackPageCount} (records ${from}-${
                  from + limit - 1
                })`
              );

              const { data: pageData, error: pageError } = await supabase
                .from("oura_variable_data_points")
                .select("id, user_id, date, variable_id, value, created_at")
                .eq("user_id", userId)
                .order("date", { ascending: false })
                .range(from, from + limit - 1);

              if (pageError) {
                console.error(
                  `[ComprehensiveHealthDashboard] Fallback page ${fallbackPageCount} error:`,
                  {
                    code: pageError.code,
                    message: pageError.message,
                    details: pageError.details,
                    hint: pageError.hint,
                  }
                );
                break;
              }

              console.log(
                `[ComprehensiveHealthDashboard] Fallback page ${fallbackPageCount} success: ${
                  pageData?.length || 0
                } records`
              );

              if (pageData && pageData.length > 0) {
                fallbackOuraData = [...fallbackOuraData, ...pageData];

                if (pageData.length < limit) {
                  hasMore = false;
                  console.log(
                    "[ComprehensiveHealthDashboard] Fallback pagination complete - last page reached"
                  );
                } else {
                  from += limit;
                }
              } else {
                hasMore = false;
                console.log(
                  "[ComprehensiveHealthDashboard] Fallback pagination complete - no more data"
                );
              }

              // Safety limit
              if (from > 20000) {
                hasMore = false;
                console.warn(
                  "[ComprehensiveHealthDashboard] Fallback pagination stopped at safety limit"
                );
              }
            }

            if (fallbackOuraData.length > 0) {
              // Use fallback data without variable labels
              const processedFallbackData = fallbackOuraData.map(
                (item: any) => ({
                  ...item,
                  variables: {
                    id: item.variable_id,
                    slug: item.variable_id,
                    label: `Variable ${item.variable_id}`,
                  },
                })
              );
              console.log(
                `[ComprehensiveHealthDashboard] ✅ Using Oura fallback data: ${processedFallbackData.length} records (${fallbackPageCount} pages)`
              );
              ouraData = processedFallbackData;
            } else {
              console.warn(
                "[ComprehensiveHealthDashboard] ⚠️ No Oura data found even with fallback"
              );
            }
          } catch (fallbackError) {
            console.error(
              "[ComprehensiveHealthDashboard] ❌ Fallback query also failed:",
              fallbackError
            );
          }
        }

        // Fetch Withings data with variable joins - Updated to use proper relationships
        let { data: withingsData, error: withingsError } = await supabase
          .from("withings_variable_data_points")
          .select(
            `
            id, 
            user_id, 
            date, 
            variable_id, 
            value, 
            created_at,
            variables!inner(id, slug, label)
          `
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5000); // Set high limit for Withings data

        if (withingsError) {
          console.error("Error fetching Withings data:", withingsError);

          // Fallback: try fetching without variable joins (fixed column reference)
          const { data: withingsFallback, error: withingsFallbackError } =
            await supabase
              .from("withings_variable_data_points")
              .select("id, user_id, date, variable_id, value, created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(5000); // Set high limit for Withings data

          if (!withingsFallbackError && withingsFallback) {
            // Use fallback data without variable labels
            const fallbackWithingsData = withingsFallback.map(
              (item: {
                id: string;
                user_id: string;
                date: string;
                variable_id: string;
                value: number | string | null;
                created_at: string;
              }) => ({
                ...item,
                variables: [
                  {
                    id: item.variable_id,
                    slug: item.variable_id,
                    label: `Variable ${item.variable_id}`,
                  },
                ],
              })
            );
            console.log(
              "[ComprehensiveHealthDashboard] Using Withings fallback data:",
              fallbackWithingsData.length
            );
            withingsData = fallbackWithingsData;
          }
        }

        // Fetch Modular Health data points (manual and auto-tracked) with variable joins
        let { data: modularHealthData, error: modularHealthError } =
          await supabase
            .from("data_points")
            .select(
              `
              id, 
              user_id, 
              date, 
              variable_id, 
              value, 
              source, 
              created_at,
              variables!inner(id, slug, label)
            `
            )
            .eq("user_id", userId)
            .order("date", { ascending: false })
            .limit(1000); // Set limit for manual data

        if (modularHealthError) {
          console.error(
            "Error fetching Modular Health data:",
            modularHealthError
          );

          // Fallback: try fetching without variable joins
          const { data: modularFallback, error: modularFallbackError } =
            await supabase
              .from("data_points")
              .select(
                "id, user_id, date, variable_id, value, source, created_at"
              )
              .eq("user_id", userId)
              .order("date", { ascending: false })
              .limit(1000); // Set limit for manual data

          if (!modularFallbackError && modularFallback) {
            // Use fallback data without variable labels
            const fallbackModularData = modularFallback.map(
              (item: {
                id: string;
                user_id: string;
                date: string;
                variable_id: string;
                value: number | string | null;
                source: string;
                created_at: string;
              }) => ({
                ...item,
                variables: [
                  {
                    id: item.variable_id,
                    slug: item.variable_id,
                    label: `Variable ${item.variable_id}`,
                  },
                ],
              })
            );
            console.log(
              "[ComprehensiveHealthDashboard] Using Modular Health fallback data:",
              fallbackModularData.length
            );
            modularHealthData = fallbackModularData as typeof modularHealthData;
          }
        }

        // Fetch Apple Health data points (direct query without join)
        const { data: appleHealthDataRaw, error: appleHealthError } =
          await supabase
            .from("apple_health_variable_data_points")
            .select(
              "id, user_id, date, variable_id, value, source, created_at"
            )
            .eq("user_id", userId)
            .order("date", { ascending: false })
            .limit(5000); // Set high limit for Apple Health data

        let appleHealthData: any[] = [];
        if (appleHealthError) {
          console.error(
            "Error fetching Apple Health data:",
            appleHealthError
          );
        } else if (appleHealthDataRaw) {
          // Map Apple Health data with proper variable information using utility
          appleHealthData = mapAppleHealthDataPoints(appleHealthDataRaw);
          console.log(
            `[ComprehensiveHealthDashboard] ✅ Fetched Apple Health data: ${appleHealthData.length} records`
          );
        }

        // Combine and transform data - Updated to use consistent variable handling
        const combinedData: HealthData[] = [
          ...(ouraData || []).map((item: any) => ({
            id: item.id,
            source: "oura" as const,
            variable: item.variables?.slug || item.variable_id,
            date: item.date,
            value: item.value || 0,
            user_id: item.user_id,
            created_at: item.created_at,
          })),
          ...(withingsData || []).map((item: any) => ({
            id: item.id,
            source: "withings" as const,
            variable: item.variables?.slug || item.variable_id, // Use slug from joined variables table
            date: item.date,
            value: item.value || 0,
            user_id: item.user_id,
            created_at: item.created_at,
          })),
          ...(modularHealthData || []).map((item: any) => {
            // Determine the source type based on the source field
            let source: "manual" | "routine" | "auto" = "manual";
            if (item.source && Array.isArray(item.source)) {
              const sourceValue = item.source[0];
              if (sourceValue === "routine" || sourceValue === "auto") {
                source = sourceValue as "routine" | "auto";
              }
            } else if (item.source === "routine" || item.source === "auto") {
              source = item.source as "routine" | "auto";
            }

            return {
              id: item.id,
              source: source,
              variable: item.variables?.slug || item.variable_id || "unknown",
              date: item.date,
              value: item.value || 0,
              user_id: item.user_id,
              created_at: item.created_at,
            };
          }),
          ...(appleHealthData || []).map((item: any) => ({
            id: item.id,
            source: "apple_health" as const,
            variable: item.variables?.slug || item.variable_id,
            date: item.date,
            value: item.value || 0,
            user_id: item.user_id,
            created_at: item.created_at,
          })),
        ];

        console.log("[ComprehensiveHealthDashboard] Fetched data:", {
          oura: ouraData?.length || 0,
          withings: withingsData?.length || 0,
          modularHealth: modularHealthData?.length || 0,
          appleHealth: appleHealthData?.length || 0,
          total: combinedData.length,
        });

        setData(combinedData);
      } catch (error) {
        console.error("Error fetching health data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    checkConnections();
  }, [userId]);

  // Check if user is authenticated - MUST be at the top level, not conditional
  const [authChecked, setAuthChecked] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const router = useRouter();

  // Handle clicking on variable labels to navigate to variable pages
  const handleVariableLabelClick = (variableId: string) => {
    const slug = variableSlugs[variableId];
    if (slug) {
      router.push(`/variable/${slug}`);
    }
  };

  React.useEffect(() => {
    // Since userId prop is passed, user is already authenticated
    setIsAuthenticated(!!userId);
    setAuthChecked(true);
  }, [userId]);

  // Set first available variable as selected if none selected
  useEffect(() => {
    if (!selectedVariable && availableMetrics.length > 0) {
      setSelectedVariable(availableMetrics[0]);
    }
  }, [selectedVariable, availableMetrics]);

  if (loading || !authChecked) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Authentication Required
          </Typography>
          <Typography>
            Please log in to view your health analytics. The 400 errors you're
            seeing are due to unauthenticated requests.
          </Typography>
        </Alert>
        <Button
          variant="contained"
          onClick={() => (window.location.href = "/auth")}
          sx={{ mt: 2 }}
        >
          Go to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        📊 Comprehensive Health Analytics
      </Typography>

      {/* Overview Content */}
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          📈 Quick Overview
        </Typography>

        {/* Search Input */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search variables (e.g., 'sleep', 'weight', 'calories')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "black",
                  color: "white",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "grey.700",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "grey.500",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "primary.main",
                  },
                },
              }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "black",
                    color: "white",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "grey.700",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "grey.500",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "primary.main",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "grey.300",
                    "&.Mui-focused": {
                      color: "primary.main",
                    },
                  },
                  "& .MuiSelect-icon": {
                    color: "grey.300",
                  },
                }}
              >
                <MenuItem value="7">Last 7 days</MenuItem>
                <MenuItem value="14">Last 2 weeks</MenuItem>
                <MenuItem value="30">Last 30 days</MenuItem>
                <MenuItem value="60">Last 2 months</MenuItem>
                <MenuItem value="90">Last 3 months</MenuItem>
                <MenuItem value="180">Last 6 months</MenuItem>
                <MenuItem value="365">Last year</MenuItem>
                <MenuItem value="999999">All time</MenuItem>
              </Select>
            </FormControl>
          </Box>
          {searchQuery && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Found {filteredAndSortedMetrics.length} matching variables
            </Typography>
          )}
          {timeRange !== "999999" && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
              Showing data from the last {timeRange} days
            </Typography>
          )}
        </Box>

        {/* Pinned Variables Section */}
        {pinnedVariables.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PinIcon /> Pinned Variables ({pinnedVariables.length})
              </Typography>
              <Button
                size="small"
                onClick={clearPinnedVariables}
                startIcon={<CloseIcon />}
                color="secondary"
              >
                Clear All
              </Button>
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {pinnedVariables.map((variable) => (
                <Chip
                  key={variable}
                  label={getVariableLabel(variable)}
                  onDelete={() => togglePinVariable(variable)}
                  color="primary"
                  variant="filled"
                />
              ))}
            </Box>
            {showCorrelation && pinnedVariables.length === 2 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                📊 Correlation analysis available between {getVariableLabel(pinnedVariables[0])} and {getVariableLabel(pinnedVariables[1])}. 
                Scroll down to see the correlation chart.
              </Alert>
            )}
          </Box>
        )}

        <Grid container spacing={2}>
          {filteredAndSortedMetrics.slice(0, 8).map((variable) => {
            const variableData = getVariableData(variable);
            const stats = calculateStats(variableData);
            const isExpanded = expandedMetrics.has(variable);

            return (
              <Grid size={{ xs: 12, md: 6 }} key={variable}>
                <Card variant="outlined" sx={{ backgroundColor: "black", color: "white" }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {getVariableIcon(variable)}
                        <Box sx={{ ml: 1 }}>
                          <VariableLabel
                            variableLabel={getVariableLabel(variable)}
                            variableSlug={variableSlugs[variable]}
                            variant="subtitle1"
                            sx={{
                              cursor: "pointer",
                              "&:hover": {
                                textDecoration: "underline",
                                color: "primary.main",
                              },
                            }}
                          />
                          <Typography variant="body2" color="textSecondary">
                            Latest: {formatValue(variable, stats.latest)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                          onClick={() => togglePinVariable(variable)}
                          size="small"
                          color={pinnedVariables.includes(variable) ? "primary" : "default"}
                          title={pinnedVariables.includes(variable) ? "Unpin variable" : "Pin variable"}
                        >
                          <PinIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => toggleMetricExpansion(variable)}
                          size="small"
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </Box>
                    </Box>

                    <Collapse in={isExpanded}>
                      <Box sx={{ mt: 2 }}>
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid size={4}>
                            <Typography variant="body2" color="textSecondary">
                              Average
                            </Typography>
                            <Typography variant="body1">
                              {formatValue(variable, stats.average)}
                            </Typography>
                          </Grid>
                          <Grid size={4}>
                            <Typography variant="body2" color="textSecondary">
                              Min
                            </Typography>
                            <Typography variant="body1">
                              {formatValue(variable, stats.min)}
                            </Typography>
                          </Grid>
                          <Grid size={4}>
                            <Typography variant="body2" color="textSecondary">
                              Max
                            </Typography>
                            <Typography variant="body1">
                              {formatValue(variable, stats.max)}
                            </Typography>
                          </Grid>
                        </Grid>

                        <Box sx={{ height: 200 }}>
                          <Line
                            data={{
                              labels: variableData.map((d, index) => {
                                const dateInfo = formatDateWithYear(d.date);
                                const prevData =
                                  index > 0 ? variableData[index - 1] : null;
                                const prevDateInfo = prevData
                                  ? formatDateWithYear(prevData.date)
                                  : null;

                                // Show year if it's the first occurrence of this year or if it's January
                                const showYear =
                                  !prevDateInfo ||
                                  !prevDateInfo.year ||
                                  prevDateInfo.year !== dateInfo.year ||
                                  dateInfo.month.startsWith("Jan");

                                return showYear
                                  ? dateInfo.formatted
                                  : dateInfo.month;
                              }),
                              datasets: [
                                {
                                  label: getVariableLabel(variable),
                                  data: variableData.map((d, index) => ({
                                    x: index,
                                    y: d.value || 0,
                                    date: d.date,
                                    id: d.id,
                                    source: d.source,
                                    variable: d.variable,
                                  })),
                                  borderColor: getVariableColor(variable),
                                  backgroundColor: `${getVariableColor(
                                    variable
                                  )}20`,
                                  fill: false,
                                  tension: 0.2,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { 
                                  display: true,
                                  position: 'top' as const,
                                  labels: {
                                    filter: function(item: any) {
                                      // Only show the data points in legend, not the trend line
                                      return !item.text.includes('Linear Trend');
                                    }
                                  }
                                },
                                tooltip: {
                                  filter: function(tooltipItem: any) {
                                    // Don't show tooltips for the trend line points
                                    return !tooltipItem.dataset.label.includes('Linear Trend');
                                  },
                                  callbacks: {
                                    title: function (tooltipItems: any[]) {
                                      const dataIndex =
                                        tooltipItems[0]?.dataIndex;
                                      if (dataIndex !== undefined) {
                                        const dataset =
                                          tooltipItems[0]?.dataset;
                                        if (
                                          dataset &&
                                          dataset.data &&
                                          dataset.data[dataIndex]
                                        ) {
                                          const dataPoint =
                                            dataset.data[dataIndex];
                                          if (dataPoint.date) {
                                            return format(
                                              parseISO(dataPoint.date),
                                              "MMM dd, yyyy 'at' HH:mm"
                                            );
                                          }
                                        }
                                      }
                                      return tooltipItems[0]?.label || "";
                                    },
                                    label: function (context: any) {
                                      return `${context.dataset.label}: ${context.parsed.y}`;
                                    },
                                    afterLabel: function (context: any) {
                                      const dataIndex = context.dataIndex;
                                      const dataset = context.dataset;
                                      if (
                                        dataset &&
                                        dataset.data &&
                                        dataset.data[dataIndex]
                                      ) {
                                        const dataPoint =
                                          dataset.data[dataIndex];
                                        if (
                                          dataPoint.source === "manual" ||
                                          dataPoint.source === "routine" ||
                                          dataPoint.source === "auto"
                                        ) {
                                          return [
                                            "",
                                            "🖊️ Click directly on this data point to edit",
                                            "📝 Modular Health data - editable",
                                          ];
                                        } else if (dataPoint.source === "apple_health") {
                                          return [
                                            "",
                                            "🍎 Apple Health data - view only",
                                          ];
                                        }
                                      }
                                      return "";
                                    },
                                  },
                                },
                              },
                              scales: {
                                y: {
                                  beginAtZero: false,
                                },
                              },
                              onClick: (event: any, elements: any[]) => {
                                if (elements.length > 0 && elements[0] && elements[0].chart && elements[0].chart.data) {
                                  const elementIndex = elements[0].index;
                                  const dataset =
                                    elements[0].chart.data.datasets?.[0];
                                  if (
                                    dataset &&
                                    dataset.data &&
                                    dataset.data[elementIndex]
                                  ) {
                                    const dataPoint =
                                      dataset.data[elementIndex];
                                    if (
                                      dataPoint.source === "manual" ||
                                      dataPoint.source === "routine" ||
                                      dataPoint.source === "auto"
                                    ) {
                                      // Navigate directly to edit the data point
                                      const variableSlug = dataPoint.variable;
                                      const dataPointId = dataPoint.id;
                                      router.push(
                                        `/variable/${variableSlug}?edit=${dataPointId}`
                                      );
                                    } else if (dataPoint.source === "apple_health") {
                                      // Don't navigate for Apple Health data - it's read-only
                                      console.log("Apple Health data clicked - read only");
                                      return;
                                    }
                                  }
                                }
                              },
                            }}
                          />
                        </Box>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {filteredAndSortedMetrics.length === 0 && searchQuery && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body1" color="textSecondary">
              No variables found matching "{searchQuery}"
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Try searching for different terms like "sleep", "weight",
              "calories", etc.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Correlation Chart for Pinned Variables */}
      {showCorrelation && pinnedVariables.length === 2 && (
        <Box sx={{ mt: 4, mb: 4 }}>
          <Card sx={{ backgroundColor: "black", color: "white" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                📊 Analysis: {getVariableLabel(pinnedVariables[0])} vs {getVariableLabel(pinnedVariables[1])}
              </Typography>
              
              {(() => {
                const var1Data = getVariableData(pinnedVariables[0]);
                const var2Data = getVariableData(pinnedVariables[1]);
                const correlation = calculateCorrelation(var1Data, var2Data);
                
                // Find common dates for scatter plot
                const var1Map = new Map(var1Data.map(d => [d.date, Number(d.value) || 0]));
                const var2Map = new Map(var2Data.map(d => [d.date, Number(d.value) || 0]));
                const commonDates = [...var1Map.keys()].filter(date => var2Map.has(date));
                
                return (
                  <>
                    {/* Correlation Analysis (only if sufficient data) */}
                    {correlation !== null ? (
                      <Box sx={{ mb: 3, p: 3, bgcolor: "grey.800", borderRadius: 1, color: "white" }}>
                        <Typography variant="h6" sx={{ mb: 1, color: "white" }}>
                          🔗 Correlation Analysis
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1, color: "white" }}>
                          <strong>Correlation Coefficient:</strong> {correlation.toFixed(3)}
                        </Typography>
                        {(() => {
                          const correlationStrength = Math.abs(correlation);
                          let strengthText = "No correlation";
                          let strengthColor = "grey.300";
                          
                          if (correlationStrength >= 0.7) {
                            strengthText = "Strong correlation";
                            strengthColor = "#4caf50"; // Green
                          } else if (correlationStrength >= 0.3) {
                            strengthText = "Moderate correlation";
                            strengthColor = "#ff9800"; // Orange
                          } else if (correlationStrength >= 0.1) {
                            strengthText = "Weak correlation";
                            strengthColor = "#2196f3"; // Blue
                          }

                          return (
                            <Typography variant="body2" sx={{ color: strengthColor }}>
                              <strong>{strengthText}</strong> {correlation > 0 ? "(positive)" : "(negative)"}
                            </Typography>
                          );
                        })()}
                        <Typography variant="caption" sx={{ display: "block", mt: 1, color: "grey.300" }}>
                          Based on {commonDates.length} overlapping data points
                        </Typography>
                      </Box>
                    ) : (
                      <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                          <strong>Correlation Analysis Unavailable:</strong> Need at least 3 dates with data for both variables to calculate correlation.
                          {commonDates.length > 0 && ` Currently have ${commonDates.length} overlapping data point${commonDates.length === 1 ? '' : 's'}.`}
                        </Typography>
                      </Alert>
                    )}

                    {/* Individual Charts for Both Variables */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        📈 Individual Trends
                      </Typography>
                      <Grid container spacing={2}>
                        {pinnedVariables.map((variable, index) => {
                          const variableData = getVariableData(variable);
                          
                          if (variableData.length === 0) {
                            return (
                              <Grid size={{ xs: 12, md: 6 }} key={variable}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                      {getVariableLabel(variable)}
                                    </Typography>
                                    <Box sx={{ textAlign: "center", py: 4 }}>
                                      <Typography variant="body2" color="text.secondary">
                                        No data available for {getVariableLabel(variable)}
                                      </Typography>
                                    </Box>
                                  </CardContent>
                                </Card>
                              </Grid>
                            );
                          }

                          return (
                            <Grid size={{ xs: 12, md: 6 }} key={variable}>
                              <Card variant="outlined">
                                <CardContent>
                                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                    {getVariableLabel(variable)} ({variableData.length} data points)
                                  </Typography>
                                  <Box sx={{ height: 250 }}>
                                    <Line
                                      data={{
                                        labels: variableData.map((d, index) => {
                                          const dateInfo = formatDateWithYear(d.date);
                                          const prevData = index > 0 ? variableData[index - 1] : null;
                                          const prevDateInfo = prevData ? formatDateWithYear(prevData.date) : null;
                                          const showYear = !prevDateInfo || prevDateInfo.year !== dateInfo.year || dateInfo.month.startsWith("Jan");
                                          return showYear ? dateInfo.formatted : dateInfo.month;
                                        }),
                                        datasets: [{
                                          label: getVariableLabel(variable),
                                          data: variableData.map((d) => d.value || 0),
                                          borderColor: getVariableColor(variable),
                                          backgroundColor: `${getVariableColor(variable)}20`,
                                          fill: false,
                                          tension: 0.2,
                                        }]
                                      }}
                                      options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                          legend: { display: false },
                                          tooltip: {
                                            callbacks: {
                                              title: (context: any) => {
                                                const index = context[0].dataIndex;
                                                return format(parseISO(variableData[index].date), "MMM dd, yyyy");
                                              },
                                              label: (context: any) => {
                                                return `${getVariableLabel(variable)}: ${context.parsed.y}`;
                                              },
                                            },
                                          },
                                        },
                                        scales: {
                                          y: {
                                            beginAtZero: false,
                                          },
                                        },
                                      }}
                                    />
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>

                    {/* Scatter Plot (only if we have overlapping data) */}
                    {commonDates.length > 0 && (
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          🔗 Relationship Plot
                        </Typography>
                        <Box sx={{ height: 400 }}>
                          <Scatter
                            data={{
                              datasets: [
                                // Data points
                                {
                                  label: `${getVariableLabel(pinnedVariables[0])} vs ${getVariableLabel(pinnedVariables[1])}`,
                                  data: commonDates.map(date => ({
                                    x: var1Map.get(date) || 0,
                                    y: var2Map.get(date) || 0,
                                    date,
                                  })),
                                  backgroundColor: getVariableColor(pinnedVariables[0]),
                                  borderColor: getVariableColor(pinnedVariables[0]),
                                  pointRadius: 6,
                                  pointHoverRadius: 8,
                                },
                                // Linear regression line as scatter points
                                (() => {
                                  const scatterData = commonDates.map(date => ({
                                    x: var1Map.get(date) || 0,
                                    y: var2Map.get(date) || 0,
                                  }));
                                  
                                  // Calculate linear regression
                                  const n = scatterData.length;
                                  const sumX = scatterData.reduce((sum, p) => sum + p.x, 0);
                                  const sumY = scatterData.reduce((sum, p) => sum + p.y, 0);
                                  const sumXY = scatterData.reduce((sum, p) => sum + p.x * p.y, 0);
                                  const sumXX = scatterData.reduce((sum, p) => sum + p.x * p.x, 0);
                                  
                                  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                                  const intercept = (sumY - slope * sumX) / n;
                                  
                                  // Get min and max x values for the line
                                  const xValues = scatterData.map(p => p.x);
                                  const minX = Math.min(...xValues);
                                  const maxX = Math.max(...xValues);
                                  
                                  // Create multiple points along the line for smooth appearance
                                  const linePoints = [];
                                  const steps = 50;
                                  for (let i = 0; i <= steps; i++) {
                                    const x = minX + (maxX - minX) * (i / steps);
                                    const y = slope * x + intercept;
                                    linePoints.push({ x, y });
                                  }
                                  
                                  return {
                                    label: 'Linear Trend',
                                    data: linePoints,
                                    backgroundColor: 'transparent',
                                    borderColor: correlation && correlation > 0 ? '#4caf50' : '#f44336',
                                    pointRadius: 1,
                                    pointHoverRadius: 1,
                                    showLine: true,
                                    borderWidth: 3,
                                    borderDash: [5, 5],
                                  };
                                })()
                              ]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  callbacks: {
                                    title: () => "",
                                    label: (context: any) => {
                                      const point = context.raw;
                                      return [
                                        `${getVariableLabel(pinnedVariables[0])}: ${point.x}`,
                                        `${getVariableLabel(pinnedVariables[1])}: ${point.y}`,
                                        `Date: ${format(parseISO(point.date), "MMM dd, yyyy")}`,
                                      ];
                                    },
                                  },
                                },
                              },
                              scales: {
                                x: {
                                  title: {
                                    display: true,
                                    text: getVariableLabel(pinnedVariables[0]),
                                  },
                                },
                                y: {
                                  title: {
                                    display: true,
                                    text: getVariableLabel(pinnedVariables[1]),
                                  },
                                },
                              },
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center" }}>
                          Scatter plot showing {commonDates.length} overlapping data points with linear trend line
                          {correlation && (
                            <span style={{ color: correlation > 0 ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
                              {` (${correlation > 0 ? 'positive' : 'negative'} correlation: ${correlation.toFixed(3)})`}
                            </span>
                          )}
                        </Typography>
                      </Box>
                    )}

                    {/* Message when no overlapping data */}
                    {commonDates.length === 0 && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>No Overlapping Data:</strong> These variables don't have any dates with data for both variables, 
                          so no relationship plot can be created. Try logging data for both variables on the same dates to see correlations.
                        </Typography>
                      </Alert>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Spacing between sections */}
      <Box sx={{ my: 4 }} />

      {/* Connection Management - moved below Overview tab */}
      <Card sx={{ mb: 3, backgroundColor: "black", color: "white" }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            🔗 Data Source Connections
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <BedIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="subtitle1">Oura Ring</Typography>
                  <Chip
                    label={ouraConnected ? "Connected" : "Disconnected"}
                    color={ouraConnected ? "success" : "default"}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {ouraConnected ? (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={syncOura}
                      disabled={syncingOura}
                      startIcon={
                        syncingOura ? (
                          <CircularProgress size={16} />
                        ) : (
                          <SyncIcon />
                        )
                      }
                    >
                      {syncingOura ? "Syncing..." : "Sync"}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => (window.location.href = "/api/oura/auth")}
                    >
                      Connect
                    </Button>
                  )}
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <ScaleIcon sx={{ mr: 1, color: "secondary.main" }} />
                  <Typography variant="subtitle1">Withings Scale</Typography>
                  <Chip
                    label={withingsConnected ? "Connected" : "Disconnected"}
                    color={withingsConnected ? "success" : "default"}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {withingsConnected ? (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={syncWithings}
                      disabled={syncingWithings}
                      startIcon={
                        syncingWithings ? (
                          <CircularProgress size={16} />
                        ) : (
                          <SyncIcon />
                        )
                      }
                    >
                      {syncingWithings ? "Syncing..." : "Sync"}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={async () => {
                        if (!userId) {
                          console.error(
                            "No user found for Withings connection"
                          );
                          // Redirect to login if no user
                          window.location.href = "/auth";
                          return;
                        }

                        // Pass user info as query parameters to avoid session issues
                        const authUrl = `/api/withings/auth?user_id=${encodeURIComponent(
                          userId
                        )}`;
                        window.location.href = authUrl;
                      }}
                    >
                      Connect
                    </Button>
                  )}
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <AppleIcon sx={{ mr: 1, color: "info.main" }} />
                  <Typography variant="subtitle1">Apple Health</Typography>
                  <Chip
                    label={appleHealthConnected ? "Connected" : "Disconnected"}
                    color={appleHealthConnected ? "success" : "default"}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {appleHealthConnected ? (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={syncAppleHealth}
                      disabled={syncingAppleHealth}
                      startIcon={
                        syncingAppleHealth ? (
                          <CircularProgress size={16} />
                        ) : (
                          <SyncIcon />
                        )
                      }
                    >
                      {syncingAppleHealth ? "Syncing..." : "Sync"}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={connectAppleHealth}
                    >
                      Connect
                    </Button>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Apple Health Connection Dialog */}
      <AppleHealthConnectionDialog
        open={appleHealthDialogOpen}
        onClose={() => setAppleHealthDialogOpen(false)}
        userId={userId}
        onConnectionSuccess={() => {
          setAppleHealthDialogOpen(false);
          checkConnections();
        }}
      />

      {/* Withings sync confirmation */}
      <Snackbar
        open={showWithingsSyncMessage}
        autoHideDuration={5000}
        onClose={() => setShowWithingsSyncMessage(false)}
        message={withingsSyncMessage}
      />
      {/* Oura sync confirmation */}
      <Snackbar
        open={showOuraSyncMessage}
        autoHideDuration={5000}
        onClose={() => setShowOuraSyncMessage(false)}
        message={ouraSyncMessage}
      />
      {/* Apple Health sync confirmation */}
      <Snackbar
        open={showAppleSyncMessage}
        autoHideDuration={5000}
        onClose={() => setShowAppleSyncMessage(false)}
        message={appleSyncMessage}
      />
    </Box>
  );
}
