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
} from "@mui/material";
import { Grid } from "@mui/material";
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
} from "@mui/icons-material";
import { supabase } from "@/utils/supaBase";
import { format, parseISO, subDays, startOfDay, endOfDay } from "date-fns";
import { useRouter } from "next/router";

interface ManualLog {
  id: number;
  date: string;
  variable: string;
  value: string;
  notes?: string;
  created_at: string;
}

interface ManualLogsTableProps {
  userId: string;
  maxRows?: number;
}

export default function ManualLogsTable({
  userId,
  maxRows = 50,
}: ManualLogsTableProps) {
  const router = useRouter();
  const [logs, setLogs] = useState<ManualLog[]>([]);
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

  useEffect(() => {
    fetchManualLogs();
  }, [userId, startDate, endDate]);

  const fetchManualLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Convert dates to ISO format for database query
      const startDateTime = startOfDay(parseISO(startDate)).toISOString();
      const endDateTime = endOfDay(parseISO(endDate)).toISOString();

      const { data, error } = await supabase
        .from("daily_logs")
        .select("id, date, variable, value, notes, created_at")
        .eq("user_id", userId)
        .gte("date", startDateTime)
        .lte("date", endDateTime)
        .order("date", { ascending: false })
        .limit(maxRows);

      if (error) throw error;

      setLogs(data || []);
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

  const getUniqueVariables = () => {
    const variables = new Set(logs.map((log) => log.variable));
    return Array.from(variables);
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
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (logs.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No manual logs found. Start logging data to see your trends here!
      </Alert>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" component="h3">
          📝 Manual Logs
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {logs.length} {logs.length === 1 ? "entry" : "entries"}
        </Typography>
      </Box>

      {/* Date Range Filter */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 3,
          bgcolor: "background.paper",
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <DateRange sx={{ color: "primary.main" }} />
          <Typography variant="h6" fontWeight="600" color="text.primary">
            Date Range Filter
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            gap: 3,
            alignItems: { xs: "stretch", lg: "flex-start" },
          }}
        >
          {/* Date Inputs Section */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, display: "flex", alignItems: "center" }}>
                      <Today fontSize="small" color="action" />
                    </Box>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "background.default",
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      backgroundColor: "background.paper",
                      "& fieldset": {
                        borderColor: "primary.main",
                      },
                    },
                    "&.Mui-focused": {
                      backgroundColor: "background.paper",
                      "& fieldset": {
                        borderColor: "primary.main",
                        borderWidth: 2,
                      },
                    },
                  },
                }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, display: "flex", alignItems: "center" }}>
                      <Today fontSize="small" color="action" />
                    </Box>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "background.default",
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      backgroundColor: "background.paper",
                      "& fieldset": {
                        borderColor: "primary.main",
                      },
                    },
                    "&.Mui-focused": {
                      backgroundColor: "background.paper",
                      "& fieldset": {
                        borderColor: "primary.main",
                        borderWidth: 2,
                      },
                    },
                  },
                }}
              />
            </Box>
          </Box>

          {/* Quick Actions Section */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: { xs: "center", lg: "flex-start" },
              mt: { xs: 1, lg: 0 },
            }}
          >
            <Tooltip title="View last 7 days" arrow>
              <Button
                size="small"
                variant="outlined"
                startIcon={<History />}
                onClick={() => handleQuickDateRange(7)}
                sx={{
                  minWidth: 110,
                  borderRadius: 1.5,
                  textTransform: "none",
                  fontWeight: 500,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                    borderColor: "primary.main",
                    transform: "translateY(-1px)",
                    boxShadow: 2,
                  },
                }}
              >
                7 days
              </Button>
            </Tooltip>
            <Tooltip title="View last 30 days" arrow>
              <Button
                size="small"
                variant="outlined"
                startIcon={<History />}
                onClick={() => handleQuickDateRange(30)}
                sx={{
                  minWidth: 110,
                  borderRadius: 1.5,
                  textTransform: "none",
                  fontWeight: 500,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                    borderColor: "primary.main",
                    transform: "translateY(-1px)",
                    boxShadow: 2,
                  },
                }}
              >
                30 days
              </Button>
            </Tooltip>
            <Tooltip title="View last 90 days" arrow>
              <Button
                size="small"
                variant="outlined"
                startIcon={<History />}
                onClick={() => handleQuickDateRange(90)}
                sx={{
                  minWidth: 110,
                  borderRadius: 1.5,
                  textTransform: "none",
                  fontWeight: 500,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                    borderColor: "primary.main",
                    transform: "translateY(-1px)",
                    boxShadow: 2,
                  },
                }}
              >
                90 days
              </Button>
            </Tooltip>
            <Tooltip title="Reset to default range" arrow>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleDateRangeReset}
                sx={{
                  minWidth: 90,
                  borderRadius: 1.5,
                  textTransform: "none",
                  fontWeight: 500,
                  borderColor: "grey.400",
                  color: "text.secondary",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    backgroundColor: "grey.100",
                    borderColor: "grey.600",
                    color: "text.primary",
                    transform: "translateY(-1px)",
                    boxShadow: 1,
                  },
                }}
              >
                Reset
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          Variables logged:
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {getUniqueVariables().map((variable) => (
            <Chip
              key={variable}
              label={variable}
              size="small"
              sx={{
                backgroundColor: getVariableColor(variable),
                color: "white",
                fontSize: "0.75rem",
                cursor: "pointer",
                "&:hover": {
                  opacity: 0.8,
                  transform: "scale(1.02)",
                },
              }}
              onClick={() =>
                router.push(`/variable/${encodeURIComponent(variable)}`)
              }
            />
          ))}
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell width="20%">Date</TableCell>
              <TableCell width="25%">Variable</TableCell>
              <TableCell width="20%">Value</TableCell>
              <TableCell width="20%">Logged At</TableCell>
              <TableCell width="15%">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <React.Fragment key={log.id}>
                <TableRow
                  hover
                  sx={{
                    cursor: log.notes ? "pointer" : "default",
                    "& > *": { borderBottom: "unset" },
                  }}
                >
                  <TableCell>{formatDate(log.date)}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.variable}
                      size="small"
                      sx={{
                        backgroundColor: getVariableColor(log.variable),
                        color: "white",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        "&:hover": {
                          opacity: 0.8,
                          transform: "scale(1.02)",
                        },
                      }}
                      onClick={() =>
                        router.push(
                          `/variable/${encodeURIComponent(log.variable)}`
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <strong>{log.value}</strong>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <AccessTime fontSize="small" color="action" />
                      <Typography variant="body2" color="textSecondary">
                        {formatDateTime(log.created_at)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {log.notes && (
                      <Tooltip
                        title={
                          expandedRows.has(log.id) ? "Hide notes" : "Show notes"
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleRowToggle(log.id)}
                        >
                          {expandedRows.has(log.id) ? (
                            <ExpandLess />
                          ) : (
                            <ExpandMore />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
                {log.notes && (
                  <TableRow>
                    <TableCell
                      style={{ paddingBottom: 0, paddingTop: 0 }}
                      colSpan={5}
                    >
                      <Collapse
                        in={expandedRows.has(log.id)}
                        timeout="auto"
                        unmountOnExit
                      >
                        <Box
                          sx={{
                            margin: 1,
                            p: 2,
                            bgcolor: "grey.50",
                            borderRadius: 1,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <Notes fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight="bold">
                              Notes:
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            {log.notes}
                          </Typography>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
