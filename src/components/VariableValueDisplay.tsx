import React from "react";
import { Typography, Box, CircularProgress } from "@mui/material";
import { useFormattedVariableValue } from "@/hooks/useUserDisplayUnit";
import { Variable } from "@/types/variables";
import UnitTooltip from "./UnitTooltip";

interface VariableValueDisplayProps {
  value: string | number;
  variableId: string;
  variable?: Variable;
  variant?: "body1" | "body2" | "h6" | "caption" | "subtitle1" | "subtitle2";
  color?: string;
  showUnit?: boolean;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
}

/**
 * Component that displays a variable value with the user's preferred display unit
 */
export default function VariableValueDisplay({
  value,
  variableId,
  variable,
  variant = "body2",
  color,
  showUnit = true,
  prefix = "",
  suffix = "",
  loading: externalLoading = false,
}: VariableValueDisplayProps) {
  const { formattedValue, unit, loading } = useFormattedVariableValue(
    value,
    variableId,
    variable
  );

  if (loading || externalLoading) {
    return <CircularProgress size={16} />;
  }

  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  if (!showUnit || !unit) {
    const displayText = `${prefix}${formattedValue}${suffix}`;
    return (
      <Typography variant={variant} style={{ color }}>
        {displayText}
      </Typography>
    );
  }

  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
    >
      <Typography variant={variant} style={{ color }}>
        {prefix}
        {formattedValue}
      </Typography>
      <UnitTooltip unit={unit} value={numericValue}>
        <Typography
          variant={variant}
          style={{ color, cursor: "help", textDecoration: "underline dotted" }}
        >
          {unit}
        </Typography>
      </UnitTooltip>
      {suffix && (
        <Typography variant={variant} style={{ color }}>
          {suffix}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Simplified version for inline use
 */
export function VariableValue({
  value,
  variableId,
  variable,
  showUnit = true,
}: {
  value: string | number;
  variableId: string;
  variable?: Variable;
  showUnit?: boolean;
}) {
  const { formattedValue, unit, loading } = useFormattedVariableValue(
    value,
    variableId,
    variable
  );

  if (loading) {
    return "...";
  }

  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  if (!showUnit || !unit) {
    return <span>{formattedValue}</span>;
  }

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
    >
      <span>{formattedValue}</span>
      <UnitTooltip unit={unit} value={numericValue}>
        <span style={{ cursor: "help", textDecoration: "underline dotted" }}>
          {unit}
        </span>
      </UnitTooltip>
    </span>
  );
}
