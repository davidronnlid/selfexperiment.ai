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
} from "@mui/icons-material";
import Link from "next/link";
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

interface OuraData {
  id: string;
  source: string;
  variable_id: string;
  date: string;
  value: number;
  raw?: Record<string, unknown>;
  created_at: string;
}

interface OuraIntegrationProps {
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

// Use the new utility function for labels
const getMetricLabel = (variableId: string) => getOuraVariableLabel(variableId);

const METRIC_COLORS: { [key: string]: string } = {
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
};

export default function OuraIntegration({ userId }: OuraIntegrationProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<OuraData[]>([]);
  const [timeRange, setTimeRange] = useState<string>("30");
  const [selectedVariable, setSelectedVariable] = useState<string>("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [variableSlugs, setVariableSlugs] = useState<Record<string, string>>(
    {}
  );

  // Utility functions
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM dd");
    } catch {
      return dateString;
    }
  };

  const getVariableColor = (variable: string) => {
    return METRIC_COLORS[variable] || "#3b82f6";
  };

  // Memoize unique variables
  const uniqueVariables = useMemo(() => {
    const variables = new Set(data.map((item) => item.variable_id));
    return Array.from(variables).sort();
  }, [data]);

  // Calculate variable statistics
  const calculateStats = useCallback(
    (variableData: OuraData[]): VariableStats => {
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
        average: Math.round(average * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        latest: Math.round(latest * 100) / 100,
        trend,
        changePercentage: Math.round(changePercentage * 100) / 100,
        streak,
        totalLogs: values.length,
      };
    },
    []
  );

  // Memoize selected variable data
  const selectedVariableData = useMemo(() => {
    return data.filter((item) => item.variable_id === selectedVariable);
  }, [data, selectedVariable]);

  // Memoize chart data
  const chartData = useMemo(() => {
    if (!selectedVariable || selectedVariableData.length === 0) {
      return null;
    }

    const sortedData = selectedVariableData
      .filter(
        (d) => d.value !== null && d.value !== undefined && !isNaN(d.value)
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      labels: sortedData.map((item) => formatDate(item.date)),
      datasets: [
        {
          label: getMetricLabel(selectedVariable),
          data: sortedData.map((item) => item.value),
          borderColor: getVariableColor(selectedVariable),
          backgroundColor: getVariableColor(selectedVariable) + "20",
          fill: false,
          tension: 0.1,
        },
      ],
    };
  }, [selectedVariable, selectedVariableData]);

  // Memoize stats calculation
  const variableStats = useMemo(() => {
    return calculateStats(selectedVariableData);
  }, [selectedVariableData, calculateStats]);

  const formatValue = (metric: string, value: number) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "No data";
    }

    // Use the new utility function for formatting
    try {
      return formatOuraVariableValue(metric, value);
    } catch (error) {
      console.warn("Error formatting Oura value:", error);
      // For sleep duration metrics, show in hours if it's a large number (likely minutes)
      if (metric.includes("duration") && value > 100) {
        return `${(value / 60).toFixed(1)} hours`;
      }
      return value.toString();
    }
  };

  const chartOptions = {
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
      x: {
        grid: { display: false },
      },
      y: {
        beginAtZero: false,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
      },
    },
  };

  // Event handlers
  const handleTimeRangeChange = useCallback((event: SelectChangeEvent) => {
    setTimeRange(event.target.value);
  }, []);

  const handleVariableChange = useCallback((event: SelectChangeEvent) => {
    setSelectedVariable(event.target.value);
  }, []);

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setConnected(false);
        setLoading(false);
        return;
      }

      const { data: tokens, error } = await supabase
        .from("oura_tokens")
        .select("access_token, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error checking Oura tokens:", error);
        setConnected(false);
        setLoading(false);
        return;
      }

      const hasValidToken =
        tokens && tokens.length > 0 && tokens[0].access_token;
      setConnected(!!hasValidToken);

      if (hasValidToken) {
        setLastSync(tokens[0].created_at);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error checking Oura connection:", error);
      setConnected(false);
      setLoading(false);
    }
  }, []);

  // Fetch Oura data
  const fetchData = useCallback(async () => {
    if (!connected) return;

    try {
      setLoading(true);
      const daysBack = parseInt(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const { data: ouraData, error } = await supabase
        .from("oura_variable_data_points")
        .select("id, source, variable_id, date, value, raw, created_at")
        .eq("user_id", userId)
        .gte("date", cutoffDate.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (error) throw error;

      // Filter out null values but keep records with 0 values
      const filteredData = (ouraData || []).filter(
        (item) => item.value !== null && item.value !== undefined
      );

      console.log(
        `[OuraIntegration] Fetched ${ouraData?.length || 0} total records, ${
          filteredData.length
        } with valid values`
      );

      setData(filteredData);
    } catch (error) {
      console.error("Error fetching Oura data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, connected, timeRange]);

  // Sync Oura data
  const syncData = async () => {
    if (!connected) return;

    try {
      setSyncing(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error("No session token available");
        return;
      }

      const response = await fetch(`/api/oura/fetch?user_id=${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        await fetchData();
        setLastSync(new Date().toISOString());
      } else {
        console.error("Failed to sync Oura data");
      }
    } catch (error) {
      console.error("Error syncing Oura data:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Connect to Oura
  const handleConnect = async () => {
    try {
      setError(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError("Please log in to connect your Oura account");
        return;
      }

      const response = await fetch("/api/oura/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(
          errorData.error || "Failed to connect to Oura. Please try again."
        );
        return;
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error connecting to Oura:", error);
      setError(
        "Failed to connect to Oura. Please check your internet connection and try again."
      );
    }
  };

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    if (connected) {
      fetchData();
    }
  }, [connected, fetchData]);

  // Auto-select first variable
  useEffect(() => {
    if (uniqueVariables.length > 0 && !selectedVariable) {
      setSelectedVariable(uniqueVariables[0]);
    }
  }, [uniqueVariables, selectedVariable]);

  // Fetch variable slugs mapping
  useEffect(() => {
    const fetchVariableSlugs = async () => {
      try {
        const { data: variables, error } = await supabase
          .from("variables")
          .select("id, slug")
          .eq("is_active", true);

        if (!error && variables) {
          const slugMap: Record<string, string> = {};
          variables.forEach((variable) => {
            slugMap[variable.id] = variable.slug;
          });
          setVariableSlugs(slugMap);
        }
      } catch (error) {
        console.error("Error fetching variable slugs:", error);
      }
    };

    fetchVariableSlugs();
  }, []);

  if (!connected) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <FitnessIcon sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6">Oura Ring Integration</Typography>
          </Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Connect your Oura Ring to track sleep, readiness, and heart rate
            data.
          </Alert>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            variant="contained"
            onClick={handleConnect}
            startIcon={<FitnessIcon />}
            disabled={!!error}
          >
            Connect Oura Ring
          </Button>
        </CardContent>
      </Card>
    );
  }

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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FitnessIcon sx={{ mr: 1, color: "success.main" }} />
              <Typography variant="h6">Oura Ring Data</Typography>
              <Chip
                label="Connected"
                color="success"
                size="small"
                sx={{ ml: 1 }}
              />
            </Box>
            <Button
              variant="outlined"
              onClick={syncData}
              disabled={syncing}
              startIcon={
                syncing ? <CircularProgress size={16} /> : <SyncIcon />
              }
            >
              {syncing ? "Syncing..." : "Sync Data"}
            </Button>
          </Box>
          <Alert severity="info">
            No Oura data with valid values found. This could mean:
            <ul style={{ marginTop: "8px", marginBottom: 0 }}>
              <li>The ring wasn't worn during the selected time period</li>
              <li>Data is still syncing from Oura servers</li>
              <li>Try syncing data or check your Oura Ring connection</li>
            </ul>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box className="space-y-6">
      {/* Header Section */}
      <Box className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <Box className="flex items-center gap-3">
          <Box className="p-2 bg-gold/10 rounded-lg">
            <FitnessIcon className="text-gold text-xl" />
          </Box>
          <Box>
            <Typography variant="h5" className="text-white font-semibold">
              Oura Ring Data
            </Typography>
            <Typography variant="body2" className="text-text-secondary">
              {data.length} data points • Last {timeRange} days
            </Typography>
          </Box>
        </Box>

        <Box className="flex items-center gap-2">
          <Chip label="Connected" color="success" size="small" />
          <Button
            variant="outlined"
            onClick={syncData}
            disabled={syncing}
            startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
            sx={{ minWidth: 120 }}
          >
            {syncing ? "Syncing..." : "Sync Data"}
          </Button>
        </Box>
      </Box>

      {/* Data Quality Information */}
      {data.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography
              variant="h6"
              sx={{ mb: 2, display: "flex", alignItems: "center" }}
            >
              💡 About Your Oura Data
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Data Availability:</strong> Oura metrics are only
                available when the ring detects sufficient data quality.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Sleep Data:</strong> Requires wearing the ring for at
                least 3+ hours during sleep periods.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Readiness/Temperature:</strong> Available most days when
                the ring is worn regularly.
              </Typography>
              {uniqueVariables.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Available metrics:</strong>{" "}
                  {uniqueVariables.join(", ")}
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {selectedVariable && (
        <Box>
          {/* Stats Cards */}
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
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

            <Card sx={{ flex: "1 1 200px", minWidth: 200 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <TimelineIcon sx={{ mr: 1, color: "secondary.main" }} />
                  <Typography variant="h6" component="div">
                    {variableStats.latest}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Latest
                </Typography>
              </CardContent>
            </Card>

            <Tooltip
              title={
                <Box>
                  <Typography variant="body2">
                    {variableStats.changePercentage > 5
                      ? `📈 Strong ${
                          variableStats.trend === "up" ? "Upward" : "Stable"
                        } Trend: Recent data points are ${variableStats.changePercentage.toFixed(
                          1
                        )}% higher.`
                      : variableStats.changePercentage < -5
                      ? `📉 Strong Downward Trend: Recent data points are ${Math.abs(
                          variableStats.changePercentage
                        ).toFixed(1)}% lower.`
                      : `📊 Stable Trend: Recent data shows minimal change (${variableStats.changePercentage.toFixed(
                          1
                        )}%).`}
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

          {/* Filter Controls */}
          <Box
            sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 2 }}
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
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Metric</InputLabel>
              <Select
                value={selectedVariable}
                label="Metric"
                onChange={handleVariableChange}
              >
                {uniqueVariables.map((variable) => (
                  <MenuItem key={variable} value={variable}>
                    {getMetricLabel(variable)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Chart */}
          {chartData && (
            <Card>
              <CardContent>
                <Typography variant="h6" component="h4" sx={{ mb: 1 }}>
                  {getMetricLabel(selectedVariable)}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
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
                    label={`Range: ${variableStats.min} - ${variableStats.max}`}
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

      <Divider sx={{ my: 3 }} />

      {/* Table Section */}
      <Card
        sx={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📋 Recent Data
          </Typography>
        </CardContent>

        <TableContainer
          sx={{
            maxHeight: 600,
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
            },
            "&::-webkit-scrollbar-track": {
              background: "var(--surface-dark)",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "var(--gold)",
              borderRadius: "4px",
            },
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    background: "var(--surface-dark)",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    borderBottom: "2px solid var(--border)",
                  }}
                >
                  Date
                </TableCell>
                <TableCell
                  sx={{
                    background: "var(--surface-dark)",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    borderBottom: "2px solid var(--border)",
                  }}
                >
                  Metric
                </TableCell>
                <TableCell
                  sx={{
                    background: "var(--surface-dark)",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    borderBottom: "2px solid var(--border)",
                  }}
                  align="right"
                >
                  Value
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data
                .slice(-20)
                .reverse()
                .map((item, index) => (
                  <TableRow
                    key={index}
                    hover
                    sx={{
                      transition: "all var(--transition-fast)",
                      "&:hover": {
                        background: "var(--surface-light)",
                      },
                    }}
                  >
                    <TableCell
                      sx={{
                        color: "var(--text-secondary)",
                        borderBottom: "1px solid var(--border-light)",
                      }}
                    >
                      {format(parseISO(item.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "var(--text-primary)",
                        borderBottom: "1px solid var(--border-light)",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            backgroundColor: getVariableColor(item.variable_id),
                          }}
                        />
                        <Link
                          href={`/variable/${encodeURIComponent(
                            variableSlugs[item.variable_id] || item.variable_id
                          )}`}
                          style={{
                            color: "inherit",
                            textDecoration: "none",
                          }}
                        >
                          {getMetricLabel(item.variable_id)}
                        </Link>
                      </Box>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: "var(--text-primary)",
                        borderBottom: "1px solid var(--border-light)",
                        fontWeight: 500,
                      }}
                    >
                      {formatValue(item.variable_id, item.value)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {lastSync && (
        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Typography variant="body2" color="textSecondary">
            Last synced: {format(parseISO(lastSync), "PPp")}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
