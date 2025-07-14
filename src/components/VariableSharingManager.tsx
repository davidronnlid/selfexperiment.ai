import { useEffect, useState } from "react";
import {
  useUserVariablePreferences,
  UserVariablePreference,
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
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { FaShare, FaLock, FaUsers, FaCog } from "react-icons/fa";
import { getVariables } from "../utils/variableUtils";
import { Variable } from "../types/variables";

interface VariableSharingManagerProps {
  user: { id: string };
}

export default function VariableSharingManager({
  user,
}: VariableSharingManagerProps) {
  const { preferences, loading, error, load, update } =
    useUserVariablePreferences(user.id);
  const [expanded, setExpanded] = useState(false);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [variablesLoading, setVariablesLoading] = useState(false);

  const handleAccordionChange = async (_event: any, isExpanded: boolean) => {
    setExpanded(isExpanded);
    if (isExpanded && user?.id) {
      console.log("🔄 Loading privacy settings...");
      await load();
      await loadVariables();
      console.log("📊 Loaded preferences:", preferences.length);
      console.log("📋 Loaded variables:", variables.length);
    }
  };

  const loadVariables = async () => {
    setVariablesLoading(true);
    try {
      const variables = await getVariables(user.id);
      setVariables(variables);
    } catch (err) {
      console.error("Failed to load variables:", err);
    } finally {
      setVariablesLoading(false);
    }
  };

  const getVariableSharingStatus = (variableName: string) => {
    // Try to find by variable_name first (should match variable.label)
    const pref = preferences.find(
      (s: UserVariablePreference) =>
        s.variable_name === variableName || s.label === variableName
    );

    // Debug logging for specific variables
    if (variableName === "Mood") {
      console.log(`🔍 Checking sharing for ${variableName}:`, {
        found: !!pref,
        shared: pref?.is_shared,
        allPrefs: preferences.map((p) => p.variable_name),
      });
    }

    return pref?.is_shared ?? false;
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

  const getSharedCount = () => {
    return preferences.filter((s) => s.is_shared).length;
  };

  const getTotalCount = () => {
    return preferences.length;
  };

  // Debug effect to log preferences when they change
  useEffect(() => {
    if (preferences.length > 0) {
      console.log(
        "✅ Preferences loaded:",
        preferences.map((p) => ({
          name: p.variable_name,
          label: p.label,
          shared: p.is_shared,
        }))
      );
    }
  }, [preferences]);

  return (
    <Accordion
      expanded={expanded}
      onChange={handleAccordionChange}
      sx={{
        mb: 4,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        overflow: "hidden",
        "&:before": {
          display: "none",
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon className="text-gold" />}
        sx={{
          background: "var(--surface-dark)",
          borderBottom: expanded ? "1px solid var(--border)" : "none",
          "&:hover": {
            background: "var(--surface-light)",
          },
        }}
      >
        <Box className="flex items-center gap-3">
          <FaShare className="text-gold text-xl" />
          <Box>
            <Typography variant="h6" className="text-white font-semibold">
              Variable Sharing Settings
            </Typography>
            <Typography variant="body2" className="text-text-secondary">
              {getSharedCount()} of {getTotalCount()} variables shared
            </Typography>
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 3 }}>
        <Typography
          variant="body2"
          className="text-text-secondary mb-6 leading-relaxed"
        >
          Choose which variable types you want to share with other users. When
          enabled, other users can see your logged values for this variable type
          in community features.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} icon={<FaLock />}>
            {error}
          </Alert>
        )}

        {expanded && (loading || variablesLoading) && (
          <Box className="flex justify-center py-8">
            <CircularProgress className="text-gold" />
          </Box>
        )}

        {Object.entries(groupedVariables).map(
          ([category, categoryVariables]) => (
            <Card
              key={category}
              sx={{
                mb: 3,
                background: "var(--surface-light)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                overflow: "hidden",
                transition: "all var(--transition-normal)",
                "&:hover": {
                  boxShadow: "var(--shadow-md)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box className="flex items-center gap-2 mb-4">
                  <FaCog className="text-gold text-lg" />
                  <Typography variant="h6" className="text-white font-semibold">
                    {category}
                  </Typography>
                  <Chip
                    label={`${categoryVariables.length} variables`}
                    size="small"
                    className="bg-gold/20 text-gold border border-gold/30"
                  />
                </Box>

                <Divider sx={{ mb: 3, borderColor: "var(--border)" }} />

                <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryVariables.map((variable) => {
                    const isShared = getVariableSharingStatus(variable.label);
                    return (
                      <Paper
                        key={variable.id}
                        elevation={0}
                        sx={{
                          p: 2,
                          background: isShared
                            ? "rgba(255, 215, 0, 0.05)"
                            : "var(--surface)",
                          border: `1px solid ${
                            isShared ? "var(--gold)" : "var(--border)"
                          }`,
                          borderRadius: "8px",
                          transition: "all var(--transition-normal)",
                          "&:hover": {
                            background: isShared
                              ? "rgba(255, 215, 0, 0.1)"
                              : "var(--surface-light)",
                            transform: "translateY(-1px)",
                            boxShadow: "var(--shadow-sm)",
                          },
                        }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isShared}
                              onChange={async (e) => {
                                console.log(
                                  `🔄 Updating ${variable.label} to ${e.target.checked}`
                                );
                                await update(
                                  variable.label,
                                  e.target.checked,
                                  variable.data_type,
                                  category
                                );
                                console.log("✅ Update completed");
                              }}
                              disabled={loading}
                              sx={{
                                color: "var(--gold)",
                                "&.Mui-checked": {
                                  color: "var(--gold)",
                                },
                                "&:hover": {
                                  backgroundColor: "rgba(255, 215, 0, 0.1)",
                                },
                              }}
                            />
                          }
                          label={
                            <Box className="flex items-center gap-2">
                              <span className="text-lg">{variable.icon}</span>
                              <Box className="flex-1 min-w-0">
                                <Typography
                                  variant="body2"
                                  className="text-white font-medium truncate"
                                >
                                  {variable.label}
                                </Typography>
                                {variable.description && (
                                  <Typography
                                    variant="caption"
                                    className="text-text-secondary truncate block"
                                  >
                                    {variable.description}
                                  </Typography>
                                )}
                              </Box>
                              {isShared && (
                                <Tooltip title="Shared with community">
                                  <Chip
                                    label="Shared"
                                    size="small"
                                    color="success"
                                    icon={<FaUsers />}
                                    sx={{
                                      background: "var(--success)",
                                      color: "white",
                                      "& .MuiChip-icon": {
                                        color: "white",
                                      },
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </Box>
                          }
                          sx={{
                            margin: 0,
                            width: "100%",
                            "& .MuiFormControlLabel-label": {
                              width: "100%",
                            },
                          }}
                        />
                      </Paper>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          )
        )}

        {Object.keys(groupedVariables).length === 0 &&
          !loading &&
          !variablesLoading && (
            <Box className="text-center py-8">
              <Typography variant="body1" className="text-text-secondary">
                No variables found. Create some variables first to manage
                sharing settings.
              </Typography>
            </Box>
          )}
      </AccordionDetails>
    </Accordion>
  );
}
