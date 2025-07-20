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
  FitnessCenter as FitnessIcon,
} from "@mui/icons-material";
import { useUser } from "./_app";
import { supabase } from "../utils/supaBase";

// Data Preview Component
function OuraDataPreview({
  userId,
  onReconnect,
  refreshTrigger,
}: {
  userId: string;
  onReconnect: () => void;
  refreshTrigger: number;
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
      const { data: ouraData, error } = await supabase
        .from("oura_variable_data_points")
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
      setData(ouraData || []);

      // Fetch data stats with variable information
      const { data: statsData, error: statsError } = await supabase
        .from("oura_variable_data_points")
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
        .from("oura_variable_data_points")
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
        .from("oura_variable_data_points")
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
  }, [userId, refreshTrigger]);

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
            🛌 Recent Oura Data ({data.length} records shown)
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
              Search for specific Oura data points by date to verify your data
              is synced correctly.
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
                      .from("oura_variable_data_points")
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
                  different date range or check if your Oura data has been
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
            🛌 Recent Data (Last 5 records)
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
              No Oura data found. Try running "Test Sync All" to import your
              data.
            </Alert>
          )}
        </Collapse>

        {!expanded && data.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click the expand button to view your recent Oura data points.
          </Typography>
        )}

        {/* Check if data has missing created_at timestamps */}
        {data.length > 0 && data.some((row) => !row.created_at) && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Some of your Oura data is missing sync timestamps. This usually
              means the data was imported before the database schema was
              updated.
              <br />
              <strong>Recommendation:</strong> Reconnect to Oura to re-sync your
              data with proper timestamps.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={onReconnect}
              sx={{ mt: 1 }}
            >
              Reconnect to Oura
            </Button>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default function OuraTest() {
  const { user } = useUser();
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    tokenInfo?: any;
  }>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [syncProgress, setSyncProgress] = useState<{
    active: boolean;
    progress: number;
    status: string;
    details?: any;
  }>({ active: false, progress: 0, status: "" });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: tokens, error } = await supabase
          .from("oura_tokens")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          console.error("Error checking tokens:", error);
          setConnectionStatus({ connected: false });
        } else {
          const connected = !!(tokens && tokens.length > 0);
          setConnectionStatus({
            connected,
            tokenInfo: connected ? tokens[0] : null,
          });
        }
      } catch (error) {
        console.error("Error checking connection:", error);
        setConnectionStatus({ connected: false });
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, [user]);

  // Connect to Oura
  const connectToOura = async () => {
    if (!user) {
      alert("Please log in first");
      return;
    }

    try {
      const response = await fetch("/api/oura/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || "Failed to connect to Oura");
        return;
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error connecting to Oura:", error);
      alert("Failed to connect to Oura");
    }
  };

  // Test sync all data using edge function
  const testSyncAll = async () => {
    if (!user) {
      alert("Please log in first");
      return;
    }

    setSyncProgress({
      active: true,
      progress: 0,
      status: "Starting sync...",
    });

    try {
      const response = await fetch("/api/v1/functions/oura-sync-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userId: user.id,
          startYear: 2020,
          clearExisting: false,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSyncProgress({
          active: false,
          progress: 100,
          status: "Sync completed successfully!",
          details: result.stats,
        });
        // Trigger refresh of data preview
        setRefreshTrigger((prev) => prev + 1);
      } else {
        setSyncProgress({
          active: false,
          progress: 0,
          status: `Sync failed: ${result.error}`,
          details: result,
        });
      }
    } catch (error) {
      console.error("Sync error:", error);
      setSyncProgress({
        active: false,
        progress: 0,
        status: `Sync failed: ${error.message}`,
      });
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">Please log in to test Oura integration.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        🛌 Oura Integration Test
      </Typography>

      <Typography
        variant="h6"
        color="textSecondary"
        align="center"
        sx={{ mb: 4 }}
      >
        Test and debug your Oura Ring integration
      </Typography>

      {/* Connection Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <FitnessIcon />
            <Typography variant="h6">Connection Status</Typography>
          </Box>

          {connectionStatus.connected ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleIcon />
                  <Typography>Connected to Oura Ring</Typography>
                </Box>
              </Alert>

              <Typography variant="body2" color="text.secondary">
                Token created:{" "}
                {new Date(
                  connectionStatus.tokenInfo?.created_at
                ).toLocaleString()}
              </Typography>

              <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  onClick={connectToOura}
                  startIcon={<RefreshIcon />}
                >
                  Reconnect
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LinkOffIcon />
                  <Typography>Not connected to Oura Ring</Typography>
                </Box>
              </Alert>

              <Button
                variant="contained"
                onClick={connectToOura}
                startIcon={<LinkIcon />}
              >
                Connect to Oura
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Data Preview */}
      {connectionStatus?.connected && (
        <OuraDataPreview
          userId={user.id}
          onReconnect={connectToOura}
          refreshTrigger={refreshTrigger}
        />
      )}

      {/* Test Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🔧 Test Controls
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
            <Button
              variant="contained"
              onClick={testSyncAll}
              disabled={!connectionStatus.connected || syncProgress.active}
              startIcon={
                syncProgress.active ? (
                  <CircularProgress size={16} />
                ) : (
                  <SyncIcon />
                )
              }
            >
              {syncProgress.active ? "Syncing..." : "Test Sync All"}
            </Button>
          </Box>

          {/* Sync Progress */}
          {(syncProgress.active || syncProgress.status) && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                {syncProgress.status}
              </Typography>
              {syncProgress.active && (
                <LinearProgress variant="indeterminate" sx={{ mb: 1 }} />
              )}
              {syncProgress.details && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Sync Results:
                  </Typography>
                  <Box
                    sx={{ bgcolor: "background.paper", p: 2, borderRadius: 1 }}
                  >
                    <pre
                      style={{
                        fontSize: "12px",
                        margin: 0,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {JSON.stringify(syncProgress.details, null, 2)}
                    </pre>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          <Typography variant="body2" color="text.secondary">
            <strong>Test Sync All:</strong> Syncs all available Oura data using
            the new edge function. This may take several minutes for large
            datasets.
          </Typography>
        </CardContent>
      </Card>

      {/* API Information */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📚 API Information
          </Typography>

          <Typography variant="body2" paragraph>
            This page tests the new Oura integration using Supabase Edge
            Functions. The data is stored in the{" "}
            <code>oura_variable_data_points</code> table with proper foreign key
            relationships to the universal variables system.
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Edge Function Endpoint:
            </Typography>
            <Typography variant="body2" fontFamily="monospace" color="primary">
              POST /api/v1/functions/oura-sync-all
            </Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Supported Variables:
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {[
                "Readiness Score",
                "Sleep Score",
                "Total Sleep Duration",
                "REM Sleep Duration",
                "Deep Sleep Duration",
                "Sleep Efficiency",
                "Sleep Latency",
                "Temperature Deviation",
                "Lowest Heart Rate",
                "Average Heart Rate",
              ].map((variable) => (
                <Chip
                  key={variable}
                  label={variable}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
