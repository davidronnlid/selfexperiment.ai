import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  LinearProgress,
} from "@mui/material";
import {
  CalendarToday,
  ExpandMore,
} from "@mui/icons-material";
import { supabase } from "@/utils/supaBase";
import { format, parseISO } from "date-fns";
import { PlannedRoutineLog } from "@/utils/batchRoutineLogging";

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
    const allEnabled = filteredLogs.every((log: PlannedRoutineLog) => log.enabled);
    setLogs((prev) => prev.map((log: PlannedRoutineLog) => ({ ...log, enabled: !allEnabled })));
  };

  const handleConfirm = () => {
    const selectedLogs = logs.filter((log) => log.enabled);
    console.log("BatchRoutineLoggingModal handleConfirm called with:", {
      totalLogs: logs.length,
      enabledLogs: selectedLogs.length,
      selectedLogs: selectedLogs
    });
    onConfirm(selectedLogs);
  };

  const enabledCount = logs.filter((log) => log.enabled).length;
  const totalCount = logs.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6">Batch Routine Tracking</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Review and confirm the data points to be created ({enabledCount} of{" "}
          {totalCount} selected)
        </Typography>
      </DialogTitle>

      <DialogContent>
        {/* Summary Section */}
        {totalCount > 0 && (
          <Box sx={{ p: 3, mb: 3, backgroundColor: "rgba(76, 175, 80, 0.15)", borderRadius: 2 }}>
            <Typography
              variant="h6"
              sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1, color: "success.main" }}
            >
              <CalendarToday fontSize="small" />
              📊 Data Points Preview
            </Typography>
            
            {/* Summary Statistics */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 2, mb: 3 }}>
              <Box sx={{ textAlign: "center", p: 1.5, backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: "bold", color: "info.main" }}>{totalCount}</Typography>
                <Typography variant="caption">Total Data Points</Typography>
              </Box>
              <Box sx={{ textAlign: "center", p: 1.5, backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main" }}>{enabledCount}</Typography>
                <Typography variant="caption">Will Be Created</Typography>
              </Box>
              <Box sx={{ textAlign: "center", p: 1.5, backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: "bold", color: "secondary.main" }}>{new Set(logs.map((l) => l.routine_name)).size}</Typography>
                <Typography variant="caption">Routines</Typography>
              </Box>
              <Box sx={{ textAlign: "center", p: 1.5, backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: "bold", color: "secondary.main" }}>{new Set(logs.map((l) => l.variable_name)).size}</Typography>
                <Typography variant="caption">Variables</Typography>
              </Box>
              <Box sx={{ textAlign: "center", p: 1.5, backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: "bold", color: "warning.main" }}>{new Set(logs.map((l) => l.date)).size}</Typography>
                <Typography variant="caption">Days</Typography>
              </Box>
            </Box>

            {/* Specific Data Points Preview */}
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: "text.primary" }}>
              Specific Data Points to be Created:
            </Typography>
            <Box sx={{ maxHeight: 300, overflowY: "auto", backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: 1, p: 2 }}>
              {filteredLogs.slice(0, 10).map((log: PlannedRoutineLog, index: number) => (
                <Box
                  key={log.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 1.5,
                    mb: 1,
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    borderRadius: 1,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <Checkbox
                    checked={log.enabled}
                    onChange={() => toggleLog(log.id)}
                    size="small"
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {log.routine_name} • {log.variable_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(log.date), "MMM d, yyyy")} at {log.time_of_day} • 
                      Value: {log.default_value}{log.default_unit && ` ${log.default_unit}`}
                      {log.time_name && ` • Time: ${log.time_name}`}
                    </Typography>
                  </Box>
                </Box>
              ))}
              {filteredLogs.length > 10 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                  ... and {filteredLogs.length - 10} more data points (use filters below to see all)
                </Typography>
              )}
            </Box>

            {enabledCount > 0 && (
              <Box sx={{ p: 2, backgroundColor: "rgba(76, 175, 80, 0.2)", borderRadius: 1, border: "1px solid rgba(76, 175, 80, 0.3)", mt: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: "success.main" }}>
                  ✅ Ready to create {enabledCount} data point{enabledCount !== 1 ? "s" : ""}!
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                  These entries will be added to your variable tracking with the default values from your routines.
                  You can always edit them later in the manual tracking section.
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Bulk actions */}
        <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
          <Button size="small" onClick={toggleAll}>
            {filteredLogs.every((log: PlannedRoutineLog) => log.enabled)
              ? "Disable All"
              : "Enable All"}
          </Button>
          <Chip
            label={`${enabledCount} / ${totalCount} selected`}
            color={enabledCount > 0 ? "primary" : "default"}
            size="small"
          />
        </Box>

        {/* Grouped logs */}
        {totalCount > 0 ? (
          <Box>
            {Object.entries(getGroupedLogs()).map(([groupKey, groupLogs]) => {
              const allEnabled = groupLogs.every((log: PlannedRoutineLog) => log.enabled);
              const someEnabled = groupLogs.some((log: PlannedRoutineLog) => log.enabled);

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
                      {groupLogs.map((log: PlannedRoutineLog) => (
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
              No Data Points to Create
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No data points match your current filters and date range. This could
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
          Create {enabledCount} Data Point{enabledCount !== 1 ? "s" : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
