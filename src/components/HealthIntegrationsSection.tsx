import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Grid,
} from "@mui/material";
import {
  Bed as BedIcon,
  Scale as ScaleIcon,
  Apple as AppleIcon,
  Sync as SyncIcon,
  Link as LinkIcon,
} from "@mui/icons-material";
import { supabase } from "@/utils/supaBase";
import { useRouter } from "next/router";

interface HealthIntegrationsSectionProps {
  userId: string;
}

export default function HealthIntegrationsSection({
  userId,
}: HealthIntegrationsSectionProps) {
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState({
    ouraConnected: false,
    withingsConnected: false,
    appleHealthConnected: false,
    loading: true,
  });
  const [syncingOura, setSyncingOura] = useState(false);
  const [syncingWithings, setSyncingWithings] = useState(false);
  const [syncingAppleHealth, setSyncingAppleHealth] = useState(false);

  // Show success messages if redirected from callbacks
  const showOuraSuccess = router.query.oura === "success";
  const showWithingsSuccess = router.query.withings === "success";
  const showAppleHealthSuccess = router.query.applehealth === "success";

  // Check connection status
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
        ouraConnected: !!(ouraTokens && ouraTokens.length > 0),
        withingsConnected: !!(withingsTokens && withingsTokens.length > 0),
        appleHealthConnected: !!(appleHealthTokens && appleHealthTokens.length > 0),
        loading: false,
      });
    } catch (error) {
      console.error("Error checking connection status:", error);
      setConnectionStatus((prev) => ({ ...prev, loading: false }));
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
        // Refresh connection status after sync
        setTimeout(() => {
          checkConnectionStatus();
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
      const response = await fetch("/api/withings/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // Refresh connection status after sync
        setTimeout(() => {
          checkConnectionStatus();
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
        // Refresh connection status after sync
        setTimeout(() => {
          checkConnectionStatus();
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
  }, [userId]);

  if (connectionStatus.loading) {
    return (
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <LinkIcon />
          <Typography variant="h6">Connect Your Health Data sources</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Connect your health devices and apps to automatically import data into your tracking routines.
        </Typography>

        {/* Success Messages */}
        {showOuraSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Oura Ring connected successfully! Your data is now being synchronized.
          </Alert>
        )}
        {showWithingsSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Withings device connected successfully! Your data is now being synchronized.
          </Alert>
        )}
        {showAppleHealthSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Apple Health connected successfully! Your health data integration is now active.
          </Alert>
        )}

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {/* Oura Ring */}
          <Box sx={{ flex: { xs: "1 1 100%", md: "1 1 calc(33.333% - 16px)" } }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <BedIcon sx={{ mr: 1, color: "primary.main" }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Oura Ring
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sleep and recovery data
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Chip
                  label={connectionStatus.ouraConnected ? "Connected" : "Disconnected"}
                  color={connectionStatus.ouraConnected ? "success" : "default"}
                  size="small"
                />
                {connectionStatus.ouraConnected ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={syncOura}
                    disabled={syncingOura}
                    startIcon={
                      syncingOura ? <CircularProgress size={16} /> : <SyncIcon />
                    }
                  >
                    {syncingOura ? "Syncing..." : "Sync"}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={connectOura}
                    startIcon={<LinkIcon />}
                  >
                    Connect
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

          {/* Withings Scale */}
          <Box sx={{ flex: { xs: "1 1 100%", md: "1 1 calc(33.333% - 16px)" } }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <ScaleIcon sx={{ mr: 1, color: "secondary.main" }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Withings Scale
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Body composition data
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Chip
                  label={connectionStatus.withingsConnected ? "Connected" : "Disconnected"}
                  color={connectionStatus.withingsConnected ? "success" : "default"}
                  size="small"
                />
                {connectionStatus.withingsConnected ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={syncWithings}
                    disabled={syncingWithings}
                    startIcon={
                      syncingWithings ? <CircularProgress size={16} /> : <SyncIcon />
                    }
                  >
                    {syncingWithings ? "Syncing..." : "Sync"}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={connectWithings}
                    startIcon={<LinkIcon />}
                  >
                    Connect
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

          {/* Apple Health */}
          <Box sx={{ flex: { xs: "1 1 100%", md: "1 1 calc(33.333% - 16px)" } }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <AppleIcon sx={{ mr: 1, color: "info.main" }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Apple Health
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Health and fitness data
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Chip
                  label={connectionStatus.appleHealthConnected ? "Connected" : "Disconnected"}
                  color={connectionStatus.appleHealthConnected ? "success" : "default"}
                  size="small"
                />
                {connectionStatus.appleHealthConnected ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={syncAppleHealth}
                    disabled={syncingAppleHealth}
                    startIcon={
                      syncingAppleHealth ? <CircularProgress size={16} /> : <SyncIcon />
                    }
                  >
                    {syncingAppleHealth ? "Syncing..." : "Sync"}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={connectAppleHealth}
                    startIcon={<LinkIcon />}
                  >
                    Connect
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
} 