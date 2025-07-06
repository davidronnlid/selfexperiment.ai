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
} from "@mui/material";
import { ExpandMore, ExpandLess, AccessTime, Notes } from "@mui/icons-material";
import { supabase } from "@/utils/supaBase";
import { format, parseISO } from "date-fns";

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
  const [logs, setLogs] = useState<ManualLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchManualLogs();
  }, [userId]);

  const fetchManualLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("daily_logs")
        .select("id, date, variable, value, notes, created_at")
        .eq("user_id", userId)
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
          📝 Recent Manual Logs
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {logs.length} {logs.length === 1 ? "entry" : "entries"}
        </Typography>
      </Box>

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
              }}
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
                      }}
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
