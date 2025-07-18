import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supaBase";
import { clearDisplayUnitCache } from "@/utils/variableUtils";
import { useUserDisplayUnit } from "@/hooks/useUserDisplayUnit";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip as MuiTooltip,
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

interface DataPointEntry {
  id: number;
  date: string;
  variable: string;
  value: string;
  notes?: string;
  created_at?: string;
  user_id?: string;
  variable_id?: string;
}

interface VariableInfo {
  id: string;
  slug: string;
  label: string;
  description?: string;
  icon?: string;
  data_type: "continuous" | "categorical" | "boolean" | "time" | "text";
  source_type:
    | "manual"
    | "oura"
    | "withings"
    | "apple_health"
    | "formula"
    | "calculated";
  category?: string;
  validation_rules?: any;
  canonical_unit?: string;
  is_public: boolean;
  convertible_units?: string[]; // Added for unit conversion
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export default function VariableDataPointsPage() {
  const router = useRouter();
  const { variableName } = router.query;
  const { user, loading: userLoading } = useUser();
  const [dataPoints, setDataPoints] = useState<DataPointEntry[]>([]);
  const [variableInfo, setVariableInfo] = useState<VariableInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isShared, setIsShared] = useState(false);
  const [sharingUpdateLoading, setSharingUpdateLoading] = useState(false);
  const [displayUnitLoading, setDisplayUnitLoading] = useState(false);
  const {
    displayUnit,
    loading: displayUnitHookLoading,
    refetch: refetchDisplayUnit,
  } = useUserDisplayUnit(variableInfo?.id || "", variableInfo || undefined);
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

