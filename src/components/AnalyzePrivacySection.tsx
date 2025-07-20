import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Tabs,
  Tab,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { FaUsers, FaEye, FaCog, FaGlobe, FaLock } from "react-icons/fa";
import { supabase } from "@/utils/supaBase";
import { useUser } from "@/pages/_app";
import { VariableLinkSimple } from "./VariableLink";
import LogPrivacyManager from "./LogPrivacyManager";
import { UserVariablePreference } from "@/types/variables";
import { LOG_LABELS } from "@/utils/logLabels";

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

export default function AnalyzePrivacySection() {
  const { user } = useUser();
  const [tabValue, setTabValue] = useState(0);
  const [variablePreferences, setVariablePreferences] = useState<
    UserVariablePreference[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [groupedVariables, setGroupedVariables] = useState<
    Record<string, any[]>
  >({});

  // Load variables that the user actually has data points for
  const loadUserVariables = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get all variable IDs that have data points for this user from all sources
      const [manualDataPoints, ouraDataPoints, withingsDataPoints] =
        await Promise.all([
          supabase
            .from("data_points")
            .select("variable_id")
            .eq("user_id", user.id),
          supabase
            .from("oura_variable_data_points")
            .select("variable_id")
            .eq("user_id", user.id),
          supabase
            .from("withings_variable_data_points")
            .select("variable_id")
            .eq("user_id", user.id),
        ]);

      // Combine all variable IDs and remove duplicates
      const allVariableIds = new Set([
        ...(manualDataPoints.data?.map((d) => d.variable_id) || []),
        ...(ouraDataPoints.data?.map((d) => d.variable_id) || []),
        ...(withingsDataPoints.data?.map((d) => d.variable_id) || []),
      ]);

      if (allVariableIds.size === 0) {
        console.log("No data points found for user");
        setGroupedVariables({});
        return;
      }

      // Get variable details for all variables with data points
      const { data: variables, error: varsError } = await supabase
        .from("variables")
        .select(
          `
          id,
          label,
          category,
          data_type,
          icon,
          description
        `
        )
        .in("id", Array.from(allVariableIds));

      if (varsError) {
        console.error("Error loading variables:", varsError);
        throw varsError;
      }

      // Group by category
      const grouped = (variables || []).reduce((acc, variable) => {
        const category = variable.category || "Uncategorized";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          label: variable.label,
          type: variable.data_type,
          description: variable.description,
          icon: variable.icon,
          id: variable.id,
        });
        return acc;
      }, {} as Record<string, any[]>);

      console.log(
        `Loaded ${
          variables?.length || 0
        } variables with data points, grouped into ${
          Object.keys(grouped).length
        } categories`
      );
      setGroupedVariables(grouped);
    } catch (error) {
      console.error("Error loading user variables:", error);
      setMessage({
        type: "error",
        text: "Failed to load your variables. Please try again.",
      });
    }
  }, [user?.id]);

  const loadVariablePreferences = useCallback(async () => {
    try {
      setLoading(true);

      // Load both user variables (those with data points) and preferences
      await Promise.all([
        loadUserVariables(),
        (async () => {
          const { data: prefs, error: prefsError } = await supabase
            .from("user_variable_preferences")
            .select(
              `
              *,
              variables (
                id,
                label,
                category,
                data_type
              )
            `
            )
            .eq("user_id", user?.id);

          if (prefsError) {
            console.error("Error loading preferences:", prefsError);
            // If there's an error, just set empty preferences
            setVariablePreferences([]);
            return;
          }

          // Transform the data to match the expected format
          const transformedPrefs = (prefs || []).map((pref) => ({
            id: pref.id?.toString() || "",
            user_id: pref.user_id,
            variable_id: pref.variable_id,
            variable_name: pref.variables?.label || "",
            is_shared: pref.is_shared,
            variable_type: pref.variables?.data_type || "manual",
            category: pref.variables?.category || "Uncategorized",
            created_at: pref.created_at,
            updated_at: pref.updated_at,
          }));

          console.log("Loaded preferences:", transformedPrefs);
          setVariablePreferences(transformedPrefs);
        })(),
      ]);
    } catch (error) {
      console.error("Error loading variable preferences:", error);
      setMessage({
        type: "error",
        text: "Failed to load variable preferences",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadUserVariables]);

  useEffect(() => {
    if (user?.id) {
      loadVariablePreferences();
    }
  }, [loadVariablePreferences]);

  const handleVariableSharingChange = async (
    variableName: string,
    isShared: boolean
  ) => {
    try {
      setSaving(true);
      // First get the variable ID from the variable name
      const { data: variable, error: varError } = await supabase
        .from("variables")
        .select("id")
        .eq("label", variableName)
        .single();

      if (varError) {
        console.error("Error finding variable:", varError);
        throw new Error("Variable not found");
      }

      console.log(
        `Updating sharing for ${variableName} (${variable.id}) to ${isShared}`
      );

      const { error } = await supabase.from("user_variable_preferences").upsert(
        {
          user_id: user?.id,
          variable_id: variable.id,
          is_shared: isShared,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,variable_id",
        }
      );

      if (error) {
        console.error("Error upserting preference:", error);
        throw error;
      }

      // Update local state
      setVariablePreferences((prev) => {
        const existingIndex = prev.findIndex(
          (p) => p.variable_id === variable.id
        );

        if (existingIndex >= 0) {
          // Update existing preference
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            is_shared: isShared,
            updated_at: new Date().toISOString(),
          };
          return updated;
        } else {
          // Add new preference
          return [
            ...prev,
            {
              id: `temp-${Date.now()}`,
              user_id: user?.id || "",
              variable_id: variable.id,
              variable_name: variableName,
              is_shared: isShared,
              variable_type: "manual",
              category: "Uncategorized",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ];
        }
      });

      setMessage({
        type: "success",
        text: `${variableName} sharing ${isShared ? "enabled" : "disabled"}`,
      });
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
    // Try to find by variable_name
    const pref = variablePreferences.find(
      (s) => s.variable_name === variableName
    );

    // Debug logging for troubleshooting
    if (variableName === "Mood") {
      console.log(`🔍 Checking sharing status for ${variableName}:`, {
        found: !!pref,
        isShared: pref?.is_shared,
        allPrefs: variablePreferences.map((p) => ({
          name: p.variable_name,
          shared: p.is_shared,
        })),
      });
    }

    return pref?.is_shared ?? false;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom>
          Loading variable preferences...
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
        </Tabs>
      </Box>

      {/* Variable Sharing Tab */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>
          📊 Variable Type Sharing
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Control which health variables are shared with the community. You can
          &quot;opt-in&quot; to share specific variables while keeping others
          private. Only variables for which you have logged data points are
          shown.
        </Typography>

        {Object.keys(groupedVariables).length === 0 && !loading ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>No variables with data found.</strong> Start logging data
              for variables to see them here and control their sharing settings.
              You can log data from the{" "}
              <a
                href="/log/manual"
                style={{ color: "inherit", textDecoration: "underline" }}
              >
                Manual Logging
              </a>{" "}
              page or connect integrations like Oura or Withings.
            </Typography>
          </Alert>
        ) : null}

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
                        <VariableLinkSimple
                          variableLabel={variable.label}
                          variant="body2"
                          fontWeight="medium"
                          color="white"
                        />
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
      </TabPanel>
    </Paper>
  );
}
