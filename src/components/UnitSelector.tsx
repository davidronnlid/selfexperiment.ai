import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Popover,
  Card,
  CardContent,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  FaInfoCircle,
  FaExchangeAlt,
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
} from "react-icons/fa";
import { Variable } from "../types/variables";

interface UnitSelectorProps {
  variable: Variable;
  value: string;
  onChange: (unit: string) => void;
  disabled?: boolean;
  size?: "small" | "medium";
  showPreview?: boolean;
  label?: string;
}

// Unit category icons
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

// Unit descriptions and conversion info
const UNIT_INFO: Record<
  string,
  { description: string; group?: string; conversions?: string[] }
> = {
  // Weight/Mass
  kg: {
    description: "Kilograms - Standard metric unit for weight/mass",
    group: "mass",
    conversions: ["lb (×2.20)", "g (×1000)", "oz (×35.3)"],
  },
  lb: {
    description: "Pounds - Imperial unit for weight/mass",
    group: "mass",
    conversions: ["kg (×0.454)", "oz (×16)", "g (×454)"],
  },
  g: {
    description: "Grams - Metric unit for small weights",
    group: "mass",
    conversions: ["kg (÷1000)", "lb (÷454)", "mg (×1000)"],
  },
  mg: {
    description: "Milligrams - For medications and supplements",
    group: "mass",
    conversions: ["g (÷1000)", "mcg (×1000)"],
  },

  // Volume
  L: {
    description: "Liters - Standard metric volume unit",
    group: "volume",
    conversions: ["ml (×1000)", "cups (×4.23)", "fl oz (×33.8)"],
  },
  ml: {
    description: "Milliliters - Small volume measurements",
    group: "volume",
    conversions: ["L (÷1000)", "fl oz (÷29.6)", "tsp (÷4.9)"],
  },
  cups: {
    description: "Cups - Common cooking measurement",
    group: "volume",
    conversions: ["ml (×237)", "L (÷4.23)", "fl oz (×8)"],
  },

  // Time
  hours: {
    description: "Hours - Standard time unit",
    group: "time",
    conversions: ["minutes (×60)", "seconds (×3600)", "days (÷24)"],
  },
  minutes: {
    description: "Minutes - Short duration measurements",
    group: "time",
    conversions: ["hours (÷60)", "seconds (×60)"],
  },
  seconds: {
    description: "Seconds - Very short durations",
    group: "time",
    conversions: ["minutes (÷60)", "hours (÷3600)"],
  },

  // Temperature
  "°C": {
    description: "Degrees Celsius - Metric temperature",
    group: "temperature",
    conversions: ["°F (×1.8 + 32)"],
  },
  "°F": {
    description: "Degrees Fahrenheit - Imperial temperature",
    group: "temperature",
    conversions: ["°C (subtract 32, ÷1.8)"],
  },

  // Health
  bpm: {
    description: "Beats per minute - Heart rate measurement",
    group: "health",
  },
  mmHg: {
    description: "Millimeters of mercury - Blood pressure",
    group: "health",
  },

  // General
  percentage: {
    description: "Percentage - Values from 0 to 100%",
    group: "general",
  },
  score: {
    description: "Score or rating - Subjective measurements",
    group: "general",
  },
  rating: {
    description: "Rating - Subjective scale measurements",
    group: "general",
  },
  units: {
    description: "Generic units - General counting",
    group: "general",
  },

  // Boolean
  "true/false": {
    description: "True/False - Boolean yes/no values",
    group: "boolean",
    conversions: ["yes/no", "0/1"],
  },
  "yes/no": {
    description: "Yes/No - Boolean affirmative/negative",
    group: "boolean",
    conversions: ["true/false", "0/1"],
  },
  "0/1": {
    description: "0/1 - Numeric boolean (0=false, 1=true)",
    group: "boolean",
    conversions: ["true/false", "yes/no"],
  },
};

