import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
} from "@mui/material";
import {
  ExpandMore,
  CheckBox,
  CheckBoxOutlineBlank,
  Search,
  AccessTime,
  CalendarToday,
} from "@mui/icons-material";
import { PlannedRoutineLog } from "@/utils/batchRoutineLogging";
import { format } from "date-fns";

interface BatchRoutineLoggingModalProps {
  open: boolean;
  onClose: () => void;
  plannedLogs: PlannedRoutineLog[];
  onConfirm: (selectedLogs: PlannedRoutineLog[]) => void;
  loading?: boolean;
}

type GroupingMode = "routine" | "date" | "variable";
type FilterMode = "all" | "enabled" | "disabled";

export default function BatchRoutineLoggingModal({
  open,
  onClose,
  plannedLogs,
  onConfirm,
  loading = false,
}: BatchRoutineLoggingModalProps) {
  const [logs, setLogs] = useState<PlannedRoutineLog[]>([]);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("routine");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // Initialize logs state when plannedLogs changes
  useEffect(() => {
    setLogs([...plannedLogs]);
    // Expand all groups by default
    const allGroupKeys = new Set<string>();
    if (groupingMode === "routine") {
      const grouped = groupPlannedLogsByRoutine(plannedLogs);
      Object.keys(grouped).forEach((key) => allGroupKeys.add(key));
    }
    setExpandedGroups(allGroupKeys);
  }, [plannedLogs, groupingMode]);

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Apply filter mode
    if (filterMode === "enabled") {
      filtered = filtered.filter((log) => log.enabled);
    } else if (filterMode === "disabled") {
      filtered = filtered.filter((log) => !log.enabled);
    }

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.routine_name.toLowerCase().includes(term) ||
          log.variable_name.toLowerCase().includes(term) ||
          log.time_name?.toLowerCase().includes(term) ||
          log.date.includes(term)
      );
    }

    return filtered;
  }, [logs, filterMode, searchTerm]);

  // Group logs by routine
  const groupPlannedLogsByRoutine = (logs: PlannedRoutineLog[]) => {
    const grouped: Record<string, PlannedRoutineLog[]> = {};
    logs.forEach((log) => {
      if (!grouped[log.routine_name]) {
        grouped[log.routine_name] = [];
      }
      grouped[log.routine_name].push(log);
    });
    return grouped;
  };

  // Group logs by date
  const groupPlannedLogsByDate = (logs: PlannedRoutineLog[]) => {
    const grouped: Record<string, PlannedRoutineLog[]> = {};
    logs.forEach((log) => {
      const dateKey = format(new Date(log.date), "yyyy-MM-dd");
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(log);
    });
    return grouped;
  };

  // Group logs by variable
  const groupPlannedLogsByVariable = (logs: PlannedRoutineLog[]) => {
    const grouped: Record<string, PlannedRoutineLog[]> = {};
    logs.forEach((log) => {
      if (!grouped[log.variable_name]) {
        grouped[log.variable_name] = [];
      }
      grouped[log.variable_name].push(log);
    });
    return grouped;
  };

  const getGroupedLogs = () => {
    switch (groupingMode) {
      case "routine":
        return groupPlannedLogsByRoutine(filteredLogs);
      case "date":
        return groupPlannedLogsByDate(filteredLogs);
      case "variable":
        return groupPlannedLogsByVariable(filteredLogs);
      default:
        return groupPlannedLogsByRoutine(filteredLogs);
    }
  };

  const toggleLog = (logId: string) => {
    setLogs((prev) =>
      prev.map((log) =>
        log.id === logId ? { ...log, enabled: !log.enabled } : log
      )
    );
  };

  const toggleGroup = (groupKey: string) => {
    const groupLogs = getGroupedLogs()[groupKey] || [];
    const allEnabled = groupLogs.every((log) => log.enabled);

    setLogs((prev) =>
      prev.map((log) => {
        const belongsToGroup = groupLogs.some((gl) => gl.id === log.id);
        return belongsToGroup ? { ...log, enabled: !allEnabled } : log;
      })
    );
  };

  const toggleAll = () => {
    const allEnabled = filteredLogs.every((log) => log.enabled);
    setLogs((prev) => prev.map((log) => ({ ...log, enabled: !allEnabled })));
  };

  const handleConfirm = () => {
    const selectedLogs = logs.filter((log) => log.enabled);
    onConfirm(selectedLogs);
  };

  const enabledCount = logs.filter((log) => log.enabled).length;
  const totalCount = logs.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AccessTime />
          <Typography variant="h6">Batch Routine Tracking</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Review and confirm the logs to be created ({enabledCount} of{" "}
          {totalCount} selected)
        </Typography>
      </DialogTitle>

      <DialogContent>
        {/* Summary Section */}
        {totalCount > 0 && (
          <Paper
            sx={{ p: 2, mb: 3, backgroundColor: "rgba(33, 150, 243, 0.1)" }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
            >
              <CalendarToday fontSize="small" />
              Batch Log Summary
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Chip
                label={`${totalCount} Total Logs`}
                color="info"
                variant="outlined"
              />
              <Chip
                label={`${enabledCount} Selected`}
                color="primary"
                variant={enabledCount > 0 ? "filled" : "outlined"}
              />
              <Chip
                label={`${
                  new Set(logs.map((l) => l.routine_name)).size
                } Routines`}
                color="secondary"
                variant="outlined"
              />
              <Chip
                label={`${
                  new Set(logs.map((l) => l.variable_name)).size
                } Variables`}
                color="secondary"
                variant="outlined"
              />
              <Chip
                label={`${new Set(logs.map((l) => l.date)).size} Days`}
                color="secondary"
                variant="outlined"
              />
            </Box>
            {enabledCount > 0 && (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
                Click "Create {enabledCount} Log{enabledCount !== 1 ? "s" : ""}"
                to add these entries to your log history.
              </Typography>
            )}
          </Paper>
        )}

        {/* Controls */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
            {/* Search */}
            <TextField
              placeholder="Search routines, variables, or dates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <Search sx={{ mr: 1, color: "text.secondary" }} />
                ),
              }}
            />

            {/* Grouping */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Group by</InputLabel>
              <Select
                value={groupingMode}
                onChange={(e) =>
                  setGroupingMode(e.target.value as GroupingMode)
                }
                label="Group by"
              >
                <MenuItem value="routine">Routine</MenuItem>
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="variable">Variable</MenuItem>
              </Select>
            </FormControl>

            {/* Filter */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                label="Filter"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="enabled">Enabled</MenuItem>
                <MenuItem value="disabled">Disabled</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Bulk actions */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" onClick={toggleAll}>
              {filteredLogs.every((log) => log.enabled)
                ? "Disable All"
                : "Enable All"}
            </Button>
            <Chip
              label={`${enabledCount} / ${totalCount} selected`}
              color={enabledCount > 0 ? "primary" : "default"}
              size="small"
            />
          </Box>
        </Box>

        {/* Grouped logs */}
        {totalCount > 0 ? (
          <Box>
            {Object.entries(getGroupedLogs()).map(([groupKey, groupLogs]) => {
              const allEnabled = groupLogs.every((log) => log.enabled);
              const someEnabled = groupLogs.some((log) => log.enabled);

              return (
                <Accordion
                  key={groupKey}
                  expanded={expandedGroups.has(groupKey)}
                  onChange={(_, isExpanded) => {
                    setExpandedGroups((prev) => {
                      const newSet = new Set(prev);
                      if (isExpanded) {
                        newSet.add(groupKey);
                      } else {
                        newSet.delete(groupKey);
                      }
                      return newSet;
                    });
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        width: "100%",
                      }}
                    >
                      <Checkbox
                        checked={allEnabled}
                        indeterminate={someEnabled && !allEnabled}
                        onChange={() => toggleGroup(groupKey)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Typography variant="subtitle1" sx={{ flex: 1 }}>
                        {groupingMode === "date"
                          ? format(new Date(groupKey), "EEEE, MMM d, yyyy")
                          : groupKey}
                      </Typography>
                      <Chip
                        label={`${
                          groupLogs.filter((l: PlannedRoutineLog) => l.enabled)
                            .length
                        } / ${groupLogs.length}`}
                        size="small"
                        color={
                          groupLogs.filter((l: PlannedRoutineLog) => l.enabled)
                            .length > 0
                            ? "primary"
                            : "default"
                        }
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {groupLogs.map((log) => (
                        <ListItem key={log.id} sx={{ pl: 0 }}>
                          <Checkbox
                            checked={log.enabled}
                            onChange={() => toggleLog(log.id)}
                          />
                          <ListItemText
                            primary={
                              groupingMode === "routine"
                                ? `${log.variable_name} at ${log.time_of_day}`
                                : groupingMode === "date"
                                ? `${log.routine_name} - ${log.variable_name}`
                                : `${log.routine_name} at ${log.time_of_day}`
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  Date:{" "}
                                  {format(new Date(log.date), "MMM d, yyyy")} •
                                  Value: {log.default_value}
                                  {log.default_unit && ` ${log.default_unit}`}
                                </Typography>
                                {log.time_name && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Time: {log.time_name}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        ) : (
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
              backgroundColor: "rgba(255, 193, 7, 0.1)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              No Logs to Create
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No logs match your current filters and date range. This could
              happen if:
            </Typography>
            <Box
              component="ul"
              sx={{ textAlign: "left", maxWidth: 400, mx: "auto" }}
            >
              <Typography component="li" variant="body2" color="text.secondary">
                The selected routines don't run on the weekdays in your date
                range
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                No variables or times match your filter selections
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                The date range is too narrow or doesn't include active days
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mt: 2, fontStyle: "italic" }}>
              Try adjusting your filters or date range in the previous screen.
            </Typography>
          </Paper>
        )}

        {loading && <LinearProgress sx={{ mt: 2 }} />}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={enabledCount === 0 || loading}
        >
          Create {enabledCount} Log{enabledCount !== 1 ? "s" : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
