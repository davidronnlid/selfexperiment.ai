import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Button,
  Alert,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  FaEye,
  FaEyeSlash,
  FaCog,
  FaUsers,
  FaLock,
  FaGlobe,
} from "react-icons/fa";
import { supabase } from "@/utils/supaBase";
import { LOG_LABELS } from "@/utils/logLabels";
import { useUser } from "@/pages/_app";
import LogPrivacyManager from "./LogPrivacyManager";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`privacy-tabpanel-${index}`}
      aria-labelledby={`privacy-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface VariableSharingSettings {
  variable_name: string;
  is_shared: boolean;
  variable_type: "predefined" | "custom" | "oura";
  category?: string;
}

export default function AnalyzePrivacySection() {
  const { user } = useUser();
  const [tabValue, setTabValue] = useState(0);
  const [variableSettings, setVariableSettings] = useState<
    VariableSharingSettings[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Group variables by category for better organization
  const groupedVariables = {
    "Mental & Emotional": LOG_LABELS.filter((v) =>
      [
        "Stress",
        "Cognitive Control",
        "Anxiety Before Bed",
        "Mood",
        "Emotional Event",
      ].includes(v.label)
    ),
    "Sleep & Recovery": LOG_LABELS.filter((v) =>
      [
        "Sleep Time",
        "Fell Asleep Time",
        "Sleep Duration",
        "Sleep Quality",
        "Naps",
      ].includes(v.label)
    ),
    "Physical Health": LOG_LABELS.filter((v) =>
      [
        "Exercise",
        "Illness/Symptoms",
        "Body Temp (subjective)",
        "Menstrual Phase",
      ].includes(v.label)
    ),
    "Substances & Diet": LOG_LABELS.filter((v) =>
      [
        "Caffeine (mg)",
        "Alcohol (units)",
        "Nicotine",
        "Cannabis/THC",
        "Medications/Supplements",
        "Big Meal Late",
        "Late Sugar Intake",
        "Intermittent Fasting",
        "Hydration",
      ].includes(v.label)
    ),
    Environment: LOG_LABELS.filter((v) =>
      [
        "Room Temp",
        "Light Exposure",
        "Noise Disturbances",
        "Travel/Jet Lag",
        "Altitude Change",
      ].includes(v.label)
    ),
    "Oura Data": [
      {
        label: "Heart Rate",
        type: "number",
        description: "Resting heart rate data",
        icon: "❤️",
      },
      {
        label: "Sleep Score",
        type: "number",
        description: "Oura sleep score",
        icon: "😴",
      },
      {
        label: "Readiness Score",
        type: "number",
        description: "Oura readiness score",
        icon: "⚡",
      },
      {
        label: "Activity Score",
        type: "number",
        description: "Oura activity score",
        icon: "🏃",
      },
      {
        label: "Deep Sleep",
        type: "number",
        description: "Deep sleep duration",
        icon: "🌙",
      },
      {
        label: "REM Sleep",
        type: "number",
        description: "REM sleep duration",
        icon: "💭",
      },
      {
        label: "Light Sleep",
        type: "number",
        description: "Light sleep duration",
        icon: "😌",
      },
    ],
  };

  useEffect(() => {
    if (user) {
      loadPrivacySettings();
    }
  }, [user]);

  const loadPrivacySettings = async () => {
    try {
      setLoading(true);

      const { data: varSettings, error: varError } = await supabase
        .from("app_variable_sharing_settings")
        .select("*")
        .eq("user_id", user?.id);

      if (varError) throw varError;

      setVariableSettings(varSettings || []);
    } catch (error) {
      console.error("Error loading privacy settings:", error);
      setMessage({ type: "error", text: "Failed to load privacy settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleVariableSharingChange = async (
    variableName: string,
    isShared: boolean
  ) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from("app_variable_sharing_settings")
        .upsert({
          user_id: user?.id,
          variable_name: variableName,
          is_shared: isShared,
          variable_type: "predefined",
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setVariableSettings((prev) =>
        prev
          .map((setting) =>
            setting.variable_name === variableName
              ? { ...setting, is_shared: isShared }
              : setting
          )
          .filter((setting) => setting.variable_name !== variableName)
          .concat({
            variable_name: variableName,
            is_shared: isShared,
            variable_type: "predefined",
          })
      );

      setMessage({ type: "success", text: "Variable sharing setting updated" });
    } catch (error) {
      console.error("Error updating variable sharing:", error);
      setMessage({
        type: "error",
        text: "Failed to update variable sharing setting",
      });
    } finally {
      setSaving(false);
    }
  };

  const getVariableSharingStatus = (variableName: string) => {
    const setting = variableSettings.find(
      (s) => s.variable_name === variableName
    );
    return setting?.is_shared ?? false;
  };

  const getSharedVariablesCount = () => {
    return variableSettings.filter((s) => s.is_shared).length;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom>
          Loading privacy settings...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Typography variant="h5" component="h2">
          🔒 Privacy & Sharing
        </Typography>
      </Box>

      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Control what data you share with other users in the community. You can
        share variable types and hide specific logged values.
      </Typography>

      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="privacy settings tabs"
        >
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FaUsers />
                <span>Variable Sharing</span>
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FaEye />
                <span>Individual Logs</span>
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FaCog />
                <span>Profile Settings</span>
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Variable Sharing Tab */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>
          📊 Variable Type Sharing
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Choose which variable types you want to share with other users. When
          enabled, other users can see your logged values for this variable
          type.
        </Typography>

        {Object.entries(groupedVariables).map(([category, variables]) => (
          <Accordion key={category} defaultExpanded>
            <AccordionSummary>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  width: "100%",
                }}
              >
                <Typography variant="h6" color="primary">
                  {category}
                </Typography>
                <Chip
                  label={`${
                    variables.filter((v) => getVariableSharingStatus(v.label))
                      .length
                  }/${variables.length} shared`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {variables.map((variable) => (
                  <Paper
                    key={variable.label}
                    elevation={1}
                    sx={{ p: 2, minWidth: 200 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 1,
                      }}
                    >
                      <span>{variable.icon}</span>
                      <Typography variant="body2" fontWeight="medium">
                        {variable.label}
                      </Typography>
                      {getVariableSharingStatus(variable.label) ? (
                        <FaGlobe color="green" />
                      ) : (
                        <FaLock color="grey" />
                      )}
                    </Box>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ mb: 2, display: "block" }}
                    >
                      {variable.description}
                    </Typography>
                    <Button
                      size="small"
                      variant={
                        getVariableSharingStatus(variable.label)
                          ? "contained"
                          : "outlined"
                      }
                      color={
                        getVariableSharingStatus(variable.label)
                          ? "success"
                          : "primary"
                      }
                      onClick={() =>
                        handleVariableSharingChange(
                          variable.label,
                          !getVariableSharingStatus(variable.label)
                        )
                      }
                      disabled={saving}
                      startIcon={
                        getVariableSharingStatus(variable.label) ? (
                          <FaGlobe />
                        ) : (
                          <FaLock />
                        )
                      }
                    >
                      {getVariableSharingStatus(variable.label)
                        ? "Shared"
                        : "Private"}
                    </Button>
                  </Paper>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Note:</strong> Even when a variable type is shared, you can
            still hide individual logged values using the "Individual Logs" tab
            below.
          </Typography>
        </Alert>
      </TabPanel>

      {/* Individual Logs Tab */}
      <TabPanel value={tabValue} index={1}>
        <LogPrivacyManager maxLogs={100} showFilters={true} />
      </TabPanel>

      {/* Profile Settings Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          👤 Profile Privacy Settings
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Control your overall profile visibility and sharing preferences.
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Profile privacy settings are coming soon. This will include options
            for:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <li>Profile visibility (public, private, followers only)</li>
            <li>Allow follow requests</li>
            <li>Show username in shared data</li>
            <li>Anonymize shared data</li>
          </Box>
        </Alert>

        <Paper elevation={1} sx={{ p: 3, bgcolor: "grey.50" }}>
          <Typography variant="body2" color="textSecondary">
            🔮 <strong>Coming Soon:</strong> Advanced profile privacy controls
            and the ability to follow other users to see their shared data in
            your feed.
          </Typography>
        </Paper>
      </TabPanel>

      <Divider sx={{ my: 3 }} />

      {/* Quick Actions */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          onClick={() => window.open("/privacy-settings", "_blank")}
          startIcon={<FaCog />}
        >
          Full Privacy Settings
        </Button>
        <Button
          variant="outlined"
          onClick={() => setTabValue(1)}
          startIcon={<FaEye />}
        >
          Manage Individual Logs
        </Button>
      </Box>
    </Paper>
  );
}