export default function UnitSelector({
  variable,
  value,
  onChange,
  disabled = false,
  size = "medium",
  showPreview = true,
  label = "Unit",
}: UnitSelectorProps) {
  const [infoAnchor, setInfoAnchor] = useState<HTMLElement | null>(null);
  const [previewAnchor, setPreviewAnchor] = useState<HTMLElement | null>(null);

  const availableUnits =
    variable.convertible_units ||
    (variable.canonical_unit ? [variable.canonical_unit] : []);

  const handleInfoClick = (event: React.MouseEvent<HTMLElement>) => {
    setInfoAnchor(event.currentTarget);
  };

  const handlePreviewClick = (event: React.MouseEvent<HTMLElement>) => {
    setPreviewAnchor(event.currentTarget);
  };

  const getUnitInfo = (unit: string) => {
    return UNIT_INFO[unit] || { description: `${unit} - Custom unit` };
  };

  const getUnitGroup = (unit: string) => {
    return getUnitInfo(unit).group || variable.unit_group;
  };

  const getCategoryIcon = (unit: string) => {
    const info = getUnitInfo(unit);
    const group = info.group || variable.unit_group || "general";

    // Map unit group to category
    const categoryMap: Record<string, string> = {
      mass: "Weight",
      volume: "Volume",
      time: "Time",
      temperature: "Temperature",
      health: "Health",
      distance: "Distance",
      speed: "Speed",
      boolean: "Boolean",
      general: "General",
    };

    const category = categoryMap[group] || "General";
    const IconComponent = UNIT_CATEGORY_ICONS[category] || FaLayerGroup;
    return <IconComponent size={14} />;
  };

  const renderUnitMenuItem = (unit: string) => {
    const info = getUnitInfo(unit);
    const isSelected = value === unit;

    return (
      <MenuItem
        key={unit}
        value={unit}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          py: 1,
          backgroundColor: isSelected ? "action.selected" : "transparent",
        }}
      >
        <Box
          sx={{ color: "primary.main", display: "flex", alignItems: "center" }}
        >
          {getCategoryIcon(unit)}
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
            {unit}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.7rem" }}
          >
            {info.description.split(" - ")[1] || info.description}
          </Typography>
        </Box>
        {info.conversions && (
          <Tooltip title={`Converts to: ${info.conversions.join(", ")}`} arrow>
            <FaExchangeAlt size={12} style={{ color: "#666", opacity: 0.7 }} />
          </Tooltip>
        )}
      </MenuItem>
    );
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <FormControl size={size} sx={{ minWidth: 120, flexGrow: 1 }}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          label={label}
          disabled={disabled}
          MenuProps={{
            PaperProps: {
              sx: { maxHeight: 300 },
            },
          }}
        >
          {availableUnits.length === 0 ? (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                No units available
              </Typography>
            </MenuItem>
          ) : (
            availableUnits.map(renderUnitMenuItem)
          )}
        </Select>
      </FormControl>

      {/* Unit Info Button */}
      {value && (
        <Tooltip title="Unit information" arrow>
          <IconButton
            size="small"
            onClick={handleInfoClick}
            disabled={disabled}
            sx={{ color: "primary.main" }}
          >
            <FaInfoCircle size={16} />
          </IconButton>
        </Tooltip>
      )}

      {/* Available Units Preview Button */}
      {showPreview && availableUnits.length > 1 && (
        <Tooltip title="Show all available units" arrow>
          <IconButton
            size="small"
            onClick={handlePreviewClick}
            disabled={disabled}
            sx={{ color: "secondary.main" }}
          >
            <FaExchangeAlt size={16} />
          </IconButton>
        </Tooltip>
      )}

      {/* Unit Info Popover */}
      <Popover
        open={Boolean(infoAnchor)}
        anchorEl={infoAnchor}
        onClose={() => setInfoAnchor(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Card sx={{ maxWidth: 300, m: 1 }}>
          <CardContent sx={{ pb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              {getCategoryIcon(value)}
              <Typography variant="h6" component="div">
                {value}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {getUnitInfo(value).description}
            </Typography>

            {getUnitInfo(value).conversions && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  sx={{ mb: 0.5, display: "block" }}
                >
                  Quick Conversions:
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {getUnitInfo(value).conversions!.map((conversion, idx) => (
                    <Chip
                      key={idx}
                      label={conversion}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.7rem" }}
                    />
                  ))}
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Popover>

      {/* Available Units Preview Popover */}
      <Popover
        open={Boolean(previewAnchor)}
        anchorEl={previewAnchor}
        onClose={() => setPreviewAnchor(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Card sx={{ maxWidth: 400, m: 1 }}>
          <CardContent sx={{ pb: 2 }}>
            <Typography variant="h6" component="div" sx={{ mb: 1 }}>
              Available Units for {variable.label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You can switch between these units at any time. Values will be
              automatically converted.
            </Typography>

            <List dense>
              {availableUnits.map((unit, idx) => (
                <ListItem
                  key={unit}
                  sx={{
                    py: 0.5,
                    backgroundColor:
                      unit === value ? "action.selected" : "transparent",
                    borderRadius: 1,
                    mb: 0.5,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {getCategoryIcon(unit)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={unit === value ? 600 : 400}
                        >
                          {unit}
                        </Typography>
                        {unit === value && (
                          <Chip
                            label="Current"
                            size="small"
                            color="primary"
                            sx={{ height: 18, fontSize: "0.6rem" }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      getUnitInfo(unit).description.split(" - ")[1] ||
                      getUnitInfo(unit).description
                    }
                    secondaryTypographyProps={{
                      variant: "caption",
                      fontSize: "0.7rem",
                    }}
                  />
                  {getUnitInfo(unit).conversions && (
                    <Tooltip
                      title={`Converts to: ${getUnitInfo(
                        unit
                      ).conversions!.join(", ")}`}
                      arrow
                    >
                      <FaExchangeAlt
                        size={12}
                        style={{ color: "#666", opacity: 0.7 }}
                      />
                    </Tooltip>
                  )}
                </ListItem>
              ))}
            </List>

            {variable.unit_group && (
              <>
                <Divider sx={{ my: 1 }} />
                <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
                  <Typography variant="caption">
                    <strong>Unit Group:</strong> {variable.unit_group} - All
                    units in this group can be automatically converted between
                    each other.
                  </Typography>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>
      </Popover>
    </Box>
  );
}
