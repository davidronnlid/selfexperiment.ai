import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supaBase";
import { clearDisplayUnitCache } from "@/utils/variableUtils";
import { useUserDisplayUnit } from "@/hooks/useUserDisplayUnit";
import { useUser } from "../_app";
import VariableUnitSelector from "@/components/VariableUnitSelector";
import VariableAdminEditor from "@/components/VariableAdminEditor";
import VariableMergeEditor from "@/components/VariableMergeEditor";
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
  FaCog,
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
  value: string;
  notes?: string;
  created_at: string;
  variable?: string;
  source?: string[];
  routine_id?: number;
  user_id?: string;
  variable_id?: string;
  display_unit?: string;
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
  updated_at?: string; // Add back the optional updated_at field
  is_active: boolean;
}

export default function VariableDataPointsPage() {
  const router = useRouter();
  const { variableName } = router.query;
  const editDataPointId = router.query.edit as string; // Get edit parameter
  const { user, loading: userLoading, username } = useUser();
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
  const [editUnit, setEditUnit] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showError, setShowError] = useState(false);
  
  // Admin edit state
  const [adminEditOpen, setAdminEditOpen] = useState(false);
  
  // Merge editor state
  const [mergeEditOpen, setMergeEditOpen] = useState(false);
  
  // Variable grouping state
  const [childVariables, setChildVariables] = useState<VariableInfo[]>([]);
  const [selectedVariableId, setSelectedVariableId] = useState<string>("");
  const [showChildData, setShowChildData] = useState(false);
  
  const isAdmin = username === "davidronnlidmh";

  const fetchVariableInfo = useCallback(async () => {
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

      // Check if this is a configuration issue
      if (
        (error && error.message?.includes("Invalid API key")) ||
        error?.code === "PGRST301" ||
        error?.message?.includes("schema")
      ) {
        console.error("❌ Supabase configuration error:", error);
        setErrorMessage(
          "Database configuration error. Please check your environment variables."
        );
        setShowError(true);
        return;
      }

      // Fallback: not found
      setVariableInfo(null);
    } catch (error) {
      console.error("Error fetching variable info:", error);
      setErrorMessage(
        "Failed to load variable information. Please check your configuration."
      );
      setShowError(true);
    }
  }, [variableName]);

  const fetchDataPoints = useCallback(async () => {
    if (!user || !variableName || !variableInfo) return;

    try {
      let mappedDataPoints: DataPointEntry[] = [];

      // Get all variable IDs to fetch (current variable + any child variables)
      const variableIdsToFetch = [variableInfo.id];

      // Check for child variables that have this variable as parent
      const { data: childVariablesData, error: childError } = await supabase
        .from("variables")
        .select("id, label, source_type, slug, description, icon, data_type, category, canonical_unit, is_public, created_at, updated_at, is_active")
        .eq("parent_variable_id", variableInfo.id)
        .eq("is_active", true);

      if (!childError && childVariablesData) {
        setChildVariables(childVariablesData);
        // Only include child variables in fetch if not showing child data specifically
        if (!showChildData) {
          childVariablesData.forEach(child => {
            variableIdsToFetch.push(child.id);
          });
        }
        console.log(`📊 [Variable Page] Found ${childVariablesData.length} child variables for ${variableInfo.label}`);
      }

      // Fetch data for all related variables
      for (const variableId of variableIdsToFetch) {
        // Get variable info for this ID
        const { data: varInfo, error: varError } = await supabase
          .from("variables")
          .select("id, label, source_type")
          .eq("id", variableId)
          .single();

        if (varError || !varInfo) continue;

        // Check if this is an Oura variable
        if (varInfo.source_type === "oura") {
          const { data: ouraLogs, error: ouraError } = await supabase
            .from("oura_variable_data_points")
            .select("id, date, variable_id, value, created_at")
            .eq("user_id", user.id)
            .eq("variable_id", varInfo.id)
            .order("date", { ascending: false })
            .limit(20);

          if (!ouraError && ouraLogs) {
            const ouraDataPoints = ouraLogs.map((log: any) => ({
              id: log.id,
              date: log.date,
              variable: varInfo.label,
              value: log.value?.toString() || "0",
              notes: `Oura Ring data (${varInfo.label})`,
              created_at: log.created_at,
              user_id: user.id,
              variable_id: log.variable_id,
              source: ["oura"],
            }));
            mappedDataPoints.push(...ouraDataPoints);
          }
        } else if (varInfo.source_type === "apple_health") {
          // Fetch Apple Health data
          const { data: appleHealthLogs, error: appleHealthError } = await supabase
            .from("apple_health_variable_data_points")
            .select("id, date, variable_id, value, created_at")
            .eq("user_id", user.id)
            .eq("variable_id", varInfo.id)
            .order("date", { ascending: false })
            .limit(20);

          if (!appleHealthError && appleHealthLogs) {
            const appleHealthDataPoints = appleHealthLogs.map((log: any) => ({
              id: log.id,
              date: log.date,
              variable: varInfo.label,
              value: log.value?.toString() || "0",
              notes: `Apple Health data (${varInfo.label})`,
              created_at: log.created_at,
              user_id: user.id,
              variable_id: log.variable_id,
              source: ["apple_health"],
            }));
            mappedDataPoints.push(...appleHealthDataPoints);
          }
        } else {
          // Regular variable - fetch from data_points table
          const { data: uuidLogs, error: uuidError } = await supabase
            .from("data_points")
            .select("id, created_at, date, variable_id, value, notes, user_id, display_unit")
            .eq("user_id", user.id)
            .eq("variable_id", varInfo.id)
            .order("created_at", { ascending: false })
            .limit(20);

          if (!uuidError && uuidLogs) {
            const regularDataPoints = uuidLogs.map((log: any) => ({
              id: log.id,
              date: log.date || log.created_at,
              variable: varInfo.label,
              value: log.value,
              notes: log.notes,
              created_at: log.created_at,
              user_id: log.user_id,
              variable_id: log.variable_id,
              display_unit: log.display_unit,
              source: ["manual"],
            }));
            mappedDataPoints.push(...regularDataPoints);
          }
        }
      }

      // Filter data points based on selected variable if showing child data
      if (showChildData && selectedVariableId) {
        mappedDataPoints = mappedDataPoints.filter(dp => dp.variable_id === selectedVariableId);
        console.log(`📊 [Variable Page] Filtered to ${mappedDataPoints.length} data points for selected variable`);
      }

      // Sort all data points by date (newest first)
      mappedDataPoints.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log(`📊 [Variable Page] Fetched ${mappedDataPoints.length} total data points for ${variableInfo.label} and its children`);
      setDataPoints(mappedDataPoints);
    } catch (error) {
      console.error("Error fetching data points:", error);
      setDataPoints([]);
    }
  }, [user, variableName, variableInfo, showChildData, selectedVariableId]);

  const fetchSharingStatus = useCallback(async () => {
    if (!user || !variableInfo) return;

    try {
      const { data, error } = await supabase
        .from("user_variable_preferences")
        .select("is_shared")
        .eq("user_id", user.id)
        .eq("variable_id", variableInfo.id)
        .maybeSingle();

      if (error) {
        setIsShared(false);
      } else if (data) {
        setIsShared(Boolean(data.is_shared));
      } else {
        setIsShared(false);
      }
    } catch (error) {
      setIsShared(false);
    }
  }, [user, variableInfo]);

  useEffect(() => {
    if (!variableName || userLoading) return;

    const initializePage = async () => {
      try {
        // First fetch variable info
        await fetchVariableInfo();
      } catch (error) {
        console.error("Error initializing page:", error);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [variableName, user, userLoading]); // Removed fetchVariableInfo to prevent infinite loop

  // Separate useEffect for fetching data points after variableInfo is available
  useEffect(() => {
    if (variableInfo && user) {
      fetchDataPoints();
      fetchSharingStatus();
    }
  }, [variableInfo, user, fetchDataPoints, fetchSharingStatus]);

  // Handle edit query parameter - auto-start editing when data point is loaded
  useEffect(() => {
    if (editDataPointId && dataPoints.length > 0) {
      const dataPointToEdit = dataPoints.find(
        (dp: any) => dp.id.toString() === editDataPointId
      );
      if (dataPointToEdit) {
        // Check if user owns this data point
        if (dataPointToEdit.user_id && dataPointToEdit.user_id !== user?.id) {
          setErrorMessage("You can only edit your own data points.");
          setShowError(true);
          return;
        }

        // Start editing this data point
        setEditingLogId(dataPointToEdit.id);
        setEditValue(dataPointToEdit.value);
        setEditNotes(dataPointToEdit.notes || "");

        // Scroll to the data point after a brief delay to ensure table is rendered
        setTimeout(() => {
          const element = document.getElementById(
            `data-point-${dataPointToEdit.id}`
          );
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            // Add visual highlight
            element.style.backgroundColor = "#fff3cd";
            setTimeout(() => {
              element.style.backgroundColor = "";
            }, 3000);
          }
        }, 100);

        // Remove edit parameter from URL without triggering a reload
        const newUrl = `/variable/${variableName}`;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [editDataPointId, dataPoints, user?.id, variableName]);

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

      // Skip the table test - just try the upsert directly

      const { data, error } = await supabase
        .from("user_variable_preferences")
        .upsert({
          user_id: user.id,
          variable_id: variableInfo?.id || "",
          is_shared: shared,
        })
        .select();

      if (error) throw error;

      // Force refresh the sharing status to ensure UI is in sync
      await fetchSharingStatus();

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
    if (!variableName || !variableInfo) return;

    setDistributionLoading(true);
    try {
      // Simplified and faster distribution query for mobile
      const { data: sharedUsers, error: usersError } = await supabase
        .from("user_variable_preferences")
        .select("user_id")
        .eq("variable_id", variableInfo.id)
        .eq("is_shared", true)
        .limit(20); // Reduced limit for mobile performance

      if (usersError || !sharedUsers || sharedUsers.length === 0) {
        setDistributionData([]);
        return;
      }

      const userIds = sharedUsers.map((row) => row.user_id);

      // Get recent data points only
      const { data, error } = await supabase
        .from("data_points")
        .select("value")
        .eq("variable_id", variableInfo.id)
        .in("user_id", userIds)
        .limit(50) // Much smaller limit for mobile performance
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setDistributionData([]);
        return;
      }

      // Simplified histogram calculation
      const values = data
        .map((d) => parseFloat(d.value))
        .filter((v) => !isNaN(v));

      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const bins = 3; // Fixed small number of bins for simplicity
        const binWidth = (max - min) / bins;

        const histogram = Array.from({ length: bins }, (_, i) => {
          const binStart = min + i * binWidth;
          const binEnd = min + (i + 1) * binWidth;
          const count = values.filter((val) =>
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
      } else {
        setDistributionData([]);
      }
    } catch (error) {
      setDistributionData([]);
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
    // Use the data point's display unit, or fall back to the user's preferred unit
    setEditUnit(dataPoint.display_unit || displayUnit || "");
  };

  const cancelEdit = () => {
    setEditingLogId(null);
    setEditValue("");
    setEditNotes("");
    setEditUnit("");
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
          .update({ 
            value: editValue, 
            notes: editNotes,
            display_unit: editUnit 
          })
          .eq("id", logId);
        error = dataPointsError;
      }

      if (!error) {
        setEditingLogId(null);
        setEditValue("");
        setEditNotes("");
        setEditUnit("");
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

  // Simplified statistics calculation for better mobile performance
  const calculateStatistics = () => {
    if (dataPoints.length === 0) return null;

    const values = dataPoints
      .map((dataPoint) => parseFloat(dataPoint.value))
      .filter((val) => !isNaN(val));

    if (values.length === 0) return null;

    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: values.length,
      mean: mean.toFixed(1),
      min: min.toFixed(1),
      max: max.toFixed(1),
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
      // Use the RPC function instead of direct upsert
      const { data: success, error } = await supabase.rpc(
        "set_user_unit_preference",
        {
          user_id_param: user.id,
          variable_id_param: variableInfo.id,
          unit_id_param: unit,
        }
      );

      if (error) {
        console.error("Error updating display unit:", error);
        setErrorMessage("Failed to update display unit preference");
        setShowError(true);
      } else if (!success) {
        console.error(
          "Function returned false - unit may not be available for this variable"
        );
        setErrorMessage("Selected unit is not available for this variable");
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

  const handleAdminSave = (updatedVariable: VariableInfo) => {
    setVariableInfo(updatedVariable);
    setSuccessMessage("Variable updated successfully!");
    setShowSuccess(true);
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
      </Box>

      {/* Variable Information Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
            <Typography 
              variant="h4" 
              component="h1"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <span>{variableInfo?.icon || "📊"}</span>
              {variableInfo?.label || variableName}
            </Typography>
            
            {isAdmin && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<FaCog />}
                  onClick={() => setAdminEditOpen(true)}
                  size="small"
                >
                  Edit Variable
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setMergeEditOpen(true)}
                  size="small"
                  sx={{ 
                    bgcolor: '#FF9800',
                    '&:hover': { bgcolor: '#F57C00' }
                  }}
                >
                  Merge Variables
                </Button>
              </Box>
            )}
          </Box>
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
              <Box sx={{ maxWidth: 300 }}>
                <VariableUnitSelector
                  variableId={variableInfo.id}
                  userId={user?.id || ""}
                  currentUnit={displayUnit}
                  onUnitChange={async (unitId, unitGroup) => {
                    // Update the user's display unit preference
                    await updateDisplayUnit(unitId);
                    // Refresh the display unit
                    await refetchDisplayUnit();
                  }}
                  disabled={displayUnitLoading}
                  label="Default Unit"
                  size="small"
                />
              </Box>
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
            
            {/* Variable Grouping Toggle */}
            {childVariables.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Data Source:
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showChildData}
                        onChange={(e) => {
                          setShowChildData(e.target.checked);
                          if (!e.target.checked) {
                            setSelectedVariableId("");
                          } else if (childVariables.length > 0) {
                            setSelectedVariableId(childVariables[0].id);
                          }
                        }}
                        color="secondary"
                      />
                    }
                    label="Show child variable data"
                  />
                  
                  {showChildData && childVariables.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Select Variable</InputLabel>
                      <Select
                        value={selectedVariableId}
                        onChange={(e) => {
                          setSelectedVariableId(e.target.value);
                          fetchDataPoints(); // Refetch data with new filter
                        }}
                        label="Select Variable"
                      >
                        {childVariables.map((child) => (
                          <MenuItem key={child.id} value={child.id}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Chip
                                label={child.source_type || "manual"}
                                size="small"
                                sx={{ 
                                  backgroundColor: child.source_type === "oura" ? "#9C27B0" :
                                                child.source_type === "apple_health" ? "#FF9800" :
                                                child.source_type === "withings" ? "#00BCD4" : "#4CAF50",
                                  color: "white"
                                }}
                              />
                              {child.label}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Box>
              </Grid>
            )}
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
            <Box>
              <Typography variant="h6">All Your Data Points</Typography>
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ mt: 0.5 }}
              >
                Total Data Points: {dataPoints.length}
              </Typography>
            </Box>
            <Alert severity="info" sx={{ py: 0, px: 2 }}>
              💡 Click the edit/delete icons to modify your data points. Both value and unit can be edited.
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
                    <TableCell sx={{ width: "20%" }}>Date</TableCell>
                    <TableCell sx={{ width: "35%" }}>Value & Unit</TableCell>
                    <TableCell sx={{ width: "30%" }}>Notes</TableCell>
                    <TableCell sx={{ width: "15%" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dataPoints.slice(0, 10).map((dataPoint) => (
                    <TableRow
                      key={dataPoint.id}
                      id={`data-point-${dataPoint.id}`}
                    >
                      <TableCell>{formatDate(dataPoint.date)}</TableCell>
                      <TableCell>
                        {editingLogId === dataPoint.id ? (
                          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", minWidth: 250 }}>
                            <TextField
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              size="small"
                              label="Value"
                              sx={{ flex: 2, minWidth: 100 }}
                            />
                            <Box sx={{ flex: 1, minWidth: 120 }}>
                              <VariableUnitSelector
                                variableId={variableInfo.id}
                                userId={user?.id || ""}
                                currentUnit={editUnit}
                                onUnitChange={(unitId, unitGroup) => {
                                  setEditUnit(unitId);
                                }}
                                label="Unit"
                                size="small"
                              />
                            </Box>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {dataPoint.value}
                              </Typography>
                              {dataPoint.display_unit && (
                                <Typography variant="body2" color="text.secondary">
                                  {dataPoint.display_unit}
                                </Typography>
                              )}
                            </Box>
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

      {/* Admin Edit Dialog */}
      {isAdmin && variableInfo && (
        <VariableAdminEditor
          variable={variableInfo}
          open={adminEditOpen}
          onClose={() => setAdminEditOpen(false)}
          onSave={handleAdminSave}
        />
      )}

      {/* Variable Merge Editor */}
      {isAdmin && variableInfo && (
        <VariableMergeEditor
          open={mergeEditOpen}
          onClose={() => setMergeEditOpen(false)}
          currentVariable={variableInfo}
          onMergeCreated={(mergeSlug) => {
            console.log('Merge created:', mergeSlug);
            // Optionally navigate to the merged variable view
            // router.push(`/merged-variable/${mergeSlug}`);
          }}
        />
      )}
    </Container>
  );
}
