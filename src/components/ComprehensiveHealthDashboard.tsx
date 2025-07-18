import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  Grid,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { Line, Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js";
import { supabase } from "@/utils/supaBase";
import { format, parseISO } from "date-fns";
import {
  Sync as SyncIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  FitnessCenter as FitnessIcon,
  Timeline as TimelineIcon,
  LocalFireDepartment as LocalFireDepartmentIcon,
  BarChart as BarChartIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Scale as ScaleIcon,
  Bed as BedIcon,
  Favorite as HeartIcon,
  Link as LinkIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {
  getOuraVariableLabel,
  getOuraVariableInfo,
  formatOuraVariableValue,
  getOuraVariableInterpretation,
  OURA_VARIABLES,
} from "@/utils/ouraVariableUtils";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface HealthData {
  id: string;
  source: "oura" | "withings" | "manual";
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

interface CorrelationData {
  variable1: string;
  variable2: string;
  correlation: number;
  pValue: number;
  dataPoints: number;
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
  const [timeRange, setTimeRange] = useState<string>("30");
  const [selectedVariable, setSelectedVariable] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<
    "all" | "oura" | "withings" | "manual"
  >("all");
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(
    new Set()
  );
  const [activeTab, setActiveTab] = useState(0);
  const [ouraConnected, setOuraConnected] = useState(false);
  const [withingsConnected, setWithingsConnected] = useState(false);
  const [syncingOura, setSyncingOura] = useState(false);
  const [syncingWithings, setSyncingWithings] = useState(false);
  const [correlations, setCorrelations] = useState<CorrelationData[]>([]);

  // Utility functions
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM dd");
    } catch {
      return dateString;
    }
  };

  const getVariableColor = (variable: string) => {
    return VARIABLE_COLORS[variable] || "#3b82f6";
  };

  const getVariableLabel = (variable: string) => {
    return VARIABLE_LABELS[variable] || variable;
  };

  const getVariableIcon = (variable: string) => {
    return VARIABLE_ICONS[variable] || <TrendingUpIcon />;
  };

  // Memoize unique variables
  const uniqueVariables = useMemo(() => {
    const variables = new Set(data.map((item) => item.variable));
    return Array.from(variables).sort();
  }, [data]);

  // Filter data by source
  const filteredData = useMemo(() => {
    if (selectedSource === "all") return data;
    return data.filter((item) => item.source === selectedSource);
  }, [data, selectedSource]);

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
      return filteredData
        .filter((item) => item.variable === variable)
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    },
    [filteredData]
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

  // Calculate correlations between variables
  const calculateCorrelations = useCallback(
    (data: HealthData[], variables: string[]) => {
      const correlations: CorrelationData[] = [];
      const filteredVariables = variables.filter((v) => {
        const variableData = data.filter((item) => item.variable === v);
        return variableData.length >= 5; // Need at least 5 data points
      });

      for (let i = 0; i < filteredVariables.length; i++) {
        for (let j = i + 1; j < filteredVariables.length; j++) {
          const var1 = filteredVariables[i];
          const var2 = filteredVariables[j];

          const data1 = data.filter((item) => item.variable === var1);
          const data2 = data.filter((item) => item.variable === var2);

          // Create date-value maps for both variables
          const map1 = new Map(data1.map((d) => [d.date, d.value || 0]));
          const map2 = new Map(data2.map((d) => [d.date, d.value || 0]));

          // Find common dates
          const commonDates = Array.from(map1.keys()).filter((date) =>
            map2.has(date)
          );

          if (commonDates.length >= 5) {
            const values1 = commonDates.map((date) => {
              const val = map1.get(date)!;
              return typeof val === "string" ? parseFloat(val) : val;
            });
            const values2 = commonDates.map((date) => {
              const val = map2.get(date)!;
              return typeof val === "string" ? parseFloat(val) : val;
            });

            // Ensure all values are numbers
            const numericValues1 = values1.filter(
              (v): v is number => typeof v === "number" && !isNaN(v)
            );
            const numericValues2 = values2.filter(
              (v): v is number => typeof v === "number" && !isNaN(v)
            );

            if (
              numericValues1.length !== numericValues2.length ||
              numericValues1.length < 5
            ) {
              continue; // Skip if we don't have enough numeric data
            }

            // Calculate correlation coefficient
            const n = numericValues1.length;
            const sum1 = numericValues1.reduce((a, b) => a + b, 0);
            const sum2 = numericValues2.reduce((a, b) => a + b, 0);
            const sum1Sq = numericValues1.reduce((a, b) => a + b * b, 0);
            const sum2Sq = numericValues2.reduce((a, b) => a + b * b, 0);
            const pSum = numericValues1.reduce(
              (a, b, i) => a + b * numericValues2[i],
              0
            );

            const num = pSum - (sum1 * sum2) / n;
            const den = Math.sqrt(
              (sum1Sq - (sum1 * sum1) / n) * (sum2Sq - (sum2 * sum2) / n)
            );

            const correlation = den === 0 ? 0 : num / den;

            // Simple p-value approximation (not statistically rigorous)
            const t =
              correlation *
              Math.sqrt((n - 2) / (1 - correlation * correlation));
            const pValue = Math.exp(-0.5 * t * t) / Math.sqrt(2 * Math.PI);

            correlations.push({
              variable1: var1,
              variable2: var2,
              correlation,
              pValue,
              dataPoints: numericValues1.length,
            });
          }
        }
      }

      // Sort by absolute correlation strength
      correlations.sort(
        (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)
      );

      return correlations;
    },
    []
  );

  // Fetch all health data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch Oura data
      const { data: ouraData, error: ouraError } = await supabase
        .from("oura_variable_data_points")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (ouraError) {
        console.error("Error fetching Oura data:", ouraError);
      }

      // Fetch Withings data
      const { data: withingsData, error: withingsError } = await supabase
        .from("withings_variable_data_points")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (withingsError) {
        console.error("Error fetching Withings data:", withingsError);
      }

      // Fetch manual data points
      const { data: manualData, error: manualError } = await supabase
        .from("data_points")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

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
          variable: item.variable,
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
          variable: item.variable || "unknown",
          date: item.date,
          value:
            typeof item.value === "string"
              ? parseFloat(item.value) || 0
              : item.value || 0, // Handle string and null values
          user_id: item.user_id,
          created_at: item.created_at,
          unit: item.unit,
        })),
      ];

      console.log("[ComprehensiveHealthDashboard] Fetched data:", {
        oura: ouraData?.length || 0,
        withings: withingsData?.length || 0,
        manual: manualData?.length || 0,
        total: combinedData.length,
      });

      setData(combinedData);

      // Calculate correlations
      const variables = Array.from(
        new Set(combinedData.map((item) => item.variable))
      ).sort();
      const newCorrelations = calculateCorrelations(combinedData, variables);
      setCorrelations(newCorrelations);
    } catch (error) {
      console.error("Error fetching health data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, calculateCorrelations]);

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

      // Check Withings connection
      const { data: withingsTokens } = await supabase
        .from("withings_tokens")
        .select("access_token")
        .eq("user_id", userId)
        .limit(1);

      setWithingsConnected(!!withingsTokens && withingsTokens.length > 0);
    } catch (error) {
      console.error("Error checking connections:", error);
    }
  }, [userId]);

  // Sync Oura data
  const syncOura = async () => {
    try {
      setSyncingOura(true);
      const response = await fetch("/api/oura/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Error syncing Oura data:", error);
    } finally {
      setSyncingOura(false);
    }
  };

  // Sync Withings data
  const syncWithings = async () => {
    try {
      setSyncingWithings(true);
      const now = new Date();
      const startDate = new Date("2009-01-01");
      const startdate = Math.floor(startDate.getTime() / 1000);
      const enddate = Math.floor(now.getTime() / 1000);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/withings-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            userId,
            startdate,
            enddate,
            meastype: [1, 5, 6, 8, 76, 77, 88],
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          await fetchData();
          console.log(
            `[ComprehensiveHealthDashboard] Synced ${
              result.upserted || 0
            } Withings data points`
          );
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

  // Handle time range change
  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setTimeRange(event.target.value);
  };

  // Handle variable change
  const handleVariableChange = (event: SelectChangeEvent) => {
    setSelectedVariable(event.target.value);
  };

  // Handle source change
  const handleSourceChange = (event: SelectChangeEvent) => {
    setSelectedSource(
      event.target.value as "all" | "oura" | "withings" | "manual"
    );
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

  // Chart data for selected variable
  const chartData = useMemo(() => {
    if (!selectedVariable) return null;

    const variableData = getVariableData(selectedVariable);
    if (variableData.length === 0) return null;

    return {
      labels: variableData.map((d) => formatDate(d.date)),
      datasets: [
        {
          label: getVariableLabel(selectedVariable),
          data: variableData.map((d) => d.value || 0), // Handle null values
          borderColor: getVariableColor(selectedVariable),
          backgroundColor: `${getVariableColor(selectedVariable)}20`,
          fill: true,
          tension: 0.2,
        },
      ],
    };
  }, [selectedVariable, getVariableData]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  // Stats for selected variable
  const variableStats = useMemo(() => {
    if (!selectedVariable) return null;
    const variableData = getVariableData(selectedVariable);
    return calculateStats(variableData);
  }, [selectedVariable, getVariableData, calculateStats]);

  // Available metrics by source
  const availableMetrics = useMemo(() => {
    const metrics = uniqueVariables.filter((variable) => {
      const variableData = getVariableData(variable);
      return variableData.length > 0;
    });
    return metrics;
  }, [uniqueVariables, getVariableData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch Oura data
        const { data: ouraData, error: ouraError } = await supabase
          .from("oura_variable_data_points")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });

        if (ouraError) {
          console.error("Error fetching Oura data:", ouraError);
        }

        // Fetch Withings data
        const { data: withingsData, error: withingsError } = await supabase
          .from("withings_variable_data_points")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });

        if (withingsError) {
          console.error("Error fetching Withings data:", withingsError);
        }

        // Fetch manual data points
        const { data: manualData, error: manualError } = await supabase
          .from("data_points")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });

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
            value: item.value || 0, // Ensure value is never null
            user_id: item.user_id,
            created_at: item.created_at,
          })),
          ...(withingsData || []).map((item) => ({
            id: item.id,
            source: "withings" as const,
            variable: item.variable,
            date: item.date,
            value: item.value || 0, // Ensure value is never null
            user_id: item.user_id,
            created_at: item.created_at,
          })),
          ...(manualData || []).map((item) => ({
            id: item.id,
            source: "manual" as const,
            variable: item.variable || "unknown",
            date: item.date,
            value: item.value || 0, // Ensure value is never null
            user_id: item.user_id,
            created_at: item.created_at,
            unit: item.unit,
          })),
        ];

        console.log("[ComprehensiveHealthDashboard] Fetched data:", {
          oura: ouraData?.length || 0,
          withings: withingsData?.length || 0,
          manual: manualData?.length || 0,
          total: combinedData.length,
        });

        setData(combinedData);

        // Calculate correlations
        try {
          const variables = Array.from(
            new Set(combinedData.map((item) => item.variable))
          ).sort();
          const newCorrelations = calculateCorrelations(
            combinedData,
            variables
          );
          setCorrelations(newCorrelations);
        } catch (error) {
          console.error("Error calculating correlations:", error);
          setCorrelations([]);
        }
      } catch (error) {
        console.error("Error fetching health data:", error);
      } finally {
        setLoading(false);
      }
    };

    const checkConnections = async () => {
      try {
        // Check Oura connection
        const { data: ouraTokens } = await supabase
          .from("oura_tokens")
          .select("access_token")
          .eq("user_id", userId)
          .limit(1);

        setOuraConnected(!!ouraTokens && ouraTokens.length > 0);

        // Check Withings connection
        const { data: withingsTokens } = await supabase
          .from("withings_tokens")
          .select("access_token")
          .eq("user_id", userId)
          .limit(1);

        setWithingsConnected(!!withingsTokens && withingsTokens.length > 0);
      } catch (error) {
        console.error("Error checking connections:", error);
      }
    };

    fetchData();
    checkConnections();
  }, [userId, calculateCorrelations]);

  // Set first available variable as selected if none selected
  useEffect(() => {
    if (!selectedVariable && availableMetrics.length > 0) {
      setSelectedVariable(availableMetrics[0]);
    }
  }, [selectedVariable, availableMetrics]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        📊 Comprehensive Health Analytics
      </Typography>

      {/* Connection Management */}
      <Card sx={{ mb: 3 }}>
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
                      onClick={() => {
                        const authUrl = `/api/withings/auth?user_id=${encodeURIComponent(
                          userId
                        )}&user_email=${encodeURIComponent(
                          "user@example.com"
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
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <BedIcon sx={{ mr: 1, color: "primary.main" }} />
                <Box>
                  <Typography variant="h6">
                    {data.filter((d) => d.source === "oura").length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Oura Records
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <ScaleIcon sx={{ mr: 1, color: "secondary.main" }} />
                <Box>
                  <Typography variant="h6">
                    {data.filter((d) => d.source === "withings").length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Withings Records
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <TimelineIcon sx={{ mr: 1, color: "success.main" }} />
                <Box>
                  <Typography variant="h6">
                    {data.filter((d) => d.source === "manual").length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manual Records
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <BarChartIcon sx={{ mr: 1, color: "warning.main" }} />
                <Box>
                  <Typography variant="h6">
                    {availableMetrics.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Metrics Tracked
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
        >
          <Tab label="Overview" />
          <Tab label="Detailed Charts" />
          <Tab label="Correlations" />
          <Tab label="All Data" />
        </Tabs>
      </Paper>

      {/* Overview Tab */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📈 Quick Overview
          </Typography>
          <Grid container spacing={2}>
            {availableMetrics.slice(0, 8).map((variable) => {
              const variableData = getVariableData(variable);
              const stats = calculateStats(variableData);
              const isExpanded = expandedMetrics.has(variable);

              return (
                <Grid size={{ xs: 12, md: 6 }} key={variable}>
                  <Card variant="outlined">
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
                            <Typography variant="subtitle1">
                              {getVariableLabel(variable)}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Latest: {formatValue(variable, stats.latest)}
                            </Typography>
                          </Box>
                        </Box>
                        <IconButton
                          onClick={() => toggleMetricExpansion(variable)}
                          size="small"
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
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
                                labels: variableData.map((d) =>
                                  formatDate(d.date)
                                ),
                                datasets: [
                                  {
                                    label: getVariableLabel(variable),
                                    data: variableData.map((d) => d.value || 0), // Handle null values
                                    borderColor: getVariableColor(variable),
                                    backgroundColor: `${getVariableColor(
                                      variable
                                    )}20`,
                                    fill: false,
                                    tension: 0.2,
                                  },
                                ],
                              }}
                              options={chartOptions}
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
        </Box>
      )}

      {/* Detailed Charts Tab */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📊 Detailed Analysis
          </Typography>

          {/* Filter Controls */}
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Source</InputLabel>
              <Select
                value={selectedSource}
                label="Source"
                onChange={handleSourceChange}
              >
                <MenuItem value="all">All Sources</MenuItem>
                <MenuItem value="oura">Oura Only</MenuItem>
                <MenuItem value="withings">Withings Only</MenuItem>
                <MenuItem value="manual">Manual Only</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Metric</InputLabel>
              <Select
                value={selectedVariable}
                label="Metric"
                onChange={handleVariableChange}
              >
                {availableMetrics.map((variable) => (
                  <MenuItem key={variable} value={variable}>
                    {getVariableLabel(variable)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {selectedVariable && variableStats && (
            <Box>
              {/* Stats Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 1 }}
                      >
                        <BarChartIcon sx={{ mr: 1, color: "primary.main" }} />
                        <Typography variant="h6">
                          {formatValue(selectedVariable, variableStats.average)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Average
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 1 }}
                      >
                        <TimelineIcon sx={{ mr: 1, color: "secondary.main" }} />
                        <Typography variant="h6">
                          {formatValue(selectedVariable, variableStats.latest)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Latest
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Tooltip
                    title={`${
                      variableStats.changePercentage > 0 ? "+" : ""
                    }${variableStats.changePercentage.toFixed(1)}% change`}
                    placement="top"
                    arrow
                  >
                    <Card sx={{ cursor: "help" }}>
                      <CardContent>
                        <Box
                          sx={{ display: "flex", alignItems: "center", mb: 1 }}
                        >
                          {variableStats.trend === "up" && (
                            <TrendingUpIcon
                              sx={{ mr: 1, color: "success.main" }}
                            />
                          )}
                          {variableStats.trend === "down" && (
                            <TrendingDownIcon
                              sx={{ mr: 1, color: "error.main" }}
                            />
                          )}
                          {variableStats.trend === "stable" && (
                            <TrendingFlatIcon
                              sx={{ mr: 1, color: "info.main" }}
                            />
                          )}
                          <Typography variant="h6">
                            {variableStats.changePercentage > 0 ? "+" : ""}
                            {variableStats.changePercentage.toFixed(1)}%
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Trend
                        </Typography>
                      </CardContent>
                    </Card>
                  </Tooltip>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 1 }}
                      >
                        <LocalFireDepartmentIcon
                          sx={{ mr: 1, color: "warning.main" }}
                        />
                        <Typography variant="h6">
                          {variableStats.streak}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Day Streak
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Chart */}
              {chartData && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h4" sx={{ mb: 1 }}>
                      {getVariableLabel(selectedVariable)}
                    </Typography>
                    <Box
                      sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}
                    >
                      <Chip
                        label={`${variableStats.totalLogs} data points`}
                        size="small"
                        color="primary"
                      />
                      <Chip
                        label={`Latest: ${formatValue(
                          selectedVariable,
                          variableStats.latest
                        )}`}
                        size="small"
                        color="secondary"
                      />
                      <Chip
                        label={`Range: ${formatValue(
                          selectedVariable,
                          variableStats.min
                        )} - ${formatValue(
                          selectedVariable,
                          variableStats.max
                        )}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ height: 400 }}>
                      <Line data={chartData} options={chartOptions} />
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Correlations Tab */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            🔗 Variable Correlations
          </Typography>

          {correlations.length === 0 ? (
            <Alert severity="info">
              Not enough data to calculate correlations. Need at least 5 data
              points for each variable pair.
            </Alert>
          ) : (
            <Box>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Showing correlations between variables with at least 5 common
                data points. Correlation ranges from -1 (perfect negative) to +1
                (perfect positive).
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Variable 1</TableCell>
                      <TableCell>Variable 2</TableCell>
                      <TableCell align="right">Correlation</TableCell>
                      <TableCell align="right">Strength</TableCell>
                      <TableCell align="right">Data Points</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {correlations.slice(0, 20).map((corr, index) => {
                      const strength = Math.abs(corr.correlation);
                      let strengthLabel = "Weak";
                      let strengthColor = "default";

                      if (strength >= 0.7) {
                        strengthLabel = "Strong";
                        strengthColor = "success";
                      } else if (strength >= 0.4) {
                        strengthLabel = "Moderate";
                        strengthColor = "warning";
                      } else if (strength >= 0.2) {
                        strengthLabel = "Weak";
                        strengthColor = "info";
                      }

                      return (
                        <TableRow key={index}>
                          <TableCell>
                            {getVariableLabel(corr.variable1)}
                          </TableCell>
                          <TableCell>
                            {getVariableLabel(corr.variable2)}
                          </TableCell>
                          <TableCell align="right">
                            {corr.correlation.toFixed(3)}
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={strengthLabel}
                              size="small"
                              color={strengthColor as any}
                            />
                          </TableCell>
                          <TableCell align="right">{corr.dataPoints}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      )}

      {/* All Data Tab */}
      {activeTab === 3 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📋 All Health Data ({data.length} records)
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow
                    key={`${item.source}-${item.variable}-${item.date}-${index}`}
                  >
                    <TableCell>
                      {format(parseISO(item.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          item.source === "oura"
                            ? "Oura"
                            : item.source === "withings"
                            ? "Withings"
                            : "Manual"
                        }
                        size="small"
                        color={
                          item.source === "oura"
                            ? "primary"
                            : item.source === "withings"
                            ? "secondary"
                            : "default"
                        }
                      />
                    </TableCell>
                    <TableCell>{getVariableLabel(item.variable)}</TableCell>
                    <TableCell align="right">
                      {formatValue(item.variable, item.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}
