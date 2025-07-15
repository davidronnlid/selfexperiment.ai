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
  LinearProgress,
  Grid,
} from "@mui/material";
import { Line } from "react-chartjs-2";
import { supabase } from "@/utils/supaBase";
import { format, parseISO } from "date-fns";
import {
  Sync as SyncIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
  Scale as ScaleIcon,
  FitnessCenter as FitnessIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

interface WithingsData {
  id: number;
  user_id: string;
  date: string;
  variable: string;
  value: number;
}

interface WithingsIntegrationProps {
  userId: string;
}

const METRIC_LABELS: { [key: string]: string } = {
  weight: "Weight (kg)",
  fat_free_mass_kg: "Fat-Free Mass (kg)",
  fat_ratio: "Fat Ratio (%)",
  fat_mass_weight_kg: "Fat Mass (kg)",
  muscle_mass_kg: "Muscle Mass (kg)",
  hydration_kg: "Hydration (kg)",
  bone_mass_kg: "Bone Mass (kg)",
};

const METRIC_COLORS: { [key: string]: string } = {
  weight: "#3b82f6",
  fat_free_mass_kg: "#10b981",
  fat_ratio: "#f59e0b",
  fat_mass_weight_kg: "#ef4444",
  muscle_mass_kg: "#8b5cf6",
  hydration_kg: "#06b6d4",
  bone_mass_kg: "#84cc16",
};

const METRIC_ICONS: { [key: string]: React.ReactNode } = {
  weight: <ScaleIcon />,
  fat_free_mass_kg: <FitnessIcon />,
  fat_ratio: <TrendingUpIcon />,
  fat_mass_weight_kg: <TrendingUpIcon />,
  muscle_mass_kg: <FitnessIcon />,
  hydration_kg: <TrendingUpIcon />,
  bone_mass_kg: <FitnessIcon />,
};

export default function WithingsIntegration({
  userId,
}: WithingsIntegrationProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reimporting, setReimporting] = useState(false);
  const [data, setData] = useState<WithingsData[]>([]);
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(
    new Set()
  );
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [reimportProgress, setReimportProgress] = useState<any>(null);

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      const { data: tokens } = await supabase
        .from("withings_tokens")
        .select("access_token, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      setConnected(!!tokens && tokens.length > 0);
      if (tokens && tokens.length > 0) {
        setLastSync(tokens[0].created_at);
      }
    } catch (error) {
      console.error("Error checking Withings connection:", error);
      setConnected(false);
    }
  }, [userId]);

  // Fetch Withings data
  const fetchData = useCallback(async () => {
    if (!connected) return;

    try {
      setLoading(true);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { data: withingsData, error } = await supabase
        .from("withings_variable_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("date", twoWeeksAgo.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (error) throw error;
      setData(withingsData || []);
    } catch (error) {
      console.error("Error fetching Withings data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, connected]);

  // Sync recent Withings data
  const syncData = async () => {
    if (!connected) return;

    try {
      setSyncing(true);
      const now = new Date();
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(now.getDate() - 14);

      const startdate = Math.floor(twoWeeksAgo.getTime() / 1000);
      const enddate = Math.floor(now.getTime() / 1000);

      const response = await fetch(
        `/api/withings/fetch?startdate=${startdate}&enddate=${enddate}&meastype=1,5,6,8,76,77,88`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        await fetchData();
        setLastSync(new Date().toISOString());
      } else {
        console.error("Failed to sync Withings data");
      }
    } catch (error) {
      console.error("Error syncing Withings data:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Reimport all historical data
  const reimportData = async () => {
    if (!connected) return;

    try {
      setReimporting(true);
      setReimportProgress(null);

      const { data: tokens } = await supabase
        .from("withings_tokens")
        .select("access_token")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!tokens || tokens.length === 0) {
        throw new Error("No access token found");
      }

      const response = await fetch("/api/withings/reimport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          accessToken: tokens[0].access_token,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setReimportProgress(result);
        await fetchData();
        setLastSync(new Date().toISOString());
      } else {
        console.error("Failed to reimport Withings data:", result);
      }
    } catch (error) {
      console.error("Error reimporting Withings data:", error);
    } finally {
      setReimporting(false);
    }
  };

  // Connect to Withings
  const handleConnect = async () => {
    window.location.href = "/api/withings/auth";
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

  const getMetricData = (metric: string) => {
    return data
      .filter((d) => d.variable === metric)
      .map((d) => ({
        date: d.date,
        value: d.value,
      }));
  };

  const getMetricStats = (metricData: { date: string; value: number }[]) => {
    if (metricData.length === 0) return { avg: 0, min: 0, max: 0, latest: 0 };

    const values = metricData.map((d) => d.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = values[values.length - 1];

    return { avg, min, max, latest };
  };

  const formatValue = (metric: string, value: number) => {
    if (metric === "fat_ratio") {
      return `${value.toFixed(1)}%`;
    }
    return `${value.toFixed(1)} kg`;
  };

  const availableMetrics = Object.keys(METRIC_LABELS).filter((metric) => {
    return data.some((d) => d.variable === metric);
  });

  if (!connected) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <ScaleIcon sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6">Withings Integration</Typography>
          </Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Connect your Withings scale to track weight, body composition, and
            health metrics.
          </Alert>
          <Button
            variant="contained"
            onClick={handleConnect}
            startIcon={<ScaleIcon />}
          >
            Connect Withings
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
            <ScaleIcon sx={{ mr: 1, color: "success.main" }} />
            <Typography variant="h6">Withings Data</Typography>
            <Chip
              label="Connected"
              color="success"
              size="small"
              sx={{ ml: 1 }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              onClick={syncData}
              disabled={syncing || reimporting}
              startIcon={
                syncing ? <CircularProgress size={16} /> : <SyncIcon />
              }
              size="small"
            >
              {syncing ? "Syncing..." : "Sync Recent"}
            </Button>
            <Button
              variant="outlined"
              onClick={reimportData}
              disabled={syncing || reimporting}
              startIcon={
                reimporting ? <CircularProgress size={16} /> : <RefreshIcon />
              }
              size="small"
            >
              {reimporting ? "Reimporting..." : "Reimport All"}
            </Button>
          </Box>
        </Box>

        {lastSync && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Last synced: {format(parseISO(lastSync), "PPp")}
          </Typography>
        )}

        {reimportProgress && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Reimport completed: {reimportProgress.upserted} data points
              imported
            </Typography>
          </Alert>
        )}

        {reimporting && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Reimporting historical data...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : data.length === 0 ? (
          <Alert severity="info">
            No Withings data found. Try syncing your data or check your Withings
            connection.
          </Alert>
        ) : (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              📊 Body Composition (Last 14 Days)
            </Typography>

            <Grid container spacing={2}>
              {availableMetrics.map((metric) => {
                const metricData = getMetricData(metric);
                const stats = getMetricStats(metricData);
                const isExpanded = expandedMetrics.has(metric);

                if (metricData.length === 0) return null;

                return (
                  <Grid size={{ xs: 12, md: 6 }} key={metric}>
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
                                {METRIC_LABELS[metric]}
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
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                              <Grid size={4}>
                                <Typography
                                  variant="body2"
                                  color="textSecondary"
                                >
                                  Average
                                </Typography>
                                <Typography variant="body1">
                                  {formatValue(metric, stats.avg)}
                                </Typography>
                              </Grid>
                              <Grid size={4}>
                                <Typography
                                  variant="body2"
                                  color="textSecondary"
                                >
                                  Min
                                </Typography>
                                <Typography variant="body1">
                                  {formatValue(metric, stats.min)}
                                </Typography>
                              </Grid>
                              <Grid size={4}>
                                <Typography
                                  variant="body2"
                                  color="textSecondary"
                                >
                                  Max
                                </Typography>
                                <Typography variant="body1">
                                  {formatValue(metric, stats.max)}
                                </Typography>
                              </Grid>
                            </Grid>

                            <Box sx={{ height: 200 }}>
                              <Line
                                data={{
                                  labels: metricData.map((d) =>
                                    format(parseISO(d.date), "MMM dd")
                                  ),
                                  datasets: [
                                    {
                                      label: METRIC_LABELS[metric],
                                      data: metricData.map((d) => d.value),
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
                          </Box>
                        </Collapse>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 2 }}>
              📋 Recent Measurements
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Variable</TableCell>
                    <TableCell align="right">Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data
                    .slice(-10)
                    .reverse()
                    .map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {format(parseISO(item.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell align="right">
                          {METRIC_LABELS[item.variable] || item.variable}
                        </TableCell>
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
      </CardContent>
    </Card>
  );
}
