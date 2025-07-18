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
  correlation: number;
  strength: "strong" | "moderate" | "weak" | "none";
  direction: "positive" | "negative";
  dataPoints: number;
  pValue?: number;
  rSquared?: number;
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
      return (
        variables[variableId] ||
        variableId.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      );
    }

    if (isWithingsVariable(variableId)) {
      return (
        variables[variableId] ||
        variableId.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      );
    }

    return variables[variableId] || variableId;
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

      // Fetch manual logs and variables separately for reliable data loading
      const [logsResponse, variablesResponse] = await Promise.all([
        supabase
          .from("data_points")
          .select("*")
          .eq("user_id", userId)
          .gte("date", startDateTime)
          .lte("date", endDateTime)
          .order("date", { ascending: false }),
        supabase.from("variables").select("id, label"),
      ]);

      const { data: rawManualLogs, error: manualError } = logsResponse;
      const { data: variablesData, error: variablesError } = variablesResponse;

      // Check for errors
      if (manualError) {
        throw new Error(`Manual logs: ${manualError.message}`);
      }
      if (variablesError) {
        throw new Error(`Variables: ${variablesError.message}`);
      }

      // Create a variables lookup map for joining data
      const varsMap =
        variablesData?.reduce(
          (acc: any, v: any) => ({ ...acc, [v.id]: v }),
          {}
        ) || {};

      // Join the data in JavaScript (more reliable than database joins)
      const manualLogsResult =
        rawManualLogs?.map((log: any) => ({
          ...log,
          variables: varsMap[log.variable_id]
            ? { label: varsMap[log.variable_id].label }
            : null,
        })) || [];

      // Fetch Oura logs
      const { data: ouraLogsResult, error: ouraError } = await supabase
        .from("oura_variable_data_points")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });
      if (ouraError) {
        throw new Error(`Oura logs: ${ouraError.message}`);
      }

      // Fetch Withings logs
      const { data: withingsLogsResult, error: withingsError } = await supabase
        .from("withings_variable_data_points")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });
      if (withingsError) {
        throw new Error(`Withings logs: ${withingsError.message}`);
      }

      let allLogs: ManualLog[] = [];
      const variableLabels: Record<string, string> = {};

      // Process manual logs
      if (manualLogsResult) {
        const processedManualLogs = manualLogsResult.map((log: any) => {
          // Handle both joined data structure and fallback structure
          const variableLabel = log.variables?.label || log.variable_label;
          if (variableLabel) {
            variableLabels[log.variable_id] = variableLabel;
          }

          return {
            id: log.id,
            variable_id: log.variable_id,
            value: log.value,
            date: format(parseISO(log.date), "yyyy-MM-dd"),
            notes: log.notes,
            source: "manual",
            created_at: log.created_at,
          };
        });
        allLogs = [...allLogs, ...processedManualLogs];
      }

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

          variableLabels[log.variable_id] =
            ouraLabels[log.variable_id] || log.variable_id;

          return {
            id: `oura_${log.id}`,
            variable_id: log.variable_id,
            value: log.value,
            date: log.date,
            notes: "Oura Ring data",
            source: "oura",
            created_at: log.created_at,
          };
        });
        allLogs = [...allLogs, ...processedOuraLogs];
      }

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

          variableLabels[log.variable] =
            withingsLabels[log.variable] || log.variable;

          return {
            id: `withings_${log.id}`,
            variable_id: log.variable,
            value: log.value,
            date: log.date,
            notes: "Withings data",
            source: "withings",
            created_at: log.created_at,
          };
        });
        allLogs = [...allLogs, ...processedWithingsLogs];
      }

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

  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  };

  const getCorrelationStrength = (
    correlation: number
  ): "strong" | "moderate" | "weak" | "none" => {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return "strong";
    if (abs >= 0.3) return "moderate";
    if (abs >= 0.1) return "weak";
    return "none";
  };

  const getCorrelationColor = (correlation: number): string => {
    const abs = Math.abs(correlation);
    if (abs >= 0.8) return "#10b981"; // Strong: Green
    if (abs >= 0.6) return "#22c55e"; // Strong: Light Green
    if (abs >= 0.4) return "#eab308"; // Moderate: Yellow
    if (abs >= 0.2) return "#f97316"; // Weak: Orange
    return "#6b7280"; // Very Weak: Gray
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
    return Math.pow(correlation, 2);
  };

  // Estimate p-value using t-test approximation
  const estimatePValue = (correlation: number, n: number) => {
    if (n < 3) return 1;

    const t =
      correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const df = n - 2;

    // Simple approximation - for more accuracy, use proper t-distribution
    if (Math.abs(t) > 3.5) return 0.001;
    if (Math.abs(t) > 2.8) return 0.01;
    if (Math.abs(t) > 2.0) return 0.05;
    if (Math.abs(t) > 1.7) return 0.1;
    return 0.5;
  };

  // Calculate confidence interval for correlation
  const calculateConfidenceInterval = (correlation: number, n: number) => {
    if (n < 3) return { lower: -1, upper: 1 };

    const z = 0.5 * Math.log((1 + correlation) / (1 - correlation));
    const se = 1 / Math.sqrt(n - 3);
    const zLower = z - 1.96 * se;
    const zUpper = z + 1.96 * se;

    const lower = (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1);
    const upper = (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1);

    return { lower, upper };
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
          const pValue = estimatePValue(correlation, matchedData.length);

          // Apply filters
          const minStrength = parseFloat(minCorrelationStrength);
          if (Math.abs(correlation) < minStrength) continue;
          if (showOnlySignificant && pValue >= 0.05) continue;

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

    return correlations.sort(
      (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)
    );
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

      {/* Analysis Controls */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h6" component="h4">
          Variable Analysis Settings
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={handleTimeRangeChange}
            >
              <MenuItem value="30">Last 30 days</MenuItem>
              <MenuItem value="90">Last 90 days</MenuItem>
              <MenuItem value="180">Last 6 months</MenuItem>
              <MenuItem value="365">Last year</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Variable 1</InputLabel>
            <Select
              value={selectedVar1}
              label="Variable 1"
              onChange={handleVar1Change}
            >
              {numericVariables.map((variable) => (
                <MenuItem key={variable} value={variable}>
                  <VariableLinkSimple
                    variableId={variable}
                    variables={variables}
                    variant="inherit"
                    underline={false}
                    onClick={() => {}} // Prevent navigation when in dropdown
                    forceAsText={true}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Variable 2</InputLabel>
            <Select
              value={selectedVar2}
              label="Variable 2"
              onChange={handleVar2Change}
            >
              {numericVariables
                .filter((v) => v !== selectedVar1)
                .map((variable) => (
                  <MenuItem key={variable} value={variable}>
                    <VariableLinkSimple
                      variableId={variable}
                      variables={variables}
                      variant="inherit"
                      underline={false}
                      onClick={() => {}} // Prevent navigation when in dropdown
                      forceAsText={true}
                    />
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

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

      {/* Data Source Breakdown */}
      {logs.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Card variant="outlined">
            <CardContent sx={{ py: 2 }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                color="textSecondary"
              >
                Data Sources Included in Analysis
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Chip
                  label={`Manual: ${
                    logs.filter((log) => !log.source || log.source === "manual")
                      .length
                  }`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`Oura: ${
                    logs.filter((log) => log.source === "oura").length
                  }`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
                <Chip
                  label={`Withings: ${
                    logs.filter((log) => log.source === "withings").length
                  }`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
                <Chip
                  label={`Total: ${logs.length} data points`}
                  size="small"
                  color="default"
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

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
                        Strong Correlations:
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {
                          allCorrelations.filter((c) => c.strength === "strong")
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
                            (c) => c.pValue && c.pValue < 0.05
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
                                const pValue = estimatePValue(
                                  corr.correlation,
                                  corr.dataPoints
                                );
                                return pValue < 0.05 ? (
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
                                        {corr.correlation.toFixed(3)}):
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
                                      const pValue = estimatePValue(
                                        corr.correlation,
                                        chartData.matchedData.length
                                      );
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
                                                  label={`${(
                                                    rSquared * 100
                                                  ).toFixed(1)}%`}
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
                                                    pValue < 0.05
                                                      ? "Significant"
                                                      : "Not Significant"
                                                  }
                                                  size="small"
                                                  color={
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
                                                  {confidenceInterval.lower.toFixed(
                                                    3
                                                  )}
                                                  ,{" "}
                                                  {confidenceInterval.upper.toFixed(
                                                    3
                                                  )}
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
                                                  Data Quality:
                                                </Typography>
                                                <Chip
                                                  label={
                                                    chartData.matchedData
                                                      .length >= 10
                                                      ? "Good"
                                                      : chartData.matchedData
                                                          .length >= 5
                                                      ? "Fair"
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
                                            label={`Correlation: ${corr.correlation}`}
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
                                              corr.correlation > 0
                                                ? "Positive"
                                                : "Negative"
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
                                            const pValue = estimatePValue(
                                              corr.correlation,
                                              chartData.matchedData.length
                                            );
                                            const confidenceInterval =
                                              calculateConfidenceInterval(
                                                corr.correlation,
                                                chartData.matchedData.length
                                              );

                                            return (
                                              <>
                                                <Chip
                                                  label={`R² = ${rSquared.toFixed(
                                                    3
                                                  )}`}
                                                  size="small"
                                                  variant="outlined"
                                                  color="info"
                                                />
                                                <Chip
                                                  label={`p < ${
                                                    pValue < 0.001
                                                      ? "0.001"
                                                      : pValue.toFixed(3)
                                                  }`}
                                                  size="small"
                                                  variant="outlined"
                                                  color={
                                                    pValue < 0.05
                                                      ? "success"
                                                      : "warning"
                                                  }
                                                />
                                                <Chip
                                                  label={`95% CI: [${confidenceInterval.lower.toFixed(
                                                    3
                                                  )}, ${confidenceInterval.upper.toFixed(
                                                    3
                                                  )}]`}
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
