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
} from "@mui/icons-material";
import {
  getOuraVariableLabel,
  getOuraVariableInfo,
  formatOuraVariableValue,
  getOuraVariableInterpretation,
  OURA_VARIABLES,
} from "@/utils/ouraVariableUtils";
import { formatLargeNumber } from "@/utils/numberFormatting";

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
  source: "oura" | "withings";
  variable: string;
  date: string;
  value: number;
  user_id: string;
  created_at?: string;
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
};

export default function UnifiedHealthDashboard({
  userId,
}: HealthIntegrationProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HealthData[]>([]);
  const [timeRange, setTimeRange] = useState<string>("30");
  const [selectedVariable, setSelectedVariable] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<
    "all" | "oura" | "withings"
  >("all");
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(
    new Set()
  );
  const [activeTab, setActiveTab] = useState(0);

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
        .filter((v) => v !== null && v !== undefined && !isNaN(v));

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
  const formatValue = useCallback((variable: string, value: number) => {
    if (variable.includes("duration")) {
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
    if (variable.includes("ratio") || variable.includes("efficiency")) {
      return `${value.toFixed(1)}%`;
    }
    if (
      variable.includes("weight") ||
      variable.includes("mass") ||
      variable === "weight"
    ) {
      return `${value.toFixed(1)} kg`;
    }
    if (variable.includes("temperature")) {
      return `${value.toFixed(2)}°C`;
    }
    if (variable.includes("hr_")) {
      return `${Math.round(value)} bpm`;
    }
    if (variable.includes("score")) {
      return `${Math.round(value)}`;
    }
    return value.toFixed(1);
  }, []);

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

      // Combine and transform data
      const combinedData: HealthData[] = [
        ...(ouraData || []).map((item) => ({
          id: item.id,
          source: "oura" as const,
          variable: item.variable_id,
          date: item.date,
          value: item.value,
          user_id: item.user_id,
          created_at: item.created_at,
        })),
        ...(withingsData || []).map((item) => ({
          id: item.id,
          source: "withings" as const,
          variable: item.variable,
          date: item.date,
          value: item.value,
          user_id: item.user_id,
          created_at: item.created_at,
        })),
      ];

      console.log("[UnifiedHealthDashboard] Fetched data:", {
        oura: ouraData?.length || 0,
        withings: withingsData?.length || 0,
        total: combinedData.length,
      });

      setData(combinedData);
    } catch (error) {
      console.error("Error fetching health data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
    setSelectedSource(event.target.value as "all" | "oura" | "withings");
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
          data: variableData.map((d) => d.value),
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
    fetchData();
  }, [fetchData]);

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

  if (data.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📊 Health Data Dashboard
          </Typography>
          <Alert severity="info">
            No health data found. Connect your Oura ring or Withings scale to
            start tracking your health metrics.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        📊 Health Data Dashboard
      </Typography>

      {/* Summary Cards */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box
          sx={{
            flex: {
              xs: "1 1 100%",
              sm: "1 1 calc(50% - 8px)",
              md: "1 1 calc(25% - 8px)",
            },
          }}
        >
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <BedIcon sx={{ mr: 1, color: "primary.main" }} />
                <Box>
                  <Typography variant="h6">
                    {formatLargeNumber(
                      data.filter((d) => d.source === "oura").length
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Oura Records
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box
          sx={{
            flex: {
              xs: "1 1 100%",
              sm: "1 1 calc(50% - 8px)",
              md: "1 1 calc(25% - 8px)",
            },
          }}
        >
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <ScaleIcon sx={{ mr: 1, color: "secondary.main" }} />
                <Box>
                  <Typography variant="h6">
                    {formatLargeNumber(
                      data.filter((d) => d.source === "withings").length
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Withings Records
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box
          sx={{
            flex: {
              xs: "1 1 100%",
              sm: "1 1 calc(50% - 8px)",
              md: "1 1 calc(25% - 8px)",
            },
          }}
        >
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <TimelineIcon sx={{ mr: 1, color: "success.main" }} />
                <Box>
                  <Typography variant="h6">
                    {formatLargeNumber(availableMetrics.length)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Variables Tracked
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box
          sx={{
            flex: {
              xs: "1 1 100%",
              sm: "1 1 calc(50% - 8px)",
              md: "1 1 calc(25% - 8px)",
            },
          }}
        >
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <BarChartIcon sx={{ mr: 1, color: "warning.main" }} />
                <Box>
                  <Typography variant="h6">
                    {formatLargeNumber(data.length)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Records
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
        >
          <Tab label="Overview" />
          <Tab label="Detailed Charts" />
          <Tab label="All Data" />
        </Tabs>
      </Paper>

      {/* Overview Tab */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📈 Quick Overview
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {availableMetrics.slice(0, 6).map((variable) => {
              const variableData = getVariableData(variable);
              const stats = calculateStats(variableData);
              const isExpanded = expandedMetrics.has(variable);

              return (
                <Box
                  sx={{ flex: { xs: "1 1 100%", md: "1 1 calc(50% - 8px)" } }}
                  key={variable}
                >
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
                          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" color="textSecondary">
                                Average
                              </Typography>
                              <Typography variant="body1">
                                {formatValue(variable, stats.average)}
                              </Typography>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" color="textSecondary">
                                Min
                              </Typography>
                              <Typography variant="body1">
                                {formatValue(variable, stats.min)}
                              </Typography>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" color="textSecondary">
                                Max
                              </Typography>
                              <Typography variant="body1">
                                {formatValue(variable, stats.max)}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ height: 200 }}>
                            <Line
                              data={{
                                labels: variableData.map((d) =>
                                  formatDate(d.date)
                                ),
                                datasets: [
                                  {
                                    label: getVariableLabel(variable),
                                    data: variableData.map((d) => d.value),
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
                </Box>
              );
            })}
          </Box>
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
                <Grid item xs={12} sm={6} md={3}>
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
                <Grid item xs={12} sm={6} md={3}>
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
                <Grid item xs={12} sm={6} md={3}>
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
                <Grid item xs={12} sm={6} md={3}>
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

      {/* All Data Tab */}
      {activeTab === 2 && (
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
                        label={item.source === "oura" ? "Oura" : "Withings"}
                        size="small"
                        color={item.source === "oura" ? "primary" : "secondary"}
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
