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
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Schedule as ScheduleIcon,
  Sync as SyncIcon,
  Psychology as PsychologyIcon,
  FitnessCenter as FitnessIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  AccessTime as AccessTimeIcon,
  Send as SendIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { supabase } from "@/utils/supaBase";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationPreferences {
  id?: string;
  user_id: string;
  enabled: boolean;
  routine_reminders: boolean;
  routine_reminder_time: string; // Time before routine
  data_sync_notifications: boolean;
  weekly_insights: boolean;
  weekly_insights_day: number; // 0-6 (Sunday-Saturday)
  weekly_insights_time: string; // HH:MM format
  experiment_reminders: boolean;
  goal_celebrations: boolean;
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
    enabled: false,
    routine_reminders: true,
    routine_reminder_time: "15", // 15 minutes before
    data_sync_notifications: true,
    weekly_insights: true,
    weekly_insights_day: 1, // Monday
    weekly_insights_time: "09:00",
    experiment_reminders: true,
    goal_celebrations: true,
  });
  const [loading, setLoading] = useState(false);
  const [testDialog, setTestDialog] = useState(false);
  const [scheduledTestExpanded, setScheduledTestExpanded] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [currentScheduledNotification, setCurrentScheduledNotification] =
    useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  useEffect(() => {
    // Set default scheduled time to 30 seconds from now
    const defaultTime = new Date();
    defaultTime.setSeconds(defaultTime.getSeconds() + 30);
    setScheduledTime(defaultTime.toISOString().slice(0, 16)); // Format for datetime-local input
    setTestMessage(
      "Hello from your iPhone! This test notification was scheduled successfully."
    );
  }, []);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading notification preferences:", error);
        return;
      }

      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
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
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        // Enable notifications in preferences
        const newPrefs = { ...preferences, enabled: true };
        setPreferences(newPrefs);
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!hasPermission) return;

    try {
      await sendNotification("🎉 Test Notification", {
        body: "Your notifications are working perfectly!",
        data: { type: "test_notification" },
      });
      setTestDialog(false);
    } catch (error) {
      console.error("Error sending test notification:", error);
    }
  };

  const handleScheduleTest = async () => {
    if (!hasPermission || !scheduledTime) return;

    try {
      const schedTime = new Date(scheduledTime);
      const notificationId = await scheduleTestNotification(
        schedTime,
        testMessage
      );
      setCurrentScheduledNotification(notificationId);

      const timeString = schedTime.toLocaleString();
      alert(
        `✅ Test notification scheduled for ${timeString}!\n\nMake sure your iPhone screen is locked or the app is in the background to see the notification.`
      );
    } catch (error) {
      alert(
        `❌ Error scheduling notification: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleCancelScheduled = () => {
    if (currentScheduledNotification) {
      cancelScheduledNotification(currentScheduledNotification);
      setCurrentScheduledNotification(null);
      alert("📱 Scheduled notification cancelled!");
    }
  };

  const handlePreferenceChange = (
    key: keyof NotificationPreferences,
    value: any
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  if (!isSupported) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning" icon={<WarningIcon />}>
            <Typography variant="h6" gutterBottom>
              Notifications Not Supported
            </Typography>
            <Typography variant="body2">
              Your browser or device doesn't support push notifications. Try
              using a modern browser like Chrome, Firefox, or Safari.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            {hasPermission ? (
              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
            ) : (
              <NotificationsOffIcon color="disabled" sx={{ mr: 1 }} />
            )}
            <Typography variant="h6" component="h2">
              Push Notifications
            </Typography>
            {hasPermission && (
              <Chip
                label="Enabled"
                color="success"
                size="small"
                sx={{ ml: 2 }}
              />
            )}
          </Box>

          {!hasPermission ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Enable notifications to get reminders for:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Daily routine reminders</li>
                  <li>Data sync completions</li>
                  <li>Weekly insights and progress</li>
                  <li>Experiment milestones</li>
                </ul>
              </Alert>
              <Button
                variant="contained"
                onClick={handleRequestPermission}
                disabled={loading}
                startIcon={<NotificationsIcon />}
                fullWidth
              >
                {loading ? "Requesting..." : "Enable Notifications"}
              </Button>
            </Box>
          ) : (
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.enabled}
                    onChange={(e) =>
                      handlePreferenceChange("enabled", e.target.checked)
                    }
                  />
                }
                label="Enable all notifications"
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

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
                      checked={
                        preferences.routine_reminders && preferences.enabled
                      }
                      disabled={!preferences.enabled}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "routine_reminders",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                {preferences.routine_reminders && preferences.enabled && (
                  <ListItem sx={{ pl: 4 }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Remind me</InputLabel>
                      <Select
                        value={preferences.routine_reminder_time}
                        onChange={(e) =>
                          handlePreferenceChange(
                            "routine_reminder_time",
                            e.target.value
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

                <ListItem>
                  <ListItemIcon>
                    <SyncIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Data Sync Notifications"
                    secondary="Get notified when data syncs from Oura, Withings, etc."
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={
                        preferences.data_sync_notifications &&
                        preferences.enabled
                      }
                      disabled={!preferences.enabled}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "data_sync_notifications",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <PsychologyIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Weekly Insights"
                    secondary="Get your weekly progress summary and insights"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={
                        preferences.weekly_insights && preferences.enabled
                      }
                      disabled={!preferences.enabled}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "weekly_insights",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                {preferences.weekly_insights && preferences.enabled && (
                  <ListItem sx={{ pl: 4 }}>
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Day</InputLabel>
                        <Select
                          value={preferences.weekly_insights_day}
                          onChange={(e) =>
                            handlePreferenceChange(
                              "weekly_insights_day",
                              e.target.value
                            )
                          }
                          label="Day"
                        >
                          <MenuItem value={0}>Sunday</MenuItem>
                          <MenuItem value={1}>Monday</MenuItem>
                          <MenuItem value={2}>Tuesday</MenuItem>
                          <MenuItem value={3}>Wednesday</MenuItem>
                          <MenuItem value={4}>Thursday</MenuItem>
                          <MenuItem value={5}>Friday</MenuItem>
                          <MenuItem value={6}>Saturday</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        type="time"
                        size="small"
                        value={preferences.weekly_insights_time}
                        onChange={(e) =>
                          handlePreferenceChange(
                            "weekly_insights_time",
                            e.target.value
                          )
                        }
                        sx={{ width: 120 }}
                      />
                    </Box>
                  </ListItem>
                )}

                <ListItem>
                  <ListItemIcon>
                    <FitnessIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Experiment Reminders"
                    secondary="Get reminded about ongoing experiments"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={
                        preferences.experiment_reminders && preferences.enabled
                      }
                      disabled={!preferences.enabled}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "experiment_reminders",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Goal Celebrations"
                    secondary="Get notified when you reach milestones"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={
                        preferences.goal_celebrations && preferences.enabled
                      }
                      disabled={!preferences.enabled}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "goal_celebrations",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                {/* Scheduled Test Notification Section */}
                <Accordion
                  expanded={scheduledTestExpanded}
                  onChange={(_, isExpanded) =>
                    setScheduledTestExpanded(isExpanded)
                  }
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <AccessTimeIcon color="primary" />
                      <Typography variant="h6">
                        Schedule Test Notification
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={3}>
                      <Alert severity="info">
                        <Typography variant="body2">
                          Perfect for iPhone testing! Schedule a notification to
                          arrive at a specific time. Make sure your phone screen
                          is locked or the app is in the background to see push
                          notifications.
                        </Typography>
                      </Alert>

                      <TextField
                        label="Scheduled Time"
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        fullWidth
                        helperText="Select when you want to receive the test notification"
                        InputLabelProps={{ shrink: true }}
                      />

                      <TextField
                        label="Custom Message"
                        multiline
                        rows={2}
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        fullWidth
                        helperText="Customize the notification message"
                        placeholder="Hello from your iPhone! This test notification was scheduled successfully."
                      />

                      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                        <Button
                          variant="contained"
                          onClick={handleScheduleTest}
                          disabled={!preferences.enabled || !scheduledTime}
                          startIcon={<SendIcon />}
                          sx={{ flex: 1, minWidth: "200px" }}
                        >
                          Schedule Test
                        </Button>

                        {currentScheduledNotification && (
                          <Button
                            variant="outlined"
                            color="warning"
                            onClick={handleCancelScheduled}
                            startIcon={<CancelIcon />}
                            sx={{ flex: 1, minWidth: "150px" }}
                          >
                            Cancel Scheduled
                          </Button>
                        )}
                      </Box>

                      {currentScheduledNotification && (
                        <Alert severity="success">
                          <Typography variant="body2">
                            ✅ Notification scheduled! ID:{" "}
                            {currentScheduledNotification}
                          </Typography>
                        </Alert>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>

                {/* Quick Test & Save Buttons */}
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Button
                    variant="outlined"
                    onClick={() => setTestDialog(true)}
                    startIcon={<NotificationsIcon />}
                    disabled={!preferences.enabled}
                    sx={{ flex: 1, minWidth: "120px" }}
                  >
                    Quick Test
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={() => window.open("/notification-test", "_blank")}
                    startIcon={<AccessTimeIcon />}
                    disabled={!preferences.enabled}
                    sx={{ flex: 1, minWidth: "140px" }}
                  >
                    iPhone Test
                  </Button>

                  <Button
                    variant="contained"
                    onClick={savePreferences}
                    disabled={saveStatus === "saving"}
                    color={saveStatus === "saved" ? "success" : "primary"}
                    sx={{ flex: 1, minWidth: "120px" }}
                  >
                    {saveStatus === "saving" && "Saving..."}
                    {saveStatus === "saved" && "Saved!"}
                    {saveStatus === "error" && "Error - Retry"}
                    {saveStatus === "idle" && "Save Preferences"}
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Test Notification Dialog */}
      <Dialog open={testDialog} onClose={() => setTestDialog(false)}>
        <DialogTitle>Send Test Notification</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will send a test notification to verify your settings are
            working correctly.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialog(false)}>Cancel</Button>
          <Button onClick={sendTestNotification} variant="contained">
            Send Test
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
