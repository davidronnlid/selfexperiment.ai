import React from "react";
import { Typography, Box, CircularProgress } from "@mui/material";
import { useFormattedVariableValue } from "@/hooks/useUserDisplayUnit";
import { Variable } from "@/types/variables";

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

  const displayText = `${prefix}${formattedValue}${
    showUnit && unit ? ` ${unit}` : ""
  }${suffix}`;

  return (
    <Typography variant={variant} style={{ color }}>
      {displayText}
    </Typography>
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

  return (
    <span>
      {formattedValue}
      {showUnit && unit ? ` ${unit}` : ""}
    </span>
  );
}
