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
  Chip,
  FormControlLabel,
  Switch,
  Snackbar,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
} from "@mui/material";
import {
  FaArrowLeft,
  FaGlobe,
  FaLock,
  FaChartBar,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface LogEntry {
  id: number;
  date: string;
  variable: string;
  value: string;
  notes?: string;
  created_at?: string;
}

interface VariableInfo {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  data_type: string;
  source_type: string;
  category?: string;
  validation_rules?: any;
  canonical_unit?: string;
  is_public: boolean;
}

export default function VariableLogsPage() {
  const router = useRouter();
  const { variableName } = router.query;
  const { user, loading: userLoading } = useUser();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [variableInfo, setVariableInfo] = useState<VariableInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isShared, setIsShared] = useState(false);
  const [sharingUpdateLoading, setSharingUpdateLoading] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);
  const [distributionData, setDistributionData] = useState<any[]>([]);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!variableName || userLoading) return;

    const initializePage = async () => {
      // First fetch variable info
      await fetchVariableInfo();
      setLoading(false);
    };

    initializePage();
  }, [variableName, user, userLoading]);

  // Separate useEffect for fetching logs after variableInfo is available
  useEffect(() => {
    if (variableInfo && user) {
      fetchLogs();
      fetchSharingStatus();
    }
  }, [variableInfo, user]);

  useEffect(() => {
    if (user) {
      console.log("[DEBUG] Current user.id:", user.id);
    }
  }, [user]);

  useEffect(() => {
    if (variableInfo) {
      console.log("[DEBUG] Current variableInfo:", variableInfo);
    }
  }, [variableInfo]);

  const fetchVariableInfo = async () => {
    try {
      // Always use slug for lookup
      if (typeof variableName !== "string") return;
      const slug = variableName.toLowerCase();
      const { data: variableData, error } = await supabase
        .from("variables")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!error && variableData) {
        setVariableInfo(variableData);
        return;
      }

      // Fallback: not found
      setVariableInfo(null);
    } catch (error) {
      console.error("Error fetching variable info:", error);
    }
  };

  const fetchLogs = async () => {
    if (!user || !variableName || !variableInfo) {
      console.log("[DEBUG] fetchLogs: Missing required data", {
        user: !!user,
        variableName,
        variableInfo: !!variableInfo,
      });
      return;
    }
    try {
      console.log("[DEBUG] fetchLogs: Starting UUID-based query", {
        userId: user.id,
        variableId: variableInfo.id,
        variableName: variableInfo.label,
      });

      // Only fetch logs using variable_id (UUID)
      const { data: uuidLogs, error: uuidError } = await supabase
        .from("logs")
        .select("id, created_at, date, variable_id, value, notes, user_id")
        .eq("user_id", user.id)
        .eq("variable_id", variableInfo.id)
        .order("created_at", { ascending: false })
        .limit(50);

      console.log("[DEBUG] UUID-based logs query result:", {
        data: uuidLogs,
        error: uuidError,
        count: uuidLogs?.length || 0,
      });

      if (uuidError) {
        console.error("[DEBUG] Error fetching logs:", uuidError);
        return;
      }

      // Map to LogEntry shape
      const mappedLogs = (uuidLogs || []).map((log: any) => ({
        id: log.id,
        date: log.date || log.created_at, // Use date field (local time) if available, fallback to created_at
        variable: variableInfo?.label || "Unknown Variable",
        value: log.value,
        notes: log.notes,
        created_at: log.created_at,
        user_id: log.user_id,
        variable_id: log.variable_id,
      }));

      console.log("[DEBUG] Final mapped logs:", mappedLogs);
      setLogs(mappedLogs);
    } catch (error) {
      console.error("[DEBUG] Error fetching logs:", error);
    }
  };

  const fetchSharingStatus = async () => {
    if (!user || !variableInfo) return;
    try {
      const { data, error } = await supabase
        .from("user_variable_preferences")
        .select("is_shared")
        .eq("user_id", user.id)
        .eq("variable_id", variableInfo.id)
        .single();
      if (!error && data) {
        setIsShared(data.is_shared);
      }
    } catch (error) {
      console.error("Error fetching sharing status:", error);
    }
  };

  const handleSharingToggle = async (shared: boolean) => {
    if (!user || !variableName) return;

    setSharingUpdateLoading(true);
    try {
      // Determine variable type based on source
      let variableType = "predefined"; // default
      if (variableInfo?.source_type === "oura") {
        variableType = "oura";
      } else if (variableInfo?.id === "" || !variableInfo?.id) {
        // If no ID from variables table, it's likely custom or predefined
        variableType = "predefined";
      } else {
        variableType = "custom";
      }

      // First, let's check if the table exists by trying a simple query
      console.log("Testing table access...");
      const { data: testData, error: testError } = await supabase
        .from("user_variable_preferences")
        .select("id")
        .limit(1);

      if (testError) {
        console.error("Table access test failed:", testError);

        if (testError.code === "42P01") {
          // Table doesn't exist
          setErrorMessage(
            "Database schema not set up. Please contact support or check the setup instructions."
          );
          setShowError(true);
          return;
        }

        if (testError.code === "42501") {
          // Permission denied - RLS issue
          setErrorMessage("Permission error. Please refresh and try again.");
          setShowError(true);
          return;
        }
      }

      console.log("Attempting to upsert sharing setting...");
      const { data, error } = await supabase
        .from("user_variable_preferences")
        .upsert({
          user_id: user.id,
          variable_id: variableInfo?.id || "",
          is_shared: shared,
        })
        .select();

      if (error) {
        console.error("Upsert failed with error:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log("Upsert successful:", data);
      setIsShared(shared);
      setSuccessMessage(
        shared
          ? "Variable is now shared with the community!"
          : "Variable is now private."
      );
      setShowSuccess(true);
    } catch (error: any) {
      console.error("Error updating sharing status:", error);

      // Provide more specific error messages
      let errorMsg = "Failed to update sharing settings. ";

      if (error?.code === "42P01") {
        errorMsg +=
          "Database table missing. Please run the privacy schema setup.";
      } else if (error?.code === "42501") {
        errorMsg += "Permission denied. Please refresh and try again.";
      } else if (error?.code === "23505") {
        errorMsg += "Duplicate entry error. Please try again.";
      } else if (error?.message?.includes("column")) {
        errorMsg += "Database column error. Schema may need updating.";
      } else {
        errorMsg += "Please try again or contact support.";
      }

      setErrorMessage(errorMsg);
      setShowError(true);
    } finally {
      setSharingUpdateLoading(false);
    }
  };

  const fetchDistributionData = async () => {
    if (!variableName) return;

    setDistributionLoading(true);
    try {
      const { data, error } = await supabase
        .from("logs")
        .select("value, user_id")
        .eq("variable_id", variableInfo?.id)
        .in(
          "user_id",
          await supabase
            .from("user_variable_preferences")
            .select("user_id")
            .eq("variable_id", variableInfo?.id)
            .eq("is_shared", true)
            .then(({ data }) => data?.map((row) => row.user_id) || [])
        );

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        // Group logs by user and calculate average value for each user
        const userAverages = new Map<string, number>();
        const userLogCounts = new Map<string, number>();

        data.forEach((log) => {
          const value = parseFloat(log.value);
          if (!isNaN(value)) {
            const userId = log.user_id;
            const currentSum = userAverages.get(userId) || 0;
            const currentCount = userLogCounts.get(userId) || 0;

            userAverages.set(userId, currentSum + value);
            userLogCounts.set(userId, currentCount + 1);
          }
        });

        // Calculate average for each user
        const userAverageValues: number[] = [];
        userAverages.forEach((sum, userId) => {
          const count = userLogCounts.get(userId) || 1;
          userAverageValues.push(sum / count);
        });

        if (userAverageValues.length > 0) {
          const min = Math.min(...userAverageValues);
          const max = Math.max(...userAverageValues);
          const bins = Math.min(
            10,
            Math.max(5, Math.ceil(Math.sqrt(userAverageValues.length)))
          );
          const binWidth = (max - min) / bins;

          const histogram = Array.from({ length: bins }, (_, i) => {
            const binStart = min + i * binWidth;
            const binEnd = min + (i + 1) * binWidth;
            const count = userAverageValues.filter((val) =>
              i === bins - 1 ? val <= binEnd : val >= binStart && val < binEnd
            ).length;

            return {
              range: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
              count,
              binStart,
              binEnd,
            };
          });

          setDistributionData(histogram);
        }
      }
    } catch (error: any) {
      console.error("Error fetching distribution data:", error);
    } finally {
      setDistributionLoading(false);
    }
  };

  const toggleDistribution = async () => {
    if (!showDistribution && distributionData.length === 0) {
      await fetchDistributionData();
    }
    setShowDistribution(!showDistribution);
  };

  const startEdit = (log: LogEntry) => {
    setEditingLogId(log.id);
    setEditValue(log.value);
    setEditNotes(log.notes || "");
  };

  const cancelEdit = () => {
    setEditingLogId(null);
    setEditValue("");
    setEditNotes("");
  };

  const updateLog = async (logId: number) => {
    const { error } = await supabase
      .from("logs")
      .update({ value: editValue, notes: editNotes })
      .eq("id", logId);
    if (!error) {
      setEditingLogId(null);
      setEditValue("");
      setEditNotes("");
      await fetchLogs();
      setSuccessMessage("Log updated successfully!");
      setShowSuccess(true);
    } else {
      setErrorMessage("Failed to update log. Please try again.");
      setShowError(true);
    }
  };

  const deleteLog = async (logId: number) => {
    if (!confirm("Are you sure you want to delete this log?")) return;
    const { error } = await supabase.from("logs").delete().eq("id", logId);
    if (!error) {
      await fetchLogs();
      setSuccessMessage("Log deleted successfully!");
      setShowSuccess(true);
    } else {
      setErrorMessage("Failed to delete log. Please try again.");
      setShowError(true);
    }
  };

  // Calculate summary statistics for logs
  const calculateStatistics = () => {
    if (logs.length === 0) return null;

    const values = logs
      .map((log) => parseFloat(log.value))
      .filter((val) => !isNaN(val))
      .sort((a, b) => a - b);

    if (values.length === 0) return null;

    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    const min = values[0];
    const max = values[values.length - 1];

    // Calculate median
    const median =
      values.length % 2 === 0
        ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
        : values[Math.floor(values.length / 2)];

    // Calculate standard deviation
    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      values.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate quartiles
    const q1Index = Math.floor(values.length * 0.25);
    const q3Index = Math.floor(values.length * 0.75);
    const q1 = values[q1Index];
    const q3 = values[q3Index];

    return {
      count: values.length,
      mean: mean.toFixed(1),
      median: median.toFixed(1),
      min: min.toFixed(1),
      max: max.toFixed(1),
      standardDeviation: standardDeviation.toFixed(1),
      q1: q1.toFixed(1),
      q3: q3.toFixed(1),
      range: (max - min).toFixed(1),
    };
  };

  const formatDate = (dateString: string) => {
    try {
      // Check if the date is already in local time format (YYYY-MM-DDTHH:mm:ss)
      if (
        dateString &&
        dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
      ) {
        // Already in local time format, just reformat for display
        return dateString.replace("T", " ");
      }

      // Otherwise, parse as Date object and format
      return new Date(dateString)
        .toLocaleString("en-CA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(",", "");
    } catch {
      return dateString;
    }
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
        <Alert severity="warning">
          Please log in to view your variable data.
        </Alert>
      </Container>
    );
  }

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
          <span>{variableInfo?.icon || "📊"}</span>
          {variableInfo?.label || variableName}
        </Typography>
      </Box>

      {/* Variable Information Card */}
      {variableInfo && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Variable Information
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 3,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
                  {variableInfo.description && (
                    <Box sx={{ flex: "1 1 300px" }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Description
                      </Typography>
                      <Typography variant="body1">
                        {variableInfo.description}
                      </Typography>
                    </Box>
                  )}

                  {variableInfo.validation_rules &&
                    (variableInfo.validation_rules.min !== undefined ||
                      variableInfo.validation_rules.max !== undefined ||
                      variableInfo.validation_rules.scaleMin !== undefined ||
                      variableInfo.validation_rules.scaleMax !== undefined ||
                      variableInfo.validation_rules.unit) && (
                      <Box sx={{ flex: "1 1 200px" }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Rules
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          {variableInfo.validation_rules.min !== undefined &&
                            variableInfo.validation_rules.max !== undefined && (
                              <Chip
                                label={`Range: ${
                                  variableInfo.validation_rules.min
                                }-${variableInfo.validation_rules.max}${
                                  variableInfo.validation_rules.unit
                                    ? ` ${variableInfo.validation_rules.unit}`
                                    : ""
                                }`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                          {variableInfo.validation_rules.scaleMin !==
                            undefined &&
                            variableInfo.validation_rules.scaleMax !==
                              undefined && (
                              <Chip
                                label={`Scale: ${variableInfo.validation_rules.scaleMin}-${variableInfo.validation_rules.scaleMax}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                          {variableInfo.validation_rules.unit && (
                            <Chip
                              label={`Unit: ${variableInfo.validation_rules.unit}`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    )}
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  <Chip
                    label={`Source: ${
                      variableInfo.source_type === "manual"
                        ? "Manual Entry"
                        : variableInfo.source_type
                    }`}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                  <Chip
                    label={`Type: ${variableInfo.data_type || "Continuous"}`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  {variableInfo.category && (
                    <Chip
                      label={`Category: ${variableInfo.category}`}
                      size="small"
                      color="default"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>

              <Box sx={{ flex: "0 0 auto", minWidth: 300 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isShared}
                        onChange={(e) => handleSharingToggle(e.target.checked)}
                        color="primary"
                        disabled={sharingUpdateLoading}
                      />
                    }
                    label={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        {isShared ? <FaGlobe /> : <FaLock />}
                        <Typography variant="body2">
                          {isShared ? "Share with community" : "Keep private"}
                        </Typography>
                      </Box>
                    }
                  />

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FaChartBar />}
                    onClick={toggleDistribution}
                    disabled={distributionLoading}
                  >
                    {showDistribution ? "Hide" : "Show"} Community Distribution
                  </Button>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Distribution Chart */}
      {showDistribution && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Community Distribution
            </Typography>
            {distributionLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : distributionData.length === 0 ? (
              <Alert severity="info">
                No shared data available for this variable. Be the first to
                share your data with the community!
              </Alert>
            ) : (
              <Box sx={{ height: 300, mt: 2 }}>
                <Bar
                  data={{
                    labels: distributionData.map((item) => item.range),
                    datasets: [
                      {
                        label: "Number of Users",
                        data: distributionData.map((item) => item.count),
                        backgroundColor: "rgba(54, 162, 235, 0.6)",
                        borderColor: "rgba(54, 162, 235, 1)",
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      title: {
                        display: true,
                        text: `Distribution of Average ${variableName} values across ${distributionData.reduce(
                          (sum, item) => sum + item.count,
                          0
                        )} users`,
                      },
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: "Number of Users",
                        },
                      },
                      x: {
                        title: {
                          display: true,
                          text: `${variableName}${
                            variableInfo?.canonical_unit
                              ? ` (${variableInfo.canonical_unit})`
                              : ""
                          }`,
                        },
                      },
                    },
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Logs */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Your Logs ({logs.length})
          </Typography>

          {/* Summary Statistics */}
          {logs.length > 0 &&
            (() => {
              const stats = calculateStatistics();
              return stats ? (
                <Card
                  sx={{
                    mb: 3,
                    bgcolor: "#1a1a1a",
                    border: "1px solid #333",
                    color: "#fff",
                  }}
                  elevation={2}
                >
                  <CardContent sx={{ pb: "16px !important" }}>
                    <Typography
                      variant="subtitle1"
                      gutterBottom
                      sx={{ color: "#ffd700", fontWeight: 600 }}
                    >
                      📊 Summary Statistics
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 3,
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ textAlign: "center", minWidth: "120px" }}>
                        <Typography
                          variant="h6"
                          sx={{ color: "#ffd700", fontWeight: 700 }}
                        >
                          {stats.mean}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "#cccccc", fontSize: "0.75rem" }}
                        >
                          Average
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "center", minWidth: "120px" }}>
                        <Typography
                          variant="h6"
                          sx={{ color: "#4fc3f7", fontWeight: 700 }}
                        >
                          {stats.median}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "#cccccc", fontSize: "0.75rem" }}
                        >
                          Median
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "center", minWidth: "120px" }}>
                        <Typography
                          variant="h6"
                          sx={{ color: "#81c784", fontWeight: 700 }}
                        >
                          {stats.min}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "#cccccc", fontSize: "0.75rem" }}
                        >
                          Min
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "center", minWidth: "120px" }}>
                        <Typography
                          variant="h6"
                          sx={{ color: "#e57373", fontWeight: 700 }}
                        >
                          {stats.max}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "#cccccc", fontSize: "0.75rem" }}
                        >
                          Max
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "center", minWidth: "120px" }}>
                        <Typography
                          variant="h6"
                          sx={{ color: "#ffb74d", fontWeight: 700 }}
                        >
                          {stats.standardDeviation}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "#cccccc", fontSize: "0.75rem" }}
                        >
                          Std Dev
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "center", minWidth: "120px" }}>
                        <Typography
                          variant="h6"
                          sx={{ color: "#ba68c8", fontWeight: 700 }}
                        >
                          {stats.range}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "#cccccc", fontSize: "0.75rem" }}
                        >
                          Range
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ) : null;
            })()}

          {logs.length === 0 ? (
            <Alert severity="info">
              No logs found for this variable. Start logging to see your data
              here!
            </Alert>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.date)}</TableCell>
                      {editingLogId === log.id ? (
                        <>
                          <TableCell>
                            <TextField
                              size="small"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              fullWidth
                              multiline
                              rows={1}
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              onClick={() => updateLog(log.id)}
                              color="primary"
                              size="small"
                            >
                              <FaCheck />
                            </IconButton>
                            <IconButton
                              onClick={cancelEdit}
                              color="secondary"
                              size="small"
                            >
                              <FaTimes />
                            </IconButton>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{log.value}</TableCell>
                          <TableCell>{log.notes || "-"}</TableCell>
                          <TableCell>
                            <IconButton
                              onClick={() => startEdit(log)}
                              color="primary"
                              size="small"
                            >
                              <FaEdit />
                            </IconButton>
                            <IconButton
                              onClick={() => deleteLog(log.id)}
                              color="error"
                              size="small"
                            >
                              <FaTrash />
                            </IconButton>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Success/Error Messages */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
        message={successMessage}
      />
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
        message={errorMessage}
      />
    </Container>
  );
}
