import React, { useState } from "react";
import { Container, Typography, Paper, Box, Alert } from "@mui/material";
import ValidatedInput from "@/components/ValidatedInput";
import DropdownInput from "@/components/DropdownInput";
import { LOG_LABELS } from "@/utils/logLabels";

export default function ConstraintsDemo() {
  const [demoValues, setDemoValues] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<
    Record<string, boolean>
  >({});

  const handleValueChange = (label: string, value: string) => {
    setDemoValues((prev) => ({ ...prev, [label]: value }));
  };

  const handleValidationChange = (label: string, isValid: boolean) => {
    setValidationResults((prev) => ({ ...prev, [label]: isValid }));
  };

  const demoVariables = [
    LOG_LABELS.find((v) => v.label === "Caffeine")!,
    LOG_LABELS.find((v) => v.label === "Stress")!,
    LOG_LABELS.find((v) => v.label === "Cognitive Control")!,
    LOG_LABELS.find((v) => v.label === "Sleep Time")!,
    LOG_LABELS.find((v) => v.label === "Nicotine")!,
    LOG_LABELS.find((v) => v.label === "Hydration")!,
    LOG_LABELS.find((v) => v.label === "Exercise")!,
  ];

  const allValid = Object.values(validationResults).every(Boolean);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        🧪 Variable Constraints Demo
      </Typography>

      <Typography
        variant="h6"
        color="textSecondary"
        align="center"
        sx={{ mb: 4 }}
      >
        Test the validation system with different variable types and constraints
      </Typography>

      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          This demo showcases the real-time validation system for different
          variable types. Try entering invalid values to see the validation in
          action!
        </Typography>
      </Alert>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {demoVariables.map((variable) => (
          <Paper elevation={2} sx={{ p: 3 }} key={variable.label}>
            <Typography variant="h6" gutterBottom>
              {variable.icon} {variable.label}
            </Typography>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {variable.description}
            </Typography>

            {variable.type === "dropdown" ? (
              <DropdownInput
                label={variable.label}
                value={demoValues[variable.label] || ""}
                onChange={(value) => handleValueChange(variable.label, value)}
                onValidationChange={(isValid) =>
                  handleValidationChange(variable.label, isValid)
                }
                showValidation={true}
              />
            ) : (
              <ValidatedInput
                label={variable.label}
                value={demoValues[variable.label] || ""}
                onChange={(value) => handleValueChange(variable.label, value)}
                onValidationChange={(isValid) =>
                  handleValidationChange(variable.label, isValid)
                }
                showValidation={true}
              />
            )}

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="textSecondary">
                Type: <strong>{variable.type}</strong>
                {variable.constraints?.required && " • Required"}
                {variable.constraints?.unit &&
                  ` • Unit: ${variable.constraints.unit}`}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          📊 Validation Summary
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          {demoVariables.map((variable) => (
            <Box
              key={variable.label}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 1,
                backgroundColor: validationResults[variable.label]
                  ? "success.light"
                  : demoValues[variable.label]
                  ? "error.light"
                  : "grey.200",
                color: validationResults[variable.label]
                  ? "success.dark"
                  : demoValues[variable.label]
                  ? "error.dark"
                  : "grey.600",
                fontSize: "0.875rem",
                fontWeight: "medium",
              }}
            >
              {variable.label}:{" "}
              {validationResults[variable.label]
                ? "✅"
                : demoValues[variable.label]
                ? "❌"
                : "⏳"}
            </Box>
          ))}
        </Box>

        <Alert severity={allValid ? "success" : "warning"}>
          {allValid
            ? "🎉 All variables are valid! You can proceed with logging."
            : "⚠️ Some variables have validation errors. Please fix them before proceeding."}
        </Alert>
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          📚 Constraint Types Explained
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ flex: "1 1 300px" }}>
            <Typography variant="subtitle2" color="primary">
              Number
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Validates numeric ranges with optional units. Example: Caffeine
              (0-1000mg)
            </Typography>
          </Box>

          <Box sx={{ flex: "1 1 300px" }}>
            <Typography variant="subtitle2" color="primary">
              Scale
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Validates integer scales (typically 1-10). Example: Stress level
            </Typography>
          </Box>

          <Box sx={{ flex: "1 1 300px" }}>
            <Typography variant="subtitle2" color="primary">
              Time
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Validates HH:MM format (24-hour). Example: Sleep time
            </Typography>
          </Box>

          <Box sx={{ flex: "1 1 300px" }}>
            <Typography variant="subtitle2" color="primary">
              Yes/No
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Accepts yes/no, true/false, 1/0, y/n (case-insensitive)
            </Typography>
          </Box>

          <Box sx={{ flex: "1 1 300px" }}>
            <Typography variant="subtitle2" color="primary">
              Dropdown
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Validates against predefined options. Example: Hydration levels
            </Typography>
          </Box>

          <Box sx={{ flex: "1 1 300px" }}>
            <Typography variant="subtitle2" color="primary">
              Text
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Validates text length and patterns. Example: Exercise description
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
