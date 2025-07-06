import React, { useState, useEffect } from "react";
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
} from "chart.js";
import { supabase } from "@/utils/supaBase";
import { format, parseISO } from "date-fns";

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
  id: number;
  date: string;
  variable: string;
  value: string;
  notes?: string;
  created_at: string;
}

interface ManualLogsChartProps {
  userId: string;
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

export default function ManualLogsChart({
  userId,
  maxDays = 30,
}: ManualLogsChartProps) {
  const [logs, setLogs] = useState<ManualLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("30");
  const [selectedVariable, setSelectedVariable] = useState<string>("all");

  useEffect(() => {
    fetchManualLogs();
  }, [userId, timeRange]);

  const fetchManualLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const daysBack = parseInt(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from("daily_logs")
        .select("id, date, label, value, notes, created_at")
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

  const getUniqueVariables = () => {
    const variables = new Set(logs.map((log) => log.label));
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

  const prepareChartData = (): { [variable: string]: ChartData } => {
    const chartData: { [variable: string]: ChartData } = {};

    // Group logs by variable
    const logsByVariable = logs.reduce((acc, log) => {
      if (!acc[log.label]) {
        acc[log.label] = [];
      }
      acc[log.label].push(log);
      return acc;
    }, {} as { [variable: string]: ManualLog[] });

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
              label: variable,
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
        No manual logs found for the selected time range. Start logging data to
        see your trends here!
      </Alert>
    );
  }

  const chartData = prepareChartData();
  const variables = getUniqueVariables();
  const numericVariables = variables.filter((variable) =>
    logs.some((log) => log.label === variable && isNumeric(log.value))
  );

  const filteredChartData =
    selectedVariable === "all"
      ? chartData
      : { [selectedVariable]: chartData[selectedVariable] };

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" component="h3">
          📈 Manual Log Trends
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
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
              <MenuItem value="all">All Variables</MenuItem>
              {numericVariables.map((variable) => (
                <MenuItem key={variable} value={variable}>
                  {variable}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {numericVariables.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No numeric variables found for charting. Charts can only display
          numeric values.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              selectedVariable === "all"
                ? "repeat(auto-fit, minmax(400px, 1fr))"
                : "1fr",
            gap: 3,
          }}
        >
          {Object.entries(filteredChartData).map(([variable, data]) => (
            <Card key={variable}>
              <CardContent>
                <Typography variant="h6" component="h4" gutterBottom>
                  {variable}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {data.datasets[0].data.length} data points
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line data={data} options={chartOptions} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {variables.length > numericVariables.length && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Note:</strong> Some variables (
            {variables.length - numericVariables.length}) contain non-numeric
            data and cannot be displayed in charts. These include:{" "}
            {variables.filter((v) => !numericVariables.includes(v)).join(", ")}
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
