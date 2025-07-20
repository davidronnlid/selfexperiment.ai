import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
  Link,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ScatterController,
  LineController,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { supabase } from "../utils/supaBase";
import { format, parseISO, subDays, startOfDay, endOfDay } from "date-fns";
import { useRouter } from "next/router";
import {
  FaExpandArrowsAlt,
  FaCompressArrowsAlt,
  FaSyncAlt,
} from "react-icons/fa";
import InfoIcon from "@mui/icons-material/Info";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { VariableLinkSimple } from "./VariableLink";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ScatterController,
  LineController,
  Title,
  ChartTooltip,
  Legend
);

interface ManualLog {
  id: number | string;
  date: string;
  value: string;
  variable_id: string;
  notes?: string;
  source?: string;
  created_at?: string;
}

interface CorrelationAnalysisProps {
  userId?: string;
}

interface CorrelationResult {
  variable1: string;
  variable2: string;
  correlation: number | null;
  strength: "none" | "small" | "medium" | "large" | "undefined";
  direction: "positive" | "negative" | "undefined";
  dataPoints: number;
  pValue?: number | null;
  rSquared?: number | null;
}

export default function CorrelationAnalysis({
  userId,
}: CorrelationAnalysisProps) {
  const router = useRouter();
  const [logs, setLogs] = useState<ManualLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [showCorrelationAnalysis, setShowCorrelationAnalysis] = useState(true); // Toggle for correlation section
  const [minCorrelationStrength, setMinCorrelationStrength] =
    useState<string>("0.1"); // Filter by minimum correlation
  const [showOnlySignificant, setShowOnlySignificant] = useState(false); // Show only statistically significant

  // Date range state for filtering
  const [startDate, setStartDate] = useState<string>(() => {
    const ninetyDaysAgo = subDays(new Date(), 90);
    return format(ninetyDaysAgo, "yyyy-MM-dd");
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return format(new Date(), "yyyy-MM-dd");
  });

  // Analysis controls state
  const [timeRange, setTimeRange] = useState("90");
  const [selectedVar1, setSelectedVar1] = useState<string | null>(null);
  const [selectedVar2, setSelectedVar2] = useState<string | null>(null);

  // Helper function to get variable display names
  const getVariableDisplayName = (variableId: string): string => {
    // First check if we have a label in the variables mapping
    if (variables[variableId]) {
      return variables[variableId];
    }

    // Fallback for known Oura variables
    const ouraLabels: Record<string, string> = {
      sleep_score: "Sleep Score",
      readiness_score: "Readiness Score",
      temperature_deviation: "Temperature Deviation",
      temperature_trend_deviation: "Temperature Trend Deviation",
      total_sleep_duration: "Total Sleep Duration",
      rem_sleep_duration: "REM Sleep Duration",
      deep_sleep_duration: "Deep Sleep Duration",
      efficiency: "Sleep Efficiency",
      sleep_latency: "Sleep Latency",
      hr_lowest_true: "Lowest Heart Rate",
      hr_average_true: "Average Heart Rate",
    };

    if (ouraLabels[variableId]) {
      return ouraLabels[variableId];
    }

    // Fallback for known Withings variables
    const withingsLabels: Record<string, string> = {
      weight: "Weight",
      fat_free_mass_kg: "Fat Free Mass",
      fat_ratio: "Fat Ratio",
      fat_mass_weight_kg: "Fat Mass",
      muscle_mass_kg: "Muscle Mass",
      hydration_kg: "Hydration",
      bone_mass_kg: "Bone Mass",
    };

    if (withingsLabels[variableId]) {
      return withingsLabels[variableId];
    }

    // If it's a UUID (variable ID), try to format it nicely
    if (
      variableId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    ) {
      // This is a UUID, likely a variable ID - show a generic name
      return `Variable ${variableId.slice(0, 8)}...`;
    }

    // Final fallback - format the ID nicely
    return variableId
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getVariableSlug = (variableId: string): string => {
    const isOuraVariable = (id: string) => {
      return [
        "sleep_score",
        "readiness_score",
        "temperature_deviation",
        "temperature_trend_deviation",
        "total_sleep_duration",
        "rem_sleep_duration",
        "deep_sleep_duration",
        "efficiency",
        "sleep_latency",
        "hr_lowest_true",
        "hr_average_true",
      ].includes(id);
    };

    const isWithingsVariable = (id: string) => {
      return [
        "weight",
        "fat_free_mass_kg",
        "fat_ratio",
        "fat_mass_weight_kg",
        "muscle_mass_kg",
        "hydration_kg",
        "bone_mass_kg",
      ].includes(id);
    };

    if (isOuraVariable(variableId)) {
      return variableId;
    }

    if (isWithingsVariable(variableId)) {
      return variableId;
    }

    return variableId;
  };

  // Create clickable variable link
  const createVariableLink = (variableId: string, displayName: string) => {
    const slug = getVariableSlug(variableId);

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      router.push(`/variable/${slug}`);
    };

    return (
      <Link
        component="button"
        onClick={handleClick}
        sx={{
          color: "primary.main",
          textDecoration: "none",
          "&:hover": {
            textDecoration: "underline",
            cursor: "pointer",
          },
          fontWeight: "inherit",
          fontSize: "inherit",
          textAlign: "left",
          padding: 0,
          border: "none",
          background: "none",
        }}
      >
        {displayName}
      </Link>
    );
  };

  useEffect(() => {
    fetchManualLogs();
  }, [userId, startDate, endDate]);

  // Debug: Log when variables state changes
  useEffect(() => {
    console.log("[CorrelationAnalysis] Variables state updated:", variables);
    console.log(
      "[CorrelationAnalysis] Variables state keys:",
      Object.keys(variables)
    );
  }, [variables]);

  const fetchManualLogs = async () => {
    if (!userId) {
      setError("User ID is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startDateTime = startOfDay(parseISO(startDate)).toISOString();
      const endDateTime = endOfDay(parseISO(endDate)).toISOString();

      console.log(
        "[CorrelationAnalysis] Fetching data from",
        startDate,
        "to",
        endDate
      );

      // Fetch variables mapping first
      const { data: variablesData, error: variablesError } = await supabase
        .from("variables")
        .select("id, label, slug")
        .eq("is_active", true);

      if (variablesError) {
        console.error("Error fetching variables:", variablesError);
      }

      // Create a variables lookup map for joining data
      const varsMap =
        variablesData?.reduce(
          (acc: any, v: any) => ({ ...acc, [v.id]: v }),
          {}
        ) || {};

      // Initialize variableLabels with all variables from the database
      const variableLabels: Record<string, string> = {};
      if (variablesData) {
        variablesData.forEach((variable: any) => {
          variableLabels[variable.id] = variable.label || variable.id;
        });
      }

      let allLogs: ManualLog[] = [];

      // 1. Fetch Oura data with high limit and proper date filtering
      console.log("[CorrelationAnalysis] Fetching Oura data...");
      const { data: ouraLogsResult, error: ouraError } = await supabase
        .from("oura_variable_data_points")
        .select("id, user_id, date, variable_id, value, created_at")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false })
        .limit(20000); // High limit to get all Oura data

      if (ouraError) {
        console.error("Error fetching Oura data:", ouraError);
      } else {
        console.log(
          "[CorrelationAnalysis] Fetched",
          ouraLogsResult?.length || 0,
          "Oura records"
        );

        // Process Oura logs
        if (ouraLogsResult) {
          const processedOuraLogs = ouraLogsResult.map((log: any) => {
            const ouraLabels: Record<string, string> = {
              sleep_score: "Sleep Score",
              readiness_score: "Readiness Score",
              temperature_deviation: "Temperature Deviation",
              temperature_trend_deviation: "Temperature Trend Deviation",
              total_sleep_duration: "Total Sleep Duration",
              rem_sleep_duration: "REM Sleep Duration",
              deep_sleep_duration: "Deep Sleep Duration",
              efficiency: "Sleep Efficiency",
              sleep_latency: "Sleep Latency",
              hr_lowest_true: "Lowest Heart Rate",
              hr_average_true: "Average Heart Rate",
            };

            // Ensure the variable label is set for Oura variables
            if (!variableLabels[log.variable_id]) {
              variableLabels[log.variable_id] =
                ouraLabels[log.variable_id] || log.variable_id;
            }

            return {
              id: `oura_${log.id}`,
              variable_id: log.variable_id,
              value: log.value?.toString() || "0",
              date: log.date,
              notes: "Oura Ring data",
              source: "oura",
              created_at: log.created_at,
            };
          });
          allLogs = [...allLogs, ...processedOuraLogs];
        }
      }

      // 2. Fetch Withings data with high limit
      console.log("[CorrelationAnalysis] Fetching Withings data...");
      const { data: withingsLogsResult, error: withingsError } = await supabase
        .from("withings_variable_data_points")
        .select("id, user_id, date, variable_id, value, created_at")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false })
        .limit(10000); // High limit for Withings data

      if (withingsError) {
        console.error("Error fetching Withings data:", withingsError);
      } else {
        console.log(
          "[CorrelationAnalysis] Fetched",
          withingsLogsResult?.length || 0,
          "Withings records"
        );

        // Process Withings logs
        if (withingsLogsResult) {
          const processedWithingsLogs = withingsLogsResult.map((log: any) => {
            const withingsLabels: Record<string, string> = {
              weight: "Weight",
              fat_free_mass_kg: "Fat Free Mass",
              fat_ratio: "Fat Ratio",
              fat_mass_weight_kg: "Fat Mass",
              muscle_mass_kg: "Muscle Mass",
              hydration_kg: "Hydration",
              bone_mass_kg: "Bone Mass",
            };

            // Ensure the variable label is set for Withings variables
            if (!variableLabels[log.variable_id]) {
              variableLabels[log.variable_id] =
                withingsLabels[log.variable_id] || log.variable_id;
            }

            return {
              id: `withings_${log.id}`,
              variable_id: log.variable_id,
              value: log.value?.toString() || "0",
              date: log.date,
              notes: "Withings data",
              source: "withings",
              created_at: log.created_at,
            };
          });
          allLogs = [...allLogs, ...processedWithingsLogs];
        }
      }

      // 3. Fetch manual/modular health data
      console.log("[CorrelationAnalysis] Fetching Modular Health data...");
      const { data: rawManualLogs, error: manualError } = await supabase
        .from("data_points")
        .select(
          "id, user_id, date, variable_id, value, notes, source, created_at"
        )
        .eq("user_id", userId)
        .gte("date", startDateTime)
        .lte("date", endDateTime)
        .order("date", { ascending: false })
        .limit(5000); // Reasonable limit for manual data

      if (manualError) {
        console.error("Error fetching manual data:", manualError);
      } else {
        console.log(
          "[CorrelationAnalysis] Fetched",
          rawManualLogs?.length || 0,
          "Modular Health records"
        );

        // Process manual logs
        if (rawManualLogs) {
          const processedManualLogs = rawManualLogs.map((log: any) => {
            // Handle both joined data structure and fallback structure
            const varData = varsMap[log.variable_id];
            if (varData && varData.label) {
              variableLabels[log.variable_id] = varData.label;
            }

            // Determine the source type based on the source field
            let source: string = "manual";
            if (log.source && Array.isArray(log.source)) {
              const sourceValue = log.source[0];
              if (sourceValue === "routine" || sourceValue === "auto") {
                source = sourceValue;
              }
            } else if (log.source === "routine" || log.source === "auto") {
              source = log.source;
            }

            return {
              id: log.id,
              variable_id: log.variable_id,
              value: log.value?.toString() || "0",
              date: format(parseISO(log.date), "yyyy-MM-dd"),
              notes: log.notes,
              source: source,
              created_at: log.created_at,
            };
          });
          allLogs = [...allLogs, ...processedManualLogs];
        }
      }

      console.log(
        "[CorrelationAnalysis] Variable labels mapping:",
        variableLabels
      );
      console.log(
        "[CorrelationAnalysis] Total logs processed:",
        allLogs.length
      );
      console.log("[CorrelationAnalysis] Data breakdown:", {
        oura: allLogs.filter((l) => l.source === "oura").length,
        withings: allLogs.filter((l) => l.source === "withings").length,
        manual: allLogs.filter((l) => l.source === "manual").length,
        routine: allLogs.filter((l) => l.source === "routine").length,
        auto: allLogs.filter((l) => l.source === "auto").length,
      });

      // Debug: Check what variables are being used in correlations
      const uniqueVariables = [
        ...new Set(allLogs.map((log) => log.variable_id)),
      ];
      console.log(
        "[CorrelationAnalysis] Unique variables found:",
        uniqueVariables
      );
      console.log(
        "[CorrelationAnalysis] Variable labels for unique variables:",
        uniqueVariables.map((vid) => ({ id: vid, label: variableLabels[vid] }))
      );

      setLogs(allLogs);
      setVariables(variableLabels);
    } catch (err: any) {
      console.error("Error fetching logs:", err);
      setError(err.message || "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  const isNumeric = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  };

  const hasAllZeroValues = (variableId: string): boolean => {
    const variableLogs = logs.filter(
      (log) => log.variable_id === variableId && isNumeric(log.value)
    );

    if (variableLogs.length === 0) return true;
    return variableLogs.every((log) => parseFloat(log.value) === 0);
  };

  const getNumericVariables = (): string[] => {
    const variableGroups = logs.reduce((acc, log) => {
      if (isNumeric(log.value)) {
        if (!acc[log.variable_id]) {
          acc[log.variable_id] = [];
        }
        acc[log.variable_id].push(parseFloat(log.value));
      }
      return acc;
    }, {} as Record<string, number[]>);

    return Object.keys(variableGroups).filter((variableId) => {
      const values = variableGroups[variableId];
      if (values.length < 3) return false;
      if (hasAllZeroValues(variableId)) return false;

      const firstValue = values[0];
      const hasVariance = values.some((val) => val !== firstValue);
      return hasVariance;
    });
  };

  const calculateCorrelation = (x: number[], y: number[]): number | null => {
    // Input validation
    if (!Array.isArray(x) || !Array.isArray(y)) {
      console.warn("calculateCorrelation: Input must be arrays");
      return null;
    }

    if (x.length !== y.length) {
      console.warn("calculateCorrelation: Arrays must have equal length");
      return null;
    }

    const n = x.length;
    if (n < 2) {
      console.warn(
        "calculateCorrelation: Need at least 2 data points for correlation"
      );
      return null;
    }

    // Check for NaN or undefined values
    const hasInvalidX = x.some((val) => !Number.isFinite(val));
    const hasInvalidY = y.some((val) => !Number.isFinite(val));

    if (hasInvalidX || hasInvalidY) {
      console.warn(
        "calculateCorrelation: Arrays contain NaN or non-finite values"
      );
      return null;
    }

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const meanX = sumX / n;
    const meanY = sumY / n;

    // Calculate variance
    const varianceX = (sumXX - (sumX * sumX) / n) / n;
    const varianceY = (sumYY - (sumY * sumY) / n) / n;

    // Check for zero variance (constant values)
    if (varianceX === 0 && varianceY === 0) {
      console.warn(
        "calculateCorrelation: Both variables have zero variance (constant values)"
      );
      return null; // Correlation is undefined when both variables are constant
    }

    if (varianceX === 0 || varianceY === 0) {
      console.warn(
        "calculateCorrelation: One variable has zero variance (constant values)"
      );
      return null; // Correlation is undefined when one variable is constant
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)
    );

    // Final check for denominator (should not be zero after variance checks, but safety first)
    if (denominator === 0) {
      console.warn(
        "calculateCorrelation: Denominator is zero (undefined correlation)"
      );
      return null;
    }

    const correlation = numerator / denominator;

    // Ensure correlation is within valid range [-1, 1] due to floating point precision
    if (correlation < -1 || correlation > 1) {
      console.warn(
        `calculateCorrelation: Correlation ${correlation} is outside valid range [-1, 1]`
      );
      return Math.max(-1, Math.min(1, correlation)); // Clamp to valid range
    }

    return correlation;
  };

  const getCorrelationStrength = (
    correlation: number | null
  ): "none" | "small" | "medium" | "large" | "undefined" => {
    if (correlation === null) return "undefined";
    const abs = Math.abs(correlation);
    if (abs >= 0.4) return "large"; // Corresponds to Very large/Huge in table
    if (abs >= 0.2) return "medium"; // Corresponds to Medium/Large in table
    if (abs >= 0.1) return "small"; // Corresponds to Small in table
    return "none"; // Corresponds to Very small in table
  };

  const getCorrelationColor = (correlation: number | null): string => {
    if (correlation === null) return "#dc2626"; // Red for undefined/invalid
    const abs = Math.abs(correlation);
    if (abs >= 0.6) return "#10b981"; // Dark Green for higher 'large' correlations (e.g., Huge)
    if (abs >= 0.4) return "#22c55e"; // Light Green for lower 'large' correlations (e.g., Very large)
    if (abs >= 0.2) return "#eab308"; // Yellow for 'medium' correlations (e.g., Medium/Large)
    if (abs >= 0.1) return "#f97316"; // Orange for 'small' correlations (e.g., Small)
    return "#6b7280"; // Gray for 'none' correlations (e.g., Very small)
  };

  const getMatchedDataPoints = (var1: string, var2: string) => {
    const var1Logs = logs.filter(
      (log) => log.variable_id === var1 && isNumeric(log.value)
    );
    const var2Logs = logs.filter(
      (log) => log.variable_id === var2 && isNumeric(log.value)
    );

    const matchedData: {
      date: string;
      var1Value: number;
      var2Value: number;
      var1Date: string;
      var2Date: string;
    }[] = [];

    var1Logs.forEach((log1) => {
      const matchingLog2 = var2Logs.find((log2) => log2.date === log1.date);
      if (matchingLog2) {
        matchedData.push({
          date: log1.date,
          var1Value: parseFloat(log1.value),
          var2Value: parseFloat(matchingLog2.value),
          var1Date: log1.date,
          var2Date: matchingLog2.date,
        });
      }
    });

    return matchedData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  // Calculate linear regression line
  const calculateRegressionLine = (x: number[], y: number[]) => {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...x);
    const maxX = Math.max(...x);

    return {
      slope,
      intercept,
      points: [
        { x: minX, y: slope * minX + intercept },
        { x: maxX, y: slope * maxX + intercept },
      ],
    };
  };

  // Calculate R-squared value
  const calculateRSquared = (x: number[], y: number[]) => {
    const correlation = calculateCorrelation(x, y);
    return correlation === null ? null : Math.pow(correlation, 2);
  };

  // Calculate exact p-value using t-distribution
  const calculatePValue = (
    correlation: number | null,
    n: number
  ): number | null => {
    // Input validation
    if (correlation === null) {
      console.warn("calculatePValue: Correlation is null");
      return null;
    }

    if (!Number.isFinite(correlation)) {
      console.warn("calculatePValue: Correlation is not finite");
      return null;
    }

    if (n < 3) {
      console.warn(
        "calculatePValue: Need at least 3 data points for p-value calculation"
      );
      return null;
    }

    // Handle edge cases
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.9999) {
      // For near-perfect correlations, p-value is essentially 0
      return 0.0001;
    }

    try {
      // Calculate t-statistic: t = r * sqrt((n-2)/(1-r²))
      const numerator = n - 2;
      const denominator = 1 - correlation * correlation;

      if (denominator <= 0) {
        console.warn("calculatePValue: Invalid denominator for t-statistic");
        return null;
      }

      const t = correlation * Math.sqrt(numerator / denominator);

      if (!Number.isFinite(t)) {
        console.warn("calculatePValue: T-statistic is not finite");
        return null;
      }

      const df = n - 2; // degrees of freedom

      // Calculate exact p-value using t-distribution
      const pValue = calculateTDistributionPValue(Math.abs(t), df);

      if (pValue === null || !Number.isFinite(pValue)) {
        console.warn("calculatePValue: P-value calculation failed");
        return null;
      }

      return Math.round(pValue * 100000) / 100000; // Round to 5 decimal places
    } catch (error) {
      console.error("calculatePValue: Unexpected error:", error);
      return null;
    }
  };

  // Calculate p-value for t-distribution using numerical approximation
  const calculateTDistributionPValue = (
    t: number,
    df: number
  ): number | null => {
    if (t < 0 || df <= 0) return null;

    // For very large t-values, p-value is essentially 0
    if (t > 10) return 0.00001;

    // For very small t-values, p-value is essentially 1
    if (t < 0.001) return 0.99999;

    // Use numerical integration to approximate the t-distribution
    // This is a more accurate approximation than the bucket system
    const pValue = integrateTDistribution(t, df);

    return pValue;
  };

  // Numerical integration for t-distribution (two-tailed test)
  const integrateTDistribution = (t: number, df: number): number => {
    // For two-tailed test, we need 2 * (1 - CDF(t))
    // Using a numerical approximation based on Abramowitz and Stegun

    if (df === 1) {
      // Cauchy distribution case
      return 2 * (1 - 0.5 - Math.atan(t) / Math.PI);
    }

    // For df > 1, use approximation
    const x = df / (df + t * t);

    // Beta function approximation
    const beta = 0.5 * Math.log(x) + 0.5 * Math.log(1 - x);
    const logBeta =
      Math.log(Math.sqrt(Math.PI)) +
      logGamma(0.5) +
      logGamma(df / 2) -
      logGamma((df + 1) / 2);

    const incompleteBeta = incompleteBetaFunction(0.5, df / 2, x);

    if (incompleteBeta === null) {
      // Fallback to simpler approximation
      return approximateTDistributionPValue(t, df);
    }

    // Two-tailed p-value
    return 2 * (1 - incompleteBeta);
  };

  // Incomplete beta function approximation
  const incompleteBetaFunction = (
    a: number,
    b: number,
    x: number
  ): number | null => {
    if (x <= 0 || x >= 1 || a <= 0 || b <= 0) return null;

    // Use continued fraction approximation for small x
    if (x < 0.5) {
      return continuedFractionBeta(a, b, x);
    } else {
      // Use symmetry: I_x(a,b) = 1 - I_{1-x}(b,a)
      const result = continuedFractionBeta(b, a, 1 - x);
      return result === null ? null : 1 - result;
    }
  };

  // Continued fraction for beta function
  const continuedFractionBeta = (
    a: number,
    b: number,
    x: number
  ): number | null => {
    const maxIterations = 100;
    const tolerance = 1e-10;

    let h = 1;
    let c = 1;
    let d = 1 - ((a + b) * x) / (a + 1);

    if (Math.abs(d) < tolerance) d = tolerance;
    d = 1 / d;
    let result = d;

    for (let i = 1; i <= maxIterations; i++) {
      const m = i / 2;
      let numerator, denominator;

      if (i % 2 === 0) {
        // Even iteration
        numerator = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
      } else {
        // Odd iteration
        numerator =
          (-(a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
      }

      d = 1 + numerator * d;
      if (Math.abs(d) < tolerance) d = tolerance;
      d = 1 / d;

      c = 1 + numerator / c;
      if (Math.abs(c) < tolerance) c = tolerance;

      h *= d * c;

      if (Math.abs(d * c - 1) < tolerance) break;
    }

    const beta = Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
    return (Math.pow(x, a) * Math.pow(1 - x, b) * h) / (a * beta);
  };

  // Fallback approximation for t-distribution p-value
  const approximateTDistributionPValue = (t: number, df: number): number => {
    // Simple but reasonably accurate approximation
    // Based on normal approximation for large df, with correction for small df

    if (df >= 30) {
      // Normal approximation for large degrees of freedom
      const z = t;
      return 2 * (1 - normalCDF(z));
    } else {
      // Correction for small degrees of freedom
      const correction = 1 + (t * t) / (2 * df);
      const z = t / Math.sqrt(correction);
      return 2 * (1 - normalCDF(z));
    }
  };

  // Natural logarithm of gamma function approximation
  const logGamma = (z: number): number => {
    // Lanczos approximation for log gamma
    const g = 5;
    const p = [
      1.000000000190015, 76.18009172947146, -86.50532032941677,
      24.01409824083091, -1.231739572450155, 0.1208650973866179e-2,
      -0.5395239384953e-5,
    ];

    let x = z;
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;

    for (let i = 1; i <= 6; i++) {
      y += 1;
      ser += p[i] / y;
    }

    return -tmp + Math.log((2.5066282746310005 * ser) / x);
  };

  // Normal cumulative distribution function approximation
  const normalCDF = (z: number): number => {
    // Abramowitz and Stegun approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z >= 0 ? 1 : -1;
    const absZ = Math.abs(z);

    const t = 1 / (1 + p * absZ);
    const y =
      1 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
        t *
        Math.exp(-absZ * absZ);

    return 0.5 * (1 + sign * y);
  };

  // Legacy function for backward compatibility (now uses the new calculation)
  const estimatePValue = (correlation: number | null, n: number) => {
    const pValue = calculatePValue(correlation, n);
    return pValue !== null ? pValue : 1;
  };

  // Calculate confidence interval for correlation using Fisher's Z transformation
  const calculateConfidenceInterval = (
    correlation: number | null,
    n: number
  ) => {
    // Input validation
    if (correlation === null) {
      console.warn("calculateConfidenceInterval: Correlation is null");
      return { lower: null, upper: null };
    }

    if (!Number.isFinite(correlation)) {
      console.warn("calculateConfidenceInterval: Correlation is not finite");
      return { lower: null, upper: null };
    }

    if (n < 4) {
      console.warn(
        "calculateConfidenceInterval: Need at least 4 data points for reliable confidence interval"
      );
      return { lower: null, upper: null };
    }

    // Handle edge cases where correlation = ±1
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.9999) {
      console.warn(
        "calculateConfidenceInterval: Correlation too close to ±1 for reliable confidence interval"
      );
      // For correlations very close to ±1, return conservative bounds
      if (correlation > 0) {
        return { lower: 0.95, upper: 1.0 };
      } else {
        return { lower: -1.0, upper: -0.95 };
      }
    }

    try {
      // Fisher's Z transformation: z = 0.5 * ln((1+r)/(1-r))
      // Check denominators before taking logarithm
      const numerator = 1 + correlation;
      const denominator = 1 - correlation;

      if (denominator <= 0 || numerator <= 0) {
        console.warn(
          "calculateConfidenceInterval: Invalid values for Fisher transformation"
        );
        return { lower: null, upper: null };
      }

      const z = 0.5 * Math.log(numerator / denominator);

      if (!Number.isFinite(z)) {
        console.warn(
          "calculateConfidenceInterval: Fisher Z transformation resulted in non-finite value"
        );
        return { lower: null, upper: null };
      }

      // Standard error: SE = 1/sqrt(n-3)
      const se = 1 / Math.sqrt(n - 3);

      if (!Number.isFinite(se) || se <= 0) {
        console.warn("calculateConfidenceInterval: Invalid standard error");
        return { lower: null, upper: null };
      }

      // 95% confidence interval: z ± 1.96 * SE
      const zLower = z - 1.96 * se;
      const zUpper = z + 1.96 * se;

      // Transform back to correlation scale: r = (e^(2z) - 1) / (e^(2z) + 1)
      const exp2zLower = Math.exp(2 * zLower);
      const exp2zUpper = Math.exp(2 * zUpper);

      // Check for overflow/underflow in exponential
      if (!Number.isFinite(exp2zLower) || !Number.isFinite(exp2zUpper)) {
        console.warn(
          "calculateConfidenceInterval: Exponential transformation overflow"
        );
        return { lower: null, upper: null };
      }

      const lower = (exp2zLower - 1) / (exp2zLower + 1);
      const upper = (exp2zUpper - 1) / (exp2zUpper + 1);

      // Validate final results
      if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
        console.warn(
          "calculateConfidenceInterval: Final confidence bounds are not finite"
        );
        return { lower: null, upper: null };
      }

      // Ensure bounds are within valid correlation range [-1, 1]
      const clampedLower = Math.max(-1, Math.min(1, lower));
      const clampedUpper = Math.max(-1, Math.min(1, upper));

      // Ensure lower <= upper (should always be true, but safety check)
      if (clampedLower > clampedUpper) {
        console.warn(
          "calculateConfidenceInterval: Lower bound greater than upper bound"
        );
        return { lower: null, upper: null };
      }

      return {
        lower: Math.round(clampedLower * 10000) / 10000, // Round to 4 decimal places
        upper: Math.round(clampedUpper * 10000) / 10000,
      };
    } catch (error) {
      console.error("calculateConfidenceInterval: Unexpected error:", error);
      return { lower: null, upper: null };
    }
  };

  const handleRowToggle = (variable1: string, variable2: string) => {
    const key = `${variable1}-${variable2}`;
    setExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Function to generate chart data for any correlation pair
  const getChartDataForCorrelation = (variable1: string, variable2: string) => {
    const matchedData = getMatchedDataPoints(variable1, variable2);
    if (matchedData.length < 3) return null;

    const x = matchedData.map((d) => d.var1Value);
    const y = matchedData.map((d) => d.var2Value);
    const correlation = calculateCorrelation(x, y);

    // Return null if correlation calculation failed
    if (correlation === null) return null;

    const regressionLine = calculateRegressionLine(x, y);

    const chartData = {
      datasets: [
        {
          label: `${getVariableDisplayName(
            variable1
          )} vs ${getVariableDisplayName(variable2)}`,
          data: matchedData.map((d) => ({
            x: d.var1Value,
            y: d.var2Value,
            date: d.date,
            var1Date: d.var1Date,
            var2Date: d.var2Date,
          })),
          backgroundColor: getCorrelationColor(correlation),
          borderColor: getCorrelationColor(correlation),
          pointRadius: 5,
          pointHoverRadius: 7,
          type: "scatter" as const,
          showLine: false,
        },
        {
          label: "Trend Line",
          data: regressionLine.points,
          backgroundColor: "rgba(255, 255, 255, 0)",
          borderColor: getCorrelationColor(correlation),
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 0,
          type: "line" as const,
          showLine: true,
          tension: 0,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 0,
      layout: {
        padding: {
          left: 10,
          right: 10,
          top: 10,
          bottom: 20,
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            filter: function (legendItem: any) {
              return legendItem.text !== "Trend Line";
            },
          },
        },
        tooltip: {
          mode: "nearest" as const,
          intersect: false,
          callbacks: {
            label: function (context: any) {
              if (context.datasetIndex === 1) return [];
              const dataPoint = context.raw;
              return [
                `${getVariableDisplayName(variable1)}: ${dataPoint.x}`,
                `${getVariableDisplayName(variable2)}: ${dataPoint.y}`,
                `Date: ${format(parseISO(dataPoint.date), "MMM dd, yyyy")}`,
              ];
            },
            title: function (context: any) {
              if (context[0]?.datasetIndex === 1) return "";
              return "Data Point";
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: getVariableDisplayName(variable1),
            font: { size: 12 },
            padding: { top: 10 },
          },
          ticks: {
            font: { size: 11 },
            padding: 5,
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: getVariableDisplayName(variable2),
            font: { size: 12 },
            padding: { bottom: 10 },
          },
          ticks: {
            font: { size: 11 },
            padding: 5,
          },
        },
      },
      interaction: {
        mode: "nearest" as const,
        axis: "xy" as const,
        intersect: false,
      },
    };

    return {
      chartData,
      chartOptions,
      correlation,
      matchedData,
      regressionLine,
    };
  };

  // Calculate all correlations
  const allCorrelations = useMemo(() => {
    const numericVariables = getNumericVariables();
    const correlations: CorrelationResult[] = [];

    for (let i = 0; i < numericVariables.length; i++) {
      for (let j = i + 1; j < numericVariables.length; j++) {
        const var1 = numericVariables[i];
        const var2 = numericVariables[j];
        const matchedData = getMatchedDataPoints(var1, var2);

        if (matchedData.length >= 3) {
          const x = matchedData.map((d) => d.var1Value);
          const y = matchedData.map((d) => d.var2Value);
          const correlation = calculateCorrelation(x, y);

          // Skip if correlation calculation failed
          if (correlation === null) {
            console.warn(
              `Skipping correlation between ${var1} and ${var2}: calculation failed`
            );
            continue;
          }

          const pValue = calculatePValue(correlation, matchedData.length);

          // Apply filters
          const minStrength = parseFloat(minCorrelationStrength);
          if (Math.abs(correlation) < minStrength) continue;
          if (showOnlySignificant && pValue !== null && pValue >= 0.05)
            continue;

          correlations.push({
            variable1: var1,
            variable2: var2,
            correlation: Math.round(correlation * 1000) / 1000,
            strength: getCorrelationStrength(correlation),
            direction: correlation > 0 ? "positive" : "negative",
            dataPoints: matchedData.length,
            pValue: pValue,
            rSquared: Math.pow(correlation, 2),
          });
        }
      }
    }

    return correlations.sort((a, b) => {
      const absA = a.correlation !== null ? Math.abs(a.correlation) : 0;
      const absB = b.correlation !== null ? Math.abs(b.correlation) : 0;
      return absB - absA;
    });
  }, [logs, minCorrelationStrength, showOnlySignificant]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}. Unable to load data from all sources for correlation analysis.
      </Alert>
    );
  }

  const numericVariables = getNumericVariables();

  if (numericVariables.length < 2) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        You need at least 2 numeric variables to perform correlation analysis.
        Start tracking more different types of data across all sources (manual,
        Oura, Withings, etc.) to see correlations!
      </Alert>
    );
  }

  const handleTimeRangeChange = (event: any) => {
    setTimeRange(event.target.value);
    const daysAgo = parseInt(event.target.value, 10);
    const ninetyDaysAgo = subDays(new Date(), daysAgo);
    setStartDate(format(ninetyDaysAgo, "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    fetchManualLogs(); // Re-fetch data based on new date range
  };

  const handleVar1Change = (event: any) => {
    setSelectedVar1(event.target.value);
  };

  const handleVar2Change = (event: any) => {
    setSelectedVar2(event.target.value);
  };

  return (
    <Box>
      {/* Date Range Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Date Range Filter
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: 150 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={fetchManualLogs}
              startIcon={<FaSyncAlt />}
              disabled={loading}
            >
              Refresh Data
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Filter Controls */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          Filter Correlations
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Min Strength</InputLabel>
            <Select
              value={minCorrelationStrength}
              label="Min Strength"
              onChange={(e) => setMinCorrelationStrength(e.target.value)}
            >
              <MenuItem value="0.0">Any (0.0+)</MenuItem>
              <MenuItem value="0.1">Weak+ (0.1+)</MenuItem>
              <MenuItem value="0.3">Moderate+ (0.3+)</MenuItem>
              <MenuItem value="0.7">Strong+ (0.7+)</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <input
                type="checkbox"
                checked={showOnlySignificant}
                onChange={(e) => setShowOnlySignificant(e.target.checked)}
                id="significant-only"
              />
              <label htmlFor="significant-only">
                <Typography variant="body2">
                  Show only significant (p &lt; 0.05)
                </Typography>
              </label>
            </Box>
          </FormControl>
        </Box>
      </Box>

      {/* Main Correlation Table */}
      {allCorrelations.length > 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" component="h4" gutterBottom>
              Correlation Results ({allCorrelations.length} correlations found)
            </Typography>

            {/* Correlation Summary */}
            {allCorrelations.length > 0 && (
              <Card variant="outlined" sx={{ mb: 3, bgcolor: "#f8f9fa" }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography
                    variant="subtitle2"
                    gutterBottom
                    sx={{ fontWeight: 600, color: "primary.main" }}
                  >
                    📈 Correlation Summary
                  </Typography>
                  <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Correlations:
                      </Typography>
                      <Typography variant="h6">
                        {allCorrelations.length}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Large Correlations:
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {
                          allCorrelations.filter((c) => c.strength === "large")
                            .length
                        }
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Significant (p &lt; 0.05):
                      </Typography>
                      <Typography variant="h6" color="info.main">
                        {
                          allCorrelations.filter(
                            (c) =>
                              c.pValue !== null &&
                              c.pValue !== undefined &&
                              c.pValue < 0.05
                          ).length
                        }
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Average R²:
                      </Typography>
                      <Typography variant="h6" color="secondary.main">
                        {(
                          allCorrelations.reduce(
                            (sum, c) => sum + (c.rSquared || 0),
                            0
                          ) / allCorrelations.length
                        ).toFixed(3)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell>
                      <strong>Variable 1</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Variable 2</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Correlation</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Strength (★ = Significant)</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Data Points</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allCorrelations.map((corr, index) => {
                    const isExpanded =
                      expandedRows[`${corr.variable1}-${corr.variable2}`];
                    const chartData = isExpanded
                      ? getChartDataForCorrelation(
                          corr.variable1,
                          corr.variable2
                        )
                      : null;

                    return (
                      <React.Fragment key={index}>
                        <TableRow
                          hover
                          onClick={() =>
                            handleRowToggle(corr.variable1, corr.variable2)
                          }
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell>
                            <IconButton size="small">
                              {isExpanded ? (
                                <FaCompressArrowsAlt />
                              ) : (
                                <FaExpandArrowsAlt />
                              )}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            {createVariableLink(
                              corr.variable1,
                              getVariableDisplayName(corr.variable1)
                            )}
                          </TableCell>
                          <TableCell>
                            {createVariableLink(
                              corr.variable2,
                              getVariableDisplayName(corr.variable2)
                            )}
                          </TableCell>
                          <TableCell
                            align="right"
                            onClick={() =>
                              handleRowToggle(corr.variable1, corr.variable2)
                            }
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: 0.5,
                              }}
                            >
                              {corr.direction === "positive" ? (
                                <TrendingUpIcon
                                  fontSize="small"
                                  color="success"
                                />
                              ) : (
                                <TrendingDownIcon
                                  fontSize="small"
                                  color="error"
                                />
                              )}
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: "bold",
                                  color: getCorrelationColor(corr.correlation),
                                }}
                              >
                                {corr.correlation}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell
                            align="right"
                            onClick={() =>
                              handleRowToggle(corr.variable1, corr.variable2)
                            }
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: 1,
                              }}
                            >
                              <Chip
                                label={corr.strength}
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontSize: "0.75rem",
                                  color: getCorrelationColor(corr.correlation),
                                  borderColor: getCorrelationColor(
                                    corr.correlation
                                  ),
                                  fontWeight: "bold",
                                }}
                              />
                              {(() => {
                                const pValue = corr.pValue;
                                return pValue !== null &&
                                  pValue !== undefined &&
                                  pValue < 0.05 ? (
                                  <Chip
                                    label="★"
                                    size="small"
                                    color="success"
                                    sx={{
                                      fontSize: "0.6rem",
                                      minWidth: "auto",
                                    }}
                                  />
                                ) : null;
                              })()}
                            </Box>
                          </TableCell>
                          <TableCell>{corr.dataPoints}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell
                            style={{ paddingBottom: 0, paddingTop: 0 }}
                            colSpan={6}
                          >
                            <Collapse
                              in={isExpanded}
                              timeout="auto"
                              unmountOnExit
                            >
                              <Box sx={{ margin: 2 }}>
                                {chartData ? (
                                  <>
                                    <Alert
                                      severity="info"
                                      icon={<InfoIcon />}
                                      sx={{ mb: 2, bgcolor: "#e3f2fd" }}
                                    >
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600, mb: 0.5 }}
                                      >
                                        Understanding Correlation (r ={" "}
                                        {corr.correlation !== null
                                          ? corr.correlation.toFixed(3)
                                          : "undefined"}
                                        ):
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        component="div"
                                      >
                                        •{" "}
                                        <strong>
                                          Correlation ≠ Causation:
                                        </strong>{" "}
                                        A correlation doesn't mean one variable
                                        causes the other
                                        <br />• <strong>Range:</strong> Values
                                        from -1 (perfect negative) to +1
                                        (perfect positive)
                                        <br />• <strong>Strength:</strong>{" "}
                                        |0.7+| = strong, |0.3-0.7| = moderate,
                                        |0.1-0.3| = weak
                                        <br />• <strong>Trend Line:</strong> The
                                        dashed line shows the linear
                                        relationship direction
                                        <br />•{" "}
                                        <strong>Hover Data Points:</strong> See
                                        exact values and measurement dates
                                        <br />• <strong>
                                          Confounding:
                                        </strong>{" "}
                                        Other variables may influence both
                                        measurements
                                      </Typography>
                                    </Alert>

                                    {/* Statistical Insights Panel */}
                                    {(() => {
                                      const x = chartData.matchedData.map(
                                        (d) => d.var1Value
                                      );
                                      const y = chartData.matchedData.map(
                                        (d) => d.var2Value
                                      );
                                      const rSquared = calculateRSquared(x, y);
                                      const pValue = corr.pValue;
                                      const confidenceInterval =
                                        calculateConfidenceInterval(
                                          corr.correlation,
                                          chartData.matchedData.length
                                        );
                                      const regressionLine =
                                        calculateRegressionLine(x, y);

                                      return (
                                        <Card
                                          variant="outlined"
                                          sx={{ mb: 2, bgcolor: "#fafafa" }}
                                        >
                                          <CardContent sx={{ py: 2 }}>
                                            <Typography
                                              variant="subtitle2"
                                              gutterBottom
                                              sx={{
                                                fontWeight: 600,
                                                color: "primary.main",
                                              }}
                                            >
                                              📊 Statistical Analysis
                                            </Typography>
                                            <Box
                                              sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 1,
                                              }}
                                            >
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  justifyContent:
                                                    "space-between",
                                                  alignItems: "center",
                                                }}
                                              >
                                                <Typography variant="body2">
                                                  R-squared (Explained
                                                  Variance):
                                                </Typography>
                                                <Chip
                                                  label={`${
                                                    rSquared !== null
                                                      ? (
                                                          rSquared * 100
                                                        ).toFixed(1)
                                                      : "N/A"
                                                  }%`}
                                                  size="small"
                                                  color="info"
                                                />
                                              </Box>
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  justifyContent:
                                                    "space-between",
                                                  alignItems: "center",
                                                }}
                                              >
                                                <Typography variant="body2">
                                                  Statistical Significance:
                                                </Typography>
                                                <Chip
                                                  label={
                                                    pValue !== null &&
                                                    pValue !== undefined &&
                                                    pValue < 0.05
                                                      ? "Significant"
                                                      : "Not Significant"
                                                  }
                                                  size="small"
                                                  color={
                                                    pValue !== null &&
                                                    pValue !== undefined &&
                                                    pValue < 0.05
                                                      ? "success"
                                                      : "warning"
                                                  }
                                                />
                                              </Box>
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  justifyContent:
                                                    "space-between",
                                                  alignItems: "center",
                                                }}
                                              >
                                                <Typography variant="body2">
                                                  95% Confidence Interval:
                                                </Typography>
                                                <Typography
                                                  variant="body2"
                                                  sx={{
                                                    fontFamily: "monospace",
                                                  }}
                                                >
                                                  [
                                                  {confidenceInterval.lower !==
                                                  null
                                                    ? confidenceInterval.lower.toFixed(
                                                        3
                                                      )
                                                    : "N/A"}
                                                  ,{" "}
                                                  {confidenceInterval.upper !==
                                                  null
                                                    ? confidenceInterval.upper.toFixed(
                                                        3
                                                      )
                                                    : "N/A"}
                                                  ]
                                                </Typography>
                                              </Box>
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  justifyContent:
                                                    "space-between",
                                                  alignItems: "center",
                                                }}
                                              >
                                                <Typography variant="body2">
                                                  Regression Equation:
                                                </Typography>
                                                <Typography
                                                  variant="body2"
                                                  sx={{
                                                    fontFamily: "monospace",
                                                  }}
                                                >
                                                  y ={" "}
                                                  {regressionLine.slope.toFixed(
                                                    3
                                                  )}
                                                  x +{" "}
                                                  {regressionLine.intercept.toFixed(
                                                    3
                                                  )}
                                                </Typography>
                                              </Box>
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  justifyContent:
                                                    "space-between",
                                                  alignItems: "center",
                                                }}
                                              >
                                                <Typography variant="body2">
                                                  Data Quantity:
                                                </Typography>
                                                <Chip
                                                  label={
                                                    chartData.matchedData
                                                      .length >= 10
                                                      ? "Sufficient"
                                                      : chartData.matchedData
                                                          .length >= 5
                                                      ? "Moderate"
                                                      : "Limited"
                                                  }
                                                  size="small"
                                                  color={
                                                    chartData.matchedData
                                                      .length >= 10
                                                      ? "success"
                                                      : chartData.matchedData
                                                          .length >= 5
                                                      ? "warning"
                                                      : "error"
                                                  }
                                                />
                                              </Box>
                                            </Box>
                                          </CardContent>
                                        </Card>
                                      );
                                    })()}
                                    <Card>
                                      <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                          {getVariableDisplayName(
                                            corr.variable1
                                          )}{" "}
                                          vs{" "}
                                          {getVariableDisplayName(
                                            corr.variable2
                                          )}
                                        </Typography>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            gap: 1,
                                            mb: 2,
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          <Chip
                                            label={`Correlation: ${
                                              corr.correlation !== null
                                                ? corr.correlation
                                                : "undefined"
                                            }`}
                                            size="small"
                                            sx={{
                                              bgcolor: getCorrelationColor(
                                                corr.correlation
                                              ),
                                              color: "white",
                                            }}
                                          />
                                          <Chip
                                            label={`${getCorrelationStrength(
                                              corr.correlation
                                            )} ${
                                              corr.correlation !== null &&
                                              corr.correlation > 0
                                                ? "Positive"
                                                : corr.correlation !== null &&
                                                  corr.correlation < 0
                                                ? "Negative"
                                                : "Undefined"
                                            }`}
                                            size="small"
                                            variant="outlined"
                                          />
                                          <Chip
                                            label={`${chartData.matchedData.length} data points`}
                                            size="small"
                                            color="primary"
                                          />
                                          {(() => {
                                            const x = chartData.matchedData.map(
                                              (d) => d.var1Value
                                            );
                                            const y = chartData.matchedData.map(
                                              (d) => d.var2Value
                                            );
                                            const regressionLine =
                                              calculateRegressionLine(x, y);
                                            const rSquared = calculateRSquared(
                                              x,
                                              y
                                            );
                                            const pValue = corr.pValue;
                                            const confidenceInterval =
                                              calculateConfidenceInterval(
                                                corr.correlation,
                                                chartData.matchedData.length
                                              );

                                            return (
                                              <>
                                                <Chip
                                                  label={`R² = ${
                                                    rSquared !== null
                                                      ? rSquared.toFixed(3)
                                                      : "N/A"
                                                  }`}
                                                  size="small"
                                                  variant="outlined"
                                                  color="info"
                                                />
                                                <Chip
                                                  label={`p = ${
                                                    pValue === null ||
                                                    pValue === undefined
                                                      ? "N/A"
                                                      : pValue < 0.00001
                                                      ? "< 0.00001"
                                                      : pValue < 0.001
                                                      ? pValue.toFixed(5)
                                                      : pValue < 0.01
                                                      ? pValue.toFixed(4)
                                                      : pValue.toFixed(3)
                                                  }`}
                                                  size="small"
                                                  variant="outlined"
                                                  color={
                                                    pValue === null ||
                                                    pValue === undefined
                                                      ? "default"
                                                      : pValue < 0.001
                                                      ? "error"
                                                      : pValue < 0.01
                                                      ? "warning"
                                                      : pValue < 0.05
                                                      ? "success"
                                                      : "default"
                                                  }
                                                />
                                                <Chip
                                                  label={`95% CI: [${
                                                    confidenceInterval.lower !==
                                                    null
                                                      ? confidenceInterval.lower.toFixed(
                                                          3
                                                        )
                                                      : "N/A"
                                                  }, ${
                                                    confidenceInterval.upper !==
                                                    null
                                                      ? confidenceInterval.upper.toFixed(
                                                          3
                                                        )
                                                      : "N/A"
                                                  }]`}
                                                  size="small"
                                                  variant="outlined"
                                                  color="secondary"
                                                />
                                              </>
                                            );
                                          })()}
                                        </Box>
                                        <Box
                                          sx={{
                                            height: 400,
                                            width: "100%",
                                            position: "relative",
                                          }}
                                        >
                                          <Chart
                                            type="scatter"
                                            data={chartData.chartData as any}
                                            options={
                                              chartData.chartOptions as any
                                            }
                                          />
                                        </Box>
                                      </CardContent>
                                    </Card>
                                  </>
                                ) : (
                                  <Alert severity="info">
                                    Not enough data points to display chart for
                                    this correlation.
                                  </Alert>
                                )}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info">
          No significant correlations found with current data. Try tracking more
          data points for your variables!
        </Alert>
      )}
    </Box>
  );
}
