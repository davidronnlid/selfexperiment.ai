import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Grid,
  IconButton,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { supabase } from "@/utils/supaBase";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  getOuraVariableLabel,
  isOuraVariable,
} from "@/utils/ouraVariableUtils";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import InfoIcon from "@mui/icons-material/Info";
import WarningIcon from "@mui/icons-material/Warning";
import { VariableLinkSimple } from "./VariableLink";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

interface ManualLog {
  id: number | string;
  date: string;
  variable_id: string;
  value: string;
  notes?: string;
  created_at: string;
  source?: string; // Added source field
}

interface CorrelationAnalysisProps {
  userId: string;
}

interface CorrelationResult {
  variable1: string;
  variable2: string;
  correlation: number;
  strength: "strong" | "moderate" | "weak" | "none";
  direction: "positive" | "negative";
  dataPoints: number;
}

export default function CorrelationAnalysis({
  userId,
}: CorrelationAnalysisProps) {
  const [logs, setLogs] = useState<ManualLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("90");
  const [selectedVar1, setSelectedVar1] = useState<string>("");
  const [selectedVar2, setSelectedVar2] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [variables, setVariables] = useState<Record<string, string>>({}); // variable_id -> label
  const [showExplanation, setShowExplanation] = useState(false); // Toggle for explanation
  const [showCorrelationAnalysis, setShowCorrelationAnalysis] = useState(true); // Toggle for correlation section

  // Helper function to get the best display name for any variable
  const getVariableDisplayName = (variableId: string): string => {
    // First check if it's an Oura variable
    if (isOuraVariable(variableId)) {
      return getOuraVariableLabel(variableId);
    }
    // Then check if we have it in our variables mapping
    return variables[variableId] || variableId;
  };

  useEffect(() => {
    // Fetch all variables for mapping
    async function fetchVariables() {
      const { data, error } = await supabase
        .from("variables")
        .select("id, label");
      if (!error && data) {
        const map: Record<string, string> = {};
        data.forEach((v: any) => {
          map[v.id] = v.label;
        });
        setVariables(map);
      }
    }
    fetchVariables();
  }, []);

  useEffect(() => {
    fetchManualLogs();
  }, [userId, timeRange]);

  useEffect(() => {
    if (logs.length > 0 && !selectedVar1) {
      const numericVariables = getNumericVariables();
      if (numericVariables.length >= 2) {
        setSelectedVar1(numericVariables[0]);
        setSelectedVar2(numericVariables[1]);
      }
    }
  }, [logs, selectedVar1]);

  const fetchManualLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const daysBack = parseInt(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const cutoffDateString = cutoffDate.toISOString();

      // Fetch from all data sources in parallel
      const [manualLogsResult, ouraLogsResult, withingsLogsResult] =
        await Promise.all([
          // Manual logs from logs table
          supabase
            .from("logs")
            .select("id, date, variable_id, value, notes, created_at, source")
            .eq("user_id", userId)
            .gte("date", cutoffDateString)
            .order("date", { ascending: true }),

          // Oura data from oura_variable_logs table
          supabase
            .from("oura_variable_logs")
            .select("id, date, variable_id, value, source, created_at")
            .eq("user_id", userId)
            .gte("date", cutoffDate.toISOString().split("T")[0])
            .order("date", { ascending: true }),

          // Withings data from withings_variable_logs table
          supabase
            .from("withings_variable_logs")
            .select("id, date, variable, value")
            .eq("user_id", userId)
            .gte("date", cutoffDate.toISOString().split("T")[0])
            .order("date", { ascending: true }),
        ]);

      // Check for errors
      if (manualLogsResult.error) {
        console.error("Error fetching manual logs:", manualLogsResult.error);
      }
      if (ouraLogsResult.error) {
        console.error("Error fetching Oura logs:", ouraLogsResult.error);
      }
      if (withingsLogsResult.error) {
        console.error(
          "Error fetching Withings logs:",
          withingsLogsResult.error
        );
      }

      // Combine all data into a unified format
      const allLogs: ManualLog[] = [];

      // Add manual logs (already in correct format)
      if (manualLogsResult.data) {
        allLogs.push(
          ...manualLogsResult.data.map((log: any) => ({
            id: log.id,
            date: log.date,
            variable_id: log.variable_id,
            value: log.value,
            notes: log.notes || "",
            created_at: log.created_at,
            source: log.source || "manual",
          }))
        );
      }

      // Add Oura logs (convert to manual log format)
      if (ouraLogsResult.data) {
        allLogs.push(
          ...ouraLogsResult.data.map((log: any) => ({
            id: `oura_${log.id}`,
            date: log.date,
            variable_id: log.variable_id, // Oura uses 'variable_id' field
            value: log.value?.toString() || "0",
            notes: `Oura data (${log.source || "oura"})`,
            created_at: log.created_at,
            source: log.source || "oura",
          }))
        );
      }

      // Add Withings logs (convert to manual log format)
      if (withingsLogsResult.data) {
        allLogs.push(
          ...withingsLogsResult.data.map((log: any) => ({
            id: `withings_${log.id}`,
            date: log.date,
            variable_id: log.variable, // Withings uses 'variable' field
            value: log.value?.toString() || "0",
            notes: "Withings data",
            created_at: log.created_at || new Date().toISOString(), // Fallback if created_at doesn't exist
            source: "withings",
          }))
        );
      }

      // Sort all logs by date
      allLogs.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      console.log(
        `📊 Correlation analysis loaded ${allLogs.length} data points from all sources:`,
        {
          manual: manualLogsResult.data?.length || 0,
          oura: ouraLogsResult.data?.length || 0,
          withings: withingsLogsResult.data?.length || 0,
          total: allLogs.length,
        }
      );

      setLogs(allLogs);
    } catch (err) {
      console.error("Error fetching logs from all sources:", err);
      setError("Failed to load data from all sources");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setTimeRange(event.target.value);
  };

  const handleVar1Change = (event: SelectChangeEvent) => {
    setSelectedVar1(event.target.value);
  };

  const handleVar2Change = (event: SelectChangeEvent) => {
    setSelectedVar2(event.target.value);
  };

  const isNumeric = (value: string): boolean => {
    return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
  };

  // Check if a variable has all zero values
  const hasAllZeroValues = (variableId: string): boolean => {
    const variableLogs = logs.filter(
      (log) => log.variable_id === variableId && isNumeric(log.value)
    );

    if (variableLogs.length === 0) return true; // No data is like having all zeros

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
      // Filter out variables with less than 3 data points or all zero values
      return values.length >= 3 && !hasAllZeroValues(variableId);
    });
  };

  // Calculate Pearson correlation coefficient
  const calculateCorrelation = (x: number[], y: number[]): number => {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
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
    if (abs >= 0.7) return correlation > 0 ? "#4caf50" : "#f44336";
    if (abs >= 0.3) return correlation > 0 ? "#8bc34a" : "#ff9800";
    if (abs >= 0.1) return correlation > 0 ? "#cddc39" : "#ffeb3b";
    return "#9e9e9e";
  };

  // Get data points for two variables on the same dates
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
          var1Date: log1.created_at || log1.date,
          var2Date: matchingLog2.created_at || matchingLog2.date,
        });
      }
    });

    return matchedData;
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

  const handleRowToggle = (variable1: string, variable2: string) => {
    const key = `${variable1}_${variable2}`;
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
              if (context.datasetIndex === 1) return null; // Hide tooltip for trend line
              const dataPoint = context.raw;
              return [
                `${getVariableDisplayName(variable1)}: ${dataPoint.x}`,
                `${getVariableDisplayName(variable2)}: ${dataPoint.y}`,
                `Date: ${format(parseISO(dataPoint.date), "MMM dd, yyyy")}`,
              ];
            },
            title: function (context: any) {
              if (context[0]?.datasetIndex === 1) return ""; // Hide title for trend line
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

          correlations.push({
            variable1: var1,
            variable2: var2,
            correlation: Math.round(correlation * 1000) / 1000,
            strength: getCorrelationStrength(correlation),
            direction: correlation > 0 ? "positive" : "negative",
            dataPoints: matchedData.length,
          });
        }
      }
    }

    return correlations.sort(
      (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)
    );
  }, [logs]);

  // Function to analyze data availability for variables
  const getDataAnalysis = () => {
    const numericVariables = getNumericVariables();
    const analysis = {
      totalVariables: numericVariables.length,
      variableData: [] as Array<{
        variableId: string;
        variableName: string;
        totalLogs: number;
        dateRange: { start: string; end: string } | null;
      }>,
      overlappingPairs: [] as Array<{
        var1: string;
        var2: string;
        var1Name: string;
        var2Name: string;
        overlappingDates: number;
      }>,
    };

    // Analyze each variable's data
    numericVariables.forEach((variableId) => {
      const variableLogs = logs.filter(
        (log) => log.variable_id === variableId && isNumeric(log.value)
      );

      if (variableLogs.length > 0) {
        const dates = variableLogs.map((log) => log.date).sort();
        analysis.variableData.push({
          variableId,
          variableName: getVariableDisplayName(variableId),
          totalLogs: variableLogs.length,
          dateRange: {
            start: dates[0],
            end: dates[dates.length - 1],
          },
        });
      }
    });

    // Analyze overlapping data between pairs
    for (let i = 0; i < numericVariables.length; i++) {
      for (let j = i + 1; j < numericVariables.length; j++) {
        const var1 = numericVariables[i];
        const var2 = numericVariables[j];
        const matchedData = getMatchedDataPoints(var1, var2);

        analysis.overlappingPairs.push({
          var1,
          var2,
          var1Name: getVariableDisplayName(var1),
          var2Name: getVariableDisplayName(var2),
          overlappingDates: matchedData.length,
        });
      }
    }

    return analysis;
  };

  const selectedCorrelation = useMemo(() => {
    if (!selectedVar1 || !selectedVar2 || selectedVar1 === selectedVar2)
      return null;

    const matchedData = getMatchedDataPoints(selectedVar1, selectedVar2);
    if (matchedData.length < 3) return null;

    const x = matchedData.map((d) => d.var1Value);
    const y = matchedData.map((d) => d.var2Value);
    const correlation = calculateCorrelation(x, y);

    return {
      data: matchedData,
      correlation: Math.round(correlation * 1000) / 1000,
      strength: getCorrelationStrength(correlation),
      direction: correlation > 0 ? "positive" : "negative",
    };
  }, [logs, selectedVar1, selectedVar2]);

  const scatterChartData = useMemo(() => {
    if (!selectedCorrelation) return null;

    const x = selectedCorrelation.data.map((d) => d.var1Value);
    const y = selectedCorrelation.data.map((d) => d.var2Value);
    const regressionLine = calculateRegressionLine(x, y);

    return {
      datasets: [
        {
          label: `${getVariableDisplayName(
            selectedVar1
          )} vs ${getVariableDisplayName(selectedVar2)}`,
          data: selectedCorrelation.data.map((d) => ({
            x: d.var1Value,
            y: d.var2Value,
            date: d.date,
            var1Date: d.var1Date,
            var2Date: d.var2Date,
          })),
          backgroundColor: getCorrelationColor(selectedCorrelation.correlation),
          borderColor: getCorrelationColor(selectedCorrelation.correlation),
          pointRadius: 5,
          pointHoverRadius: 7,
          type: "scatter" as const,
          showLine: false,
        },
        {
          label: "Trend Line",
          data: regressionLine.points,
          backgroundColor: "rgba(255, 255, 255, 0)",
          borderColor: getCorrelationColor(selectedCorrelation.correlation),
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
  }, [selectedCorrelation, selectedVar1, selectedVar2]);

  const scatterChartOptions = {
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
            if (context.datasetIndex === 1) return null; // Hide tooltip for trend line
            const dataPoint = context.raw;
            return [
              `${getVariableDisplayName(selectedVar1)}: ${dataPoint.x}`,
              `${getVariableDisplayName(selectedVar2)}: ${dataPoint.y}`,
              `Date: ${format(parseISO(dataPoint.date), "MMM dd, yyyy")}`,
            ];
          },
          title: function (context: any) {
            if (context[0]?.datasetIndex === 1) return ""; // Hide title for trend line
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
          text: getVariableDisplayName(selectedVar1),
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
          text: getVariableDisplayName(selectedVar2),
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

  // Function to get data source breakdown
  const getDataSourceBreakdown = () => {
    const breakdown = {
      manual: logs.filter((log) => !log.source || log.source === "manual")
        .length,
      oura: logs.filter((log) => log.source === "oura").length,
      withings: logs.filter((log) => log.source === "withings").length,
      other: logs.filter(
        (log) =>
          log.source && !["manual", "oura", "withings"].includes(log.source)
      ).length,
      total: 0,
    };
    breakdown.total =
      breakdown.manual + breakdown.oura + breakdown.withings + breakdown.other;
    return breakdown;
  };

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
        Start logging more different types of data across all sources (manual,
        Oura, Withings, etc.) to see correlations!
      </Alert>
    );
  }

  return (
    <Box>
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
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {(() => {
                  const breakdown = getDataSourceBreakdown();
                  return (
                    <>
                      <Chip
                        label={`Manual: ${breakdown.manual}`}
                        size="small"
                        color={breakdown.manual > 0 ? "primary" : "default"}
                        variant={breakdown.manual > 0 ? "filled" : "outlined"}
                      />
                      <Chip
                        label={`Oura: ${breakdown.oura}`}
                        size="small"
                        color={breakdown.oura > 0 ? "secondary" : "default"}
                        variant={breakdown.oura > 0 ? "filled" : "outlined"}
                      />
                      <Chip
                        label={`Withings: ${breakdown.withings}`}
                        size="small"
                        color={breakdown.withings > 0 ? "success" : "default"}
                        variant={breakdown.withings > 0 ? "filled" : "outlined"}
                      />
                      {breakdown.other > 0 && (
                        <Chip
                          label={`Other: ${breakdown.other}`}
                          size="small"
                          color="info"
                          variant="filled"
                        />
                      )}
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ ml: 1 }}
                      >
                        Total: {breakdown.total} data points
                      </Typography>
                    </>
                  );
                })()}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      <Stack spacing={3}>
        {/* Expandable Comprehensive Correlation Analysis Section */}
        <Accordion
          expanded={showCorrelationAnalysis}
          onChange={() => setShowCorrelationAnalysis(!showCorrelationAnalysis)}
          elevation={2}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="correlation-analysis-content"
            id="correlation-analysis-header"
            sx={{
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "& .MuiAccordionSummary-expandIconWrapper": {
                color: "primary.contrastText",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AnalyticsIcon />
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                📊 Comprehensive Correlation Analysis
              </Typography>
              <Chip
                label={`${allCorrelations.length} correlations found`}
                size="small"
                variant="outlined"
                sx={{
                  ml: 2,
                  color: "primary.contrastText",
                  borderColor: "primary.contrastText",
                }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Box sx={{ p: 3 }}>
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

              {/* Variable Filtering Information */}
              {(() => {
                const allVariableIds = [
                  ...new Set(
                    logs
                      .filter((log) => isNumeric(log.value))
                      .map((log) => log.variable_id)
                  ),
                ];
                const filteredOutVariables = allVariableIds.filter((varId) =>
                  hasAllZeroValues(varId)
                );

                if (filteredOutVariables.length > 0) {
                  return (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, mb: 0.5 }}
                      >
                        📊 Data Quality Filter Active
                      </Typography>
                      <Typography variant="body2">
                        {filteredOutVariables.length} variable(s) excluded from
                        correlation analysis because they contain only zero
                        values:{" "}
                        {filteredOutVariables
                          .slice(0, 3)
                          .map((varId) => getVariableDisplayName(varId))
                          .join(", ")}
                        {filteredOutVariables.length > 3 &&
                          ` and ${filteredOutVariables.length - 3} more`}
                        . Variables with all zero values cannot show meaningful
                        correlations.
                      </Typography>
                    </Alert>
                  );
                }
                return null;
              })()}

              {/* Scatter Plot and Table */}
              <Box
                sx={{
                  display: "flex",
                  gap: 3,
                  flexDirection: { xs: "column", lg: "row" },
                  overflow: "visible",
                  minHeight: "fit-content",
                }}
              >
                {selectedCorrelation && scatterChartData && (
                  <Box sx={{ flex: selectedCorrelation ? 2 : 1 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" component="h4" gutterBottom>
                          {getVariableDisplayName(selectedVar1)} vs{" "}
                          {getVariableDisplayName(selectedVar2)}
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
                            label={`Correlation: ${selectedCorrelation.correlation}`}
                            size="small"
                            sx={{
                              bgcolor: getCorrelationColor(
                                selectedCorrelation.correlation
                              ),
                              color: "white",
                            }}
                          />
                          <Chip
                            label={`${selectedCorrelation.strength} ${selectedCorrelation.direction}`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={`${selectedCorrelation.data.length} data points`}
                            size="small"
                            color="primary"
                          />
                        </Box>

                        {/* Educational Information */}
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
                            {selectedCorrelation.correlation}):
                          </Typography>
                          <Typography variant="body2" component="div">
                            • <strong>Correlation ≠ Causation:</strong> A
                            correlation doesn't mean one variable causes the
                            other
                            <br />• <strong>Range:</strong> Values from -1
                            (perfect negative) to +1 (perfect positive)
                            <br />• <strong>Strength:</strong> |0.7+| = strong,
                            |0.3-0.7| = moderate, |0.1-0.3| = weak
                            <br />• <strong>Confounding:</strong> Other
                            variables may influence both measurements
                          </Typography>
                        </Alert>

                        <Box
                          sx={{
                            height: "auto",
                            minHeight: { xs: 500, sm: 600, md: 700 },
                            maxHeight: "90vh",
                            width: "100%",
                            position: "relative",
                            pb: 2,
                            overflow: "visible",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: "500px",
                              minHeight: "500px",
                              position: "relative",
                            }}
                          >
                            <Scatter
                              data={scatterChartData}
                              options={scatterChartOptions}
                            />
                          </div>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* Correlation Table */}
                <Box sx={{ flex: selectedCorrelation ? 1 : 1 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" component="h4" gutterBottom>
                        All Correlations
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        Ranked by correlation strength
                      </Typography>
                      {allCorrelations.length === 0 ? (
                        <Box sx={{ p: 3, pt: 0 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 600 }}
                            >
                              No correlations found
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() =>
                                setShowExplanation(!showExplanation)
                              }
                              sx={{ ml: 1 }}
                            >
                              {showExplanation ? (
                                <ExpandLessIcon />
                              ) : (
                                <ExpandMoreIcon />
                              )}
                            </IconButton>
                          </Box>
                          <Collapse in={showExplanation}>
                            <Alert severity="info">
                              <Box>
                                <Typography
                                  variant="body1"
                                  sx={{ fontWeight: 600, mb: 1 }}
                                >
                                  Here's why:
                                </Typography>
                                {(() => {
                                  const analysis = getDataAnalysis();
                                  const insufficientData =
                                    analysis.overlappingPairs.filter(
                                      (pair) => pair.overlappingDates < 3
                                    );
                                  const hasData =
                                    analysis.variableData.length > 0;

                                  return (
                                    <Box>
                                      {!hasData ? (
                                        <Typography
                                          variant="body2"
                                          sx={{ mb: 1 }}
                                        >
                                          •{" "}
                                          <strong>No numeric data found</strong>{" "}
                                          in the selected time range. Make sure
                                          you have logged numeric values for
                                          your variables.
                                        </Typography>
                                      ) : (
                                        <>
                                          <Typography
                                            variant="body2"
                                            sx={{ mb: 1 }}
                                          >
                                            •{" "}
                                            <strong>Data availability:</strong>{" "}
                                            You have {analysis.totalVariables}{" "}
                                            numeric variables with data
                                          </Typography>
                                          {analysis.variableData.map(
                                            (varData, index) => (
                                              <Typography
                                                key={index}
                                                variant="body2"
                                                sx={{ ml: 2, mb: 0.5 }}
                                              >
                                                - {varData.variableName}:{" "}
                                                {varData.totalLogs} logs (
                                                {varData.dateRange
                                                  ? `${format(
                                                      parseISO(
                                                        varData.dateRange.start
                                                      ),
                                                      "MMM d"
                                                    )} - ${format(
                                                      parseISO(
                                                        varData.dateRange.end
                                                      ),
                                                      "MMM d"
                                                    )}`
                                                  : "no date range"}
                                                )
                                              </Typography>
                                            )
                                          )}
                                          <Typography
                                            variant="body2"
                                            sx={{ mt: 1, mb: 1 }}
                                          >
                                            • <strong>Overlapping data:</strong>{" "}
                                            Need at least 3 matching dates
                                            between variables for correlation
                                            analysis
                                          </Typography>
                                          {insufficientData.length > 0 && (
                                            <Box sx={{ ml: 2 }}>
                                              {insufficientData
                                                .slice(0, 3)
                                                .map((pair, index) => (
                                                  <Typography
                                                    key={index}
                                                    variant="body2"
                                                    sx={{ mb: 0.5 }}
                                                  >
                                                    - {pair.var1Name} &{" "}
                                                    {pair.var2Name}:{" "}
                                                    {pair.overlappingDates}{" "}
                                                    overlapping dates
                                                  </Typography>
                                                ))}
                                              {insufficientData.length > 3 && (
                                                <Typography
                                                  variant="body2"
                                                  sx={{ fontStyle: "italic" }}
                                                >
                                                  ... and{" "}
                                                  {insufficientData.length - 3}{" "}
                                                  more pairs
                                                </Typography>
                                              )}
                                            </Box>
                                          )}
                                          <Typography
                                            variant="body2"
                                            sx={{ mt: 1, fontWeight: 600 }}
                                          >
                                            💡 <strong>Tip:</strong> Try logging
                                            both variables on the same days, or
                                            expand your time range to get more
                                            overlapping data points.
                                          </Typography>
                                        </>
                                      )}
                                    </Box>
                                  );
                                })()}
                              </Box>
                            </Alert>
                          </Collapse>
                        </Box>
                      ) : (
                        <TableContainer
                          component={Paper}
                          sx={{
                            maxHeight: "none",
                            height: "auto",
                            overflow: "visible",
                            "& .MuiTable-root": {
                              minWidth: 650,
                              overflow: "visible",
                            },
                            "& .MuiCollapse-root": {
                              overflow: "visible !important",
                            },
                            "& .MuiTableCell-root": {
                              overflow: "visible",
                            },
                            "& .MuiTableRow-root": {
                              overflow: "visible",
                            },
                            "&::-webkit-scrollbar": {
                              width: "8px",
                            },
                            "&::-webkit-scrollbar-track": {
                              background: "#f1f1f1",
                              borderRadius: "4px",
                            },
                            "&::-webkit-scrollbar-thumb": {
                              background: "#888",
                              borderRadius: "4px",
                            },
                            "&::-webkit-scrollbar-thumb:hover": {
                              background: "#555",
                            },
                          }}
                        >
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell>Variables</TableCell>
                                <TableCell align="right">Correlation</TableCell>
                                <TableCell align="right">Strength</TableCell>
                                <TableCell align="right">Points</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {allCorrelations.map((corr, index) => {
                                const rowKey = `${corr.variable1}_${corr.variable2}`;
                                const isExpanded =
                                  expandedRows[rowKey] || false;
                                const chartData = isExpanded
                                  ? getChartDataForCorrelation(
                                      corr.variable1,
                                      corr.variable2
                                    )
                                  : null;

                                return (
                                  <React.Fragment key={index}>
                                    <TableRow hover sx={{ cursor: "pointer" }}>
                                      <TableCell
                                        onClick={() =>
                                          handleRowToggle(
                                            corr.variable1,
                                            corr.variable2
                                          )
                                        }
                                      >
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                          }}
                                        >
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRowToggle(
                                                corr.variable1,
                                                corr.variable2
                                              );
                                            }}
                                          >
                                            {isExpanded ? (
                                              <ExpandLessIcon />
                                            ) : (
                                              <ExpandMoreIcon />
                                            )}
                                          </IconButton>
                                          <Typography variant="body2">
                                            {getVariableDisplayName(
                                              corr.variable1
                                            )}{" "}
                                            ×{" "}
                                            {getVariableDisplayName(
                                              corr.variable2
                                            )}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell
                                        align="right"
                                        onClick={() =>
                                          handleRowToggle(
                                            corr.variable1,
                                            corr.variable2
                                          )
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
                                            sx={{ fontWeight: "bold" }}
                                          >
                                            {corr.correlation}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell
                                        align="right"
                                        onClick={() =>
                                          handleRowToggle(
                                            corr.variable1,
                                            corr.variable2
                                          )
                                        }
                                      >
                                        <Chip
                                          label={corr.strength}
                                          size="small"
                                          variant="outlined"
                                          sx={{
                                            fontSize: "0.75rem",
                                            color: getCorrelationColor(
                                              corr.correlation
                                            ),
                                            borderColor: getCorrelationColor(
                                              corr.correlation
                                            ),
                                          }}
                                        />
                                      </TableCell>
                                      <TableCell
                                        align="right"
                                        onClick={() =>
                                          handleRowToggle(
                                            corr.variable1,
                                            corr.variable2
                                          )
                                        }
                                      >
                                        <Typography variant="body2">
                                          {corr.dataPoints}
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell
                                        colSpan={4}
                                        sx={{ py: 0, border: 0 }}
                                      >
                                        <Collapse
                                          in={isExpanded}
                                          timeout="auto"
                                          unmountOnExit
                                          sx={{
                                            overflow: "visible !important",
                                            width: "100%",
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              p: 2,
                                              bgcolor: "action.hover",
                                              position: "relative",
                                              zIndex: 10,
                                              width: "100%",
                                              overflow: "visible",
                                              minHeight: "fit-content",
                                            }}
                                          >
                                            {chartData ? (
                                              <Card
                                                elevation={3}
                                                sx={{
                                                  position: "relative",
                                                  zIndex: 11,
                                                  overflow: "visible",
                                                  width: "100%",
                                                  minHeight: "fit-content",
                                                }}
                                              >
                                                <CardContent
                                                  sx={{
                                                    overflow: "visible",
                                                    width: "100%",
                                                    "&:last-child": {
                                                      pb: 3,
                                                    },
                                                  }}
                                                >
                                                  <Typography
                                                    variant="subtitle1"
                                                    gutterBottom
                                                  >
                                                    {getVariableDisplayName(
                                                      corr.variable1
                                                    )}{" "}
                                                    vs{" "}
                                                    {getVariableDisplayName(
                                                      corr.variable2
                                                    )}{" "}
                                                    Chart
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
                                                      label={`Correlation: ${chartData.correlation.toFixed(
                                                        3
                                                      )}`}
                                                      size="small"
                                                      sx={{
                                                        bgcolor:
                                                          getCorrelationColor(
                                                            chartData.correlation
                                                          ),
                                                        color: "white",
                                                      }}
                                                    />
                                                    <Chip
                                                      label={`${corr.strength} ${corr.direction}`}
                                                      size="small"
                                                      variant="outlined"
                                                    />
                                                    <Chip
                                                      label={`${chartData.matchedData.length} data points`}
                                                      size="small"
                                                      color="primary"
                                                    />
                                                  </Box>
                                                  <Box
                                                    sx={{
                                                      height: "auto",
                                                      minHeight: "500px",
                                                      maxHeight: "80vh",
                                                      width: "100%",
                                                      position: "relative",
                                                      pb: 2,
                                                      mt: 2,
                                                      overflow: "visible",
                                                      display: "flex",
                                                      flexDirection: "column",
                                                    }}
                                                  >
                                                    <div
                                                      style={{
                                                        width: "100%",
                                                        height: "500px",
                                                        minHeight: "500px",
                                                        position: "relative",
                                                      }}
                                                    >
                                                      <Scatter
                                                        data={
                                                          chartData.chartData
                                                        }
                                                        options={
                                                          chartData.chartOptions
                                                        }
                                                      />
                                                    </div>
                                                  </Box>
                                                </CardContent>
                                              </Card>
                                            ) : (
                                              <Alert severity="info">
                                                Not enough data points to
                                                display chart for this
                                                correlation.
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
                      )}
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Insights */}
        {allCorrelations.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" component="h4" gutterBottom>
                Key Insights
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {allCorrelations.slice(0, 3).map((corr, index) => (
                  <Box
                    key={index}
                    sx={{
                      flex: { xs: "1 1 100%", sm: "1 1 calc(33.33% - 16px)" },
                    }}
                  >
                    <Paper elevation={1} sx={{ p: 2, bgcolor: "action.hover" }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: "bold", mb: 1 }}
                      >
                        {getVariableDisplayName(corr.variable1)} &{" "}
                        {getVariableDisplayName(corr.variable2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {corr.strength === "strong" &&
                          Math.abs(corr.correlation) >= 0.7 &&
                          `Strong ${corr.direction} relationship (${corr.correlation})`}
                        {corr.strength === "moderate" &&
                          `Moderate ${corr.direction} relationship (${corr.correlation})`}
                        {corr.strength === "weak" &&
                          `Weak ${corr.direction} relationship (${corr.correlation})`}
                      </Typography>
                    </Paper>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Educational Section */}
        <Accordion sx={{ bgcolor: "#fff3e0" }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="correlation-education-content"
            id="correlation-education-header"
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <WarningIcon color="warning" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                📚 Understanding Correlation: Important Limitations
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <Alert severity="warning" icon={<WarningIcon />}>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                  ⚠️ Critical: Correlation does NOT equal causation!
                </Typography>
                <Typography variant="body2">
                  Just because two variables are correlated doesn't mean one
                  causes the other. There may be hidden factors, coincidences,
                  or reverse causation at play.
                </Typography>
              </Alert>

              <Box>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ color: "primary.main" }}
                >
                  🎯 What Correlation Measures
                </Typography>
                <Typography variant="body2" paragraph>
                  Pearson's correlation coefficient (r) measures the{" "}
                  <strong>linear relationship</strong> between two variables:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>
                    <strong>+1.0:</strong> Perfect positive relationship (as one
                    goes up, the other always goes up)
                  </li>
                  <li>
                    <strong>0.0:</strong> No linear relationship
                  </li>
                  <li>
                    <strong>-1.0:</strong> Perfect negative relationship (as one
                    goes up, the other always goes down)
                  </li>
                </Box>
              </Box>

              <Box>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ color: "warning.main" }}
                >
                  ⚠️ Common Pitfalls
                </Typography>
                <Box component="ul" sx={{ pl: 3 }}>
                  <li>
                    <strong>Confounding Variables:</strong> A third factor might
                    influence both variables
                  </li>
                  <li>
                    <strong>Non-linear Relationships:</strong> Variables might
                    be related in complex ways not captured by correlation
                  </li>
                  <li>
                    <strong>Sample Size:</strong> Small datasets can show
                    misleading correlations due to chance
                  </li>
                  <li>
                    <strong>Outliers:</strong> Extreme values can significantly
                    skew correlation results
                  </li>
                  <li>
                    <strong>Time Factors:</strong> Correlations might change
                    over different time periods
                  </li>
                </Box>
              </Box>

              <Box>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ color: "success.main" }}
                >
                  ✅ How to Interpret Safely
                </Typography>
                <Box component="ul" sx={{ pl: 3 }}>
                  <li>
                    <strong>Look for patterns:</strong> Use correlation to
                    identify interesting relationships to investigate further
                  </li>
                  <li>
                    <strong>Consider context:</strong> Think about what might
                    logically connect these variables
                  </li>
                  <li>
                    <strong>Check sample size:</strong> Stronger correlations
                    with more data points are more reliable
                  </li>
                  <li>
                    <strong>Test theories:</strong> Use correlation to generate
                    hypotheses, not prove them
                  </li>
                  <li>
                    <strong>Combine with other evidence:</strong> Correlation is
                    one piece of the puzzle, not the whole picture
                  </li>
                </Box>
              </Box>

              <Alert severity="info" icon={<InfoIcon />}>
                <Typography variant="body2">
                  <strong>Remember:</strong> Correlation analysis is a powerful
                  tool for discovering patterns in your data, but it's the
                  starting point for investigation, not the final answer. Always
                  consider the bigger picture when interpreting your results.
                </Typography>
              </Alert>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Box>
  );
}
