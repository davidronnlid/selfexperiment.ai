import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Alert,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  FaWeight,
  FaClock,
  FaThermometerHalf,
  FaHeartbeat,
  FaRuler,
  FaTachometerAlt,
  FaPills,
  FaUtensils,
  FaStar,
  FaGlobe,
  FaToggleOn,
  FaFont,
  FaLayerGroup,
  FaExchangeAlt,
  FaInfoCircle,
} from "react-icons/fa";
import { Variable } from "../types/variables";

interface UnitPreviewProps {
  variable: Variable;
  currentUnit?: string;
  showConversions?: boolean;
  compact?: boolean;
  onUnitSelect?: (unit: string) => void;
}

// Unit category icons mapping
const UNIT_CATEGORY_ICONS: Record<string, any> = {
  Weight: FaWeight,
  Volume: FaGlobe,
  Time: FaClock,
  Temperature: FaThermometerHalf,
  Health: FaHeartbeat,
  Distance: FaRuler,
  Speed: FaTachometerAlt,
  "Medication/Supplement": FaPills,
  "Food/Exercise": FaUtensils,
  Activity: FaStar,
  Subjective: FaStar,
  General: FaLayerGroup,
  Boolean: FaToggleOn,
  Categorical: FaLayerGroup,
  Text: FaFont,
  Frequency: FaClock,
};

// Enhanced unit information
const UNIT_INFO: Record<
  string,
  {
    description: string;
    group?: string;
    category?: string;
    conversions?: Array<{ to: string; factor: string; description: string }>;
    examples?: string[];
  }
