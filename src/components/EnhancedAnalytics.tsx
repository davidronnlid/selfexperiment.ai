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
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Stack,
  Tooltip,
} from "@mui/material";

import { Line, Bar } from "react-chartjs-2";
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
import {
  format,
  parseISO,
  differenceInDays,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { LOG_LABELS } from "@/utils/logLabels";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import BarChartIcon from "@mui/icons-material/BarChart";
import TimelineIcon from "@mui/icons-material/Timeline";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AssessmentIcon from "@mui/icons-material/Assessment";
import InsightsIcon from "@mui/icons-material/Insights";

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

interface ManualLog {
  id: number;
  date: string;
  variable: string;
  value: string;
  notes?: string;
  created_at: string;
}

interface EnhancedAnalyticsProps {
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
  weeklyPattern: { day: string; average: number | null; hasLogs: boolean }[];
  insights: string[];
}

type ChartType = "line" | "bar";

export default function EnhancedAnalytics({ userId }: EnhancedAnalyticsProps) {
  const [logs, setLogs] = useState<ManualLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("30");
  const [selectedVariable, setSelectedVariable] = useState<string>("");
  const [chartType, setChartType] = useState<ChartType>("line");

  useEffect(() => {
    fetchManualLogs();
  }, [userId, timeRange]);

  useEffect(() => {
    if (logs.length > 0 && !selectedVariable) {
      const numericVariables = getUniqueVariables().filter((variable) =>
        logs.some((log) => log.variable === variable && isNumeric(log.value))
      );
      if (numericVariables.length > 0) {
        setSelectedVariable(numericVariables[0]);
      }
    }
  }, [logs, selectedVariable]);

  const fetchManualLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const daysBack = parseInt(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from("daily_logs")
        .select("id, date, variable, value, notes, created_at")
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
  };

  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setTimeRange(event.target.value);
  };

  const handleVariableChange = (event: SelectChangeEvent) => {
    setSelectedVariable(event.target.value);
  };

  const handleChartTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newChartType: ChartType
  ) => {
    if (newChartType !== null) {
      setChartType(newChartType);
    }
  };

  const getUniqueVariables = () => {
    const variables = new Set(logs.map((log) => log.variable));
    return Array.from(variables).sort();
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

  const generateInsights = (stats: VariableStats): string[] => {
    const insights: string[] = [];

    if (stats.trend === "up" && stats.changePercentage > 10) {
      insights.push(
        `📈 Strong upward trend: ${stats.changePercentage.toFixed(1)}% increase`
      );
    } else if (stats.trend === "down" && stats.changePercentage < -10) {
      insights.push(
        `📉 Strong downward trend: ${Math.abs(stats.changePercentage).toFixed(
          1
        )}% decrease`
      );
    } else if (stats.trend === "stable") {
      insights.push(`📊 Values have been stable over this period`);
    }

    if (stats.streak > 7) {
      insights.push(
        `🔥 Great consistency! ${stats.streak} days logged in a row`
      );
    } else if (stats.streak > 0) {
      insights.push(`💪 Currently on a ${stats.streak} day logging streak`);
    }

    if (stats.latest > stats.average * 1.2) {
      insights.push(`⚡ Latest value (${stats.latest}) is 20% above average`);
    } else if (stats.latest < stats.average * 0.8) {
      insights.push(`⬇️ Latest value (${stats.latest}) is 20% below average`);
    }

    const daysWithLogs = stats.weeklyPattern.filter((day) => day.hasLogs);

    if (daysWithLogs.length > 1) {
      const highestDay = daysWithLogs.reduce(
        (max, day) => (day.average! > max.average! ? day : max),
        daysWithLogs[0]
      );
      const lowestDay = daysWithLogs.reduce(
        (min, day) => (day.average! < min.average! ? day : min),
        daysWithLogs[0]
      );

      if (highestDay.average! > lowestDay.average! * 1.3) {
        insights.push(
          `📅 ${highestDay.day}s tend to be highest, ${lowestDay.day}s lowest`
        );
      }
    }

    return insights;
  };

  const calculateStats = (variableLogs: ManualLog[]): VariableStats => {
    const numericLogs = variableLogs.filter((log) => isNumeric(log.value));
    const values = numericLogs.map((log) => parseFloat(log.value));

    if (values.length === 0) {
      const daysOfWeek = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      return {
        average: 0,
        min: 0,
        max: 0,
        latest: 0,
        trend: "stable",
        changePercentage: 0,
        streak: 0,
        totalLogs: 0,
        weeklyPattern: daysOfWeek.map((day) => ({
          day,
          average: null,
          hasLogs: false,
        })),
        insights: [],
      };
    }

    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = values[values.length - 1];

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

    const sortedLogs = [...numericLogs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    let streak = 0;
    let lastDate = new Date();

    for (const log of sortedLogs) {
      const logDate = new Date(log.date);
      const daysDiff = differenceInDays(lastDate, logDate);

      if (daysDiff <= 1) {
        streak++;
        lastDate = logDate;
      } else {
        break;
      }
    }

    const weeklyData: { [key: string]: number[] } = {};
    numericLogs.forEach((log) => {
      const day = format(parseISO(log.date), "EEEE");
      if (!weeklyData[day]) weeklyData[day] = [];
      weeklyData[day].push(parseFloat(log.value));
    });

    // Create weekly pattern for all days Monday-Sunday
    const daysOfWeek = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const weeklyPattern = daysOfWeek.map((day) => {
      const dayValues = weeklyData[day];
      return {
        day,
        average: dayValues
          ? dayValues.reduce((sum, val) => sum + val, 0) / dayValues.length
          : null,
        hasLogs: !!dayValues,
      };
    });

    const baseStats: VariableStats = {
      average: Math.round(average * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      latest: Math.round(latest * 100) / 100,
      trend,
      changePercentage: Math.round(changePercentage * 100) / 100,
      streak,
      totalLogs: numericLogs.length,
      weeklyPattern,
      insights: [],
    };

    baseStats.insights = generateInsights(baseStats);
    return baseStats;
  };

  const prepareChartData = () => {
    if (!selectedVariable) return null;

    const variableLogs = logs.filter(
      (log) => log.variable === selectedVariable
    );
    const numericLogs = variableLogs.filter((log) => isNumeric(log.value));

    if (numericLogs.length === 0) return null;

    const color = getVariableColor(selectedVariable);
    const data = numericLogs.map((log) => parseFloat(log.value));

    return {
      labels: numericLogs.map((log) => formatDate(log.date)),
      datasets: [
        {
          label: selectedVariable,
          data,
          borderColor: color,
          backgroundColor: chartType === "bar" ? color + "80" : color + "20",
          fill: chartType === "line" ? false : true,
          tension: 0.3,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
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
        title: { display: true, text: "Date" },
      },
      y: {
        display: true,
        title: { display: true, text: "Value" },
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };

  const variableStats = useMemo(() => {
    if (!selectedVariable) return null;
    const variableLogs = logs.filter(
      (log) => log.variable === selectedVariable
    );
    return calculateStats(variableLogs);
  }, [logs, selectedVariable]);

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
        No manual logs found for the selected time range. Start logging data to
        see your insights!
      </Alert>
    );
  }

  const variables = getUniqueVariables();
  const numericVariables = variables.filter((variable) =>
    logs.some((log) => log.variable === variable && isNumeric(log.value))
  );

  const chartData = prepareChartData();

  return (
    <Box>
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
        <Typography variant="h6" component="h3">
          🔍 Enhanced Analytics
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
            <InputLabel>Variable</InputLabel>
            <Select
              value={selectedVariable}
              label="Variable"
              onChange={handleVariableChange}
            >
              {numericVariables.map((variable) => (
                <MenuItem key={variable} value={variable}>
                  {variable}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={handleChartTypeChange}
            size="small"
          >
            <ToggleButton value="line" aria-label="line chart">
              <ShowChartIcon />
            </ToggleButton>
            <ToggleButton value="bar" aria-label="bar chart">
              <AssessmentIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {numericVariables.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No numeric variables found for charting. Charts can only display
          numeric values.
        </Alert>
      ) : selectedVariable && chartData && variableStats ? (
        <Stack spacing={3}>
          {/* Statistics Cards */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {/* Day Streak - First */}
            <Box
              sx={{
                flex: {
                  xs: "1 1 100%",
                  sm: "1 1 calc(50% - 8px)",
                  md: "1 1 calc(25% - 12px)",
                },
              }}
            >
              <Card>
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

            {/* Average - Third */}
            <Box
              sx={{
                flex: {
                  xs: "1 1 100%",
                  sm: "1 1 calc(50% - 8px)",
                  md: "1 1 calc(25% - 12px)",
                },
              }}
            >
              <Card>
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
            </Box>
            {/* Trend - Fourth */}
            <Box
              sx={{
                flex: {
                  xs: "1 1 100%",
                  sm: "1 1 calc(50% - 8px)",
                  md: "1 1 calc(25% - 12px)",
                },
              }}
            >
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
                <Card sx={{ cursor: "help" }}>
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
            </Box>
          </Box>

          {/* Chart */}
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h4">
                  {selectedVariable}
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
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
              </Box>
              <Box sx={{ height: 400 }}>
                {chartType === "line" ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <Bar data={chartData} options={chartOptions} />
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Weekly Pattern */}
          <Card>
            <CardContent>
              <Typography variant="h6" component="h4" gutterBottom>
                Weekly Pattern
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Average values by day of week
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {variableStats.weeklyPattern.map((day) => (
                  <Chip
                    key={day.day}
                    label={`${day.day.substring(0, 3)}: ${
                      day.hasLogs ? day.average!.toFixed(1) : "No logs"
                    }`}
                    size="small"
                    variant={day.hasLogs ? "outlined" : "filled"}
                    color={day.hasLogs ? "default" : "secondary"}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Stack>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>
          Select a variable to view its analytics and insights.
        </Alert>
      )}
    </Box>
  );
}
