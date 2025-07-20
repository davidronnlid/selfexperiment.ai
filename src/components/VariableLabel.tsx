import React from "react";
import Link from "next/link";
import { Typography, TypographyProps } from "@mui/material";
import { Variable } from "@/types/variables";

interface VariableLabelProps {
  // Can accept either a Variable object, or individual properties
  variable?: Variable;
  variableId?: string;
  variableLabel?: string;
  variableSlug?: string;
  variableIcon?: string;

  // Array of variables to look up from if we only have an ID
  variables?: Variable[];

  // Typography props to customize appearance
  variant?: TypographyProps["variant"];
  sx?: TypographyProps["sx"];
  color?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  className?: string;

  // Show icon before label
  showIcon?: boolean;

  // Custom onClick handler (optional, will still navigate to variable page)
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;

  // If true, renders as plain text instead of link
  disableLink?: boolean;
}

export default function VariableLabel({
  variable,
  variableId,
  variableLabel,
  variableSlug,
  variableIcon,
  variables = [],
  variant = "body2",
  sx = {},
  color = "#1976d2",
  fontSize,
  fontWeight = 500,
  className = "",
  showIcon = false,
  onClick,
  disableLink = false,
}: VariableLabelProps) {
  // Determine the variable data to use
  let finalVariable: Variable | null = null;
  let finalLabel = "";
  let finalSlug = "";
  let finalIcon = "";

  if (variable) {
    // Direct variable object provided
    finalVariable = variable;
    finalLabel = variable.label;
    finalSlug =
      variable.slug || variable.label.toLowerCase().replace(/\s+/g, "-");
    finalIcon = variable.icon || "📝";
  } else if (variableId && variables.length > 0) {
    // Look up variable by ID
    finalVariable = variables.find((v) => v.id === variableId) || null;
    if (finalVariable) {
      finalLabel = finalVariable.label;
      finalSlug =
        finalVariable.slug ||
        finalVariable.label.toLowerCase().replace(/\s+/g, "-");
      finalIcon = finalVariable.icon || "📝";
    } else {
      // Fallback if variable not found
      finalLabel = variableLabel || variableId || "Unknown Variable";
      finalSlug = variableSlug || finalLabel.toLowerCase().replace(/\s+/g, "-");
      finalIcon = variableIcon || "📝";
    }
  } else {
    // Use provided individual properties
    finalLabel = variableLabel || "Unknown Variable";
    finalSlug = variableSlug || finalLabel.toLowerCase().replace(/\s+/g, "-");
    finalIcon = variableIcon || "📝";
  }

  const displayText = showIcon ? `${finalIcon} ${finalLabel}` : finalLabel;

  const typographyProps = {
    variant,
    sx: {
      color,
      textDecoration: disableLink ? "none" : "underline",
      fontWeight,
      fontSize,
      cursor: disableLink ? "default" : "pointer",
      "&:hover": disableLink
        ? {}
        : {
            color: "#1565c0",
            textDecoration: "underline",
          },
      ...sx,
    },
    className,
  };

  if (disableLink) {
    return <Typography {...typographyProps}>{displayText}</Typography>;
  }

  return (
    <Link
      href={`/variable/${encodeURIComponent(finalSlug)}`}
      passHref
      style={{ textDecoration: "none" }}
      onClick={onClick}
    >
      <Typography
        {...typographyProps}
        component="span"
        title={`View variable: ${finalLabel}`}
      >
        {displayText}
      </Typography>
    </Link>
  );
}

// Helper hook for getting variable data from logs
export const useVariableFromLog = (
  log: any,
  variables: Variable[]
): {
  label: string;
  slug: string;
  icon: string;
  variable?: Variable;
} => {
  if (log.variable_id && variables.length > 0) {
    const variable = variables.find((v) => v.id === log.variable_id);
    if (variable) {
      return {
        label: variable.label,
        slug:
          variable.slug || variable.label.toLowerCase().replace(/\s+/g, "-"),
        icon: variable.icon || "📝",
        variable,
      };
    }
  }

  // Fallback to legacy variable field
  const fallbackLabel = log.variable || "Unknown Variable";
  return {
    label: fallbackLabel,
    slug: fallbackLabel.toLowerCase().replace(/\s+/g, "-"),
    icon: "📝",
  };
};
