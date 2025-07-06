import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  IconButton,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

interface TimeInterval {
  start: string;
  end: string;
  label?: string;
}

interface TimeIntervalSelectorProps {
  intervals: TimeInterval[];
  onChange: (intervals: TimeInterval[]) => void;
  disabled?: boolean;
  maxIntervals?: number;
}

const TIME_PRESETS = [
  { label: "Early Morning", start: "06:00", end: "09:00" },
  { label: "Morning", start: "09:00", end: "12:00" },
  { label: "Afternoon", start: "12:00", end: "17:00" },
  { label: "Evening", start: "17:00", end: "21:00" },
  { label: "Night", start: "21:00", end: "23:59" },
  { label: "Work Hours", start: "09:00", end: "17:00" },
  { label: "Wake Hours", start: "07:00", end: "22:00" },
  { label: "All Day", start: "00:00", end: "23:59" },
];

export default function TimeIntervalSelector({
  intervals,
  onChange,
  disabled = false,
  maxIntervals,
}: TimeIntervalSelectorProps) {
  const [newInterval, setNewInterval] = useState<TimeInterval>({
    start: "09:00",
    end: "17:00",
    label: "",
  });

  const addInterval = () => {
    // Check if we've reached the maximum number of intervals
    if (maxIntervals && intervals.length >= maxIntervals) {
      return;
    }

    // Validate that end time is after start time
    if (newInterval.start >= newInterval.end) {
      return;
    }

    // Check for overlaps
    const hasOverlap = intervals.some((interval) => {
      const newStart = timeToMinutes(newInterval.start);
      const newEnd = timeToMinutes(newInterval.end);
      const existingStart = timeToMinutes(interval.start);
      const existingEnd = timeToMinutes(interval.end);

      return newStart < existingEnd && newEnd > existingStart;
    });

    if (hasOverlap) {
      return; // Don't add overlapping intervals
    }

    const intervalToAdd = {
      ...newInterval,
      label: newInterval.label || `${newInterval.start} - ${newInterval.end}`,
    };

    onChange([...intervals, intervalToAdd]);
    setNewInterval({ start: "09:00", end: "17:00", label: "" });
  };

  const removeInterval = (index: number) => {
    const newIntervals = intervals.filter((_, i) => i !== index);
    onChange(newIntervals);
  };

  const addPreset = (preset: TimeInterval) => {
    // Check if we've reached the maximum number of intervals
    if (maxIntervals && intervals.length >= maxIntervals) {
      return;
    }

    // Check if this preset already exists
    const exists = intervals.some(
      (interval) =>
        interval.start === preset.start && interval.end === preset.end
    );

    if (!exists) {
      onChange([...intervals, { ...preset }]);
    }
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const formatTimeRange = (interval: TimeInterval) => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    return `${formatTime(interval.start)} - ${formatTime(interval.end)}`;
  };

  const getTotalMinutes = () => {
    return intervals.reduce((total, interval) => {
      const startMinutes = timeToMinutes(interval.start);
      const endMinutes = timeToMinutes(interval.end);
      return total + (endMinutes - startMinutes);
    }, 0);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AccessTimeIcon />
          <Typography variant="subtitle1">Time Intervals</Typography>
          {intervals.length > 0 && (
            <Chip
              label={`${intervals.length} interval${
                intervals.length > 1 ? "s" : ""
              }`}
              size="small"
              color="primary"
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            Set specific time intervals when you want to be prompted to log this
            experiment. If no intervals are set, you'll be prompted all day.
            {maxIntervals && (
              <>
                {" "}
                Maximum {maxIntervals} interval{maxIntervals > 1 ? "s" : ""}{" "}
                allowed (matches your frequency per day).
              </>
            )}
          </Typography>

          {/* Current Intervals */}
          {intervals.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Current Intervals
                {maxIntervals && (
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ ml: 1, color: "text.secondary" }}
                  >
                    ({intervals.length}/{maxIntervals})
                  </Typography>
                )}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {intervals.map((interval, index) => (
                  <Chip
                    key={index}
                    label={formatTimeRange(interval)}
                    onDelete={
                      disabled ? undefined : () => removeInterval(index)
                    }
                    deleteIcon={<DeleteIcon />}
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Maximum reached warning */}
          {maxIntervals && intervals.length >= maxIntervals && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              You've reached the maximum number of intervals ({maxIntervals})
              for this experiment. This matches your frequency of {maxIntervals}{" "}
              log{maxIntervals > 1 ? "s" : ""} per day.
            </Alert>
          )}

          {/* Quick Presets */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Quick Presets
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {TIME_PRESETS.map((preset, index) => (
                <Chip
                  key={index}
                  label={preset.label}
                  onClick={() => addPreset(preset)}
                  variant="outlined"
                  disabled={
                    disabled ||
                    Boolean(maxIntervals && intervals.length >= maxIntervals)
                  }
                  sx={{ cursor: "pointer" }}
                />
              ))}
            </Stack>
          </Box>

          {/* Custom Interval Creator */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Add Custom Interval
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Start Time"
                type="time"
                value={newInterval.start}
                onChange={(e) =>
                  setNewInterval({ ...newInterval, start: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                size="small"
                disabled={disabled}
              />
              <Typography variant="body2">to</Typography>
              <TextField
                label="End Time"
                type="time"
                value={newInterval.end}
                onChange={(e) =>
                  setNewInterval({ ...newInterval, end: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                size="small"
                disabled={disabled}
              />
              <TextField
                label="Label (optional)"
                value={newInterval.label}
                onChange={(e) =>
                  setNewInterval({ ...newInterval, label: e.target.value })
                }
                size="small"
                placeholder="e.g., Work break"
                disabled={disabled}
              />
              <IconButton
                onClick={addInterval}
                disabled={
                  disabled ||
                  newInterval.start >= newInterval.end ||
                  Boolean(maxIntervals && intervals.length >= maxIntervals) ||
                  intervals.some((interval) => {
                    const newStart = timeToMinutes(newInterval.start);
                    const newEnd = timeToMinutes(newInterval.end);
                    const existingStart = timeToMinutes(interval.start);
                    const existingEnd = timeToMinutes(interval.end);
                    return newStart < existingEnd && newEnd > existingStart;
                  })
                }
                color="primary"
              >
                <AddIcon />
              </IconButton>
            </Stack>
          </Box>

          {/* Summary */}
          {intervals.length > 0 && (
            <Box
              sx={{
                p: 2,
                backgroundColor: "primary.main",
                color: "primary.contrastText",
                borderRadius: 1,
              }}
            >
              <Typography variant="body2">
                <strong>Summary:</strong> You'll be prompted to log during{" "}
                {intervals.length} time interval
                {intervals.length > 1 ? "s" : ""} per day.
              </Typography>
            </Box>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
