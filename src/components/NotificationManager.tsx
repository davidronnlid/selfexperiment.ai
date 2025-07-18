import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Snackbar,
  IconButton,
  Tooltip,
  Badge,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  AccessTime as AccessTimeIcon,
  Send as SendIcon,
  Cancel as CancelIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { supabase } from "@/utils/supaBase";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationPreferences {
  id?: string;
  user_id: string;
  routine_reminder_enabled: boolean;
  routine_reminder_minutes: number;
  test_notification_enabled: boolean;
  test_notification_time?: string;
  created_at?: string;
  updated_at?: string;
}

interface NotificationManagerProps {
  userId: string;
}

export default function NotificationManager({
  userId,
}: NotificationManagerProps) {
  const {
    hasPermission,
    isSupported,
    requestPermission,
    sendNotification,
    scheduleTestNotification,
    cancelScheduledNotification,
  } = useNotifications(userId);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    user_id: userId,
    routine_reminder_enabled: true,
    routine_reminder_minutes: 15,
    test_notification_enabled: false,
  });

  const [loading, setLoading] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [testDialog, setTestDialog] = useState(false);
  const [scheduledTestExpanded, setScheduledTestExpanded] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [currentScheduledNotification, setCurrentScheduledNotification] =
    useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  useEffect(() => {
    // Set default scheduled time to 30 seconds from now
    const defaultTime = new Date();
    defaultTime.setSeconds(defaultTime.getSeconds() + 30);
    setScheduledTime(defaultTime.toISOString().slice(0, 16)); // Format for datetime-local input
    setTestMessage(
      "🎉 Test notification! Your notification system is working perfectly."
    );
  }, []);

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" | "warning" = "info"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const loadPreferences = async () => {
    setLoadingPreferences(true);
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading notification preferences:", error);
        showSnackbar("Failed to load preferences. Using defaults.", "warning");
        return;
      }

      if (data) {
        setPreferences(data);
        showSnackbar("Preferences loaded successfully", "success");
      } else {
        showSnackbar("No saved preferences found. Using defaults.", "info");
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
      showSnackbar("Error loading preferences", "error");
    } finally {
      setLoadingPreferences(false);
    }
  };

  const savePreferences = async () => {
    setSaveStatus("saving");
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .upsert({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
      setSaveStatus("saved");
      setHasChanges(false);
      showSnackbar("Preferences saved successfully!", "success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      setSaveStatus("error");
      showSnackbar("Failed to save preferences. Please try again.", "error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        const newPrefs = { ...preferences, routine_reminder_enabled: true };
        setPreferences(newPrefs);
        setHasChanges(true);
        showSnackbar(
          "Notifications enabled! You can now receive reminders.",
          "success"
        );
      } else {
        showSnackbar(
          "Permission denied. You can enable notifications in your browser settings.",
          "warning"
        );
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      showSnackbar("Error requesting permission", "error");
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!hasPermission) {
      showSnackbar("Please enable notifications first", "warning");
      return;
    }

    try {
      await sendNotification("🎉 Test Notification", {
        body: "Your notifications are working perfectly!",
        data: { type: "test_notification" },
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
      });
      setTestDialog(false);
      showSnackbar("Test notification sent!", "success");
    } catch (error) {
      console.error("Error sending test notification:", error);
      showSnackbar("Failed to send test notification", "error");
    }
  };

  const handleScheduleTest = async () => {
    if (!hasPermission) {
      showSnackbar("Please enable notifications first", "warning");
      return;
    }

    if (!scheduledTime) {
      showSnackbar("Please select a time for the test notification", "warning");
      return;
    }

    try {
      const schedTime = new Date(scheduledTime);
      const notificationId = await scheduleTestNotification(
        schedTime,
        testMessage
      );
      setCurrentScheduledNotification(notificationId);
      setScheduledTestExpanded(false);
      showSnackbar(
        `Test notification scheduled for ${schedTime.toLocaleString()}`,
        "success"
      );
    } catch (error) {
      console.error("Error scheduling test notification:", error);
      showSnackbar("Failed to schedule test notification", "error");
    }
  };

  const handleCancelScheduled = () => {
    if (currentScheduledNotification) {
      cancelScheduledNotification(currentScheduledNotification);
      setCurrentScheduledNotification(null);
      showSnackbar("Scheduled notification cancelled", "info");
    }
  };

  const handlePreferenceChange = (
    key: keyof NotificationPreferences,
    value: any
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const getEnabledCount = () => {
    return [
      preferences.routine_reminder_enabled,
      preferences.test_notification_enabled,
    ].filter(Boolean).length;
  };

  if (!isSupported) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <WarningIcon color="warning" sx={{ mr: 1 }} />
            <Typography variant="h6">Notifications Not Supported</Typography>
          </Box>
          <Alert severity="warning">
            <Typography variant="body2">
              Your browser doesn't support push notifications. Try using a
              modern browser like Chrome, Firefox, or Safari.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loadingPreferences) {
    return (
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              py: 4,
            }}
          >
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>Loading notification preferences...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {hasPermission ? (
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              ) : (
                <NotificationsOffIcon color="disabled" sx={{ mr: 1 }} />
              )}
              <Typography variant="h6">Notification Preferences</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label={`${getEnabledCount()}/2 enabled`}
                color={getEnabledCount() > 0 ? "success" : "default"}
                size="small"
              />
              {hasChanges && (
                <Chip
                  label="Unsaved changes"
                  color="warning"
                  size="small"
                  icon={<SaveIcon />}
                />
              )}
            </Box>
          </Box>

          {!hasPermission ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Enable notifications to get reminders for your scheduled
                  routines.
                </Typography>
              </Alert>
              <Button
                variant="contained"
                onClick={handleRequestPermission}
                disabled={loading}
                startIcon={
                  loading ? (
                    <CircularProgress size={16} />
                  ) : (
                    <NotificationsIcon />
                  )
                }
                fullWidth
                sx={{ mb: 2 }}
              >
                {loading ? "Requesting..." : "Enable Notifications"}
              </Button>
              <Typography variant="caption" color="text.secondary">
                You'll be prompted to allow notifications. You can change this
                later in your browser settings.
              </Typography>
            </Box>
          ) : (
            <Box>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <ScheduleIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Routine Reminders"
                    secondary="Get notified before your scheduled routines"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={preferences.routine_reminder_enabled}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "routine_reminder_enabled",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                {preferences.routine_reminder_enabled && (
                  <ListItem sx={{ pl: 4 }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Remind me</InputLabel>
                      <Select
                        value={preferences.routine_reminder_minutes.toString()}
                        onChange={(e) =>
                          handlePreferenceChange(
                            "routine_reminder_minutes",
                            parseInt(e.target.value)
                          )
                        }
                        label="Remind me"
                      >
                        <MenuItem value="5">5 minutes before</MenuItem>
                        <MenuItem value="15">15 minutes before</MenuItem>
                        <MenuItem value="30">30 minutes before</MenuItem>
                        <MenuItem value="60">1 hour before</MenuItem>
                      </Select>
                    </FormControl>
                  </ListItem>
                )}
              </List>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                {/* Test Notification Section */}
                <Accordion
                  expanded={scheduledTestExpanded}
                  onChange={(_, isExpanded) =>
                    setScheduledTestExpanded(isExpanded)
                  }
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <AccessTimeIcon />
                      <Typography variant="h6">Test Notifications</Typography>
                      <Tooltip title="Test your notification settings">
                        <InfoIcon fontSize="small" color="action" />
                      </Tooltip>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <Alert severity="info">
                        <Typography variant="body2">
                          Test your notification settings to make sure
                          everything is working correctly.
                        </Typography>
                      </Alert>

                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={sendTestNotification}
                          startIcon={<SendIcon />}
                          disabled={!hasPermission}
                        >
                          Quick Test
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => setTestDialog(true)}
                          startIcon={<NotificationsIcon />}
                          disabled={!hasPermission}
                        >
                          Custom Test
                        </Button>
                      </Box>

                      <Divider />

                      <Typography variant="subtitle2" gutterBottom>
                        Schedule Test Notification
                      </Typography>
                      <TextField
                        label="Scheduled Time"
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="Test Message"
                        multiline
                        rows={2}
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        fullWidth
                        size="small"
                      />
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={handleScheduleTest}
                          startIcon={<AccessTimeIcon />}
                          disabled={!hasPermission || !scheduledTime}
                          size="small"
                        >
                          Schedule Test
                        </Button>
                        {currentScheduledNotification && (
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={handleCancelScheduled}
                            startIcon={<CancelIcon />}
                            size="small"
                          >
                            Cancel Scheduled
                          </Button>
                        )}
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>

                {/* Action Buttons */}
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    variant="contained"
                    onClick={savePreferences}
                    disabled={saveStatus === "saving" || !hasChanges}
                    startIcon={
                      saveStatus === "saving" ? (
                        <CircularProgress size={16} />
                      ) : (
                        <SaveIcon />
                      )
                    }
                    sx={{
                      bgcolor: "#fdd835",
                      color: "black",
                      "&:hover": { bgcolor: "#f9a825" },
                      "&:disabled": { bgcolor: "#e0e0e0", color: "#757575" },
                    }}
                  >
                    {saveStatus === "saving"
                      ? "Saving..."
                      : saveStatus === "saved"
                      ? "Saved!"
                      : saveStatus === "error"
                      ? "Error - Try Again"
                      : "Save Preferences"}
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={loadPreferences}
                    startIcon={<RefreshIcon />}
                    size="small"
                  >
                    Refresh
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Test Notification Dialog */}
      <Dialog
        open={testDialog}
        onClose={() => setTestDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Send Test Notification
          <IconButton
            aria-label="close"
            onClick={() => setTestDialog(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This will send a test notification to verify your settings are
            working correctly.
          </Typography>
          <TextField
            label="Custom Message"
            multiline
            rows={3}
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialog(false)}>Cancel</Button>
          <Button
            onClick={sendTestNotification}
            variant="contained"
            startIcon={<SendIcon />}
          >
            Send Test
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
