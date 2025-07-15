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
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { supabase } from "@/utils/supaBase";
import { format, parseISO, differenceInDays } from "date-fns";
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
  Title,
  ChartTooltip,
  Legend
);

interface ManualLog {
  id: number;
  date: string;
  variable_id: string;
  value: string;
  notes?: string;
  created_at: string;
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

      const { data, error } = await supabase
        .from("logs")
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

  const getNumericVariables = () => {
    const variables = new Set(
      logs.filter((log) => isNumeric(log.value)).map((log) => log.variable_id)
    );
    return Array.from(variables).sort();
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
    }[] = [];

    var1Logs.forEach((log1) => {
      const matchingLog2 = var2Logs.find((log2) => log2.date === log1.date);
      if (matchingLog2) {
        matchedData.push({
          date: log1.date,
          var1Value: parseFloat(log1.value),
          var2Value: parseFloat(matchingLog2.value),
        });
      }
    });

    return matchedData;
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

    const chartData = {
      datasets: [
        {
          label: `${variables[variable1] || variable1} vs ${
            variables[variable2] || variable2
          }`,
          data: matchedData.map((d) => ({
            x: d.var1Value,
            y: d.var2Value,
          })),
          backgroundColor: getCorrelationColor(correlation),
          borderColor: getCorrelationColor(correlation),
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context: any) {
              return `${variables[variable1] || variable1}: ${
                context.parsed.x
              }, ${variables[variable2] || variable2}: ${context.parsed.y}`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: { display: true, text: variables[variable1] || variable1 },
        },
        y: {
          display: true,
          title: { display: true, text: variables[variable2] || variable2 },
        },
      },
    };

    return { chartData, chartOptions, correlation, matchedData };
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

    return {
      datasets: [
        {
          label: `${variables[selectedVar1] || selectedVar1} vs ${
            variables[selectedVar2] || selectedVar2
          }`,
          data: selectedCorrelation.data.map((d) => ({
            x: d.var1Value,
            y: d.var2Value,
          })),
          backgroundColor: getCorrelationColor(selectedCorrelation.correlation),
          borderColor: getCorrelationColor(selectedCorrelation.correlation),
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [selectedCorrelation, selectedVar1, selectedVar2]);

  const scatterChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `${variables[selectedVar1] || selectedVar1}: ${
              context.parsed.x
            }, ${variables[selectedVar2] || selectedVar2}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: { display: true, text: variables[selectedVar1] || selectedVar1 },
      },
      y: {
        display: true,
        title: { display: true, text: variables[selectedVar2] || selectedVar2 },
      },
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

  const numericVariables = getNumericVariables();

  if (numericVariables.length < 2) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        You need at least 2 numeric variables to perform correlation analysis.
        Start logging more different types of data to see correlations!
      </Alert>
    );
  }

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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AnalyticsIcon color="primary" />
          <Typography variant="h6" component="h3">
            Correlation Analysis
          </Typography>
        </Box>
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

      <Stack spacing={3}>
        {/* Scatter Plot and Table */}
        <Box
          sx={{
            display: "flex",
            gap: 3,
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          {selectedCorrelation && scatterChartData && (
            <Box sx={{ flex: selectedCorrelation ? 2 : 1 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h4" gutterBottom>
                    {variables[selectedVar1] || selectedVar1} vs{" "}
                    {variables[selectedVar2] || selectedVar2}
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}
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
                      • <strong>Correlation ≠ Causation:</strong> A correlation
                      doesn't mean one variable causes the other
                      <br />• <strong>Range:</strong> Values from -1 (perfect
                      negative) to +1 (perfect positive)
                      <br />• <strong>Strength:</strong> |0.7+| = strong,
                      |0.3-0.7| = moderate, |0.1-0.3| = weak
                      <br />• <strong>Confounding:</strong> Other variables may
                      influence both measurements
                    </Typography>
                  </Alert>

                  <Box sx={{ height: 400 }}>
                    <Scatter
                      data={scatterChartData}
                      options={scatterChartOptions}
                    />
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
                  <Alert severity="info">
                    No correlations found. Make sure you have overlapping data
                    for multiple variables.
                  </Alert>
                ) : (
                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
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
                          const isExpanded = expandedRows[rowKey] || false;
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
                                      {variables[corr.variable1] ||
                                        corr.variable1}{" "}
                                      ×{" "}
                                      {variables[corr.variable2] ||
                                        corr.variable2}
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
                                  >
                                    <Box sx={{ p: 2, bgcolor: "action.hover" }}>
                                      {chartData ? (
                                        <Card elevation={1}>
                                          <CardContent>
                                            <Typography
                                              variant="subtitle1"
                                              gutterBottom
                                            >
                                              {variables[corr.variable1] ||
                                                corr.variable1}{" "}
                                              vs{" "}
                                              {variables[corr.variable2] ||
                                                corr.variable2}{" "}
                                              Chart
                                            </Typography>
                                            <Box
                                              sx={{
                                                display: "flex",
                                                gap: 1,
                                                mb: 2,
                                              }}
                                            >
                                              <Chip
                                                label={`Correlation: ${chartData.correlation.toFixed(
                                                  3
                                                )}`}
                                                size="small"
                                                sx={{
                                                  bgcolor: getCorrelationColor(
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
                                                height: 300,
                                                width: "100%",
                                              }}
                                            >
                                              <Scatter
                                                data={chartData.chartData}
                                                options={chartData.chartOptions}
                                              />
                                            </Box>
                                          </CardContent>
                                        </Card>
                                      ) : (
                                        <Alert severity="info">
                                          Not enough data points to display
                                          chart for this correlation.
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
                        {variables[corr.variable1] || corr.variable1} &{" "}
                        {variables[corr.variable2] || corr.variable2}
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