> = {
  // Weight/Mass
  kg: {
    description: "Kilograms - Standard metric unit for weight and mass",
    group: "mass",
    category: "Weight",
    conversions: [
      { to: "lb", factor: "×2.20", description: "pounds" },
      { to: "g", factor: "×1000", description: "grams" },
      { to: "oz", factor: "×35.3", description: "ounces" },
    ],
    examples: ["70 kg", "55.5 kg", "85 kg"],
  },
  lb: {
    description: "Pounds - Imperial unit for weight and mass",
    group: "mass",
    category: "Weight",
    conversions: [
      { to: "kg", factor: "×0.454", description: "kilograms" },
      { to: "oz", factor: "×16", description: "ounces" },
      { to: "g", factor: "×454", description: "grams" },
    ],
    examples: ["150 lb", "200 lb", "120 lb"],
  },
  g: {
    description: "Grams - Metric unit for smaller weights",
    group: "mass",
    category: "Weight",
    conversions: [
      { to: "kg", factor: "÷1000", description: "kilograms" },
      { to: "lb", factor: "÷454", description: "pounds" },
      { to: "mg", factor: "×1000", description: "milligrams" },
    ],
    examples: ["500 g", "250 g", "1000 g"],
  },
  mg: {
    description: "Milligrams - For medications and small supplements",
    group: "mass",
    category: "Medication/Supplement",
    conversions: [
      { to: "g", factor: "÷1000", description: "grams" },
      { to: "mcg", factor: "×1000", description: "micrograms" },
    ],
    examples: ["500 mg", "200 mg", "1000 mg"],
  },

  // Volume
  L: {
    description: "Liters - Standard metric volume unit",
    group: "volume",
    category: "Volume",
    conversions: [
      { to: "ml", factor: "×1000", description: "milliliters" },
      { to: "cups", factor: "×4.23", description: "cups" },
      { to: "fl oz", factor: "×33.8", description: "fluid ounces" },
    ],
    examples: ["2.5 L", "1.5 L", "3 L"],
  },
  ml: {
    description: "Milliliters - Small volume measurements",
    group: "volume",
    category: "Volume",
    conversions: [
      { to: "L", factor: "÷1000", description: "liters" },
      { to: "fl oz", factor: "÷29.6", description: "fluid ounces" },
      { to: "tsp", factor: "÷4.9", description: "teaspoons" },
    ],
    examples: ["250 ml", "500 ml", "750 ml"],
  },

  // Time
  hours: {
    description: "Hours - Standard time unit",
    group: "time",
    category: "Time",
    conversions: [
      { to: "minutes", factor: "×60", description: "minutes" },
      { to: "seconds", factor: "×3600", description: "seconds" },
      { to: "days", factor: "÷24", description: "days" },
    ],
    examples: ["8 hours", "1.5 hours", "12 hours"],
  },
  minutes: {
    description: "Minutes - Short duration measurements",
    group: "time",
    category: "Time",
    conversions: [
      { to: "hours", factor: "÷60", description: "hours" },
      { to: "seconds", factor: "×60", description: "seconds" },
    ],
    examples: ["30 minutes", "45 minutes", "90 minutes"],
  },

  // Temperature
  "°C": {
    description: "Degrees Celsius - Metric temperature scale",
    group: "temperature",
    category: "Temperature",
    conversions: [
      { to: "°F", factor: "×1.8 + 32", description: "degrees Fahrenheit" },
    ],
    examples: ["20°C", "37°C", "100°C"],
  },
  "°F": {
    description: "Degrees Fahrenheit - Imperial temperature scale",
    group: "temperature",
    category: "Temperature",
    conversions: [
      { to: "°C", factor: "(x-32)÷1.8", description: "degrees Celsius" },
    ],
    examples: ["68°F", "98.6°F", "212°F"],
  },

  // Health
  bpm: {
    description: "Beats per minute - Heart rate measurement",
    group: "health",
    category: "Health",
    examples: ["60 bpm", "80 bpm", "120 bpm"],
  },
  mmHg: {
    description: "Millimeters of mercury - Blood pressure measurement",
    group: "health",
    category: "Health",
    examples: ["120 mmHg", "80 mmHg", "140 mmHg"],
  },

  // General
  percentage: {
    description: "Percentage - Values from 0 to 100%",
    group: "general",
    category: "General",
    examples: ["85%", "70%", "95%"],
  },
  score: {
    description: "Score or rating - Subjective measurements on a scale",
    group: "general",
    category: "Subjective",
    examples: ["7/10", "8.5/10", "6/10"],
  },
  rating: {
    description: "Rating - Subjective scale measurements",
    group: "general",
    category: "Subjective",
    examples: ["4/5", "7/10", "9/10"],
  },
  units: {
    description: "Generic units - General counting or measuring",
    group: "general",
    category: "General",
    examples: ["5 units", "12 units", "20 units"],
  },

  // Boolean
  "true/false": {
    description: "True/False - Boolean yes/no values",
    group: "boolean",
    category: "Boolean",
    conversions: [
      { to: "yes/no", factor: "1:1", description: "yes/no format" },
      { to: "0/1", factor: "1:1", description: "numeric format" },
    ],
    examples: ["true", "false"],
  },
  "yes/no": {
    description: "Yes/No - Boolean affirmative/negative responses",
    group: "boolean",
    category: "Boolean",
    conversions: [
      { to: "true/false", factor: "1:1", description: "true/false format" },
      { to: "0/1", factor: "1:1", description: "numeric format" },
    ],
    examples: ["yes", "no"],
  },
  "0/1": {
    description: "0/1 - Numeric boolean (0=false, 1=true)",
    group: "boolean",
    category: "Boolean",
    conversions: [
      { to: "true/false", factor: "1:1", description: "true/false format" },
      { to: "yes/no", factor: "1:1", description: "yes/no format" },
    ],
    examples: ["1", "0"],
  },
};

