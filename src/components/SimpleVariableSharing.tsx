import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { FaGlobe, FaLock } from "react-icons/fa";
import { supabase } from "@/utils/supaBase";

interface VariableWithSharing {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  is_shared: boolean;
}

interface SimpleVariableSharingProps {
  userId: string;
}

export default function SimpleVariableSharing({
  userId,
}: SimpleVariableSharingProps) {
  const [variables, setVariables] = useState<VariableWithSharing[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadVariablesWithDataPoints();
  }, [userId]);

  const loadVariablesWithDataPoints = async () => {
    setLoading(true);
    try {
      // Get all variable IDs that have data points for this user from all sources
      const [manualDataPoints, ouraDataPoints, withingsDataPoints] =
        await Promise.all([
          supabase
            .from("data_points")
            .select("variable_id")
            .eq("user_id", userId)
            .not("variable_id", "is", null),
          supabase
            .from("oura_variable_data_points")
            .select("variable_id")
            .eq("user_id", userId)
            .not("variable_id", "is", null),
          supabase
            .from("withings_variable_data_points")
            .select("variable_id")
            .eq("user_id", userId)
            .not("variable_id", "is", null),
        ]);

      // Check for errors
      if (manualDataPoints.error) throw manualDataPoints.error;
      if (ouraDataPoints.error) throw ouraDataPoints.error;
      if (withingsDataPoints.error) throw withingsDataPoints.error;

      // Combine all variable IDs and remove duplicates
      const allVariableIds = new Set([
        ...(manualDataPoints.data?.map((d) => d.variable_id) || []),
        ...(ouraDataPoints.data?.map((d) => d.variable_id) || []),
        ...(withingsDataPoints.data?.map((d) => d.variable_id) || []),
      ]);

      console.log(`[SimpleVariableSharing] Found variables with data:`, {
        manual: manualDataPoints.data?.length || 0,
        oura: ouraDataPoints.data?.length || 0,
        withings: withingsDataPoints.data?.length || 0,
        totalUnique: allVariableIds.size,
      });

      if (allVariableIds.size === 0) {
        setVariables([]);
        return;
      }

      const variableIds = Array.from(allVariableIds);

      // Get variables and their sharing preferences
      const { data: variablesData, error: variablesError } = await supabase
        .from("variables")
        .select(
          `
          id,
          label,
          description,
          icon,
          user_variable_preferences!inner (
            is_shared
          )
        `
        )
        .in("id", variableIds)
        .eq("user_variable_preferences.user_id", userId);

      if (variablesError) throw variablesError;

      // Transform the data to include is_shared at the top level
      const transformedVariables = (variablesData || []).map(
        (variable: any) => ({
          id: variable.id,
          label: variable.label,
          description: variable.description,
          icon: variable.icon,
          is_shared:
            variable.user_variable_preferences?.[0]?.is_shared || false,
        })
      );

      setVariables(transformedVariables);
    } catch (error) {
      console.error("Error loading variables:", error);
      setMessage({
        type: "error",
        text: "Failed to load variables",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSharing = async (
    variableId: string,
    newIsShared: boolean
  ) => {
    setUpdating(variableId);
    try {
      // Update or insert user_variable_preferences
      const { error } = await supabase
        .from("user_variable_preferences")
        .upsert({
          user_id: userId,
          variable_id: variableId,
          is_shared: newIsShared,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update local state
      setVariables((prev) =>
        prev.map((variable) =>
          variable.id === variableId
            ? { ...variable, is_shared: newIsShared }
            : variable
        )
      );

      const variableName = variables.find((v) => v.id === variableId)?.label;
      setMessage({
        type: "success",
        text: `${variableName} ${
          newIsShared ? "shared" : "unshared"
        } successfully`,
      });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error updating variable sharing:", error);
      setMessage({
        type: "error",
        text: "Failed to update sharing setting",
      });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (variables.length === 0) {
    return (
      <Alert severity="info">
        No variables with data found. Start tracking variables through manual
        logging, or connect integrations like Oura Ring or Withings to see
        sharing options here.
      </Alert>
    );
  }

  return (
    <Box>
      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Control which of your tracked variables are visible to other users in
        the community.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {variables.map((variable, index) => (
          <React.Fragment key={variable.id}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 2,
                px: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: "1.2rem" }}>
                  {variable.icon || "📊"}
                </span>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {variable.label}
                  </Typography>
                  {variable.description && (
                    <Typography variant="caption" color="textSecondary">
                      {variable.description}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {variable.is_shared ? (
                  <FaGlobe color="#4caf50" size={16} />
                ) : (
                  <FaLock color="#666" size={16} />
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={variable.is_shared}
                      onChange={(e) =>
                        handleToggleSharing(variable.id, e.target.checked)
                      }
                      disabled={updating === variable.id}
                      color="primary"
                    />
                  }
                  label={variable.is_shared ? "Shared" : "Private"}
                  labelPlacement="start"
                  sx={{ m: 0 }}
                />
                {updating === variable.id && <CircularProgress size={16} />}
              </Box>
            </Box>
            {index < variables.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </Box>

      <Typography
        variant="caption"
        color="textSecondary"
        sx={{ mt: 2, display: "block" }}
      >
        💡 Shared variables are visible to other users but your specific data
        values remain private unless you choose to share them separately.
      </Typography>
    </Box>
  );
}
