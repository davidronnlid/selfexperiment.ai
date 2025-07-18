import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  TextField,
  Button,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import {
  ExpandMore,
  ExpandLess,
  AccessTime,
  Notes,
  FilterList,
  Clear,
  DateRange,
  Today,
  History,
  Refresh,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
} from "@mui/icons-material";
import { supabase } from "@/utils/supaBase";
import { format, parseISO, subDays, startOfDay, endOfDay } from "date-fns";
import { useRouter } from "next/router";

interface ManualDataPoint {
  id: number;
  date: string;
  variable_id: string;
  value: string;
  notes?: string;
  created_at: string;
}

interface ManualDataPointsTableProps {
  userId: string;
  maxRows?: number;
}

export default function ManualDataPointsTable({
  userId,
  maxRows = 25, // Reduced from 50 to 25 for faster loading
}: ManualDataPointsTableProps) {
  const router = useRouter();
  const [logs, setLogs] = useState<ManualDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Date range state
  const [startDate, setStartDate] = useState<string>(() => {
    // Default to 30 days ago
    const thirtyDaysAgo = subDays(new Date(), 30);
    return format(thirtyDaysAgo, "yyyy-MM-dd");
  });
  const [endDate, setEndDate] = useState<string>(() => {
    // Default to today
    return format(new Date(), "yyyy-MM-dd");
  });

  // Add state for variables
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [variableSlugs, setVariableSlugs] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    fetchManualLogs();
  }, [userId, startDate, endDate]);

  useEffect(() => {
    // Fetch all variables for mapping
    async function fetchVariables() {
      const { data, error } = await supabase
        .from("variables")
        .select("id, label, slug");
      if (!error && data) {
        const labelMap: Record<string, string> = {};
        const slugMap: Record<string, string> = {};
        data.forEach((v: any) => {
          labelMap[v.id] = v.label;
          slugMap[v.id] = v.slug;
        });
        setVariables(labelMap);
        setVariableSlugs(slugMap);
      }
    }
    fetchVariables();
  }, []);

  const fetchManualLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Convert dates to ISO format for database query
      const startDateTime = startOfDay(parseISO(startDate)).toISOString();
      const endDateTime = endOfDay(parseISO(endDate)).toISOString();

      const { data, error } = await supabase
        .from("data_points")
        .select("id, date, variable_id, value, notes, created_at")
        .eq("user_id", userId)
        .gte("date", startDateTime)
        .lte("date", endDateTime)
        .order("date", { ascending: false })
        .limit(maxRows);

      if (error) throw error;

      // Sort by date descending for display
      const finalLogs = (data || []).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Map logs to ManualLog type
      const mappedLogs: ManualDataPoint[] = finalLogs.map((log: any) => ({
        id: log.id,
        date: log.date,
        variable_id: log.variable_id,
        value: log.value,
        notes: log.notes,
        created_at: log.created_at,
      }));
      setLogs(mappedLogs);
    } catch (err) {
      console.error("Error fetching manual logs:", err);
      setError("Failed to load manual logs");
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeReset = () => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    setStartDate(format(thirtyDaysAgo, "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleQuickDateRange = (days: number) => {
    const startDate = subDays(new Date(), days);
    setStartDate(format(startDate, "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleRowToggle = (logId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM dd, yyyy 'at' HH:mm");
    } catch {
      return dateString;
    }
  };

  const formatTimeOnly = (dateString: string) => {
    try {
      return format(parseISO(dateString), "HH:mm");
    } catch {
      return dateString;
    }
  };

  // Helper to normalize variable names for deduplication
  const normalizeVariable = (name: string) =>
    name
      .toLowerCase()
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim();

  const getUniqueVariables = () => {
    const seen = new Map<string, string>();
    for (const log of logs) {
      const norm = normalizeVariable(log.variable_id);
      if (!seen.has(norm)) {
        seen.set(norm, log.variable_id);
      }
    }
    return Array.from(seen.values());
  };

  const getVariableColor = (variable: string) => {
    const colors = [
      "#1976d2",
      "#d32f2f",
      "#388e3c",
      "#f57c00",
      "#7b1fa2",
      "#c2185b",
      "#0097a7",
      "#5d4037",
      "#616161",
      "#e64a19",
    ];
    const index = variable.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <Box className="flex justify-center items-center min-h-[200px]">
        <CircularProgress className="text-gold" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }} icon={<TrendingDown />}>
        {error}
      </Alert>
    );
  }

  if (logs.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }} icon={<TrendingFlat />}>
        No manual data points found. Start tracking data to see your trends
        here!
      </Alert>
    );
  }

  return (
    <Box className="space-y-6">
      {/* Header Section */}
      <Box className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <Box className="flex items-center gap-3">
          <Box className="p-2 bg-gold/10 rounded-lg">
            <TrendingUp className="text-gold text-xl" />
          </Box>
          <Box>
            <Typography variant="h5" className="text-white font-semibold">
              Manual Data Points
            </Typography>
            <Typography variant="body2" className="text-text-secondary">
              {logs.length} {logs.length === 1 ? "entry" : "entries"} found
            </Typography>
          </Box>
        </Box>

        <Chip
          label={`${formatDate(startDate)} - ${formatDate(endDate)}`}
          className="bg-gold/20 text-gold border border-gold/30"
          icon={<DateRange />}
        />
      </Box>

      {/* Date Range Filter */}
      <Card
        sx={{
          background: "var(--surface-light)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box className="flex items-center gap-2 mb-4">
            <FilterList className="text-gold text-xl" />
            <Typography variant="h6" className="text-white font-semibold">
              Date Range Filter
            </Typography>
          </Box>

          <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Date Inputs Section */}
            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <Box className="mr-2 flex items-center">
                      <Today fontSize="small" className="text-text-secondary" />
                    </Box>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "var(--surface)",
                    transition: "all var(--transition-normal)",
                    "&:hover": {
                      backgroundColor: "var(--surface-light)",
                      "& fieldset": {
                        borderColor: "var(--gold)",
                      },
                    },
                    "&.Mui-focused": {
                      backgroundColor: "var(--surface-light)",
                      "& fieldset": {
                        borderColor: "var(--gold)",
                        borderWidth: 2,
                      },
                    },
                  },
                }}
              />

              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <Box className="mr-2 flex items-center">
                      <Today fontSize="small" className="text-text-secondary" />
                    </Box>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "var(--surface)",
                    transition: "all var(--transition-normal)",
                    "&:hover": {
                      backgroundColor: "var(--surface-light)",
                      "& fieldset": {
                        borderColor: "var(--gold)",
                      },
                    },
                    "&.Mui-focused": {
                      backgroundColor: "var(--surface-light)",
                      "& fieldset": {
                        borderColor: "var(--gold)",
                        borderWidth: 2,
                      },
                    },
                  },
                }}
              />
            </Box>

            {/* Quick Actions Section */}
            <Box className="flex flex-wrap gap-2 items-center">
              <Tooltip title="Last 7 days" arrow>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<History />}
                  onClick={() => handleQuickDateRange(7)}
                  className="transition-all duration-300 hover:bg-gold/10"
                  sx={{
                    minWidth: 110,
                    borderRadius: 1.5,
                    textTransform: "none",
                    fontWeight: 500,
                    borderColor: "var(--gold)",
                    color: "var(--gold)",
                    "&:hover": {
                      backgroundColor: "rgba(255, 215, 0, 0.1)",
                      borderColor: "var(--gold-light)",
                      color: "var(--gold-light)",
                      transform: "translateY(-1px)",
                      boxShadow: "var(--shadow-sm)",
                    },
                  }}
                >
                  7 Days
                </Button>
              </Tooltip>

              <Tooltip title="Last 30 days" arrow>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<History />}
                  onClick={() => handleQuickDateRange(30)}
                  className="transition-all duration-300 hover:bg-gold/10"
                  sx={{
                    minWidth: 110,
                    borderRadius: 1.5,
                    textTransform: "none",
                    fontWeight: 500,
                    borderColor: "var(--gold)",
                    color: "var(--gold)",
                    "&:hover": {
                      backgroundColor: "rgba(255, 215, 0, 0.1)",
                      borderColor: "var(--gold-light)",
                      color: "var(--gold-light)",
                      transform: "translateY(-1px)",
                      boxShadow: "var(--shadow-sm)",
                    },
                  }}
                >
                  30 Days
                </Button>
              </Tooltip>

              <Tooltip title="Reset to default" arrow>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={handleDateRangeReset}
                  className="transition-all duration-300 hover:bg-gold/10"
                  sx={{
                    minWidth: 110,
                    borderRadius: 1.5,
                    textTransform: "none",
                    fontWeight: 500,
                    borderColor: "var(--gold)",
                    color: "var(--gold)",
                    "&:hover": {
                      backgroundColor: "rgba(255, 215, 0, 0.1)",
                      borderColor: "var(--gold-light)",
                      color: "var(--gold-light)",
                      transform: "translateY(-1px)",
                      boxShadow: "var(--shadow-sm)",
                    },
                  }}
                >
                  Reset
                </Button>
              </Tooltip>

              <Tooltip title="Refresh data" arrow>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchManualLogs}
                  className="transition-all duration-300 hover:bg-gold/10"
                  sx={{
                    minWidth: 110,
                    borderRadius: 1.5,
                    textTransform: "none",
                    fontWeight: 500,
                    borderColor: "var(--gold)",
                    color: "var(--gold)",
                    "&:hover": {
                      backgroundColor: "rgba(255, 215, 0, 0.1)",
                      borderColor: "var(--gold-light)",
                      color: "var(--gold-light)",
                      transform: "translateY(-1px)",
                      boxShadow: "var(--shadow-sm)",
                    },
                  }}
                >
                  Refresh
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card
        sx={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <TableContainer
          sx={{
            maxHeight: 600,
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
            },
            "&::-webkit-scrollbar-track": {
              background: "var(--surface-dark)",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "var(--gold)",
              borderRadius: "4px",
              transition: "background var(--transition-normal)",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "var(--gold-light)",
            },
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    background: "var(--surface-dark)",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    borderBottom: "2px solid var(--border)",
                    minWidth: 120,
                  }}
                >
                  Date
                </TableCell>
                <TableCell
                  sx={{
                    background: "var(--surface-dark)",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    borderBottom: "2px solid var(--border)",
                    minWidth: 150,
                  }}
                >
                  Variable
                </TableCell>
                <TableCell
                  sx={{
                    background: "var(--surface-dark)",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    borderBottom: "2px solid var(--border)",
                    minWidth: 120,
                  }}
                >
                  Value
                </TableCell>
                <TableCell
                  sx={{
                    background: "var(--surface-dark)",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    borderBottom: "2px solid var(--border)",
                    width: 60,
                  }}
                >
                  Details
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => {
                const isExpanded = expandedRows.has(log.id);
                return (
                  <React.Fragment key={log.id}>
                    <TableRow
                      hover
                      sx={{
                        transition: "all var(--transition-fast)",
                        "&:hover": {
                          background: "var(--surface-light)",
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          color: "var(--text-secondary)",
                          borderBottom: "1px solid var(--border-light)",
                          padding: "16px",
                        }}
                      >
                        <Box className="flex items-center gap-2">
                          <AccessTime className="text-gold text-sm" />
                          <Box>
                            <Typography variant="body2" className="font-medium">
                              {formatDate(log.date)}
                            </Typography>
                            <Typography
                              variant="caption"
                              className="text-text-muted"
                            >
                              {formatTimeOnly(log.date)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell
                        sx={{
                          color: "var(--text-primary)",
                          borderBottom: "1px solid var(--border-light)",
                          padding: "16px",
                        }}
                      >
                        <Box className="flex items-center gap-2">
                          <Box
                            className="w-3 h-3 rounded-full"
                            sx={{
                              backgroundColor: getVariableColor(
                                log.variable_id
                              ),
                            }}
                          />
                          <Typography
                            variant="body2"
                            className="font-medium cursor-pointer hover:text-blue-400 transition-colors"
                            sx={{
                              color: "var(--text-primary)",
                              textDecoration: "none",
                              "&:hover": {
                                color: "#60a5fa",
                                textDecoration: "underline",
                              },
                            }}
                            onClick={() => {
                              const variableSlug =
                                variableSlugs[log.variable_id] ||
                                variables[log.variable_id] ||
                                log.variable_id;
                              router.push(
                                `/variable/${encodeURIComponent(variableSlug)}`
                              );
                            }}
                          >
                            {variables[log.variable_id] || log.variable_id}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell
                        sx={{
                          color: "var(--text-secondary)",
                          borderBottom: "1px solid var(--border-light)",
                          padding: "16px",
                        }}
                      >
                        <Typography variant="body2" className="font-medium">
                          {log.value}
                        </Typography>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: "1px solid var(--border-light)",
                          padding: "8px 16px",
                        }}
                      >
                        <Tooltip
                          title={isExpanded ? "Hide details" : "Show details"}
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleRowToggle(log.id)}
                            sx={{
                              color: "var(--gold)",
                              transition: "all var(--transition-normal)",
                              "&:hover": {
                                backgroundColor: "rgba(255, 215, 0, 0.1)",
                                transform: "scale(1.1)",
                              },
                            }}
                          >
                            {isExpanded ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                        colSpan={4}
                      >
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box
                            sx={{
                              p: 3,
                              background: "var(--surface-light)",
                              borderTop: "1px solid var(--border-light)",
                            }}
                          >
                            <Box className="space-y-3">
                              {log.notes && (
                                <Box className="flex items-start gap-2">
                                  <Notes className="text-gold text-sm mt-1" />
                                  <Box className="flex-1">
                                    <Typography
                                      variant="body2"
                                      className="text-text-secondary font-medium mb-1"
                                    >
                                      Notes:
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      className="text-text-secondary"
                                    >
                                      {log.notes}
                                    </Typography>
                                  </Box>
                                </Box>
                              )}

                              <Box className="flex items-center gap-2">
                                <AccessTime className="text-gold text-sm" />
                                <Typography
                                  variant="caption"
                                  className="text-text-muted"
                                >
                                  Logged on {formatDateTime(log.created_at)}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
