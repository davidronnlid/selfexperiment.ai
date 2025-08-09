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
  Snackbar,
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
import AppleHealthConnectionDialog from "./AppleHealthConnectionDialog";
import AppleHealthIntegration from "./AppleHealthIntegration";

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
  const [appleHealthDialogOpen, setAppleHealthDialogOpen] = useState(false);
  const [withingsSyncMessage, setWithingsSyncMessage] = useState<string>("");
  const [showWithingsSyncMessage, setShowWithingsSyncMessage] = useState(false);
  const [ouraSyncMessage, setOuraSyncMessage] = useState<string>("");
  const [showOuraSyncMessage, setShowOuraSyncMessage] = useState(false);
  const [appleSyncMessage, setAppleSyncMessage] = useState<string>("");
  const [showAppleSyncMessage, setShowAppleSyncMessage] = useState(false);

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
      // Note: `withings_tokens` does not have an `id` column in this project.
      // Query a safe, non-sensitive column to determine existence.
      const { data: withingsTokens } = await supabase
        .from("withings_tokens")
        .select("user_id")
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
      const response = await fetch("/api/oura/sync-incremental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, startYear: 2020, clearExisting: false }),
      });

      if (response.ok) {
        const result = await response.json();
        const upserted = result.data?.totalUpserted || result.data?.upserted || 0;
        setOuraSyncMessage(upserted > 0 ? `Oura sync completed: ${upserted} new data points` : "Oura sync completed: no new data");
        setShowOuraSyncMessage(true);
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
      const response = await fetch("/api/withings/sync-incremental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const result = await response.json();
        const upserted = result.data?.totalUpserted || result.data?.upserted || 0;
        setWithingsSyncMessage(
          upserted > 0
            ? `Withings sync completed: ${upserted} new data points`
            : "Withings sync completed: no new data"
        );
        setShowWithingsSyncMessage(true);
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
      const response = await fetch("/api/applehealth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        const result = await response.json();
        const upserted = result.data?.totalUpserted || result.updated_statistics?.total_data_points || 0;
        setAppleSyncMessage(upserted > 0 ? `Apple Health sync completed: ${upserted} new data points` : "Apple Health sync completed");
        setShowAppleSyncMessage(true);
        setTimeout(() => checkConnectionStatus(), 1000);
      }
    } catch (e) {
      console.error("Error syncing Apple Health:", e);
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

          {/* Apple Health - Full Integration Component */}
          <Box sx={{ flex: { xs: "1 1 100%", md: "1 1 100%" }, mt: 2 }}>
            <AppleHealthIntegration userId={userId} />
          </Box>
        </Box>
      </CardContent>
      <Snackbar open={showOuraSyncMessage} autoHideDuration={5000} onClose={() => setShowOuraSyncMessage(false)} message={ouraSyncMessage} />
      <Snackbar open={showAppleSyncMessage} autoHideDuration={5000} onClose={() => setShowAppleSyncMessage(false)} message={appleSyncMessage} />
      <Snackbar
        open={showWithingsSyncMessage}
        autoHideDuration={5000}
        onClose={() => setShowWithingsSyncMessage(false)}
        message={withingsSyncMessage}
      />
      
      {/* Apple Health Connection Dialog */}
      <AppleHealthConnectionDialog
        open={appleHealthDialogOpen}
        onClose={() => setAppleHealthDialogOpen(false)}
        userId={userId}
        onConnectionSuccess={() => {
          setAppleHealthDialogOpen(false);
          checkConnectionStatus();
        }}
      />
    </Card>
  );
} 