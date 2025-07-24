import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  IconButton,
  Button,
} from "@mui/material";
import { supabase } from "@/utils/supaBase";
import SyncIcon from "@mui/icons-material/Sync";
import LinkIcon from "@mui/icons-material/Link";

interface DataSourcesAnalysisProps {
  userId: string;
}

export default function DataSourcesAnalysis({
  userId,
}: DataSourcesAnalysisProps) {
  // Data source counts state
  const [dataCounts, setDataCounts] = useState({
    modularHealth: 0,
    oura: 0,
    withings: 0,
    appleHealth: 0,
    variablesTracked: 0,
    total: 0,
    loading: true,
  });

  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState({
    ouraConnected: false,
    withingsConnected: false,
    appleHealthConnected: false,
    loading: true,
  });

  // Sync states
  const [syncingOura, setSyncingOura] = useState(false);
  const [syncingWithings, setSyncingWithings] = useState(false);
  const [syncingAppleHealth, setSyncingAppleHealth] = useState(false);

  // Helper function to check connection status
  const checkConnectionStatus = async () => {
    if (!userId) return;

    try {
      // Check Oura connection
      const { data: ouraTokens } = await supabase
        .from("oura_tokens")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      // Check Withings connection
      const { data: withingsTokens } = await supabase
        .from("withings_tokens")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      // Check Apple Health connection
      const { data: appleHealthTokens } = await supabase
        .from("apple_health_tokens")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      setConnectionStatus({
        ouraConnected: !!ouraTokens && ouraTokens.length > 0,
        withingsConnected: !!withingsTokens && withingsTokens.length > 0,
        appleHealthConnected: !!appleHealthTokens && appleHealthTokens.length > 0,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking connection status:", error);
      setConnectionStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  // Helper function to fetch data counts
  const fetchDataCounts = async () => {
    if (!userId) return;

    try {
      setDataCounts((prev) => ({ ...prev, loading: true }));

      // Count Oura data points
      const { count: ouraCount } = await supabase
        .from("oura_variable_data_points")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Count Withings data points
      const { count: withingsCount } = await supabase
        .from("withings_variable_data_points")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Count Apple Health data points
      const { count: appleHealthCount } = await supabase
        .from("apple_health_variable_data_points")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Count Modular Health data points (manual + routine + auto)
      const { count: modularHealthCount } = await supabase
        .from("data_points")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Count unique variables tracked
      const { data: variablesData } = await supabase
        .from("variables")
        .select("id")
        .eq("is_active", true);

      const variablesTracked = variablesData?.length || 0;

      const total =
        (ouraCount || 0) + (withingsCount || 0) + (appleHealthCount || 0) + (modularHealthCount || 0);

      setDataCounts({
        modularHealth: modularHealthCount || 0,
        oura: ouraCount || 0,
        withings: withingsCount || 0,
        appleHealth: appleHealthCount || 0,
        variablesTracked,
        total,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching data counts:", error);
      setDataCounts((prev) => ({ ...prev, loading: false }));
    }
  };

  // Connect functions
  const connectOura = () => {
    const ouraAuthUrl = "/api/oura/auth";
    window.location.href = ouraAuthUrl;
  };

  const connectWithings = () => {
    const withingsAuthUrl = "/api/withings/auth";
    window.location.href = withingsAuthUrl;
  };

  const connectAppleHealth = async () => {
    if (!userId) return;

    try {
      const response = await fetch("/api/applehealth/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || "Failed to connect to Apple Health");
        return;
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error connecting to Apple Health:", error);
      alert("Failed to connect to Apple Health");
    }
  };

  // Sync functions
  const syncOura = async () => {
    if (!userId) return;

    try {
      setSyncingOura(true);
      const response = await fetch("/api/oura/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // Refresh data counts after sync
        setTimeout(() => {
          fetchDataCounts();
        }, 1000);
      }
    } catch (error) {
      console.error("Error syncing Oura data:", error);
    } finally {
      setSyncingOura(false);
    }
  };

  const syncWithings = async () => {
    if (!userId) return;

    try {
      setSyncingWithings(true);
      const response = await fetch("/api/withings/sync-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          clearExisting: false,
          startYear: 2020,
        }),
      });

      if (response.ok) {
        // Refresh data counts after sync
        setTimeout(() => {
          fetchDataCounts();
        }, 1000);
      }
    } catch (error) {
      console.error("Error syncing Withings data:", error);
    } finally {
      setSyncingWithings(false);
    }
  };

  const syncAppleHealth = async () => {
    if (!userId) return;

    try {
      setSyncingAppleHealth(true);
      const response = await fetch("/api/applehealth/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // Refresh data counts after sync
        setTimeout(() => {
          fetchDataCounts();
        }, 1000);
      }
    } catch (error) {
      console.error("Error syncing Apple Health data:", error);
    } finally {
      setSyncingAppleHealth(false);
    }
  };

  useEffect(() => {
    checkConnectionStatus();
    fetchDataCounts();
  }, [userId]);

  const formatLargeNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent sx={{ py: 2 }}>
        <Typography
          variant="subtitle2"
          gutterBottom
          color="textSecondary"
          sx={{ mb: 2 }}
        >
          Data Sources Included in Analysis
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {dataCounts.loading || connectionStatus.loading ? (
            <CircularProgress size={20} />
          ) : (
            <>
              <Chip
                label={`Modular Health: ${formatLargeNumber(
                  dataCounts.modularHealth
                )} data points`}
                size="small"
                color="primary"
                variant="outlined"
              />

              {/* Oura Connection */}
              {connectionStatus.ouraConnected ? (
                <Chip
                  label={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <span>{`Oura: ${formatLargeNumber(
                        dataCounts.oura
                      )} data points`}</span>
                      <IconButton
                        size="small"
                        onClick={syncOura}
                        disabled={syncingOura}
                        sx={{
                          width: 22,
                          height: 22,
                          color: "secondary.main",
                          "&:hover": { backgroundColor: "secondary.light" },
                          ml: 0.25,
                        }}
                      >
                        {syncingOura ? (
                          <CircularProgress size={12} />
                        ) : (
                          <SyncIcon sx={{ fontSize: 12 }} />
                        )}
                      </IconButton>
                    </Box>
                  }
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LinkIcon />}
                  onClick={connectOura}
                  sx={{
                    textTransform: "none",
                    color: "secondary.main",
                    borderColor: "secondary.main",
                    "&:hover": {
                      backgroundColor: "secondary.light",
                      borderColor: "secondary.main",
                    },
                  }}
                >
                  Connect Oura
                </Button>
              )}

              {/* Withings Connection */}
              {connectionStatus.withingsConnected ? (
                <Chip
                  label={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <span>{`Withings: ${formatLargeNumber(
                        dataCounts.withings
                      )} data points`}</span>
                      <IconButton
                        size="small"
                        onClick={syncWithings}
                        disabled={syncingWithings}
                        sx={{
                          width: 22,
                          height: 22,
                          color: "warning.main",
                          "&:hover": { backgroundColor: "warning.light" },
                          ml: 0.25,
                        }}
                      >
                        {syncingWithings ? (
                          <CircularProgress size={12} />
                        ) : (
                          <SyncIcon sx={{ fontSize: 12 }} />
                        )}
                      </IconButton>
                    </Box>
                  }
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LinkIcon />}
                  onClick={connectWithings}
                  sx={{
                    textTransform: "none",
                    color: "warning.main",
                    borderColor: "warning.main",
                    "&:hover": {
                      backgroundColor: "warning.light",
                      borderColor: "warning.main",
                    },
                  }}
                >
                  Connect Withings
                </Button>
              )}

              {/* Apple Health Connection */}
              {connectionStatus.appleHealthConnected ? (
                <Chip
                  label={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <span>{`Apple Health: ${formatLargeNumber(
                        dataCounts.appleHealth
                      )} data points`}</span>
                      <IconButton
                        size="small"
                        onClick={syncAppleHealth}
                        disabled={syncingAppleHealth}
                        sx={{
                          width: 22,
                          height: 22,
                          color: "info.main",
                          "&:hover": { backgroundColor: "info.light" },
                          ml: 0.25,
                        }}
                      >
                        {syncingAppleHealth ? (
                          <CircularProgress size={12} />
                        ) : (
                          <SyncIcon sx={{ fontSize: 12 }} />
                        )}
                      </IconButton>
                    </Box>
                  }
                  size="small"
                  color="info"
                  variant="outlined"
                />
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LinkIcon />}
                  onClick={connectAppleHealth}
                  sx={{
                    textTransform: "none",
                    color: "info.main",
                    borderColor: "info.main",
                    "&:hover": {
                      backgroundColor: "info.light",
                      borderColor: "info.main",
                    },
                  }}
                >
                  Connect Apple Health
                </Button>
              )}

              <Chip
                label={`Total: ${formatLargeNumber(
                  dataCounts.total
                )} data points`}
                size="small"
                color="default"
                variant="outlined"
                sx={{
                  backgroundColor: "rgba(255, 215, 0, 0.1)",
                  borderColor: "rgba(255, 215, 0, 0.5)",
                  color: "text.primary",
                  fontWeight: "medium",
                }}
              />

              <Chip
                label={`Variables tracked: ${formatLargeNumber(
                  dataCounts.variablesTracked
                )}`}
                size="small"
                color="default"
                variant="outlined"
                sx={{
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  borderColor: "rgba(59, 130, 246, 0.5)",
                  color: "text.primary",
                  fontWeight: "medium",
                }}
              />
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
