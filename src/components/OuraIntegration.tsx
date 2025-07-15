import React, { useState, useEffect, useCallback } from "react";
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
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
  Bedtime as BedtimeIcon,
  FitnessCenter as FitnessIcon,
  Thermostat as ThermostatIcon,
} from "@mui/icons-material";

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
  raw?: any;
  created_at: string;
}

interface OuraIntegrationProps {
  userId: string;
}

const METRIC_LABELS: { [key: string]: string } = {
  readiness_score: "Readiness Score",
  sleep_score: "Sleep Score",
  total_sleep_duration: "Total Sleep Duration (min)",
  rem_sleep_duration: "REM Sleep Duration (min)",
  deep_sleep_duration: "Deep Sleep Duration (min)",
  efficiency: "Sleep Efficiency (%)",
  sleep_latency: "Sleep Latency (min)",
  temperature_deviation: "Temperature Deviation (°C)",
  temperature_trend_deviation: "Temperature Trend Deviation (°C)",
  hr_lowest_true: "Lowest Heart Rate (bpm)",
  hr_average_true: "Average Heart Rate (bpm)",
};

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

const METRIC_ICONS: { [key: string]: React.ReactNode } = {
  readiness_score: <FitnessIcon />,
  sleep_score: <BedtimeIcon />,
  total_sleep_duration: <BedtimeIcon />,
  rem_sleep_duration: <BedtimeIcon />,
  deep_sleep_duration: <BedtimeIcon />,
  efficiency: <TrendingUpIcon />,
  sleep_latency: <BedtimeIcon />,
  temperature_deviation: <ThermostatIcon />,
  temperature_trend_deviation: <ThermostatIcon />,
  hr_lowest_true: <FitnessIcon />,
  hr_average_true: <FitnessIcon />,
};

