import { useEffect, useState } from "react";
import { supabase } from "@/utils/supaBase";
import {
  Container,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Collapse,
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Snackbar,
  InputAdornment,
} from "@mui/material";
import Link from "next/link";
import { useUser } from "../_app";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HistoryIcon from "@mui/icons-material/History";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { FaTag, FaStickyNote } from "react-icons/fa";
import { LOG_LABELS } from "@/utils/logLabels";
import type {
  DraggableProvided,
  DraggableStateSnapshot,
  DroppableProvided,
  DropResult,
} from "@hello-pangea/dnd";

interface LogEntry {
  id: number;
  date: string;
  variable: string;
  value: string;
  notes?: string;
}

export default function CompletedExperimentsPage() {
  const { user, loading: userLoading, refreshUser } = useUser();
  const [experiments, setExperiments] = useState<any[]>([]);
  const [logsByExp, setLogsByExp] = useState<
    Record<string, { independent: LogEntry[]; dependent: LogEntry[] }>
  >({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editExpIndex, setEditExpIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  // Success and error message states
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Check and refresh user state if needed
  useEffect(() => {
    const checkUserState = async () => {
      if (!userLoading && !user) {
        console.log(
          "CompletedExperimentsPage: User state is undefined, attempting refresh..."
        );
        try {
          await refreshUser();
        } catch (error) {
          console.error(
            "CompletedExperimentsPage: Failed to refresh user state:",
            error
          );
        }
      }
    };

    checkUserState();
  }, [user, userLoading, refreshUser]);

  // Auto-clear error messages after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (!user) return;
    const fetchExperiments = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("experiments")
        .select("*")
        .eq("user_id", user.id)
        .lt("end_date", today) // Only show completed experiments
        .order("end_date", { ascending: false }) // Show most recently completed first
        .order("created_at", { ascending: false });
      if (!error) setExperiments(data || []);
      setLoading(false);
    };
    fetchExperiments();
  }, [user]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user || experiments.length === 0) return;
      setLoading(true);
      const logsById: Record<
        string,
        { independent: LogEntry[]; dependent: LogEntry[] }
      > = {};

      for (const exp of experiments) {
        // Fetch logs for independent variable within experiment date range
        const { data: independentLogs } = await supabase
          .from("logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("variable", exp.variable)
          .gte("date", exp.start_date)
          .lte("date", exp.end_date)
          .order("date", { ascending: false })
          .limit(50); // Add limit to prevent loading too many logs

        // Fetch logs for dependent variable within experiment date range
        const dependentVariable = exp.dependent_variable || exp.effect;
        let dependentLogs: LogEntry[] = [];
        if (dependentVariable) {
          const { data } = await supabase
            .from("logs")
            .select("*")
            .eq("user_id", user.id)
            .eq("variable", dependentVariable)
            .gte("date", exp.start_date)
            .lte("date", exp.end_date)
            .order("date", { ascending: false })
            .limit(50); // Add limit to prevent loading too many logs
          dependentLogs = data || [];
        }

        logsById[exp.id] = {
          independent: independentLogs || [],
          dependent: dependentLogs,
        };
      }
      setLogsByExp(logsById);
      setLoading(false);
    };
    fetchLogs();
  }, [user, experiments]);

  const handleRemove = async (id: number) => {
    setLoading(true);
    const { error } = await supabase.from("experiments").delete().eq("id", id);
    if (!error) {
      setExperiments((prev) => prev.filter((exp) => exp.id !== id));
      setSuccessMessage("Experiment removed successfully!");
      setShowSuccess(true);
    } else {
      setErrorMessage("Failed to remove experiment. Please try again.");
    }
    setLoading(false);
  };

  const handleToggleLogs = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDuplicate = async (experiment: any) => {
    if (!user) return;

    setLoading(true);
    try {
      // Calculate the duration of the original experiment
      const originalStartDate = new Date(experiment.start_date);
      const originalEndDate = new Date(experiment.end_date);
      const durationInDays =
        Math.ceil(
          (originalEndDate.getTime() - originalStartDate.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;

      // Set new start date to today
      const newStartDate = new Date();
      const newEndDate = new Date(
        newStartDate.getTime() + (durationInDays - 1) * 24 * 60 * 60 * 1000
      );

      // Create the duplicate experiment data
      const duplicateExperiment = {
        user_id: user.id,
        variable: experiment.variable,
        start_date: newStartDate.toISOString().split("T")[0],
        end_date: newEndDate.toISOString().split("T")[0],
        frequency: experiment.frequency,
        effect: experiment.effect,
        dependent_variable: experiment.dependent_variable,
        time_intervals: experiment.time_intervals,
        missing_data_strategy: experiment.missing_data_strategy,
        description: experiment.description,
        sort_order: 0, // Add to beginning of active experiments
      };

      // Insert the duplicate experiment
      const { data, error } = await supabase
        .from("experiments")
        .insert([duplicateExperiment])
        .select()
        .single();

      if (error) {
        setErrorMessage("Failed to duplicate experiment. Please try again.");
      } else {
        setSuccessMessage(
          "Experiment duplicated successfully! New experiment starts today and can be found in Active Experiments."
        );
        setShowSuccess(true);
      }
    } catch (error) {
      console.error("Error duplicating experiment:", error);
      setErrorMessage("Failed to duplicate experiment. Please try again.");
    }
    setLoading(false);
  };

  const renderLogsTable = (logs: LogEntry[], title: string) => {
    if (logs.length === 0) {
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No logs found for this variable during the experiment period.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {title} ({logs.length} log{logs.length !== 1 ? "s" : ""})
        </Typography>
        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.slice(0, 10).map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {new Date(log.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{log.value}</TableCell>
                  <TableCell>{log.notes || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {logs.length > 10 && (
          <Typography variant="caption" color="text.secondary">
            Showing 10 most recent logs ({logs.length} total)
          </Typography>
        )}
      </Box>
    );
  };

  // Calculate experiment completion stats
  const getExperimentStats = (experiment: any) => {
    const startDate = new Date(experiment.start_date);
    const endDate = new Date(experiment.end_date);
    const totalDays =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
    const expectedLogs = totalDays * (experiment.frequency || 1);

    const independentLogs = logsByExp[experiment.id]?.independent || [];
    const dependentLogs = logsByExp[experiment.id]?.dependent || [];

    const independentLogCount = independentLogs.length;
    const dependentLogCount = dependentLogs.length;

    const independentCompletionRate = Math.round(
      (independentLogCount / expectedLogs) * 100
    );
    const dependentCompletionRate = experiment.dependent_variable
      ? Math.round((dependentLogCount / expectedLogs) * 100)
      : 100;

    return {
      totalDays,
      expectedLogs,
      independentLogCount,
      dependentLogCount,
      independentCompletionRate,
      dependentCompletionRate,
      overallCompletionRate: Math.round(
        ((independentLogCount + dependentLogCount) /
          (expectedLogs * (experiment.dependent_variable ? 2 : 1))) *
          100
      ),
    };
  };

  if (userLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Please log in to view your completed experiments.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            📈 Completed Experiments
          </Typography>
          <Typography variant="h6" color="textSecondary">
            Review your finished experiments and their results
          </Typography>
        </Box>
        <Button
          component={Link}
          href="/experiment/active-experiments"
          variant="outlined"
          color="primary"
        >
          View Active Experiments
        </Button>
      </Box>

      {/* Success/Error Messages */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setShowSuccess(false)}>
          {successMessage}
        </Alert>
      </Snackbar>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Build New Experiment Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          component={Link}
          href="/experiment/builder"
          variant="contained"
          size="large"
          sx={{
            background: "linear-gradient(45deg, #FFD700 30%, #FFEA70 90%)",
            color: "black",
            fontWeight: "bold",
            "&:hover": {
              background: "linear-gradient(45deg, #FFD700 30%, #FFEA70 90%)",
            },
          }}
        >
          🧪 Build New Experiment
        </Button>
      </Box>

      {loading && (
        <Box sx={{ mb: 3 }}>
          <Typography>Loading completed experiments...</Typography>
        </Box>
      )}

      {!loading && experiments.length === 0 && (
        <Alert severity="info">
          No completed experiments found. Your experiments will appear here
          after their end date.
        </Alert>
      )}

      {!loading && experiments.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Completed Experiments ({experiments.length})
          </Typography>

          {experiments.map((exp, idx) => {
            const stats = getExperimentStats(exp);
            return (
              <Paper
                key={exp.id}
                elevation={2}
                sx={{
                  p: 3,
                  mb: 4,
                  border: "1px solid",
                  borderColor: "grey.300",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <HistoryIcon sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="h6" gutterBottom>
                      Does {exp.variable} cause an effect on{" "}
                      {exp.dependent_variable ||
                        exp.effect ||
                        "unknown variable"}
                      ?
                    </Typography>
                  </Box>
                  <Box>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      sx={{ mr: 1 }}
                      onClick={() => handleDuplicate(exp)}
                      disabled={loading}
                      startIcon={<ContentCopyIcon />}
                    >
                      Restart Experiment
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      sx={{ mr: 1 }}
                      onClick={() => handleRemove(exp.id)}
                    >
                      Remove
                    </Button>
                  </Box>
                </Box>

                <Typography sx={{ mb: 1 }}>
                  <strong>Date Range:</strong>{" "}
                  {new Date(exp.start_date).toLocaleDateString()} to{" "}
                  {new Date(exp.end_date).toLocaleDateString()}
                </Typography>
                <Typography sx={{ mb: 1 }}>
                  <strong>Duration:</strong> {stats.totalDays} days
                </Typography>
                <Typography sx={{ mb: 1 }}>
                  <strong>Frequency:</strong> {exp.frequency} logs/day
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  <strong>Overall Completion:</strong>{" "}
                  {stats.overallCompletionRate}% (
                  {stats.independentLogCount + stats.dependentLogCount} of{" "}
                  {stats.expectedLogs * (exp.dependent_variable ? 2 : 1)}{" "}
                  expected logs)
                </Typography>

                {/* Experiment Results Summary */}
                <Box
                  sx={{
                    mb: 3,
                    p: 2,
                    backgroundColor: "grey.50",
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, fontWeight: 600 }}
                  >
                    📊 Experiment Summary
                  </Typography>
                  <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {exp.variable}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {stats.independentLogCount} logs (
                        {stats.independentCompletionRate}%)
                      </Typography>
                    </Box>
                    {exp.dependent_variable && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {exp.dependent_variable}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {stats.dependentLogCount} logs (
                          {stats.dependentCompletionRate}%)
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Experiment Logs Section */}
                <Box sx={{ mt: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6">Experiment Data</Typography>
                    <IconButton
                      onClick={() => handleToggleLogs(exp.id)}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                    >
                      {expanded[exp.id] ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </IconButton>
                  </Box>

                  <Collapse in={expanded[exp.id] || false}>
                    {loading ? (
                      <Typography>Loading logs...</Typography>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: { xs: "column", md: "row" },
                          gap: 2,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          {renderLogsTable(
                            logsByExp[exp.id]?.independent || [],
                            `${exp.variable}`
                          )}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          {renderLogsTable(
                            logsByExp[exp.id]?.dependent || [],
                            `${
                              exp.dependent_variable ||
                              exp.effect ||
                              "Not specified"
                            }`
                          )}
                        </Box>
                      </Box>
                    )}
                  </Collapse>
                </Box>
              </Paper>
            );
          })}
        </>
      )}
    </Container>
  );
}
