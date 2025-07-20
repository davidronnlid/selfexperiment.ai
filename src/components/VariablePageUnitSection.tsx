import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  Chip,
} from "@mui/material";
import VariableUnitSelector from "./VariableUnitSelector";
import { supabase } from "@/utils/supaBase";

interface VariablePageUnitSectionProps {
  variableId: string;
  userId: string;
  variableSlug: string;
  variableLabel: string;
}

export default function VariablePageUnitSection({
  variableId,
  userId,
  variableSlug,
  variableLabel,
}: VariablePageUnitSectionProps) {
  const [currentUnit, setCurrentUnit] = useState<{
    unit_id: string;
    label: string;
    symbol: string;
  } | null>(null);
  const [unitGroups, setUnitGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataPointCount, setDataPointCount] = useState<number>(0);
  const [variableData, setVariableData] = useState<{
    description?: string;
    data_type?: string;
  } | null>(null);

  // Fetch current user preference and available units
  useEffect(() => {
    const loadData = async () => {
      if (!variableId || !userId) return;

      setLoading(true);
      setError(null);

      try {
        // Load variable data
        const { data: variable, error: varError } = await supabase
          .from("variables")
          .select("description, data_type")
          .eq("id", variableId)
          .single();

        if (!varError && variable) {
          setVariableData(variable);
        }

        // Load data point count
        const { count, error: countError } = await supabase
          .from("data_points")
          .select("*", { count: "exact", head: true })
          .eq("variable_id", variableId)
          .eq("user_id", userId);

        if (!countError) {
          setDataPointCount(count || 0);
        }

        // Get current user preference
        const { data: preference, error: prefError } = await supabase
          .from("user_variable_preferences")
          .select("display_unit")
          .eq("user_id", userId)
          .eq("variable_id", variableId)
          .single();

        // Get available unit groups for this variable
        const { data: availableUnits, error: unitsError } = await supabase.rpc(
          "get_variable_units",
          { var_id: variableId }
        );

        if (!unitsError && availableUnits) {
          const groups: string[] = Array.from(
            new Set(
              availableUnits
                .map((u: any) => u.unit_group)
                .filter((g: any): g is string => typeof g === "string")
            )
          );
          setUnitGroups(groups);

          // If no current unit, set default
          if (!currentUnit && availableUnits.length > 0) {
            const defaultUnit =
              availableUnits.find(
                (u: any) => u.is_default_group && u.is_base
              ) || availableUnits[0];

            setCurrentUnit({
              unit_id: defaultUnit.unit_id,
              label: defaultUnit.label,
              symbol: defaultUnit.symbol,
            });
          }
        }
      } catch (err) {
        setError("Failed to load variable data");
        console.error("Error loading variable data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [variableId, userId]);

  const handleUnitChange = (unitId: string, unitGroup: string) => {
    // Update local state - the VariableUnitSelector handles saving to database
    setCurrentUnit((prev) => ({
      unit_id: unitId,
      label: "", // Will be populated by the component
      symbol: "", // Will be populated by the component
    }));
  };

  if (loading) {
    return null; // Or a loading skeleton
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          📊 {variableLabel}
        </Typography>

        <Grid container spacing={3}>
          {/* Variable Information */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ color: "var(--gold)", mb: 1, fontWeight: 600 }}
              >
                Variable Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Description: {variableData?.description || "No description"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Data Type: {variableData?.data_type || "Unknown"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Data Points: {dataPointCount}
              </Typography>
            </Box>
          </Grid>

          {/* Unit Settings */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box>
              <Typography
                variant="subtitle2"
                color="textSecondary"
                gutterBottom
              >
                Measurement Unit
              </Typography>

              {unitGroups.length > 1 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  This variable supports multiple unit types:{" "}
                  {unitGroups.join(", ")}
                </Alert>
              ) : null}

              <VariableUnitSelector
                variableId={variableId}
                userId={userId}
                currentUnit={currentUnit?.unit_id}
                onUnitChange={handleUnitChange}
                label="Display Unit"
                size="medium"
              />

              {currentUnit && (
                <Box
                  sx={{ mt: 1, display: "flex", gap: 1, alignItems: "center" }}
                >
                  <Typography variant="body2" color="textSecondary">
                    Current:
                  </Typography>
                  <Chip
                    label={currentUnit.symbol}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              )}

              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ mt: 1, display: "block" }}
              >
                Your unit preference is saved and will be used for all future
                data entry and display.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