  // Separate useEffect for fetching data points after variableInfo is available
  useEffect(() => {
    if (variableInfo && user) {
      fetchDataPoints();
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
      if (typeof variableName !== "string") return;

      // Regular variable lookup by slug
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

  const fetchDataPoints = async () => {
    if (!user || !variableName || !variableInfo) {
      console.log("[DEBUG] fetchDataPoints: Missing required data", {
        user: !!user,
        variableName,
        variableInfo: !!variableInfo,
      });
      return;
    }
    try {
      console.log("[DEBUG] fetchDataPoints: Starting query", {
        userId: user.id,
        variableId: variableInfo.id,
        variableName: variableInfo.label,
        sourceType: variableInfo.source_type,
      });

      let mappedDataPoints: DataPointEntry[] = [];

      // Check if this is an Oura variable
      if (variableInfo.source_type === "oura") {
        console.log(
          "[DEBUG] Fetching Oura variable logs for:",
          variableInfo.slug
        );

        const { data: ouraLogs, error: ouraError } = await supabase
          .from("oura_variable_data_points")
          .select("id, date, variable_id, value, raw, created_at")
          .eq("user_id", user.id)
          .eq("variable_id", variableInfo.slug) // Oura uses slug as variable_id
          .order("date", { ascending: false })
          .limit(50);

        console.log("[DEBUG] Oura logs query result:", {
          data: ouraLogs,
          error: ouraError,
          count: ouraLogs?.length || 0,
        });

        if (ouraError) {
          console.error("[DEBUG] Error fetching Oura logs:", ouraError);
        } else {
          mappedDataPoints = (ouraLogs || []).map((log: any) => ({
            id: log.id,
            date: log.date,
            variable: variableInfo?.label || "Unknown Variable",
            value: log.value?.toString() || "0",
            notes: "Oura Ring data", // Clean, simple note for Oura data
            created_at: log.created_at,
            user_id: user.id,
            variable_id: log.variable_id,
          }));
        }
      } else {
        // Regular variable - fetch from data_points table using variable_id (UUID)
        const { data: uuidLogs, error: uuidError } = await supabase
          .from("data_points")
          .select("id, created_at, date, variable_id, value, notes, user_id")
          .eq("user_id", user.id)
          .eq("variable_id", variableInfo.id)
          .order("created_at", { ascending: false })
          .limit(50);

        console.log("[DEBUG] Regular logs query result:", {
          data: uuidLogs,
          error: uuidError,
          count: uuidLogs?.length || 0,
        });

        if (uuidError) {
          console.error("[DEBUG] Error fetching regular logs:", uuidError);
        } else {
          mappedDataPoints = (uuidLogs || []).map((log: any) => ({
            id: log.id,
            date: log.date || log.created_at, // Use date field (local time) if available, fallback to created_at
            variable: variableInfo?.label || "Unknown Variable",
            value: log.value,
            notes: log.notes,
            created_at: log.created_at,
            user_id: log.user_id,
            variable_id: log.variable_id,
          }));
        }
      }

      console.log("[DEBUG] Final mapped data points:", mappedDataPoints);
      setDataPoints(mappedDataPoints);
    } catch (error) {
      console.error("[DEBUG] Error fetching data points:", error);
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
        .from("data_points")
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
        // Group data points by user and calculate average value for each user
        const userAverages = new Map<string, number>();
        const userDataPointCounts = new Map<string, number>();

        data.forEach((dataPoint) => {
          const value = parseFloat(dataPoint.value);
          if (!isNaN(value)) {
            const userId = dataPoint.user_id;
            const currentSum = userAverages.get(userId) || 0;
            const currentCount = userDataPointCounts.get(userId) || 0;

            userAverages.set(userId, currentSum + value);
            userDataPointCounts.set(userId, currentCount + 1);
          }
        });

        // Calculate average for each user
        const userAverageValues: number[] = [];
        userAverages.forEach((sum, userId) => {
          const count = userDataPointCounts.get(userId) || 1;
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

  const startEdit = (dataPoint: DataPointEntry) => {
    // Check if user owns this data point
    if (dataPoint.user_id && dataPoint.user_id !== user?.id) {
      setErrorMessage("You can only edit your own data points.");
      setShowError(true);
      return;
    }

    // For Oura data, show a warning that this is external data
    if (variableInfo?.source_type === "oura") {
      if (
        !confirm(
          "This is Oura Ring data. Editing it will only affect your local copy. Continue?"
        )
      ) {
        return;
      }
    }

    setEditingLogId(dataPoint.id);
    setEditValue(dataPoint.value);
    setEditNotes(dataPoint.notes || "");
  };

  const cancelEdit = () => {
    setEditingLogId(null);
    setEditValue("");
    setEditNotes("");
  };

  const updateLog = async (logId: number) => {
    try {
      let error;

      // Check if this is an Oura variable
      if (variableInfo?.source_type === "oura") {
        const { error: ouraError } = await supabase
          .from("oura_variable_data_points")
          .update({ value: editValue })
          .eq("id", logId);
        error = ouraError;
      } else {
        // Regular variable - update data_points table
        const { error: dataPointsError } = await supabase
          .from("data_points")
          .update({ value: editValue, notes: editNotes })
          .eq("id", logId);
        error = dataPointsError;
      }

      if (!error) {
        setEditingLogId(null);
        setEditValue("");
        setEditNotes("");
        await fetchDataPoints();
        setSuccessMessage("Data point updated successfully!");
        setShowSuccess(true);
      } else {
        console.error("Error updating data point:", error);
        setErrorMessage("Failed to update data point. Please try again.");
        setShowError(true);
      }
    } catch (err) {
      console.error("Error updating data point:", err);
      setErrorMessage("Failed to update data point. Please try again.");
      setShowError(true);
    }
  };

  const deleteLog = async (logId: number) => {
    if (!confirm("Are you sure you want to delete this log?")) return;

    try {
      let error;

      // Check if this is an Oura variable
      if (variableInfo?.source_type === "oura") {
        const { error: ouraError } = await supabase
          .from("oura_variable_data_points")
          .delete()
          .eq("id", logId);
        error = ouraError;
      } else {
        // Regular variable - delete from data_points table
        const { error: dataPointsError } = await supabase
          .from("data_points")
          .delete()
          .eq("id", logId);
        error = dataPointsError;
      }

      if (!error) {
        await fetchDataPoints();
        setSuccessMessage("Data point deleted successfully!");
        setShowSuccess(true);
      } else {
        console.error("Error deleting data point:", error);
        setErrorMessage("Failed to delete data point. Please try again.");
        setShowError(true);
      }
    } catch (err) {
      console.error("Error deleting data point:", err);
      setErrorMessage("Failed to delete data point. Please try again.");
      setShowError(true);
    }
  };

  // Calculate summary statistics for data points
  const calculateStatistics = () => {
    if (dataPoints.length === 0) return null;

    const values = dataPoints
      .map((dataPoint) => parseFloat(dataPoint.value))
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

  const updateDisplayUnit = async (unit: string) => {
    if (!user || !variableInfo) return;

    setDisplayUnitLoading(true);
    try {
      const { error } = await supabase
        .from("user_variable_preferences")
        .upsert({
          user_id: user.id,
          variable_id: variableInfo.id,
          display_unit: unit,
        });

      if (error) {
        console.error("Error updating display unit:", error);
        setErrorMessage("Failed to update display unit preference");
        setShowError(true);
      } else {
        setSuccessMessage("Display unit preference updated successfully");
        setShowSuccess(true);
        clearDisplayUnitCache(user.id, variableInfo.id); // Clear cache after successful update
        await refetchDisplayUnit(); // Refetch using the hook
      }
    } catch (error) {
      console.error("Error updating display unit:", error);
      setErrorMessage("Failed to update display unit preference");
      setShowError(true);
    } finally {
      setDisplayUnitLoading(false);
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

  if (!variableInfo) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<FaArrowLeft />}
          onClick={() => router.back()}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <Alert severity="error">
          Variable not found. This might be an Oura variable which has its own
          dedicated page.
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
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Variable Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="textSecondary">
                Description:
              </Typography>
              <Typography variant="body1">
                {variableInfo?.description || "No description available"}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="textSecondary">
                Data Type:
              </Typography>
              <Typography variant="body1">
                {variableInfo?.data_type || "Unknown"}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="textSecondary">
                Unit:
              </Typography>
              <Typography variant="body1">
                {displayUnit || variableInfo?.canonical_unit || "No unit"}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="textSecondary">
                Total Data Points:
              </Typography>
              <Typography variant="body1">{dataPoints.length}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="textSecondary">
                Sharing:
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isShared}
                      onChange={(e) => handleSharingToggle(e.target.checked)}
                      disabled={sharingUpdateLoading}
                      color="primary"
                    />
                  }
                  label=""
                />
                <Typography variant="body2" color="textSecondary">
                  {isShared ? "Shared with community" : "Private"}
                </Typography>
                {sharingUpdateLoading && <CircularProgress size={16} />}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Recent Data Points Table */}
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Recent Data Points</Typography>
            <Alert severity="info" sx={{ py: 0, px: 2 }}>
              Click the edit/delete icons to modify your data points
            </Alert>
          </Box>
          {dataPoints.length === 0 ? (
            <Alert severity="info">
              No data points found for this variable. Start tracking data to see
              it here.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
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
                  {dataPoints.slice(0, 20).map((dataPoint) => (
                    <TableRow key={dataPoint.id}>
                      <TableCell>
                        {new Date(dataPoint.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {editingLogId === dataPoint.id ? (
                          <TextField
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            size="small"
                            fullWidth
                          />
                        ) : (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {dataPoint.value}
                            {variableInfo?.source_type === "oura" && (
                              <Chip
                                label="Oura"
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingLogId === dataPoint.id ? (
                          <TextField
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            size="small"
                            fullWidth
                            multiline
                            rows={2}
                          />
                        ) : (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {dataPoint.notes || "-"}
                            {variableInfo?.source_type === "oura" && (
                              <Chip
                                label="External"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingLogId === dataPoint.id ? (
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <MuiTooltip title="Save changes">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => updateLog(dataPoint.id)}
                                sx={{
                                  backgroundColor: "primary.main",
                                  color: "white",
                                  "&:hover": {
                                    backgroundColor: "primary.dark",
                                  },
                                }}
                              >
                                <FaCheck />
                              </IconButton>
                            </MuiTooltip>
                            <MuiTooltip title="Cancel editing">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={cancelEdit}
                                sx={{
                                  backgroundColor: "error.main",
                                  color: "white",
                                  "&:hover": {
                                    backgroundColor: "error.dark",
                                  },
                                }}
                              >
                                <FaTimes />
                              </IconButton>
                            </MuiTooltip>
                          </Box>
                        ) : (
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <MuiTooltip title="Edit this data point">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => startEdit(dataPoint)}
                                sx={{
                                  "&:hover": {
                                    backgroundColor: "primary.light",
                                  },
                                }}
                              >
                                <FaEdit />
                              </IconButton>
                            </MuiTooltip>
                            <MuiTooltip title="Delete this data point">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => deleteLog(dataPoint.id)}
                                sx={{
                                  "&:hover": {
                                    backgroundColor: "error.light",
                                  },
                                }}
                              >
                                <FaTrash />
                              </IconButton>
                            </MuiTooltip>
                          </Box>
                        )}
                      </TableCell>
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
