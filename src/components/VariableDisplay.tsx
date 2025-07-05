import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Collapse,
} from "@mui/material";
import {
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaInfoCircle,
  FaChartLine,
} from "react-icons/fa";
import {
  Variable,
  UserVariablePreference,
  VariableLog,
} from "../types/variables";
import {
  formatVariableValue,
  getUserPreferredUnit,
} from "../utils/variableUtils";
import { useUser } from "../pages/_app";

interface VariableDisplayProps {
  variable: Variable;
  value: string | number;
  unit?: string;
  userPreferences?: UserVariablePreference;
  showTrend?: boolean;
  showCorrelations?: boolean;
  showHistory?: boolean;
  history?: VariableLog[];
  trend?: {
    direction: "increasing" | "decreasing" | "stable";
    changePercentage: number;
    period: string;
  };
  correlations?: Array<{
    variableName: string;
    strength: number;
    direction: "positive" | "negative";
  }>;
  size?: "small" | "medium" | "large";
  variant?: "card" | "inline" | "compact";
}

export default function VariableDisplay({
  variable,
  value,
  unit,
  userPreferences,
  showTrend = false,
  showCorrelations = false,
  showHistory = false,
  history = [],
  trend,
  correlations = [],
  size = "medium",
  variant = "card",
}: VariableDisplayProps) {
  const { user } = useUser();
  const [displayData, setDisplayData] = useState<{
    value: string | number;
    unit?: string;
    convertedValue?: number;
    convertedUnit?: string;
  }>({ value, unit });
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Load user's preferred unit and format display
  useEffect(() => {
    const loadDisplayData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const formatted = await formatVariableValue(
          variable,
          value,
          unit,
          user.id
        );
        setDisplayData({
          value: formatted.value,
          unit: formatted.unit,
          convertedValue: formatted.converted_value,
          convertedUnit: formatted.converted_unit,
        });
      } catch (error) {
        console.error("Failed to format variable value:", error);
        setDisplayData({ value, unit });
      } finally {
        setIsLoading(false);
      }
    };

    loadDisplayData();
  }, [user, variable, value, unit]);

  // Get trend icon and color
  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.direction) {
      case "increasing":
        return { icon: <FaArrowUp />, color: "success.main" };
      case "decreasing":
        return { icon: <FaArrowDown />, color: "error.main" };
      case "stable":
        return { icon: <FaMinus />, color: "text.secondary" };
      default:
        return null;
    }
  };

  // Get correlation strength color
  const getCorrelationColor = (strength: number) => {
    const absStrength = Math.abs(strength);
    if (absStrength > 0.7) return "error.main";
    if (absStrength > 0.5) return "warning.main";
    if (absStrength > 0.3) return "info.main";
    return "text.secondary";
  };

  // Format value for display
  const formatValue = (val: string | number, unit?: string) => {
    if (typeof val === "number") {
      return `${val.toFixed(2)}${unit ? ` ${unit}` : ""}`;
    }
    return `${val}${unit ? ` ${unit}` : ""}`;
  };

  // Render compact variant
  if (variant === "compact") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="body2" color="textSecondary">
          {variable.icon} {variable.label}:
        </Typography>
        <Typography variant="body2" fontWeight="medium">
          {formatValue(displayData.value, displayData.unit)}
        </Typography>
        {trend && getTrendIcon() && (
          <Tooltip
            title={`${trend.direction} ${trend.changePercentage.toFixed(
              1
            )}% over ${trend.period}`}
          >
            <IconButton size="small" sx={{ color: getTrendIcon()?.color }}>
              {getTrendIcon()?.icon}
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  // Render inline variant
  if (variant === "inline") {
    return (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        <Typography variant="body1" fontWeight="medium">
          {formatValue(displayData.value, displayData.unit)}
        </Typography>
        {trend && getTrendIcon() && (
          <Chip
            icon={getTrendIcon()?.icon}
            label={`${trend.changePercentage.toFixed(1)}%`}
            size="small"
            color={trend.direction === "increasing" ? "success" : "error"}
            variant="outlined"
          />
        )}
        {showCorrelations && correlations.length > 0 && (
          <Chip
            icon={<FaChartLine />}
            label={`${correlations.length} correlations`}
            size="small"
            variant="outlined"
            onClick={() => setShowDetails(!showDetails)}
          />
        )}
      </Box>
    );
  }

  // Render card variant (default)
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" component="h3">
              {variable.icon} {variable.label}
            </Typography>
            {variable.description && (
              <Tooltip title={variable.description}>
                <IconButton size="small">
                  <FaInfoCircle />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          {showCorrelations && correlations.length > 0 && (
            <IconButton
              size="small"
              onClick={() => setShowDetails(!showDetails)}
              color={showDetails ? "primary" : "default"}
            >
              <FaChartLine />
            </IconButton>
          )}
        </Box>

        {/* Main Value */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Typography variant="h4" component="div" fontWeight="bold">
            {isLoading ? (
              <LinearProgress sx={{ width: 100, height: 8 }} />
            ) : (
              formatValue(displayData.value, displayData.unit)
            )}
          </Typography>

          {trend && getTrendIcon() && (
            <Tooltip
              title={`${trend.direction} ${trend.changePercentage.toFixed(
                1
              )}% over ${trend.period}`}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton size="small" sx={{ color: getTrendIcon()?.color }}>
                  {getTrendIcon()?.icon}
                </IconButton>
                <Typography variant="body2" color="textSecondary">
                  {trend.changePercentage > 0 ? "+" : ""}
                  {trend.changePercentage.toFixed(1)}%
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* Unit Conversion Info */}
        {displayData.convertedValue && displayData.convertedUnit && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            Also:{" "}
            {formatValue(displayData.convertedValue, displayData.convertedUnit)}
          </Typography>
        )}

        {/* User Preferences */}
        {userPreferences && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Your Settings:
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {userPreferences.preferred_unit && (
                <Chip
                  label={`Unit: ${userPreferences.preferred_unit}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {userPreferences.is_tracked && (
                <Chip
                  label="Tracking"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
              {userPreferences.is_shared && (
                <Chip
                  label={`Shared (${userPreferences.share_level})`}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              )}
              {userPreferences.is_favorite && (
                <Chip
                  label="Favorite"
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}

        {/* Correlations */}
        <Collapse in={showDetails}>
          {correlations.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Correlations:
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {correlations.map((correlation, index) => (
                  <Box
                    key={index}
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      {correlation.variableName}:
                    </Typography>
                    <Chip
                      label={`${correlation.direction} ${(
                        Math.abs(correlation.strength) * 100
                      ).toFixed(0)}%`}
                      size="small"
                      color={
                        correlation.direction === "positive"
                          ? "success"
                          : "error"
                      }
                      variant="outlined"
                      sx={{ color: getCorrelationColor(correlation.strength) }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Collapse>

        {/* History */}
        {showHistory && history.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Recent History:
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {history.slice(0, 5).map((log, index) => (
                <Box
                  key={index}
                  sx={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Typography variant="body2" color="textSecondary">
                    {new Date(log.logged_at).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2">
                    {formatValue(
                      log.display_value || log.canonical_value || 0,
                      log.display_unit
                    )}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Variable Metadata */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip label={variable.data_type} size="small" variant="outlined" />
            {variable.category && (
              <Chip label={variable.category} size="small" variant="outlined" />
            )}
            {variable.source_type && (
              <Chip
                label={`Source: ${variable.source_type}`}
                size="small"
                variant="outlined"
              />
            )}
            {variable.tags &&
              variable.tags.map((tag, index) => (
                <Chip key={index} label={tag} size="small" variant="outlined" />
              ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
