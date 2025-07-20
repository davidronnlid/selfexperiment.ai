import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
  Grid,
} from "@mui/material";
import { supabase } from "@/utils/supaBase";

interface DataPoint {
  id: number;
  date: string;
  variable_id: string;
  value: string;
  notes?: string;
  created_at: string;
}

interface ChartSelectionProps {
  userId: string;
  onChartConfigChange: (config: {
    selectedVariables: string[];
    timeRange: string;
    chartType: string;
  }) => void;
}

export default function ChartSelection({
  userId,
  onChartConfigChange,
}: ChartSelectionProps) {
  const [logs, setLogs] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("30");
  const [selectedVariables, setSelectedVariables] = useState<string[]>([
    "",
    "",
  ]);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [chartType, setChartType] = useState<string>("line");

  // Utility functions
  const isNumeric = (value: string): boolean => {
    return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
  };

  // Memoized calculations
  const uniqueVariables = useMemo(() => {
    // Get unique variable slugs from the data
    const variables = new Set(logs.map((log) => log.variable_id));
    return Array.from(variables).sort();
  }, [logs]);

  const numericVariables = useMemo(() => {
    return uniqueVariables.filter((variable) =>
      logs.some((log) => log.variable_id === variable && isNumeric(log.value))
    );
  }, [uniqueVariables, logs]);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setTime(startDate.getTime() - days * 24 * 60 * 60 * 1000); // Use milliseconds subtraction for safe date calculation

      // First, fetch variable mappings
      const { data: variablesData, error: variablesError } = await supabase
        .from("variables")
        .select("id, slug, label")
        .eq("is_active", true);

      if (variablesError) {
        console.error("Error fetching variables:", variablesError);
      }

      // Create a mapping from variable_id to slug
      const variableIdToSlug: Record<string, string> = {};
      variablesData?.forEach((variable) => {
        variableIdToSlug[variable.id] = variable.slug || variable.id;
      });

      const { data: ouraData, error: ouraError } = await supabase
        .from("oura_variable_data_points")
        .select("id, date, variable_id, value, created_at")
        .eq("user_id", userId)
        .gte("date", startDate.toISOString().split("T")[0])
        .limit(200);

      const { data: withingsData, error: withingsError } = await supabase
        .from("withings_variable_data_points")
        .select("id, date, variable_id, value, created_at")
        .eq("user_id", userId)
        .gte("date", startDate.toISOString().split("T")[0])
        .limit(200);

      const { data: manualData, error: manualError } = await supabase
        .from("data_points")
        .select("id, date, variable_id, value, notes, created_at")
        .eq("user_id", userId)
        .gte("date", startDate.toISOString().split("T")[0])
        .limit(200);

      if (ouraError || withingsError || manualError) {
        console.error("Database errors:", {
          ouraError,
          withingsError,
          manualError,
        });
        const errorMessages = [];
        if (ouraError) errorMessages.push(`Oura: ${ouraError.message}`);
        if (withingsError)
          errorMessages.push(`Withings: ${withingsError.message}`);
        if (manualError) errorMessages.push(`Manual: ${manualError.message}`);
        throw new Error(`Failed to fetch data: ${errorMessages.join(", ")}`);
      }

      const allData = [
        ...(ouraData || []).map((d) => ({
          id: d.id,
          date: d.date,
          variable_id: variableIdToSlug[d.variable_id] || d.variable_id, // Map to slug
          value: d.value?.toString() || "",
          notes: "Oura Ring data",
          created_at: d.created_at,
        })),
        ...(withingsData || []).map((d) => ({
          id: d.id,
          date: d.date,
          variable_id: variableIdToSlug[d.variable_id] || d.variable_id, // Map to slug
          value: d.value?.toString() || "",
          notes: "Withings device data",
          created_at: d.created_at,
        })),
        ...(manualData || []).map((d) => ({
          id: d.id,
          date: d.date,
          variable_id: variableIdToSlug[d.variable_id] || d.variable_id || "", // Map to slug
          value: d.value?.toString() || "",
          notes: d.notes,
          created_at: d.created_at,
        })),
      ];

      setLogs(allData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchVariables = async () => {
    try {
      const { data, error } = await supabase
        .from("variables")
        .select("id, label, slug")
        .eq("is_active", true);

      if (error) throw error;

      const variableMap: Record<string, string> = {};
      data?.forEach((variable) => {
        // Use slug as the key for consistency with data mapping
        const key = variable.slug || variable.id;
        variableMap[key] = variable.label;
      });

      setVariables(variableMap);
    } catch (err) {
      console.error("Error fetching variables:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchVariables();
  }, [userId, timeRange]);

  useEffect(() => {
    // Notify parent component of chart configuration changes
    onChartConfigChange({
      selectedVariables,
      timeRange,
      chartType,
    });
  }, [selectedVariables, timeRange, chartType]);

  const handleVariableChange = (index: number, value: string) => {
    const newSelectedVariables = [...selectedVariables];
    newSelectedVariables[index] = value;
    setSelectedVariables(newSelectedVariables);
  };

  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setTimeRange(event.target.value);
  };

  const handleChartTypeChange = (event: SelectChangeEvent) => {
    setChartType(event.target.value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📊 Chart Selection
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Loading chart options...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📊 Chart Selection
          </Typography>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          📊 Chart Selection
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Select variables and settings to customize your chart view.
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Variable 1</InputLabel>
              <Select
                value={selectedVariables[0]}
                onChange={(e) => handleVariableChange(0, e.target.value)}
                label="Variable 1"
              >
                <MenuItem value="">
                  <em>Select a variable</em>
                </MenuItem>
                {numericVariables.map((variableId) => (
                  <MenuItem key={variableId} value={variableId}>
                    {variables[variableId] || variableId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Variable 2 (Optional)</InputLabel>
              <Select
                value={selectedVariables[1]}
                onChange={(e) => handleVariableChange(1, e.target.value)}
                label="Variable 2 (Optional)"
              >
                <MenuItem value="">
                  <em>Select a variable</em>
                </MenuItem>
                {numericVariables.map((variableId) => (
                  <MenuItem key={variableId} value={variableId}>
                    {variables[variableId] || variableId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={handleTimeRangeChange}
                label="Time Range"
              >
                <MenuItem value="7">Last 7 days</MenuItem>
                <MenuItem value="30">Last 30 days</MenuItem>
                <MenuItem value="90">Last 90 days</MenuItem>
                <MenuItem value="365">Last year</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={chartType}
                onChange={handleChartTypeChange}
                label="Chart Type"
              >
                <MenuItem value="line">Line Chart</MenuItem>
                <MenuItem value="bar">Bar Chart</MenuItem>
                <MenuItem value="scatter">Scatter Plot</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
