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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { LOG_LABELS } from "../utils/logLabels";

interface VariableSharingManagerProps {
  user: { id: string };
}

// Group variables by category from LOG_LABELS
const groupedVariables: Record<
  string,
  { label: string; icon?: string; description?: string }[]
> = {
  "Mental & Emotional": LOG_LABELS.filter((v) =>
    [
      "Stress",
      "Cognitive Control",
      "Anxiety Before Bed",
      "Mood",
      "Emotional Event",
    ].includes(v.label)
  ),
  "Sleep & Recovery": LOG_LABELS.filter((v) =>
    [
      "Sleep Time",
      "Fell Asleep Time",
      "Sleep Duration",
      "Sleep Quality",
      "Naps",
    ].includes(v.label)
  ),
  "Physical Health": LOG_LABELS.filter((v) =>
    [
      "Exercise",
      "Illness/Symptoms",
      "Body Temp (subjective)",
      "Menstrual Phase",
    ].includes(v.label)
  ),
  "Substances & Diet": LOG_LABELS.filter((v) =>
    [
      "Caffeine (mg)",
      "Alcohol (units)",
      "Nicotine",
      "Cannabis/THC",
      "Medications/Supplements",
      "Big Meal Late",
      "Late Sugar Intake",
      "Intermittent Fasting",
      "Hydration",
    ].includes(v.label)
  ),
  Environment: LOG_LABELS.filter((v) =>
    [
      "Room Temp",
      "Light Exposure",
      "Noise Disturbances",
      "Travel/Jet Lag",
      "Altitude Change",
    ].includes(v.label)
  ),
  // Add any other categories and variables as needed
};

export default function VariableSharingManager({
  user,
}: VariableSharingManagerProps) {
  const { settings, loading, load, update } = useVariableSharingSettings(
    user.id
  );
  const [expanded, setExpanded] = useState(false);

  const handleAccordionChange = async (_event: any, isExpanded: boolean) => {
    setExpanded(isExpanded);
    if (isExpanded && user?.id) {
      await load();
    }
  };

  const getVariableSharingStatus = (variableName: string) => {
    const setting = settings.find(
      (s: VariableSharingSetting) => s.variable_name === variableName
    );
    return setting?.is_shared ?? false;
  };

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
        {expanded && loading ? <CircularProgress /> : null}
        {Object.entries(groupedVariables).map(([category, variables]) => (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
              {category}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {variables.map((variable) => (
                <Paper
                  key={variable.label}
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
                            "predefined",
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
        ))}
      </AccordionDetails>
    </Accordion>
  );
}
