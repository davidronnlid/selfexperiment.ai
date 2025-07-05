import { useEffect, useState } from "react";
import {
  useVariableSharingSettings,
  VariableSharingSetting,
} from "../hooks/useVariableSharingSettings";
import {
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Checkbox,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { searchVariables } from "../utils/variableUtils";
import { Variable } from "../types/variables";

interface VariableSharingManagerProps {
  user: { id: string };
}

export default function VariableSharingManager({
  user,
}: VariableSharingManagerProps) {
  const { settings, loading, error, load, update } = useVariableSharingSettings(
    user.id
  );
  const [expanded, setExpanded] = useState(false);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [variablesLoading, setVariablesLoading] = useState(false);

  const handleAccordionChange = async (_event: any, isExpanded: boolean) => {
    setExpanded(isExpanded);
    if (isExpanded && user?.id) {
      await load();
      await loadVariables();
    }
  };

  const loadVariables = async () => {
    setVariablesLoading(true);
    try {
      const result = await searchVariables(
        {
          query: "",
          limit: 100,
        },
        user.id
      );
      setVariables(result.variables);
    } catch (err) {
      console.error("Failed to load variables:", err);
    } finally {
      setVariablesLoading(false);
    }
  };

  const getVariableSharingStatus = (variableName: string) => {
    const setting = settings.find(
      (s: VariableSharingSetting) => s.variable_name === variableName
    );
    return setting?.is_shared ?? false;
  };

  // Group variables by category
  const groupedVariables = variables.reduce((acc, variable) => {
    const category = variable.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(variable);
    return acc;
  }, {} as Record<string, Variable[]>);

  return (
    <Accordion
      expanded={expanded}
      onChange={handleAccordionChange}
      sx={{ mb: 4 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h5" gutterBottom>
          📊 Variable Sharing
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Choose which variable types you want to share with other users. When
          enabled, other users can see your logged values for this variable
          type.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {expanded && (loading || variablesLoading) && <CircularProgress />}

        {Object.entries(groupedVariables).map(
          ([category, categoryVariables]) => (
            <Box key={category} sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
                {category}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {categoryVariables.map((variable) => (
                  <Paper
                    key={variable.id}
                    elevation={1}
                    sx={{ p: 2, minWidth: 200 }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={getVariableSharingStatus(variable.label)}
                          onChange={(e) =>
                            update(
                              variable.label,
                              e.target.checked,
                              variable.data_type,
                              category
                            )
                          }
                          disabled={loading}
                        />
                      }
                      label={
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <span>{variable.icon}</span>
                          <Typography variant="body2">
                            {variable.label}
                          </Typography>
                          {getVariableSharingStatus(variable.label) && (
                            <Chip label="Shared" size="small" color="success" />
                          )}
                        </Box>
                      }
                    />
                  </Paper>
                ))}
              </Box>
            </Box>
          )
        )}
      </AccordionDetails>
    </Accordion>
  );
}
