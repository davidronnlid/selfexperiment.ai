import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supaBase";
import { useUser } from "../_app";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import { FaArrowLeft, FaChartLine, FaInfoCircle } from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { format, parseISO } from "date-fns";
import {
  getOuraVariableInfo,
  formatOuraVariableValue,
  getOuraVariableInterpretation,
} from "@/utils/ouraVariableUtils";
import { formatLargeNumber } from "@/utils/numberFormatting";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface OuraLogEntry {
  id: string;
  date: string;
  value: number;
  created_at: string;
  raw?: any;
}

export default function ReadinessScorePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [logs, setLogs] = useState<OuraLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("30");
  const [error, setError] = useState<string | null>(null);
  const [variableInfo, setVariableInfo] = useState<any>(null);

  const variableSlug = "readiness_score";
  const ouraVariableInfo = getOuraVariableInfo(variableSlug);

  useEffect(() => {
    if (userLoading) return;

    const initializePage = async () => {
      if (!ouraVariableInfo) {
        setError("Invalid Oura variable");
        setLoading(false);
        return;
      }

      if (!user) {
        setError("Please log in to view your Oura data");
        setLoading(false);
        return;
      }

      // Fetch the actual variable info from the database
      try {
        const { data: variableData, error } = await supabase
          .from("variables")
          .select("*")
          .eq("slug", variableSlug)
          .single();

        if (error || !variableData) {
          setError("Variable not found in database");
          setLoading(false);
          return;
        }

        setVariableInfo(variableData);
        await fetchLogs(variableData.id);
      } catch (err) {
        console.error("Error fetching variable info:", err);
        setError("Failed to load variable information");
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [user, userLoading, timeRange]);

  const fetchLogs = async (variableId?: string) => {
    if (!user || !variableInfo) return;

    try {
      setLoading(true);
      const daysBack = parseInt(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const { data: ouraData, error } = await supabase
        .from("oura_variable_data_points")
        .select("id, date, value, created_at, raw")
        .eq("user_id", user.id)
        .eq("variable_id", variableId || variableInfo.id)
        .gte("date", cutoffDate.toISOString().split("T")[0])
        .order("date", { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs(ouraData || []);
    } catch (err) {
      console.error("Error fetching Oura logs:", err);
      setError("Failed to load Oura data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const getStats = () => {
    if (logs.length === 0) return null;

    const values = logs
      .map((log) => log.value)
      .filter((v) => v !== null && v !== undefined);
    if (values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = logs[0]?.value;

    return {
      average: Math.round(average * 100) / 100,
      min,
      max,
      latest,
      count: values.length,
    };
  };

  const chartData =
    logs.length > 0
      ? {
          labels: logs
            .slice()
            .reverse()
            .map((log) => format(parseISO(log.date), "MMM dd")),
          datasets: [
            {
              label: ouraVariableInfo?.label || variableSlug,
              data: logs
                .slice()
                .reverse()
                .map((log) => log.value),
              borderColor: "#10b981",
              backgroundColor: "#10b98120",
              fill: false,
              tension: 0.1,
            },
          ],
        }
      : null;

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
  };

  if (loading || userLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Please log in to view your Oura data.</Alert>
      </Container>
    );
  }

  if (error || !variableInfo || !ouraVariableInfo) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<FaArrowLeft />}
          onClick={() => router.back()}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <Alert severity="error">{error || "Oura variable not found"}</Alert>
      </Container>
    );
  }

  const stats = getStats();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<FaArrowLeft />}
          onClick={() => router.back()}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <Typography
          variant="h3"
          component="h1"
          sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
        >
          <span>{ouraVariableInfo.icon}</span>
          {ouraVariableInfo.label}
        </Typography>
        <Typography variant="h6" color="textSecondary" sx={{ mb: 1 }}>
          {ouraVariableInfo.category} • {formatLargeNumber(logs.length)} data
          points
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Variable Information */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
              >
                <FaInfoCircle />
                About This Metric
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {ouraVariableInfo.description}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="textSecondary">
                    Unit:
                  </Typography>
                  <Typography variant="body2">
                    {ouraVariableInfo.unit}
                  </Typography>
                </Box>
                {ouraVariableInfo.normalRange && (
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      Normal Range:
                    </Typography>
                    <Typography variant="body2">
                      {ouraVariableInfo.normalRange}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Stats */}
          {stats && (
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  📊 Statistics
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      Latest:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatOuraVariableValue(variableSlug, stats.latest)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      Average:
                    </Typography>
                    <Typography variant="body2">
                      {formatOuraVariableValue(variableSlug, stats.average)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      Range:
                    </Typography>
                    <Typography variant="body2">
                      {formatOuraVariableValue(variableSlug, stats.min)} -{" "}
                      {formatOuraVariableValue(variableSlug, stats.max)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Chart and Data */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Time Range Filter */}
          <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="7">Last 7 days</MenuItem>
                <MenuItem value="30">Last 30 days</MenuItem>
                <MenuItem value="90">Last 90 days</MenuItem>
                <MenuItem value="365">Last year</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Chart */}
          {chartData && logs.length > 0 ? (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography
                  variant="h6"
                  sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
                >
                  <FaChartLine />
                  Trend Over Time
                </Typography>
                <Box sx={{ height: 400 }}>
                  <Line data={chartData} options={chartOptions} />
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              No data available for the selected time range. Try syncing your
              Oura data or selecting a different time range.
            </Alert>
          )}

          {/* Recent Data Table */}
          {logs.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  📋 Recent Data
                </Typography>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Value</TableCell>
                        <TableCell>Interpretation</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logs.slice(0, 20).map((log) => (
                        <TableRow key={log.id} hover>
                          <TableCell>{formatDate(log.date)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: "bold" }}>
                            {formatOuraVariableValue(variableSlug, log.value)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary">
                              {getOuraVariableInterpretation(
                                variableSlug,
                                log.value
                              )}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
