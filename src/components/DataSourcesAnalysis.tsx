import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { supabase } from "@/utils/supaBase";
import SyncIcon from "@mui/icons-material/Sync";

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
    variablesTracked: 0,
    total: 0,
    loading: true,
  });

  // Sync states
  const [syncingOura, setSyncingOura] = useState(false);
  const [syncingWithings, setSyncingWithings] = useState(false);

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
        (ouraCount || 0) + (withingsCount || 0) + (modularHealthCount || 0);

      setDataCounts({
        modularHealth: modularHealthCount || 0,
        oura: ouraCount || 0,
        withings: withingsCount || 0,
        variablesTracked,
        total,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching data counts:", error);
      setDataCounts((prev) => ({ ...prev, loading: false }));
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

  useEffect(() => {
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
          {dataCounts.loading ? (
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

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Chip
                  label={`Oura: ${formatLargeNumber(
                    dataCounts.oura
                  )} data points`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
                <IconButton
                  size="small"
                  onClick={syncOura}
                  disabled={syncingOura}
                  sx={{
                    width: 20,
                    height: 20,
                    color: "secondary.main",
                    "&:hover": { backgroundColor: "secondary.light" },
                  }}
                >
                  {syncingOura ? (
                    <CircularProgress size={12} />
                  ) : (
                    <SyncIcon sx={{ fontSize: 12 }} />
                  )}
                </IconButton>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Chip
                  label={`Withings: ${formatLargeNumber(
                    dataCounts.withings
                  )} data points`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
                <IconButton
                  size="small"
                  onClick={syncWithings}
                  disabled={syncingWithings}
                  sx={{
                    width: 20,
                    height: 20,
                    color: "warning.main",
                    "&:hover": { backgroundColor: "warning.light" },
                  }}
                >
                  {syncingWithings ? (
                    <CircularProgress size={12} />
                  ) : (
                    <SyncIcon sx={{ fontSize: 12 }} />
                  )}
                </IconButton>
              </Box>

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
                label={`${formatLargeNumber(
                  dataCounts.variablesTracked
                )} variables tracked`}
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
