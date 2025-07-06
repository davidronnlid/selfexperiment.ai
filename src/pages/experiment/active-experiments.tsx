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
import ConstrainedInput from "@/components/ConstrainedInput";

interface LogEntry {
  id: number;
  date: string;
  variable: string;
  value: string;
  notes?: string;
}

export default function ActiveExperimentsPage() {
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
  // Experiment logging states
  const [todaysLogs, setTodaysLogs] = useState<LogEntry[]>([]);
  const [experimentsNeedingLogs, setExperimentsNeedingLogs] = useState<any[]>(
    []
  );
  const [experimentValues, setExperimentValues] = useState<
    Record<string, string>
  >({});
  const [experimentNotes, setExperimentNotes] = useState<
    Record<string, string>
  >({});
  const [submitting, setSubmitting] = useState(false);

  // Check and refresh user state if needed
  useEffect(() => {
    const checkUserState = async () => {
      if (!userLoading && !user) {
        console.log(
          "ActiveExperimentsPage: User state is undefined, attempting refresh..."
        );
        try {
          await refreshUser();
        } catch (error) {
          console.error(
            "ActiveExperimentsPage: Failed to refresh user state:",
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
        .gte("end_date", today) // Only show active experiments
        .order("sort_order", { ascending: true })
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
        // Fetch logs for independent variable
        const { data: independentLogs } = await supabase
          .from("daily_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("variable", exp.variable)
          .order("date", { ascending: false });

        // Fetch logs for dependent variable
        const dependentVariable = exp.dependent_variable || exp.effect;
        let dependentLogs: LogEntry[] = [];
        if (dependentVariable) {
          const { data } = await supabase
            .from("daily_logs")
            .select("*")
            .eq("user_id", user.id)
            .eq("variable", dependentVariable)
            .order("date", { ascending: false });
          dependentLogs = data || [];
        }

        logsById[exp.id] = {
          independent: independentLogs || [],
          dependent: dependentLogs,
        };
      }
      setLogsByExp(logsById);
      setLoading(false);

      // Also refresh today's logs for experiment filtering
      await loadTodaysLogs();
    };
    fetchLogs();
  }, [user, experiments]);

  // Load today's logs and filter experiments needing logs
  useEffect(() => {
    if (user && experiments.length > 0) {
      loadTodaysLogs();
    }
  }, [user, experiments]);

  const handleRemove = async (id: number) => {
    setLoading(true);
    const { error } = await supabase.from("experiments").delete().eq("id", id);
    if (!error) {
      setExperiments((prev) => prev.filter((exp) => exp.id !== id));
      setSuccessMessage("Experiment removed successfully!");
      setShowSuccess(true);
      // Refresh today's logs filtering
      await loadTodaysLogs();
    } else {
      setErrorMessage("Failed to remove experiment. Please try again.");
    }
    setLoading(false);
  };

  const handleToggleLogs = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEditOpen = (index: number) => {
    setEditExpIndex(index);
    setEditForm({ ...experiments[index] });
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditExpIndex(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditSave = async () => {
    if (editExpIndex === null) return;
    setLoading(true);
    const exp = editForm;
    const { error } = await supabase
      .from("experiments")
      .update({
        variable: exp.variable,
        start_date: exp.start_date,
        end_date: exp.end_date,
        frequency: exp.frequency,
        time_intervals: exp.time_intervals,
        description: exp.description,
        dependent_variable: exp.dependent_variable,
        missing_data_strategy: exp.missing_data_strategy,
      })
      .eq("id", exp.id);
    if (!error) {
      setExperiments((prev) => {
        const updated = [...prev];
        updated[editExpIndex] = { ...exp };
        return updated;
      });
      setSuccessMessage("Experiment updated successfully!");
      setShowSuccess(true);
      // Refresh today's logs filtering
      await loadTodaysLogs();
    } else {
      setErrorMessage("Failed to update experiment. Please try again.");
    }
    setEditDialogOpen(false);
    setEditExpIndex(null);
    setLoading(false);
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
        sort_order: experiments.length, // Add to end
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
        // Add the new experiment to the local state
        setExperiments((prev) => [...prev, data]);
        setSuccessMessage(
          "Experiment duplicated successfully! New experiment starts today."
        );
        setShowSuccess(true);
        // Refresh today's logs filtering
        await loadTodaysLogs();
      }
    } catch (error) {
      console.error("Error duplicating experiment:", error);
      setErrorMessage("Failed to duplicate experiment. Please try again.");
    }
    setLoading(false);
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(experiments);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setExperiments(reordered);
    // Persist new order to Supabase
    await Promise.all(
      reordered.map((exp, idx) =>
        supabase
          .from("experiments")
          .update({ sort_order: idx })
          .eq("id", exp.id)
      )
    );
  };

  const renderLogsTable = (logs: LogEntry[], title: string) => {
    if (logs.length === 0) {
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No logs found for this variable.
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

  // Function to check if current time is within experiment time intervals
  const isCurrentTimeInIntervals = (timeIntervals: any): boolean => {
    if (!timeIntervals || timeIntervals.length === 0) return true;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return timeIntervals.some((interval: any) => {
      // Check if interval has valid start and end times
      if (!interval || !interval.start || !interval.end) {
        return true; // If no valid time interval, allow logging
      }

      const [startHour, startMin] = interval.start.split(":").map(Number);
      const [endHour, endMin] = interval.end.split(":").map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      if (startTime <= endTime) {
        return currentTime >= startTime && currentTime <= endTime;
      } else {
        return currentTime >= startTime || currentTime <= endTime;
      }
    });
  };

  // Filter experiments that need logs today
  const filterExperimentsNeedingLogs = (
    experiments: any[],
    todaysLogs: LogEntry[]
  ) => {
    const today = new Date().toISOString().split("T")[0];

    return experiments.filter((experiment) => {
      // Check if experiment is active today
      const startDate = new Date(experiment.start_date);
      const endDate = new Date(experiment.end_date);
      const todayDate = new Date(today);

      if (todayDate < startDate || todayDate > endDate) {
        return false;
      }

      // Count how many logs for the independent variable were made today
      const independentLogsToday = todaysLogs.filter(
        (log) =>
          log.variable === experiment.variable && log.date.startsWith(today)
      ).length;

      // Count how many logs for the dependent variable were made today
      const dependentVariable =
        experiment.effect || experiment.dependent_variable;
      const dependentLogsToday = dependentVariable
        ? todaysLogs.filter(
            (log) =>
              log.variable === dependentVariable && log.date.startsWith(today)
          ).length
        : 0;

      // Check if we haven't reached the required frequency for today for either variable
      const independentNeedsMoreLogs =
        independentLogsToday < (experiment.frequency || 1);
      const dependentNeedsMoreLogs = dependentVariable
        ? dependentLogsToday < (experiment.frequency || 1)
        : false;

      // Check if current time is within the experiment's time intervals
      const inTimeInterval = isCurrentTimeInIntervals(
        experiment.time_intervals
      );

      // Only include if we need more logs for either variable and we're in time interval
      return (
        (independentNeedsMoreLogs || dependentNeedsMoreLogs) && inTimeInterval
      );
    });
  };

  // Submit experiment log
  const submitExperimentLog = async (
    experimentVariableName: string,
    logValue: string,
    logNotes: string
  ) => {
    if (!user || !logValue.trim()) return;

    setSubmitting(true);
    try {
      const logData = {
        user_id: user.id,
        variable: experimentVariableName,
        value: logValue.trim(),
        notes: logNotes.trim() || null,
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("daily_logs").insert([logData]);

      if (error) throw error;

      // Clear the form
      setExperimentValues((prev) => ({
        ...prev,
        [experimentVariableName]: "",
      }));
      setExperimentNotes((prev) => ({
        ...prev,
        [experimentVariableName]: "",
      }));

      // Refresh today's logs and experiments
      await loadTodaysLogs();
      setSuccessMessage(`Successfully logged ${experimentVariableName}!`);
      setShowSuccess(true);
    } catch (error) {
      console.error("Error logging experiment data:", error);
      setErrorMessage("Failed to log experiment data. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Load today's logs
  const loadTodaysLogs = async () => {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    const { data: logs } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startOfDay)
      .lte("date", endOfDay);

    if (logs) {
      setTodaysLogs(logs);
      // Filter experiments needing logs
      const filtered = filterExperimentsNeedingLogs(experiments, logs);
      setExperimentsNeedingLogs(filtered);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Active Experiments
      </Typography>

      {/* Success Message */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowSuccess(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Error Message */}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Log Any Other Variables Button */}
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Button
          component={Link}
          href="/log"
          variant="contained"
          size="large"
          sx={{
            background: "linear-gradient(45deg, #667eea 30%, #764ba2 90%)",
            color: "white",
            px: 4,
            py: 1.5,
            fontSize: "1rem",
            fontWeight: "bold",
            borderRadius: 2,
            boxShadow: 3,
            textTransform: "none",
            "&:hover": {
              background: "linear-gradient(45deg, #5a6fd8 30%, #6a419b 90%)",
              transform: "translateY(-1px)",
              boxShadow: 4,
            },
          }}
        >
          📊 Log Any Other Variables
        </Button>
      </Box>

      {/* Experiment Logging Section */}
      {experiments.length > 0 && (
        <>
          {experimentsNeedingLogs.length === 0 ? (
            /* Success Message - All experiments logged for today */
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                🎉 <strong>Great job!</strong> You've completed all required
                logs for your active experiments today. You can still log
                additional variables using the button above.
              </Typography>
            </Alert>
          ) : (
            /* Experiment Logging Forms */
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h5"
                sx={{
                  mb: 3,
                  display: "flex",
                  alignItems: "center",
                  fontSize: { xs: "1.2rem", sm: "1.5rem" },
                }}
              >
                🧪 Log Your Experiment Data
              </Typography>

              {experimentsNeedingLogs.map((experiment, index) => (
                <Paper
                  key={`${experiment.id}-${index}`}
                  elevation={2}
                  sx={{
                    p: 2,
                    mb: 2,
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderRadius: 1,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        mb: 1,
                        fontWeight: "bold",
                        fontSize: { xs: "0.9rem", sm: "1rem" },
                      }}
                    >
                      📝 Log your experiment variables for today
                    </Typography>

                    {/* Show variable constraint information */}
                    {(() => {
                      let experimentVariable = LOG_LABELS.find(
                        (label) => label.label === experiment.variable
                      );

                      if (!experimentVariable) {
                        const cleanVariableName = experiment.variable.replace(
                          /\s*\([^)]*\)\s*$/,
                          ""
                        );
                        experimentVariable = LOG_LABELS.find(
                          (label) => label.label === cleanVariableName
                        );
                      }

                      if (experimentVariable?.constraints) {
                        const { constraints } = experimentVariable;
                        let constraintText = "";

                        if (
                          constraints.min !== undefined &&
                          constraints.max !== undefined
                        ) {
                          constraintText = `${constraints.min}${
                            constraints.unit ? ` ${constraints.unit}` : ""
                          } - ${constraints.max}${
                            constraints.unit ? ` ${constraints.unit}` : ""
                          }`;
                        } else if (
                          constraints.scaleMin !== undefined &&
                          constraints.scaleMax !== undefined
                        ) {
                          constraintText = `${constraints.scaleMin} - ${constraints.scaleMax}`;
                        }

                        if (constraintText) {
                          return (
                            <Typography
                              variant="caption"
                              sx={{
                                mb: 1,
                                opacity: 0.8,
                                fontStyle: "italic",
                                display: "block",
                                fontSize: { xs: "0.7rem", sm: "0.75rem" },
                              }}
                            >
                              Range: {constraintText}
                            </Typography>
                          );
                        }
                      }
                      return null;
                    })()}

                    {/* Independent Variable Input */}
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        gap: 1.5,
                        alignItems: { xs: "stretch", sm: "flex-start" },
                        mb: 2,
                      }}
                    >
                      <ConstrainedInput
                        label={experiment.variable}
                        value={experimentValues[experiment.variable] || ""}
                        onChange={(newValue) =>
                          setExperimentValues((prev) => ({
                            ...prev,
                            [experiment.variable]: newValue,
                          }))
                        }
                        placeholder={`Enter ${experiment.variable} value...`}
                        variant="outlined"
                        size="small"
                        fullWidth
                        sx={{
                          flex: 1,
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: "#ffffff",
                            color: "#333",
                            "& fieldset": {
                              borderColor: "rgba(255,255,255,0.5)",
                            },
                            "&:hover fieldset": {
                              borderColor: "rgba(255,255,255,0.7)",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#ffd700",
                              borderWidth: "2px",
                            },
                          },
                        }}
                      />

                      <TextField
                        size="small"
                        multiline
                        rows={1}
                        fullWidth
                        value={experimentNotes[experiment.variable] || ""}
                        onChange={(e) =>
                          setExperimentNotes((prev) => ({
                            ...prev,
                            [experiment.variable]: e.target.value,
                          }))
                        }
                        placeholder="Notes (optional)"
                        variant="outlined"
                        sx={{
                          flex: 1,
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: "#ffffff",
                            color: "#333",
                            "& fieldset": {
                              borderColor: "rgba(255,255,255,0.5)",
                            },
                            "&:hover fieldset": {
                              borderColor: "rgba(255,255,255,0.7)",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#ffd700",
                              borderWidth: "2px",
                            },
                          },
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <FaStickyNote color="#666" size="14" />
                            </InputAdornment>
                          ),
                        }}
                      />

                      <Button
                        variant="contained"
                        onClick={() =>
                          submitExperimentLog(
                            experiment.variable,
                            experimentValues[experiment.variable] || "",
                            experimentNotes[experiment.variable] || ""
                          )
                        }
                        disabled={
                          submitting ||
                          !experimentValues[experiment.variable]?.trim()
                        }
                        sx={{
                          background:
                            "linear-gradient(45deg, #FFD700 30%, #FFEA70 90%)",
                          color: "black",
                          fontWeight: "bold",
                          "&:hover": {
                            background:
                              "linear-gradient(45deg, #FFD700 30%, #FFEA70 90%)",
                          },
                        }}
                      >
                        {submitting ? "Logging..." : "Log"}
                      </Button>
                    </Box>

                    {/* Dependent Variable Input if exists */}
                    {(experiment.dependent_variable || experiment.effect) && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          gap: 1.5,
                          alignItems: { xs: "stretch", sm: "flex-start" },
                        }}
                      >
                        <ConstrainedInput
                          label={
                            experiment.dependent_variable || experiment.effect
                          }
                          value={
                            experimentValues[
                              experiment.dependent_variable || experiment.effect
                            ] || ""
                          }
                          onChange={(newValue) =>
                            setExperimentValues((prev) => ({
                              ...prev,
                              [experiment.dependent_variable ||
                              experiment.effect]: newValue,
                            }))
                          }
                          placeholder={`Enter ${
                            experiment.dependent_variable || experiment.effect
                          } value...`}
                          variant="outlined"
                          size="small"
                          fullWidth
                          sx={{
                            flex: 1,
                            "& .MuiOutlinedInput-root": {
                              backgroundColor: "#ffffff",
                              color: "#333",
                              "& fieldset": {
                                borderColor: "rgba(255,255,255,0.5)",
                              },
                              "&:hover fieldset": {
                                borderColor: "rgba(255,255,255,0.7)",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#ffd700",
                                borderWidth: "2px",
                              },
                            },
                          }}
                        />

                        <TextField
                          size="small"
                          multiline
                          rows={1}
                          fullWidth
                          value={
                            experimentNotes[
                              experiment.dependent_variable || experiment.effect
                            ] || ""
                          }
                          onChange={(e) =>
                            setExperimentNotes((prev) => ({
                              ...prev,
                              [experiment.dependent_variable ||
                              experiment.effect]: e.target.value,
                            }))
                          }
                          placeholder="Notes (optional)"
                          variant="outlined"
                          sx={{
                            flex: 1,
                            "& .MuiOutlinedInput-root": {
                              backgroundColor: "#ffffff",
                              color: "#333",
                              "& fieldset": {
                                borderColor: "rgba(255,255,255,0.5)",
                              },
                              "&:hover fieldset": {
                                borderColor: "rgba(255,255,255,0.7)",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#ffd700",
                                borderWidth: "2px",
                              },
                            },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <FaStickyNote color="#666" size="14" />
                              </InputAdornment>
                            ),
                          }}
                        />

                        <Button
                          variant="contained"
                          onClick={() =>
                            submitExperimentLog(
                              experiment.dependent_variable ||
                                experiment.effect,
                              experimentValues[
                                experiment.dependent_variable ||
                                  experiment.effect
                              ] || "",
                              experimentNotes[
                                experiment.dependent_variable ||
                                  experiment.effect
                              ] || ""
                            )
                          }
                          disabled={
                            submitting ||
                            !experimentValues[
                              experiment.dependent_variable || experiment.effect
                            ]?.trim()
                          }
                          sx={{
                            background:
                              "linear-gradient(45deg, #FFD700 30%, #FFEA70 90%)",
                            color: "black",
                            fontWeight: "bold",
                            "&:hover": {
                              background:
                                "linear-gradient(45deg, #FFD700 30%, #FFEA70 90%)",
                            },
                          }}
                        >
                          {submitting ? "Logging..." : "Log"}
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </>
      )}

      {experiments.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          You have no active experiments. <br />
          <Button
            component={Link}
            href="/experiment/builder"
            variant="contained"
            sx={{ mt: 2 }}
          >
            Start a New Experiment
          </Button>
        </Alert>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="experiments-droppable" isDropDisabled={false}>
            {(provided: DroppableProvided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {experiments.map((exp, idx) => (
                  <Draggable
                    key={exp.id}
                    draggableId={String(exp.id)}
                    index={idx}
                  >
                    {(
                      provided: DraggableProvided,
                      snapshot: DraggableStateSnapshot
                    ) => (
                      <Paper
                        sx={{
                          p: 3,
                          mb: 4,
                          opacity: snapshot.isDragging ? 0.7 : 1,
                        }}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <DragIndicatorIcon sx={{ mr: 1 }} />
                            <Typography variant="h6" gutterBottom>
                              Does {exp.variable} cause an effect on{" "}
                              {exp.dependent_variable ||
                                exp.effect ||
                                "unknown variable"}
                              ?
                            </Typography>
                          </Box>
                          <Box>
                            <IconButton
                              onClick={() => handleEditOpen(idx)}
                              sx={{ mr: 1 }}
                            >
                              <EditIcon />
                            </IconButton>
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              sx={{ mr: 1 }}
                              onClick={() => handleDuplicate(exp)}
                              disabled={loading}
                              startIcon={<ContentCopyIcon />}
                            >
                              Duplicate
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
                        <Typography>
                          Date Range:{" "}
                          {new Date(exp.start_date).toLocaleDateString()} to{" "}
                          {new Date(exp.end_date).toLocaleDateString()}
                        </Typography>
                        <Typography>
                          Frequency: {exp.frequency} logs/day
                        </Typography>

                        {/* Experiment Logs Section - Outside of Toggle */}
                        <Box sx={{ mt: 3 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              mb: 2,
                            }}
                          >
                            <Typography variant="h6">
                              Experiment Logs
                            </Typography>
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
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
      <Dialog
        open={editDialogOpen}
        onClose={handleEditClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Experiment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="First Variable"
              name="variable"
              value={editForm.variable || ""}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              label="Second Variable"
              name="dependent_variable"
              value={editForm.dependent_variable || ""}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              label="Start Date"
              name="start_date"
              type="date"
              value={
                editForm.start_date ? editForm.start_date.slice(0, 10) : ""
              }
              onChange={handleEditChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="End Date"
              name="end_date"
              type="date"
              value={editForm.end_date ? editForm.end_date.slice(0, 10) : ""}
              onChange={handleEditChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Frequency"
              name="frequency"
              type="number"
              value={editForm.frequency || 1}
              onChange={handleEditChange}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
