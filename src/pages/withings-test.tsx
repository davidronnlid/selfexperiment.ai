import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Divider,
  Chip,
  TextField,
  FormControlLabel,
  Switch,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
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
import {
  Sync as SyncIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Link as LinkIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Code as CodeIcon,
  Launch as LaunchIcon,
  Warning as WarningIcon,
  LinkOff as LinkOffIcon,
} from "@mui/icons-material";
import { useUser } from "./_app";
import { supabase } from "../utils/supaBase";

// Data Preview Component
function WithingsDataPreview({
  userId,
  onReconnect,
}: {
  userId: string;
  onReconnect: () => void;
}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [searchStartDate, setSearchStartDate] = useState<string>("");
  const [searchEndDate, setSearchEndDate] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dataStats, setDataStats] = useState<{
    totalRecords: number;
    dateRange: { min: string; max: string };
    variables: string[];
  } | null>(null);

  const fetchPreviewData = async () => {
    setLoading(true);
    try {
      // Fetch recent data with variable information
      const { data: withingsData, error } = await supabase
        .from("withings_variable_data_points")
        .select(
          `
          date, 
          variable_id, 
          value, 
          created_at,
          variables!inner(slug, label)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setData(withingsData || []);

      // Fetch data stats with variable information
      const { data: statsData, error: statsError } = await supabase
        .from("withings_variable_data_points")
        .select(
          `
          date, 
          variable_id,
          variables!inner(slug, label)
        `
        )
        .eq("user_id", userId);

      if (!statsError && statsData && statsData.length > 0) {
        const dates = statsData.map((row) => row.date).sort();
        const variables = [
          ...new Set(statsData.map((row: any) => row.variables?.label)),
        ].filter(Boolean);

        setDataStats({
          totalRecords: statsData.length,
          dateRange: {
            min: dates[0],
            max: dates[dates.length - 1],
          },
          variables: variables.sort(),
        });
      }
    } catch (error) {
      console.error("Error fetching preview data:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchByDate = async () => {
    if (!searchStartDate && !searchEndDate) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      console.log("Searching with dates:", { searchStartDate, searchEndDate });

      let query = supabase
        .from("withings_variable_data_points")
        .select(
          `
          date, 
          variable_id, 
          value, 
          created_at, 
          user_id,
          variables!inner(slug, label)
        `
        )
        .eq("user_id", userId);

      // First, let's see what data exists without date filters
      const { data: allData, error: allError } = await supabase
        .from("withings_variable_data_points")
        .select(
          `
          date, 
          variable_id, 
          value, 
          created_at, 
          user_id,
          variables!inner(slug, label)
        `
        )
        .eq("user_id", userId)
        .limit(10);

      if (allError) throw allError;
      console.log("Sample data in database:", allData);

      // Now apply date filters
      if (searchStartDate) {
        // Convert to ISO string for proper comparison
        const startDate = new Date(
          searchStartDate + "T00:00:00.000Z"
        ).toISOString();
        console.log("Start date filter:", startDate);
        query = query.gte("date", startDate);
      }
      if (searchEndDate) {
        // Convert to end of day for proper comparison
        const endDate = new Date(
          searchEndDate + "T23:59:59.999Z"
        ).toISOString();
        console.log("End date filter:", endDate);
        query = query.lte("date", endDate);
      }

      const { data: searchData, error } = await query
        .order("date", { ascending: false })
        .limit(50);

      if (error) throw error;
      console.log("Search results:", searchData);
      setSearchResults(searchData || []);
    } catch (error) {
      console.error("Error searching by date:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchPreviewData();
    }
  }, [userId]);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h5">
            📊 Recent Withings Data ({data.length} records shown)
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              onClick={fetchPreviewData}
              disabled={loading}
              size="small"
            >
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={() => setExpanded(!expanded)} size="small">
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded}>
          {/* Date Search Section */}
          <Box sx={{ mb: 3, p: 2, border: "1px solid #333", borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              🔍 Search by Date Range
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Search for specific Withings data points by date to verify your
              data is synced correctly.
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
                value={searchStartDate}
                onChange={(e) => setSearchStartDate(e.target.value)}
                size="small"
                sx={{ minWidth: 150 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                value={searchEndDate}
                onChange={(e) => setSearchEndDate(e.target.value)}
                size="small"
                sx={{ minWidth: 150 }}
                InputLabelProps={{ shrink: true }}
              />
              <Button
                variant="contained"
                onClick={searchByDate}
                disabled={searchLoading || (!searchStartDate && !searchEndDate)}
                size="small"
              >
                {searchLoading ? <CircularProgress size={16} /> : "Search"}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchStartDate("");
                  setSearchEndDate("");
                  setSearchResults([]);
                }}
                size="small"
              >
                Clear
              </Button>
              <Button
                variant="outlined"
                onClick={async () => {
                  setSearchLoading(true);
                  try {
                    const { data: allData, error } = await supabase
                      .from("withings_variable_data_points")
                      .select(
                        `
                        date, 
                        variable_id, 
                        value, 
                        created_at, 
                        user_id,
                        variables!inner(slug, label)
                      `
                      )
                      .eq("user_id", userId)
                      .order("date", { ascending: false })
                      .limit(20);

                    if (error) throw error;
                    setSearchResults(allData || []);
                    console.log("All data (first 20):", allData);
                  } catch (error) {
                    console.error("Error fetching all data:", error);
                  } finally {
                    setSearchLoading(false);
                  }
                }}
                size="small"
                disabled={searchLoading}
              >
                Show All
              </Button>
            </Box>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  📅 Search Results ({searchResults.length} data points found)
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Date</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Variable</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Value</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Synced At</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {searchResults.map((row, index) => (
                        <TableRow key={`search-${index}`}>
                          <TableCell>
                            {new Date(row.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={row.variables?.label || row.variable_id}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontFamily="monospace">
                              {typeof row.value === "number"
                                ? row.value.toFixed(2)
                                : row.value}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {row.created_at
                                ? new Date(row.created_at).toLocaleString()
                                : "Unknown"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {searchResults.length === 0 &&
              (searchStartDate || searchEndDate) &&
              !searchLoading && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No data points found for the selected date range. Try a
                  different date range or check if your Withings data has been
                  synced.
                  <br />
                  <Typography
                    variant="caption"
                    sx={{ mt: 1, display: "block" }}
                  >
                    <strong>Debug Info:</strong> Check browser console for
                    sample data and date format details.
                  </Typography>
                </Alert>
              )}
          </Box>

          {/* Data Stats Section */}
          {dataStats && (
            <Box
              sx={{ mb: 3, p: 2, bgcolor: "background.paper", borderRadius: 1 }}
            >
              <Typography variant="h6" gutterBottom>
                📈 Data Overview
              </Typography>
              <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Records
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {dataStats.totalRecords}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Date Range
                  </Typography>
                  <Typography variant="body2">
                    {new Date(dataStats.dateRange.min).toLocaleDateString()} -{" "}
                    {new Date(dataStats.dateRange.max).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Variables Tracked
                  </Typography>
                  <Typography variant="body2">
                    {dataStats.variables.length} types
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Available Variables:
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {dataStats.variables.map((variable) => (
                    <Chip
                      key={variable}
                      label={variable}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          )}

          {/* Recent Data Section */}
          <Typography variant="h6" gutterBottom>
            📊 Recent Data (Last 5 records)
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : data.length > 0 ? (
            <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Date</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Variable</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Value</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Synced At</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(row.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.variables?.label || row.variable_id}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontFamily="monospace">
                          {typeof row.value === "number"
                            ? row.value.toFixed(2)
                            : row.value}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {row.created_at
                            ? new Date(row.created_at).toLocaleString()
                            : "Unknown"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No Withings data found. Try running "Test Sync All" to import your
              data.
            </Alert>
          )}
        </Collapse>

        {!expanded && data.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click the expand button to view your recent Withings data points.
          </Typography>
        )}

        {/* Check if data has missing created_at timestamps */}
        {data.length > 0 && data.some((row) => !row.created_at) && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Some of your Withings data is missing sync timestamps. This
              usually means the data was imported before the database schema was
              updated.
              <br />
              <strong>Recommendation:</strong> Reconnect to Withings to re-sync
              your data with proper timestamps.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={onReconnect}
              sx={{ mt: 1 }}
            >
              Reconnect to Withings
            </Button>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

interface TestResult {
  action: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
  duration?: number;
}

interface EnvironmentCheck {
  name: string;
  status: "success" | "error" | "warning" | "info";
  message: string;
  value?: string;
}

export default function WithingsTestPage() {
  const { user, loading } = useUser();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    dataCount?: number;
    lastSync?: string;
  } | null>(null);
  const [clearExisting, setClearExisting] = useState(true);
  const [startYear, setStartYear] = useState(2020);
  const [envChecks, setEnvChecks] = useState<EnvironmentCheck[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Add test result helper
  const addTestResult = (
    action: string,
    success: boolean,
    data?: any,
    error?: string,
    duration?: number
  ) => {
    setTestResults((prev) => [
      {
        action,
        success,
        data,
        error,
        timestamp: new Date(),
        duration,
      },
      ...prev,
    ]);
  };

  // Check environment variables and setup
  const checkEnvironment = () => {
    const checks: EnvironmentCheck[] = [];

    // Check Supabase URL
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      checks.push({
        name: "Supabase URL",
        status: "success",
        message: "Supabase URL is configured",
        value: process.env.NEXT_PUBLIC_SUPABASE_URL,
      });
    } else {
      checks.push({
        name: "Supabase URL",
        status: "error",
        message: "NEXT_PUBLIC_SUPABASE_URL is not configured",
      });
    }

    // Check Supabase Anon Key
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      checks.push({
        name: "Supabase Anon Key",
        status: "success",
        message: "Supabase Anon Key is configured",
        value: `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(
          0,
          20
        )}...`,
      });
    } else {
      checks.push({
        name: "Supabase Anon Key",
        status: "error",
        message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured",
      });
    }

    // Check if user is authenticated
    if (user?.id) {
      checks.push({
        name: "User Authentication",
        status: "success",
        message: "User is authenticated",
        value: user.id,
      });
    } else {
      checks.push({
        name: "User Authentication",
        status: "error",
        message: "User is not authenticated",
      });
    }

    // Check edge function URLs
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      checks.push({
        name: "Edge Function URLs",
        status: "info",
        message:
          "Edge function endpoints will be constructed from Supabase URL",
        value: `${supabaseUrl}/functions/v1/`,
      });
    }

    setEnvChecks(checks);
  };

  // Check connection status
  const checkConnection = async () => {
    if (!user?.id) return;

    const startTime = Date.now();
    try {
      const response = await fetch("/api/withings/processor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get-status",
          user_id: user.id,
        }),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      if (data.success) {
        // Also fetch the actual data count from the database
        const countResponse = await fetch("/api/withings/processor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "get-data-count",
            user_id: user.id,
          }),
        });

        const countData = await countResponse.json();
        const dataCount = countData.success ? countData.data_count : 0;

        setConnectionStatus({
          connected: true,
          dataCount: dataCount,
          lastSync: new Date().toISOString(),
        });

        addTestResult(
          "Check Connection",
          true,
          duration,
          `Connected with ${dataCount} data points`
        );
      } else {
        setConnectionStatus({
          connected: false,
          dataCount: 0,
        });
        addTestResult(
          "Check Connection",
          false,
          duration,
          data.error || "Not connected"
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      setConnectionStatus({
        connected: false,
        dataCount: 0,
      });
      addTestResult(
        "Check Connection",
        false,
        duration,
        error instanceof Error ? error.message : "Failed to fetch"
      );
    }
  };

  // Connect to Withings via OAuth
  const connectToWithings = async () => {
    if (!user?.id) return;

    try {
      // Use the existing Withings auth endpoint
      const authUrl = `/api/withings/auth?user_id=${
        user.id
      }&user_email=${encodeURIComponent(user.email || "")}`;
      window.location.href = authUrl;
    } catch (error) {
      addTestResult(
        "Connect to Withings",
        false,
        undefined,
        error instanceof Error ? error.message : "Failed to initiate OAuth"
      );
    }
  };

  const disconnectFromWithings = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch("/api/withings/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus({
          connected: false,
          dataCount: 0,
        });
        addTestResult(
          "Disconnect",
          true,
          undefined,
          "Account disconnected successfully"
        );
      } else {
        addTestResult(
          "Disconnect",
          false,
          undefined,
          result.error || "Failed to disconnect"
        );
      }
    } catch (error) {
      addTestResult(
        "Disconnect",
        false,
        undefined,
        error instanceof Error ? error.message : "Failed to disconnect"
      );
    }
  };

  // Test the new withings-sync-all edge function
  const testSyncAll = async () => {
    if (!user?.id) return;

    setTesting(true);
    const startTime = Date.now();
    try {
      const response = await fetch("/api/withings/sync-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          clearExisting,
          startYear,
        }),
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      if (result.success) {
        addTestResult(
          "Test Sync All",
          true,
          duration,
          `Synced ${
            result.data?.totalUpserted ||
            result.data?.dataCount ||
            result.dataCount ||
            0
          } data points from ${startYear}-present`
        );
        // Refresh connection status to show updated data count
        setTimeout(() => checkConnection(), 1000);
      } else {
        addTestResult(
          "Test Sync All",
          false,
          duration,
          result.error || "Sync failed"
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      addTestResult(
        "Test Sync All",
        false,
        duration,
        error instanceof Error ? error.message : "Failed to fetch"
      );
    } finally {
      setTesting(false);
    }
  };

  const testProcessor = async () => {
    if (!user?.id) return;

    setTesting(true);
    const startTime = Date.now();
    try {
      const response = await fetch("/api/withings/processor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "sync",
          user_id: user.id,
          meastype: "1,6,76,77", // weight, fat_ratio, muscle_mass, hydration
          startdate: Math.floor(new Date("2024-01-01").getTime() / 1000),
          enddate: Math.floor(new Date().getTime() / 1000),
        }),
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      if (result.success) {
        addTestResult(
          "Test Processor",
          true,
          duration,
          `Processed ${result.dataCount || 0} data points for 2024-present`
        );
        // Refresh connection status to show updated data count
        setTimeout(() => checkConnection(), 1000);
      } else {
        addTestResult(
          "Test Processor",
          false,
          duration,
          result.error || "Processing failed"
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      addTestResult(
        "Test Processor",
        false,
        duration,
        error instanceof Error ? error.message : "Failed to fetch"
      );
    } finally {
      setTesting(false);
    }
  };

  // Check environment and connection on mount
  useEffect(() => {
    checkEnvironment();
    if (user?.id) {
      checkConnection();
    }
  }, [user?.id]);

  // Check for success parameter from OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("withings") === "success") {
      setShowSuccessMessage(true);
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh connection status after successful OAuth
      setTimeout(() => {
        checkConnection();
      }, 1000);
    }
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          You need to be logged in to test Withings integration.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        🏥 Withings Integration Test
      </Typography>

      {/* Success Message */}
      {showSuccessMessage && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setShowSuccessMessage(false)}
        >
          <Typography variant="h6" gutterBottom>
            ✅ Withings Connection Successful!
          </Typography>
          <Typography variant="body2">
            Your Withings account has been successfully connected. You can now
            test the data sync functionality below.
          </Typography>
        </Alert>
      )}

      {/* Environment Check */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <SecurityIcon sx={{ mr: 1 }} />
            <Typography variant="h5">Environment & Setup Check</Typography>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {envChecks.map((check, index) => (
              <Box
                key={index}
                sx={{ flex: { xs: "1 1 100%", md: "1 1 calc(50% - 8px)" } }}
              >
                <Box display="flex" alignItems="center" mb={1}>
                  {check.status === "success" && (
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  )}
                  {check.status === "error" && (
                    <ErrorIcon color="error" sx={{ mr: 1 }} />
                  )}
                  {check.status === "warning" && (
                    <WarningIcon color="warning" sx={{ mr: 1 }} />
                  )}
                  {check.status === "info" && (
                    <InfoIcon color="info" sx={{ mr: 1 }} />
                  )}
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    {check.name}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ mb: 1 }}
                >
                  {check.message}
                </Typography>
                {check.value && (
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                      backgroundColor: "rgba(0,0,0,0.1)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {check.value}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* User Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            User Information
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ flex: { xs: "1 1 100%", md: "1 1 calc(50% - 8px)" } }}>
              <Typography variant="body2" color="textSecondary">
                <strong>User ID:</strong> {user.id}
              </Typography>
            </Box>
            <Box sx={{ flex: { xs: "1 1 100%", md: "1 1 calc(50% - 8px)" } }}>
              <Typography variant="body2" color="textSecondary">
                <strong>Email:</strong> {user.email}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">🔗 Connection Status</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={checkConnection}
              disabled={testing}
            >
              Refresh
            </Button>
          </Box>
          {connectionStatus ? (
            <Box>
              <Typography
                variant="body1"
                color={
                  connectionStatus.connected ? "success.main" : "error.main"
                }
                sx={{ fontWeight: "bold", mb: 1 }}
              >
                {connectionStatus.connected
                  ? "✅ Connected"
                  : "❌ Not Connected"}
              </Typography>
              {connectionStatus.connected && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    📊 Data Points: {connectionStatus.dataCount || 0}
                  </Typography>
                  {connectionStatus.lastSync && (
                    <Typography variant="body2" color="text.secondary">
                      🕒 Last Sync:{" "}
                      {new Date(connectionStatus.lastSync).toLocaleString()}
                    </Typography>
                  )}
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={disconnectFromWithings}
                    startIcon={<LinkOffIcon />}
                    sx={{ mt: 2 }}
                  >
                    Disconnect Account
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Checking connection...
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">⚙️ Setup Instructions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                <strong>1. Create Withings Developer Account:</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                Visit the{" "}
                <Link
                  href="https://oauth.withings.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  color="primary"
                >
                  Withings Partner Hub
                </Link>{" "}
                to create your developer account and get your Client ID and
                Secret.
              </Typography>

              <Typography variant="body2" paragraph>
                <strong>2. Configure Environment Variables:</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                Add these to your <code>.env.local</code> file:
              </Typography>
              <Box
                component="pre"
                sx={{
                  backgroundColor: "grey.800",
                  p: 2,
                  borderRadius: 1,
                  fontSize: "0.875rem",
                  overflow: "auto",
                }}
              >
                {`WITHINGS_ClientID=your_client_id_here
WITHINGS_Secret=your_client_secret_here`}
              </Box>

              <Typography variant="body2" paragraph>
                <strong>3. Connect Your Account:</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                Click the button below to connect your Withings account:
              </Typography>

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {!connectionStatus?.connected ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={connectToWithings}
                    startIcon={<LinkIcon />}
                  >
                    Connect to Withings
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={disconnectFromWithings}
                      startIcon={<LinkOffIcon />}
                    >
                      Disconnect Account
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={connectToWithings}
                      startIcon={<LinkIcon />}
                    >
                      Connect Different Account
                    </Button>
                  </>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      {/* Data Preview */}
      {connectionStatus?.connected && (
        <WithingsDataPreview userId={user.id} onReconnect={connectToWithings} />
      )}

      {/* Test Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Test Controls
          </Typography>

          {/* Sync All Settings */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Sync All Settings
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                alignItems: "center",
              }}
            >
              <Box
                sx={{ flex: { xs: "1 1 100%", md: "1 1 calc(33.33% - 8px)" } }}
              >
                <TextField
                  label="Start Year"
                  type="number"
                  value={startYear}
                  onChange={(e) =>
                    setStartYear(parseInt(e.target.value) || 2009)
                  }
                  fullWidth
                  size="small"
                />
              </Box>
              <Box
                sx={{ flex: { xs: "1 1 100%", md: "1 1 calc(66.67% - 8px)" } }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={clearExisting}
                      onChange={(e) => setClearExisting(e.target.checked)}
                    />
                  }
                  label="Clear existing data before sync"
                />
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Test Buttons */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              startIcon={<SyncIcon />}
              onClick={testSyncAll}
              disabled={testing || !connectionStatus?.connected}
              color="primary"
            >
              Test Sync All (2020-Present)
            </Button>

            <Button
              variant="outlined"
              startIcon={<SyncIcon />}
              onClick={testProcessor}
              disabled={testing || !connectionStatus?.connected}
            >
              Test Processor (2024-Present)
            </Button>
          </Box>

          {testing && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Testing in progress... This may take several minutes for large
                data sets.
              </Typography>
            </Box>
          )}

          {!connectionStatus?.connected && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              You need to connect to Withings first before running tests.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Test Results
          </Typography>

          {testResults.length === 0 ? (
            <Alert severity="info" icon={<InfoIcon />}>
              No tests have been run yet. Complete the setup and use the
              controls above to test the Withings integration.
            </Alert>
          ) : (
            <Box>
              {testResults.map((result, index) => (
                <Alert
                  key={index}
                  severity={result.success ? "success" : "error"}
                  icon={result.success ? <CheckCircleIcon /> : <ErrorIcon />}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    {result.action} - {result.timestamp.toLocaleTimeString()}
                    {result.duration && ` (${result.duration}ms)`}
                  </Typography>

                  {result.success && result.data && (
                    <Box sx={{ mt: 1 }}>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{ fontSize: "12px", overflow: "auto" }}
                      >
                        {JSON.stringify(result.data, null, 2)}
                      </Typography>
                    </Box>
                  )}

                  {!result.success && result.error && (
                    <Typography variant="body2" color="error">
                      Error: {result.error}
                    </Typography>
                  )}
                </Alert>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