export default function OuraIntegration({ userId }: OuraIntegrationProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<OuraData[]>([]);
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(
    new Set()
  );
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      // Get current user session first
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.log("[Oura Integration] No authenticated user");
        setConnected(false);
        setLoading(false);
        return;
      }

      const actualUserId = session.user.id;
      console.log("[Oura Integration] Checking tokens for user:", actualUserId);

      const { data: tokens, error } = await supabase
        .from("oura_tokens")
        .select("access_token, created_at")
        .eq("user_id", actualUserId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error checking Oura tokens:", error);
        setConnected(false);
        setLoading(false);
        return;
      }

      console.log("[Oura Integration] Found tokens:", tokens?.length || 0);
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
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { data: ouraData, error } = await supabase
        .from("oura_variable_logs")
        .select("id, source, variable_id, date, value, raw, created_at")
        .eq("user_id", userId)
        .gte("date", twoWeeksAgo.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (error) throw error;
      setData(ouraData || []);
    } catch (error) {
      console.error("Error fetching Oura data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, connected]);

  // Sync Oura data
  const syncData = async () => {
    if (!connected) return;

    try {
      setSyncing(true);

      // Get the current session token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error("No session token available");
        return;
      }

      const response = await fetch("/api/oura/fetch", {
        method: "POST",
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

      // Get current user session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError("Please log in to connect your Oura account");
        return;
      }

      const actualUserId = session.user.id;
      console.log("[Oura Integration] Connecting Oura for user:", actualUserId);

      const response = await fetch("/api/oura/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: actualUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to generate Oura auth URL:", errorData);
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

  const toggleMetricExpansion = (metric: string) => {
    const newExpanded = new Set(expandedMetrics);
    if (newExpanded.has(metric)) {
      newExpanded.delete(metric);
    } else {
      newExpanded.add(metric);
    }
    setExpandedMetrics(newExpanded);
  };

  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.variable_id]) {
      acc[item.variable_id] = [];
    }
    acc[item.variable_id].push(item);
    return acc;
  }, {} as { [key: string]: OuraData[] });

  const formatValue = (metric: string, value: number) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "N/A";
    }

    if (metric.includes("duration")) {
      return `${Math.round(value / 60)} min`;
    }
    if (metric.includes("temperature")) {
      return `${value.toFixed(2)}°C`;
    }
    if (metric.includes("hr_")) {
      return `${value} bpm`;
    }
    if (metric === "efficiency") {
      return `${value}%`;
    }
    return value.toString();
  };

  const getMetricStats = (metricData: OuraData[]) => {
    const values = metricData
      .map((d) => d.value)
      .filter((v) => v !== null && v !== undefined && !isNaN(v));

    if (values.length === 0) {
      return { avg: 0, min: 0, max: 0, latest: 0 };
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = values[values.length - 1];

    return { avg, min, max, latest };
  };

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
            startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
          >
            {syncing ? "Syncing..." : "Sync Data"}
          </Button>
        </Box>

        {lastSync && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Last synced: {format(parseISO(lastSync), "PPp")}
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : data.length === 0 ? (
          <Alert severity="info">
            No Oura data found. Try syncing your data or check your Oura Ring
            connection.
          </Alert>
        ) : (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              📊 Data Summary (Last 14 Days)
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {Object.entries(groupedData).map(([metric, metricData]) => {
                const stats = getMetricStats(metricData);
                const isExpanded = expandedMetrics.has(metric);

                return (
                  <Box
                    key={metric}
                    sx={{ width: { xs: "100%", md: "50%" }, p: 1 }}
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
                            {METRIC_ICONS[metric] || <TrendingUpIcon />}
                            <Box sx={{ ml: 1 }}>
                              <Typography variant="subtitle1">
                                {METRIC_LABELS[metric] || metric}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                Latest: {formatValue(metric, stats.latest)}
                              </Typography>
                            </Box>
                          </Box>
                          <IconButton
                            onClick={() => toggleMetricExpansion(metric)}
                            size="small"
                          >
                            {isExpanded ? (
                              <ExpandLessIcon />
                            ) : (
                              <ExpandMoreIcon />
                            )}
                          </IconButton>
                        </Box>

                        <Collapse in={isExpanded}>
                          <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                              <Box sx={{ flex: 1, textAlign: "center" }}>
                                <Typography
                                  variant="body2"
                                  color="textSecondary"
                                >
                                  Average
                                </Typography>
                                <Typography variant="body1">
                                  {formatValue(metric, stats.avg)}
                                </Typography>
                              </Box>
                              <Box sx={{ flex: 1, textAlign: "center" }}>
                                <Typography
                                  variant="body2"
                                  color="textSecondary"
                                >
                                  Min
                                </Typography>
                                <Typography variant="body1">
                                  {formatValue(metric, stats.min)}
                                </Typography>
                              </Box>
                              <Box sx={{ flex: 1, textAlign: "center" }}>
                                <Typography
                                  variant="body2"
                                  color="textSecondary"
                                >
                                  Max
                                </Typography>
                                <Typography variant="body1">
                                  {formatValue(metric, stats.max)}
                                </Typography>
                              </Box>
                            </Box>

                            {metricData.filter(
                              (d) =>
                                d.value !== null &&
                                d.value !== undefined &&
                                !isNaN(d.value)
                            ).length > 0 ? (
                              <Box sx={{ height: 200 }}>
                                <Line
                                  data={{
                                    labels: metricData
                                      .filter(
                                        (d) =>
                                          d.value !== null &&
                                          d.value !== undefined &&
                                          !isNaN(d.value)
                                      )
                                      .map((d) =>
                                        format(parseISO(d.date), "MMM dd")
                                      ),
                                    datasets: [
                                      {
                                        label: METRIC_LABELS[metric] || metric,
                                        data: metricData
                                          .filter(
                                            (d) =>
                                              d.value !== null &&
                                              d.value !== undefined &&
                                              !isNaN(d.value)
                                          )
                                          .map((d) => d.value),
                                        borderColor:
                                          METRIC_COLORS[metric] || "#3b82f6",
                                        backgroundColor: `${
                                          METRIC_COLORS[metric] || "#3b82f6"
                                        }20`,
                                        fill: false,
                                        tension: 0.2,
                                      },
                                    ],
                                  }}
                                  options={{
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
                                  }}
                                />
                              </Box>
                            ) : (
                              <Box
                                sx={{
                                  height: 200,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  color="textSecondary"
                                >
                                  No valid data available for chart
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </CardContent>
                    </Card>
                  </Box>
                );
              })}
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 2 }}>
              📋 Recent Data
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data
                    .slice(-20)
                    .reverse()
                    .map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {format(parseISO(item.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {METRIC_LABELS[item.variable_id] || item.variable_id}
                        </TableCell>
                        <TableCell align="right">
                          {formatValue(item.variable_id, item.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
