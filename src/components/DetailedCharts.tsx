import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Grid,
  Button,
  TextField,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { Line, Bar, Scatter, Doughnut } from "react-chartjs-2";
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
  ArcElement,
} from "chart.js";
import {
  BarChart,
  Timeline,
  PieChart,
  ScatterPlot,
  FilterList,
  Refresh,
} from "@mui/icons-material";
import { supabase } from "@/utils/supaBase";
import {
  format,
  parseISO,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  subDays,
  startOfDay,
  endOfDay,
} from "date-fns";
import { VariableLinkSimple } from "./VariableLink";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  ArcElement
);

interface DataPoint {
  id: number;
  date: string;
  variable_id: string;
  value: string;
  notes?: string;
  created_at: string;
}

interface DetailedChartsProps {
  userId: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: (number | null)[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
    tension: number;
    pointRadius?: number;
    pointHoverRadius?: number;
  }[];
}

export default function DetailedCharts({ userId }: DetailedChartsProps) {
  const [logs, setLogs] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("30");
  const [selectedVariables, setSelectedVariables] = useState<string[]>([
    "",
    "",
  ]);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [chartType, setChartType] = useState<string>("line");
  const [showTable, setShowTable] = useState(false);

  // Utility functions
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

  // Memoized calculations
  const uniqueVariables = useMemo(() => {
    const variables = new Set(logs.map((log) => log.variable_id));
    return Array.from(variables).sort();
  }, [logs]);

  const numericVariables = useMemo(() => {
    return uniqueVariables.filter((variable) =>
      logs.some((log) => log.variable_id === variable && isNumeric(log.value))
    );
  }, [uniqueVariables, logs]);

  const filteredLogs = useMemo(() => {
    const selectedVars = selectedVariables.filter((v) => v !== "");
    if (selectedVars.length === 0) return logs;
    return logs.filter((log) => selectedVars.includes(log.variable_id));
  }, [logs, selectedVariables]);

  const prepareChartData = (): ChartData => {
    const selectedVars = selectedVariables.filter((v) => v !== "");
    if (selectedVars.length === 0 || filteredLogs.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // Get all unique dates from the filtered logs
    const allDates = [...new Set(filteredLogs.map((log) => log.date))].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    const labels = allDates.map((date) => formatDate(date));
    const datasets = selectedVars.map((variableId, index) => {
      const variableLogs = filteredLogs
        .filter((log) => log.variable_id === variableId && isNumeric(log.value))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      const color = getVariableColor(variableId);
      const variableName = variables[variableId] || variableId;

      // Create data array aligned with all dates
      const data = allDates.map((date) => {
        const log = variableLogs.find((l) => l.date === date);
        return log ? parseFloat(log.value) : null;
      });

      return {
        label: variableName,
        data,
        borderColor: color,
        backgroundColor: color + "20",
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    });

    return {
      labels,
      datasets,
    };
  };

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [userId, timeRange]);

  useEffect(() => {
    fetchVariables();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const days = parseInt(timeRange);
      const startDate = subDays(new Date(), days);
      const startDateTime = startOfDay(startDate).toISOString();
      const endDateTime = endOfDay(new Date()).toISOString();

      const { data, error } = await supabase
        .from("data_points")
        .select("id, date, variable_id, value, notes, created_at")
        .eq("user_id", userId)
        .gte("date", startDateTime)
        .lte("date", endDateTime)
        .order("date", { ascending: false });

      if (error) throw error;

      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchVariables = async () => {
    const { data, error } = await supabase
      .from("variables")
      .select("id, label");
    if (!error && data) {
      const labelMap: Record<string, string> = {};
      data.forEach((v: any) => {
        labelMap[v.id] = v.label;
      });
      setVariables(labelMap);
    }
  };

  const handleVariableChange = (index: number, value: string) => {
    const newSelectedVariables = [...selectedVariables];
    newSelectedVariables[index] = value;
    setSelectedVariables(newSelectedVariables);
  };

  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setTimeRange(event.target.value);
  };

  const handleChartTypeChange = (event: SelectChangeEvent) => {
    setChartType(event.target.value);
  };

  const renderChart = () => {
    const selectedVars = selectedVariables.filter((v) => v !== "");
    if (selectedVars.length === 0) return null;

    const chartData = prepareChartData();

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
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
    };

    switch (chartType) {
      case "line":
        return <Line data={chartData} options={chartOptions} height={300} />;
      case "bar":
        return <Bar data={chartData} options={chartOptions} height={300} />;
      case "scatter":
        return <Scatter data={chartData} options={chartOptions} height={300} />;
      default:
        return <Line data={chartData} options={chartOptions} height={300} />;
    }
  };

  const renderDataTable = () => {
    const selectedVars = selectedVariables.filter((v) => v !== "");
    if (selectedVars.length === 0) return null;

    const sortedLogs = filteredLogs
      .filter((log) => isNumeric(log.value))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Variable</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedLogs.slice(0, 20).map((log) => (
              <TableRow key={log.id}>
                <TableCell>{formatDate(log.date)}</TableCell>
                <TableCell>
                  <VariableLinkSimple variableId={log.variable_id} />
                </TableCell>
                <TableCell>{log.value}</TableCell>
                <TableCell>
                  {log.notes ? (
                    <Typography variant="body2" color="textSecondary">
                      {log.notes}
                    </Typography>
                  ) : (
                    "-"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Controls */}
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 8px)" } }}>
              <FormControl fullWidth size="small">
                <InputLabel>Variable 1</InputLabel>
                <Select
                  value={selectedVariables[0]}
                  onChange={(e) => handleVariableChange(0, e.target.value)}
                  label="Variable 1"
                >
                  <MenuItem value="">
                    <em>Select a variable</em>
                  </MenuItem>
                  {numericVariables.map((variableId) => (
                    <MenuItem key={variableId} value={variableId}>
                      {variables[variableId] || variableId}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 8px)" } }}>
              <FormControl fullWidth size="small">
                <InputLabel>Variable 2 (Optional)</InputLabel>
                <Select
                  value={selectedVariables[1]}
                  onChange={(e) => handleVariableChange(1, e.target.value)}
                  label="Variable 2 (Optional)"
                >
                  <MenuItem value="">
                    <em>Select a variable</em>
                  </MenuItem>
                  {numericVariables.map((variableId) => (
                    <MenuItem key={variableId} value={variableId}>
                      {variables[variableId] || variableId}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box
              sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(33.33% - 8px)" } }}
            >
              <FormControl fullWidth size="small">
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={timeRange}
                  onChange={handleTimeRangeChange}
                  label="Time Range"
                >
                  <MenuItem value="7">Last 7 days</MenuItem>
                  <MenuItem value="30">Last 30 days</MenuItem>
                  <MenuItem value="90">Last 90 days</MenuItem>
                  <MenuItem value="365">Last year</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box
              sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(33.33% - 8px)" } }}
            >
              <FormControl fullWidth size="small">
                <InputLabel>Chart Type</InputLabel>
                <Select
                  value={chartType}
                  onChange={handleChartTypeChange}
                  label="Chart Type"
                >
                  <MenuItem value="line">Line Chart</MenuItem>
                  <MenuItem value="bar">Bar Chart</MenuItem>
                  <MenuItem value="scatter">Scatter Plot</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box
              sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(33.33% - 8px)" } }}
            >
              <Button
                variant="outlined"
                onClick={() => setShowTable(!showTable)}
                fullWidth
                size="small"
              >
                {showTable ? "Hide Table" : "Show Table"}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Detailed Chart */}
      {selectedVariables.some((v) => v !== "") && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Variable Comparison Chart
            </Typography>
            <Box sx={{ height: 400, mt: 2 }}>{renderChart()}</Box>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {showTable && selectedVariables.some((v) => v !== "") && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Data Points
            </Typography>
            {renderDataTable()}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
