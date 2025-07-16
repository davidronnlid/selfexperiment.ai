import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
  Link,
  TextField,
  Button,
} from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ScatterController,
  LineController,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { supabase } from "../utils/supaBase";
import { format, parseISO, subDays, startOfDay, endOfDay } from "date-fns";
import { useRouter } from "next/router";
import {
  FaExpandArrowsAlt,
  FaCompressArrowsAlt,
  FaSyncAlt,
} from "react-icons/fa";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ScatterController,
  LineController,
  Title,
  ChartTooltip,
  Legend
);

interface ManualLog {
  id: number | string;
  date: string;
  value: string;
  variable_id: string;
  notes?: string;
  source?: string;
  created_at?: string;
}

interface CorrelationAnalysisProps {
  userId?: string;
}

export default function CorrelationAnalysis({
  userId,
}: CorrelationAnalysisProps) {
  const router = useRouter();
  const [logs, setLogs] = useState<ManualLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [variables, setVariables] = useState<Record<string, string>>({});

  // Date range state for filtering
  const [startDate, setStartDate] = useState<string>(() => {
    const ninetyDaysAgo = subDays(new Date(), 90);
    return format(ninetyDaysAgo, "yyyy-MM-dd");
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return format(new Date(), "yyyy-MM-dd");
  });

  // Helper function to get variable display names
  const getVariableDisplayName = (variableId: string): string => {
    const isOuraVariable = (id: string) => {
      return [
        "sleep_score",
        "readiness_score",
        "temperature_deviation",
        "temperature_trend_deviation",
        "total_sleep_duration",
        "rem_sleep_duration",
        "deep_sleep_duration",
        "efficiency",
        "sleep_latency",
        "hr_lowest_true",
        "hr_average_true",
      ].includes(id);
    };

    if (isOuraVariable(variableId)) {
      return (
        variables[variableId] ||
        variableId.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      );
    }
    return variables[variableId] || variableId;
  };

  const getVariableSlug = (variableId: string): string => {
    const isOuraVariable = (id: string) => {
      return [
        "sleep_score",
        "readiness_score",
        "temperature_deviation",
        "temperature_trend_deviation",
        "total_sleep_duration",
        "rem_sleep_duration",
        "deep_sleep_duration",
        "efficiency",
        "sleep_latency",
        "hr_lowest_true",
        "hr_average_true",
      ].includes(id);
    };

    if (isOuraVariable(variableId)) {
      return variableId;
    }
    return variableId;
  };

  // Create clickable variable link
  const createVariableLink = (variableId: string, displayName: string) => {
    const slug = getVariableSlug(variableId);

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      router.push(`/variable/${slug}`);
    };

    return (
      <Link
        component="button"
        onClick={handleClick}
        sx={{
          color: "primary.main",
          textDecoration: "none",
          "&:hover": {
            textDecoration: "underline",
            cursor: "pointer",
          },
          fontWeight: "inherit",
          fontSize: "inherit",
          textAlign: "left",
          padding: 0,
          border: "none",
          background: "none",
        }}
      >
        {displayName}
      </Link>
    );
  };

  useEffect(() => {
    fetchManualLogs();
  }, [userId, startDate, endDate]);

  const fetchManualLogs = async () => {
    if (!userId) {
      setError("User ID is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startDateTime = startOfDay(parseISO(startDate)).toISOString();
      const endDateTime = endOfDay(parseISO(endDate)).toISOString();

      // Fetch manual logs and variables separately for reliable data loading
      const [logsResponse, variablesResponse] = await Promise.all([
        supabase
          .from("logs")
          .select("*")
          .eq("user_id", userId)
          .gte("date", startDateTime)
          .lte("date", endDateTime)
          .order("date", { ascending: false }),
        supabase.from("variables").select("id, label"),
      ]);

      const { data: rawManualLogs, error: manualError } = logsResponse;
      const { data: variablesData, error: variablesError } = variablesResponse;

      // Check for errors
      if (manualError) {
        throw new Error(`Manual logs: ${manualError.message}`);
      }
      if (variablesError) {
        throw new Error(`Variables: ${variablesError.message}`);
      }

      // Create a variables lookup map for joining data
      const varsMap =
        variablesData?.reduce(
          (acc: any, v: any) => ({ ...acc, [v.id]: v }),
          {}
        ) || {};

      // Join the data in JavaScript (more reliable than database joins)
      const manualLogsResult =
        rawManualLogs?.map((log: any) => ({
          ...log,
          variables: varsMap[log.variable_id]
            ? { label: varsMap[log.variable_id].label }
            : null,
        })) || [];

      // Fetch Oura logs
      const { data: ouraLogsResult, error: ouraError } = await supabase
        .from("oura_variable_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });
      if (ouraError) {
        throw new Error(`Oura logs: ${ouraError.message}`);
      }

      let allLogs: ManualLog[] = [];
      const variableLabels: Record<string, string> = {};

      // Process manual logs
      if (manualLogsResult) {
        const processedManualLogs = manualLogsResult.map((log: any) => {
          // Handle both joined data structure and fallback structure
          const variableLabel = log.variables?.label || log.variable_label;
          if (variableLabel) {
            variableLabels[log.variable_id] = variableLabel;
          }

          return {
            id: log.id,
            variable_id: log.variable_id,
            value: log.value,
            date: format(parseISO(log.date), "yyyy-MM-dd"),
            notes: log.notes,
            source: "manual",
            created_at: log.created_at,
          };
        });
        allLogs = [...allLogs, ...processedManualLogs];
      }

      // Process Oura logs
      if (ouraLogsResult) {
        const processedOuraLogs = ouraLogsResult.map((log: any) => {
          const ouraLabels: Record<string, string> = {
            sleep_score: "Sleep Score",
            readiness_score: "Readiness Score",
            temperature_deviation: "Temperature Deviation",
            temperature_trend_deviation: "Temperature Trend Deviation",
            total_sleep_duration: "Total Sleep Duration",
            rem_sleep_duration: "REM Sleep Duration",
            deep_sleep_duration: "Deep Sleep Duration",
            efficiency: "Sleep Efficiency",
            sleep_latency: "Sleep Latency",
            hr_lowest_true: "Lowest Heart Rate",
            hr_average_true: "Average Heart Rate",
          };

          variableLabels[log.variable_id] =
            ouraLabels[log.variable_id] || log.variable_id;

          return {
            id: `oura_${log.id}`,
            variable_id: log.variable_id,
            value: log.value,
            date: log.date,
            notes: "Oura Ring data",
            source: "oura",
            created_at: log.created_at,
          };
        });
        allLogs = [...allLogs, ...processedOuraLogs];
      }

      setLogs(allLogs);
      setVariables(variableLabels);
    } catch (err: any) {
      console.error("Error fetching logs:", err);
      setError(err.message || "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  const isNumeric = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  };

  const hasAllZeroValues = (variableId: string): boolean => {
    const variableLogs = logs.filter(
      (log) => log.variable_id === variableId && isNumeric(log.value)
    );

    if (variableLogs.length === 0) return true;
    return variableLogs.every((log) => parseFloat(log.value) === 0);
  };

  const getNumericVariables = (): string[] => {
    const variableGroups = logs.reduce((acc, log) => {
      if (isNumeric(log.value)) {
        if (!acc[log.variable_id]) {
          acc[log.variable_id] = [];
        }
        acc[log.variable_id].push(parseFloat(log.value));
      }
      return acc;
    }, {} as Record<string, number[]>);

    return Object.keys(variableGroups).filter((variableId) => {
      const values = variableGroups[variableId];
      if (values.length < 3) return false;
      if (hasAllZeroValues(variableId)) return false;

      const firstValue = values[0];
      const hasVariance = values.some((val) => val !== firstValue);
      return hasVariance;
    });
  };

  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = x.length;
    if (n === 0) return 0;

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
  ): "Very Strong" | "Strong" | "Moderate" | "Weak" | "Very Weak" => {
    const abs = Math.abs(correlation);
    if (abs >= 0.8) return "Very Strong";
    if (abs >= 0.6) return "Strong";
    if (abs >= 0.4) return "Moderate";
    if (abs >= 0.2) return "Weak";
    return "Very Weak";
  };

  const getCorrelationColor = (correlation: number): string => {
    const abs = Math.abs(correlation);
    if (abs >= 0.8) return "#10b981"; // Strong: Green
    if (abs >= 0.6) return "#22c55e"; // Strong: Light Green
    if (abs >= 0.4) return "#eab308"; // Moderate: Yellow
    if (abs >= 0.2) return "#f97316"; // Weak: Orange
    return "#6b7280"; // Very Weak: Gray
  };

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
      var1Date: string;
      var2Date: string;
    }[] = [];

    var1Logs.forEach((log1) => {
      const matchingLog2 = var2Logs.find((log2) => log2.date === log1.date);
      if (matchingLog2) {
        matchedData.push({
          date: log1.date,
          var1Value: parseFloat(log1.value),
          var2Value: parseFloat(matchingLog2.value),
          var1Date: log1.date,
          var2Date: matchingLog2.date,
        });
      }
    });

    return matchedData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const calculateRegressionLine = (x: number[], y: number[]) => {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...x);
    const maxX = Math.max(...x);

    return {
      slope,
      intercept,
      points: [
        { x: minX, y: slope * minX + intercept },
        { x: maxX, y: slope * maxX + intercept },
      ],
    };
  };

  const handleRowToggle = (variable1: string, variable2: string) => {
    const key = `${variable1}-${variable2}`;
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
    const regressionLine = calculateRegressionLine(x, y);

    const chartData = {
      datasets: [
        {
          label: `${getVariableDisplayName(
            variable1
          )} vs ${getVariableDisplayName(variable2)}`,
          data: matchedData.map((d) => ({
            x: d.var1Value,
            y: d.var2Value,
            date: d.date,
            var1Date: d.var1Date,
            var2Date: d.var2Date,
          })),
          backgroundColor: getCorrelationColor(correlation),
          borderColor: getCorrelationColor(correlation),
          pointRadius: 5,
          pointHoverRadius: 7,
          type: "scatter" as const,
          showLine: false,
        },
        {
          label: "Trend Line",
          data: regressionLine.points,
          backgroundColor: "rgba(255, 255, 255, 0)",
          borderColor: getCorrelationColor(correlation),
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 0,
          type: "line" as const,
          showLine: true,
          tension: 0,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 0,
      layout: {
        padding: {
          left: 10,
          right: 10,
          top: 10,
          bottom: 20,
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            filter: function (legendItem: any) {
              return legendItem.text !== "Trend Line";
            },
          },
        },
        tooltip: {
          mode: "nearest" as const,
          intersect: false,
          callbacks: {
            label: function (context: any) {
              if (context.datasetIndex === 1) return [];
              const dataPoint = context.raw;
              return [
                `${getVariableDisplayName(variable1)}: ${dataPoint.x}`,
                `${getVariableDisplayName(variable2)}: ${dataPoint.y}`,
                `Date: ${format(parseISO(dataPoint.date), "MMM dd, yyyy")}`,
              ];
            },
            title: function (context: any) {
              if (context[0]?.datasetIndex === 1) return "";
              return "Data Point";
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: getVariableDisplayName(variable1),
            font: { size: 12 },
            padding: { top: 10 },
          },
          ticks: {
            font: { size: 11 },
            padding: 5,
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: getVariableDisplayName(variable2),
            font: { size: 12 },
            padding: { bottom: 10 },
          },
          ticks: {
            font: { size: 11 },
            padding: 5,
          },
        },
      },
      interaction: {
        mode: "nearest" as const,
        axis: "xy" as const,
        intersect: false,
      },
    };

    return {
      chartData,
      chartOptions,
      correlation,
      matchedData,
      regressionLine,
    };
  };

  // Calculate all correlations
  const allCorrelations = useMemo(() => {
    const numericVariables = getNumericVariables();
    const correlations: Array<{
      variable1: string;
      variable2: string;
      correlation: number;
      strength: string;
      dataPoints: number;
      color: string;
    }> = [];

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
            correlation,
            strength: getCorrelationStrength(correlation),
            dataPoints: matchedData.length,
            color: getCorrelationColor(correlation),
          });
        }
      }
    }

    return correlations.sort(
      (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)
    );
  }, [logs]);

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
        {error}. Unable to load data from all sources for correlation analysis.
      </Alert>
    );
  }

  const numericVariables = getNumericVariables();

  if (numericVariables.length < 2) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        You need at least 2 numeric variables to perform correlation analysis.
        Start logging more different types of data across all sources (manual,
        Oura, Withings, etc.) to see correlations!
      </Alert>
    );
  }

  return (
    <Box>
      {/* Date Range Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Date Range Filter
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: 150 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={fetchManualLogs}
              startIcon={<FaSyncAlt />}
              disabled={loading}
            >
              Refresh Data
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Data Source Breakdown */}
      {logs.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Card variant="outlined">
            <CardContent sx={{ py: 2 }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                color="textSecondary"
              >
                Data Sources Included in Analysis
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Chip
                  label={`Manual: ${
                    logs.filter((log) => !log.source || log.source === "manual")
                      .length
                  }`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`Oura: ${
                    logs.filter((log) => log.source === "oura").length
                  }`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
                <Chip
                  label={`Total: ${logs.length} logs`}
                  size="small"
                  color="default"
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Main Correlation Table */}
      {allCorrelations.length > 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" component="h4" gutterBottom>
              Correlation Results ({allCorrelations.length} correlations found)
            </Typography>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell>
                      <strong>Variable 1</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Variable 2</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Correlation</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Strength</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Data Points</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allCorrelations.map((corr, index) => {
                    const isExpanded =
                      expandedRows[`${corr.variable1}-${corr.variable2}`];
                    const chartData = isExpanded
                      ? getChartDataForCorrelation(
                          corr.variable1,
                          corr.variable2
                        )
                      : null;

                    return (
                      <React.Fragment key={index}>
                        <TableRow
                          hover
                          onClick={() =>
                            handleRowToggle(corr.variable1, corr.variable2)
                          }
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell>
                            <IconButton size="small">
                              {isExpanded ? (
                                <FaCompressArrowsAlt />
                              ) : (
                                <FaExpandArrowsAlt />
                              )}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            {createVariableLink(
                              corr.variable1,
                              getVariableDisplayName(corr.variable1)
                            )}
                          </TableCell>
                          <TableCell>
                            {createVariableLink(
                              corr.variable2,
                              getVariableDisplayName(corr.variable2)
                            )}
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  backgroundColor: corr.color,
                                }}
                              />
                              {corr.correlation.toFixed(3)}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={corr.strength}
                              size="small"
                              sx={{
                                backgroundColor: corr.color,
                                color: "white",
                                fontWeight: "bold",
                              }}
                            />
                          </TableCell>
                          <TableCell>{corr.dataPoints}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell
                            style={{ paddingBottom: 0, paddingTop: 0 }}
                            colSpan={6}
                          >
                            <Collapse
                              in={isExpanded}
                              timeout="auto"
                              unmountOnExit
                            >
                              <Box sx={{ margin: 2 }}>
                                {chartData ? (
                                  <Card>
                                    <CardContent>
                                      <Typography variant="h6" gutterBottom>
                                        {getVariableDisplayName(corr.variable1)}{" "}
                                        vs{" "}
                                        {getVariableDisplayName(corr.variable2)}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        color="textSecondary"
                                        gutterBottom
                                      >
                                        Correlation:{" "}
                                        {chartData.correlation.toFixed(3)} (
                                        {getCorrelationStrength(
                                          chartData.correlation
                                        )}
                                        ) • Data Points:{" "}
                                        {chartData.matchedData.length}
                                      </Typography>
                                      <Box
                                        sx={{
                                          height: 400,
                                          width: "100%",
                                          position: "relative",
                                        }}
                                      >
                                        <Chart
                                          type="scatter"
                                          data={chartData.chartData as any}
                                          options={
                                            chartData.chartOptions as any
                                          }
                                        />
                                      </Box>
                                    </CardContent>
                                  </Card>
                                ) : (
                                  <Alert severity="info">
                                    Not enough data points to display chart for
                                    this correlation.
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
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info">
          No significant correlations found with current data. Try logging more
          data points for your variables!
        </Alert>
      )}
    </Box>
  );
}