export default function UnitPreview({
  variable,
  currentUnit,
  showConversions = true,
  compact = false,
  onUnitSelect,
}: UnitPreviewProps) {
  const availableUnits =
    variable.convertible_units ||
    (variable.canonical_unit ? [variable.canonical_unit] : []);

  const getUnitInfo = (unit: string) => {
    return (
      UNIT_INFO[unit] || {
        description: `${unit} - Custom unit`,
        category: "General",
        examples: [`1 ${unit}`, `5 ${unit}`, `10 ${unit}`],
      }
    );
  };

  const getCategoryIcon = (unit: string) => {
    const info = getUnitInfo(unit);
    const category = info.category || "General";
    const IconComponent = UNIT_CATEGORY_ICONS[category] || FaLayerGroup;
    return IconComponent;
  };

  // Group units by category for better organization
  const groupedUnits = availableUnits.reduce((groups, unit) => {
    const info = getUnitInfo(unit);
    const category = info.category || "General";

    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(unit);
    return groups;
  }, {} as Record<string, string[]>);

  if (availableUnits.length === 0) {
    return (
      <Alert severity="info">
        <Typography variant="body2">
          No units are configured for this variable.
        </Typography>
      </Alert>
    );
  }

  // Compact view for inline display
  if (compact) {
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {availableUnits.map((unit) => {
          const info = getUnitInfo(unit);
          const IconComponent = getCategoryIcon(unit);
          const isSelected = currentUnit === unit;

          return (
            <Tooltip key={unit} title={info.description} arrow>
              <Chip
                icon={<IconComponent size={12} />}
                label={unit}
                size="small"
                color={isSelected ? "primary" : "default"}
                variant={isSelected ? "filled" : "outlined"}
                onClick={onUnitSelect ? () => onUnitSelect(unit) : undefined}
                clickable={!!onUnitSelect}
                sx={{
                  fontWeight: isSelected ? 600 : 400,
                  cursor: onUnitSelect ? "pointer" : "default",
                }}
              />
            </Tooltip>
          );
        })}
      </Box>
    );
  }

  // Full detailed view
  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <FaInfoCircle color="#2196f3" />
          <Typography variant="h6" component="div">
            Available Units for {variable.label}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This variable supports the following units. Values are automatically
          converted when you switch between units.
        </Typography>

        {Object.entries(groupedUnits).map(([category, units]) => (
          <Box key={category} sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              {React.createElement(
                UNIT_CATEGORY_ICONS[category] || FaLayerGroup,
                {
                  size: 16,
                  color: "#666",
                }
              )}
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                color="text.primary"
              >
                {category}
              </Typography>
            </Box>

            <Grid container spacing={1}>
              {units.map((unit) => {
                const info = getUnitInfo(unit);
                const isSelected = currentUnit === unit;

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={unit}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: onUnitSelect ? "pointer" : "default",
                        backgroundColor: isSelected
                          ? "action.selected"
                          : "background.paper",
                        borderColor: isSelected ? "primary.main" : "divider",
                        "&:hover": onUnitSelect
                          ? {
                              backgroundColor: "action.hover",
                              borderColor: "primary.light",
                            }
                          : {},
                      }}
                      onClick={
                        onUnitSelect ? () => onUnitSelect(unit) : undefined
                      }
                    >
                      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <Typography variant="subtitle1" fontWeight="bold">
                            {unit}
                          </Typography>
                          {isSelected && (
                            <Chip
                              label="Current"
                              size="small"
                              color="primary"
                              sx={{ height: 18, fontSize: "0.6rem" }}
                            />
                          )}
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1, fontSize: "0.8rem" }}
                        >
                          {info.description}
                        </Typography>

                        {info.examples && (
                          <Box sx={{ mb: 1 }}>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: "bold", fontSize: "0.7rem" }}
                            >
                              Examples:
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                                mt: 0.5,
                              }}
                            >
                              {info.examples.slice(0, 2).map((example, idx) => (
                                <Chip
                                  key={idx}
                                  label={example}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: "0.6rem", height: 18 }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}

                        {showConversions &&
                          info.conversions &&
                          info.conversions.length > 0 && (
                            <Box>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: "bold", fontSize: "0.7rem" }}
                              >
                                <FaExchangeAlt
                                  size={10}
                                  style={{ marginRight: 4 }}
                                />
                                Converts to:
                              </Typography>
                              <List dense sx={{ py: 0 }}>
                                {info.conversions
                                  .slice(0, 2)
                                  .map((conversion, idx) => (
                                    <ListItem key={idx} sx={{ py: 0, px: 0 }}>
                                      <ListItemText
                                        primary={`${conversion.to} (${conversion.factor})`}
                                        primaryTypographyProps={{
                                          variant: "caption",
                                          fontSize: "0.65rem",
                                        }}
                                      />
                                    </ListItem>
                                  ))}
                              </List>
                            </Box>
                          )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))}

        {variable.unit_group && (
          <>
            <Divider sx={{ my: 2 }} />
            <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
              <Typography variant="body2">
                <strong>Unit Group:</strong> {variable.unit_group} <br />
                All units in this group can be automatically converted between
                each other with high precision.
              </Typography>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
