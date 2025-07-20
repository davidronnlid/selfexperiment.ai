import React, { useState, useEffect, useMemo, memo, useCallback } from "react";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  Divider,
  Tooltip,
} from "@mui/material";

import { Line } from "react-chartjs-2";
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
import {
  format,
  parseISO,
  differenceInDays,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import BarChartIcon from "@mui/icons-material/BarChart";
import TimelineIcon from "@mui/icons-material/Timeline";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import { VariableLinkSimple } from "./VariableLink";

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

interface ManualDataPoint {
  id: number;
  date: string;
  variable_id: string;
  value: string;
  notes?: string;
  created_at: string;
}

interface ManualDataPointsChartProps {
  userId: string;
  maxRows?: number;
  maxDays?: number;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
    tension: number;
  }[];
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
  weeklyPattern: { day: string; average: number }[];
}

const ManualDataPointsChart = memo(function ManualDataPointsChart({
  userId,
  maxDays = 30,
}: ManualDataPointsChartProps) {
  const [logs, setLogs] = useState<ManualDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("30");
  const [selectedVariable, setSelectedVariable] = useState<string>("");
  const [variables, setVariables] = useState<Record<string, string>>({}); // variable_id -> label

  // Utility functions - must be defined before useMemo/useCallback hooks
  const isNumeric = (value: string): boolean => {
    return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM dd");
    } catch {
      return dateString;
    }
  };

  const getVariableColor = (variable: string) => {
    const colors = [
      "#1976d2",
      "#d32f2f",
      "#388e3c",
      "#f57c00",
      "#7b1fa2",
      "#c2185b",
      "#0097a7",
      "#5d4037",
      "#616161",
      "#e64a19",
    ];
    const index = variable.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Memoize expensive calculations
  const uniqueVariables = useMemo(() => {
    const variables = new Set(logs.map((log) => log.variable_id));
    return Array.from(variables).sort();
  }, [logs]);

  const numericVariables = useMemo(() => {
    return uniqueVariables.filter((variable) =>
      logs.some((log) => log.variable_id === variable && isNumeric(log.value))
    );
  }, [uniqueVariables, logs]);

  // Memoize filtered logs for selected variable
  // Calculate variable statistics
  const calculateStats = useCallback(
    (variableLogs: ManualDataPoint[]): VariableStats => {
      const numericLogs = variableLogs.filter((log) => isNumeric(log.value));
      const values = numericLogs.map((log) => parseFloat(log.value));

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
          weeklyPattern: [],
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

      // Calculate current streak (consecutive days with data)
      // Group logs by unique dates first
      const uniqueDates = [...new Set(numericLogs.map((log) => log.date))].sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      );

      let streak = 0;
      if (uniqueDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < uniqueDates.length; i++) {
          const logDate = new Date(uniqueDates[i]);
          logDate.setHours(0, 0, 0, 0);

          // Calculate expected date for this position in the streak
          const expectedDate = new Date(today);
          expectedDate.setDate(today.getDate() - i);

          const daysDiff = Math.abs(differenceInDays(expectedDate, logDate));

          // If this log is on the expected consecutive date (or today), continue streak
          if (daysDiff === 0) {
            streak++;
          } else {
            // Check if we can start counting from yesterday instead
            if (i === 0) {
              const yesterday = new Date(today);
              yesterday.setDate(today.getDate() - 1);
              const daysDiffYesterday = Math.abs(
                differenceInDays(yesterday, logDate)
              );

              if (daysDiffYesterday === 0) {
                streak++;
                // Adjust the starting point for subsequent checks
                continue;
              }
            }
            // Break the streak if this date doesn't fit the consecutive pattern
            break;
          }
        }
      }

      // Calculate weekly pattern
      const weeklyData: { [key: string]: number[] } = {};
      numericLogs.forEach((log) => {
        const day = format(parseISO(log.date), "EEEE");
        if (!weeklyData[day]) weeklyData[day] = [];
        weeklyData[day].push(parseFloat(log.value));
      });

      const weeklyPattern = Object.entries(weeklyData).map(([day, values]) => ({
        day,
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
      }));

      return {
        average: Math.round(average * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        latest: Math.round(latest * 100) / 100,
        trend,
        changePercentage: Math.round(changePercentage * 100) / 100,
        streak,
        totalLogs: numericLogs.length,
        weeklyPattern,
      };
    },
    []
  );

  const selectedVariableLogs = useMemo(() => {
    return logs.filter(
      (log) => log.variable_id === selectedVariable && isNumeric(log.value)
    );
  }, [logs, selectedVariable]);

  // Memoize chart data preparation
  const chartData = useMemo(() => {
    if (!selectedVariable || selectedVariableLogs.length === 0) {
      return null;
    }

    const sortedLogs = selectedVariableLogs.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      labels: sortedLogs.map((log) => formatDate(log.date)),
      datasets: [
        {
          label: variables[selectedVariable] || selectedVariable,
          data: sortedLogs.map((log) => parseFloat(log.value)),
          borderColor: getVariableColor(selectedVariable),
          backgroundColor: getVariableColor(selectedVariable) + "20",
          fill: false,
          tension: 0.1,
        },
      ],
    };
  }, [selectedVariable, selectedVariableLogs, variables]);

  // Memoize stats calculation
  const variableStats = useMemo(() => {
    return calculateStats(selectedVariableLogs);
  }, [selectedVariableLogs, calculateStats]);

  // Use useCallback for event handlers
  const handleTimeRangeChange = useCallback((event: SelectChangeEvent) => {
    setTimeRange(event.target.value);
  }, []);

  const handleVariableChange = useCallback((event: SelectChangeEvent) => {
    setSelectedVariable(event.target.value);
  }, []);

  const fetchManualLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const daysBack = parseInt(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from("data_points")
        .select("id, date, variable_id, value, notes, created_at")
        .eq("user_id", userId)
        .gte("date", cutoffDate.toISOString())
        .order("date", { ascending: true });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching manual logs:", err);
      setError("Failed to load manual logs");
    } finally {
      setLoading(false);
    }
  }, [userId, timeRange]);

  useEffect(() => {
    fetchManualLogs();
  }, [fetchManualLogs]);

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

  // Auto-select first numeric variable
  useEffect(() => {
    if (numericVariables.length > 0 && !selectedVariable) {
      setSelectedVariable(numericVariables[0]);
    }
  }, [numericVariables, selectedVariable]);

  const getUniqueVariables = () => {
    const variables = new Set(logs.map((log) => log.variable_id));
    return Array.from(variables).sort();
  };

  const prepareChartData = (): { [variable: string]: ChartData } => {
    const chartData: { [variable: string]: ChartData } = {};

    // Group logs by variable
    const logsByVariable = logs.reduce((acc, log) => {
      if (!acc[log.variable_id]) {
        acc[log.variable_id] = [];
      }
      acc[log.variable_id].push(log);
      return acc;
    }, {} as { [variable: string]: ManualDataPoint[] });

    // Create chart data for each variable
    Object.entries(logsByVariable).forEach(([variable, variableLogs]) => {
      // Only include numeric variables for line charts
      const numericLogs = variableLogs.filter((log) => isNumeric(log.value));

      if (numericLogs.length > 0) {
        const color = getVariableColor(variable);

        chartData[variable] = {
          labels: numericLogs.map((log) => formatDate(log.date)),
          datasets: [
            {
              label: variables[variable] || variable,
              data: numericLogs.map((log) => parseFloat(log.value)),
              borderColor: color,
              backgroundColor: color + "20",
              fill: false,
              tension: 0.3,
            },
          ],
        };
      }
    });

    return chartData;
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: "Value",
        },
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
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
        {error}
      </Alert>
    );
  }

  if (logs.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No manual data points found for the selected time range. Start tracking
        data to see your trends here!
      </Alert>
    );
  }

  // chartData is ChartData | null
  const displayedChartData = chartData ? chartData : undefined;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" component="h3">
          📈 Manual Log Trends
        </Typography>
      </Box>

      {numericVariables.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No numeric variables found for charting. Charts can only display
          numeric values.
        </Alert>
      ) : selectedVariable && displayedChartData && variableStats ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Statistics Cards */}
          <Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Card sx={{ flex: "1 1 200px", minWidth: 200 }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <BarChartIcon sx={{ mr: 1, color: "primary.main" }} />
                    <Typography variant="h6" component="div">
                      {variableStats.average}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Average
                  </Typography>
                </CardContent>
              </Card>
              <Tooltip
                title={
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: "bold", mb: 1 }}
                    >
                      📊 Trend Calculation
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {variableStats.changePercentage > 0
                        ? `📈 Strong ${
                            variableStats.trend === "up" ? "Upward" : "Stable"
                          } Trend: Your recent data points are on average ${variableStats.changePercentage.toFixed(
                            1
                          )}% higher than your earlier data points.`
                        : variableStats.changePercentage < 0
                        ? `📉 Strong Downward Trend: Your recent data points are on average ${Math.abs(
                            variableStats.changePercentage
                          ).toFixed(1)}% lower than your earlier data points.`
                        : `📊 Stable Trend: Your recent data points show minimal change (${variableStats.changePercentage.toFixed(
                            1
                          )}%) compared to earlier data points.`}
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                      ⏱️ Time Period: This calculation uses your selected time
                      range ({timeRange} days) and compares the first half of
                      that period to the second half.
                    </Typography>
                  </Box>
                }
                placement="top"
                arrow
              >
                <Card sx={{ flex: "1 1 200px", minWidth: 200, cursor: "help" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      {variableStats.trend === "up" && (
                        <TrendingUpIcon sx={{ mr: 1, color: "success.main" }} />
                      )}
                      {variableStats.trend === "down" && (
                        <TrendingDownIcon sx={{ mr: 1, color: "error.main" }} />
                      )}
                      {variableStats.trend === "stable" && (
                        <TrendingFlatIcon sx={{ mr: 1, color: "info.main" }} />
                      )}
                      <Typography variant="h6" component="div">
                        {variableStats.changePercentage > 0 ? "+" : ""}
                        {variableStats.changePercentage}%
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Trend
                    </Typography>
                  </CardContent>
                </Card>
              </Tooltip>
              <Card sx={{ flex: "1 1 200px", minWidth: 200 }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <TimelineIcon sx={{ mr: 1, color: "secondary.main" }} />
                    <Typography variant="h6" component="div">
                      {variableStats.min} - {variableStats.max}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Range
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: "1 1 200px", minWidth: 200 }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <LocalFireDepartmentIcon
                      sx={{ mr: 1, color: "warning.main" }}
                    />
                    <Typography variant="h6" component="div">
                      {variableStats.streak}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Day Streak
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Filter Controls */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 2,
              mb: 2,
            }}
          >
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={handleTimeRangeChange}
              >
                <MenuItem value="7">Last 7 days</MenuItem>
                <MenuItem value="30">Last 30 days</MenuItem>
                <MenuItem value="90">Last 90 days</MenuItem>
                <MenuItem value="365">Last year</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Variable</InputLabel>
              <Select
                value={selectedVariable}
                label="Variable"
                onChange={handleVariableChange}
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
          </Box>

          {/* Chart */}
          <Box>
            <Card>
              <CardContent>
                <VariableLinkSimple
                  variableId={selectedVariable}
                  variables={variables}
                  variant="h6"
                  component="h4"
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <Chip
                    label={`${variableStats.totalLogs} data points`}
                    size="small"
                    color="primary"
                  />
                  <Chip
                    label={`Latest: ${variableStats.latest}`}
                    size="small"
                    color="secondary"
                  />
                </Box>
                <Box sx={{ height: 400 }}>
                  <Line data={displayedChartData} options={chartOptions} />
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Weekly Pattern */}
          {variableStats.weeklyPattern.length > 0 && (
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h4" gutterBottom>
                    Weekly Pattern
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Average values by day of week
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {variableStats.weeklyPattern.map((day) => (
                      <Chip
                        key={day.day}
                        label={`${day.day.substring(
                          0,
                          3
                        )}: ${day.average.toFixed(1)}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>
          Select a variable to view its trend chart and insights.
        </Alert>
      )}

      {/* Info about non-numeric variables */}
      {uniqueVariables.length > numericVariables.length && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Note:</strong> Some variables (
            {uniqueVariables.length - numericVariables.length}) contain
            non-numeric data and cannot be displayed in charts. These include:{" "}
            {uniqueVariables
              .filter((v: string) => !numericVariables.includes(v))
              .map((v: string) => variables[v] || v)
              .join(", ")}
          </Typography>
        </Alert>
      )}
    </Box>
  );
});

export default ManualDataPointsChart;
