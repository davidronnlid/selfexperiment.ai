import React from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Typography, Box, SxProps, Theme } from "@mui/material";
import { Variable } from "../types/variables";

interface VariableLinkProps {
  // Variable info - can be a full Variable object or just the essential info
  variable?: Variable;
  variableId?: string;
  variableLabel?: string;
  variableSlug?: string;

  // Display options
  showIcon?: boolean;
  color?: string;
  variant?:
    | "inherit"
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    | "subtitle1"
    | "subtitle2"
    | "body1"
    | "body2"
    | "caption"
    | "button"
    | "overline";
  component?: React.ElementType;
  sx?: SxProps<Theme>;
  className?: string;

  // Styling options
  underline?: boolean;
  fontWeight?: number | string;
  fontSize?: string;
  hoverColor?: string;

  // Click handler (optional - for additional logic)
  onClick?: () => void;

  // Override self-link detection (force as link or plain text)
  forceAsLink?: boolean;
  forceAsText?: boolean;
}

export default function VariableLink({
  variable,
  variableId,
  variableLabel,
  variableSlug,
  showIcon = false,
  color = "primary.main",
  variant = "body2",
  component = "span",
  sx = {},
  className = "",
  underline = true,
  fontWeight = "medium",
  fontSize,
  hoverColor = "primary.dark",
  onClick,
  forceAsLink = false,
  forceAsText = false,
}: VariableLinkProps) {
  const router = useRouter();
  const { variableName: currentVariableName } = router.query;

  // Extract variable information
  const finalLabel =
    variableLabel || variable?.label || variableId || "Unknown Variable";
  const finalSlug =
    variableSlug || variable?.slug || variableId || "unknown-variable";
  const finalIcon = variable?.icon;

  // Check if we're on the variable's own page
  const isOnCurrentVariablePage =
    !forceAsLink &&
    (forceAsText ||
      currentVariableName === finalSlug ||
      currentVariableName === finalLabel);

  // Base styling
  const baseStyles: SxProps<Theme> = {
    color,
    fontWeight,
    fontSize,
    cursor: isOnCurrentVariablePage ? "default" : "pointer",
    textDecoration:
      underline && !isOnCurrentVariablePage ? "underline" : "none",
    "&:hover": !isOnCurrentVariablePage
      ? {
          color: hoverColor,
          textDecoration: "underline",
        }
      : {},
    transition: "color 0.2s ease-in-out",
    ...sx,
  };

  // Handle click
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    if (!isOnCurrentVariablePage) {
      router.push(`/variable/${encodeURIComponent(finalSlug)}`);
    }
  };

  // Content to display
  const content = (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
    >
      {showIcon && finalIcon && (
        <Box component="span" sx={{ display: "inline-block" }}>
          {finalIcon}
        </Box>
      )}
      <Box component="span">{finalLabel}</Box>
    </Box>
  );

  // If we're on the current variable's page, render as plain text
  if (isOnCurrentVariablePage) {
    return (
      <Typography
        variant={variant}
        component={component}
        sx={baseStyles}
        className={className}
      >
        {content}
      </Typography>
    );
  }

  // Otherwise, render as clickable link
  return (
    <Typography
      variant={variant}
      component={component}
      sx={baseStyles}
      className={className}
      onClick={handleClick}
      title={`View variable: ${finalLabel}`}
    >
      {content}
    </Typography>
  );
}

// Simplified version that works with legacy variable objects or variable mappings
export function VariableLinkSimple({
  variableId,
  variableLabel,
  variableSlug,
  variables,
  ...props
}: {
  variableId?: string;
  variableLabel?: string;
  variableSlug?: string;
  variables?: Variable[] | Record<string, string>;
  [key: string]: any;
}) {
  let finalLabel = variableLabel;
  let finalSlug = variableSlug;

  // Try to get more info from variables mapping
  if (variableId && variables) {
    if (Array.isArray(variables)) {
      const foundVar = variables.find((v) => v.id === variableId);
      if (foundVar) {
        finalLabel = foundVar.label;
        finalSlug = foundVar.slug;
      }
    } else if (typeof variables === "object") {
      // Variables is a mapping of id -> label
      finalLabel = variables[variableId] || finalLabel;
      finalSlug = finalSlug || finalLabel; // Use label as slug if no slug
    }
  }

  return (
    <VariableLink
      variableId={variableId}
      variableLabel={finalLabel}
      variableSlug={finalSlug}
      {...props}
    />
  );
}
