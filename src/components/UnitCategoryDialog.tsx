import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Typography,
  Box,
  Alert,
} from "@mui/material";

interface UnitCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (category: string, unitLabel?: string) => void;
  unitValue: string;
}

// Available unit categories
const UNIT_CATEGORIES = [
  { value: "Weight", label: "Weight", examples: "kg, lbs, grams, ounces" },
  { value: "Volume", label: "Volume", examples: "ml, L, cups, gallons" },
  { value: "Time", label: "Time", examples: "hours, minutes, seconds, days" },
  { value: "Temperature", label: "Temperature", examples: "°C, °F, Kelvin" },
  { value: "Health", label: "Health", examples: "bpm, mmHg, calories" },
  { value: "Activity", label: "Activity", examples: "steps, reps, sets" },
  {
    value: "Medication/Supplement",
    label: "Medication/Supplement",
    examples: "mg, mcg, IU, tablets",
  },
  {
    value: "Food/Exercise",
    label: "Food/Exercise",
    examples: "calories, grams, servings",
  },
  {
    value: "Subjective",
    label: "Subjective",
    examples: "rating, score, level",
  },
  { value: "Distance", label: "Distance", examples: "km, miles, meters, feet" },
  { value: "Speed", label: "Speed", examples: "mph, km/h, m/s" },
  {
    value: "Frequency",
    label: "Frequency",
    examples: "per day, per week, times",
  },
  { value: "General", label: "General", examples: "units, pieces, items" },
];

export default function UnitCategoryDialog({
  open,
  onClose,
  onConfirm,
  unitValue,
}: UnitCategoryDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [customLabel, setCustomLabel] = useState<string>("");

  const handleConfirm = () => {
    if (!selectedCategory) return;

    const label = customLabel.trim() || unitValue;
    onConfirm(selectedCategory, label);

    // Reset state
    setSelectedCategory("");
    setCustomLabel("");
  };

  const handleClose = () => {
    setSelectedCategory("");
    setCustomLabel("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="div">
          🏷️ Categorize New Unit
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            We don't recognize the unit <strong>"{unitValue}"</strong>. Please
            select which category it belongs to so we can add it to our system.
          </Typography>
        </Alert>

        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend" sx={{ mb: 2, fontWeight: "bold" }}>
            Unit Category
          </FormLabel>
          <RadioGroup
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {UNIT_CATEGORIES.map((category) => (
              <FormControlLabel
                key={category.value}
                value={category.value}
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {category.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Examples: {category.examples}
                    </Typography>
                  </Box>
                }
                sx={{
                  mb: 1,
                  alignItems: "flex-start",
                  "& .MuiRadio-root": {
                    mt: 0.5,
                  },
                }}
              />
            ))}
          </RadioGroup>
        </FormControl>

        <TextField
          fullWidth
          label="Display Label (Optional)"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder={unitValue}
          helperText={`Leave blank to use "${unitValue}" as the display name`}
          sx={{ mt: 3 }}
          variant="outlined"
        />
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} variant="outlined" sx={{ mr: 1 }}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedCategory}
          sx={{
            minWidth: 120,
            backgroundColor: "#2196f3",
            "&:hover": {
              backgroundColor: "#1976d2",
            },
          }}
        >
          Add Unit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
