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
} from "@mui/material";
import Link from "next/link";
import { useUser } from "../_app";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EditIcon from "@mui/icons-material/Edit";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import type {
  DraggableProvided,
  DraggableStateSnapshot,
  DroppableProvided,
  DropResult,
} from "@hello-pangea/dnd";

interface LogEntry {
  id: number;
  date: string;
  label: string;
  value: string;
  notes?: string;
}

export default function ActiveExperimentsPage() {
  const { user } = useUser();
  const [experiments, setExperiments] = useState<any[]>([]);
  const [logsByExp, setLogsByExp] = useState<Record<string, LogEntry[]>>({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editExpIndex, setEditExpIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [snackbar, setSnackbar] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchExperiments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("experiments")
        .select("*")
        .eq("user_id", user.id)
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
      const logsById: Record<string, LogEntry[]> = {};
      for (const exp of experiments) {
        const { data } = await supabase
          .from("daily_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("label", exp.variable)
          .order("date", { ascending: false });
        logsById[exp.id] = data || [];
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
      setSnackbar("Experiment removed.");
    } else {
      setSnackbar("Failed to remove experiment.");
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
      setSnackbar("Experiment updated.");
    } else {
      setSnackbar("Failed to update experiment.");
    }
    setEditDialogOpen(false);
    setEditExpIndex(null);
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

  return (
    <Container maxWidth="md" sx={{ py: 4 /* Do not set overflow here! */ }}>
      <Typography variant="h4" align="center" gutterBottom>
        Active Experiments
      </Typography>
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
                          opacity: snapshot.isDragging
                            ? 0.7
                            : 1 /* Do not set overflow here! */,
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
                              {exp.variable}
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
                              color="error"
                              sx={{ mr: 1 }}
                              onClick={() => handleRemove(exp.id)}
                            >
                              Remove
                            </Button>
                            <IconButton
                              onClick={() => handleToggleLogs(exp.id)}
                            >
                              {expanded[exp.id] ? (
                                <ExpandLessIcon />
                              ) : (
                                <ExpandMoreIcon />
                              )}
                            </IconButton>
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
                        {exp.time_intervals && (
                          <Typography>
                            Intervals:{" "}
                            {Array.isArray(exp.time_intervals)
                              ? exp.time_intervals.join(", ")
                              : exp.time_intervals}
                          </Typography>
                        )}
                        <Typography sx={{ mt: 2 }}>
                          <b>Description:</b>{" "}
                          {exp.description || "No description provided."}
                        </Typography>
                        <Collapse in={expanded[exp.id] || false}>
                          <Typography variant="subtitle1" sx={{ mt: 2 }}>
                            Logs for {exp.variable}
                          </Typography>
                          {loading ? (
                            <Typography>Loading logs...</Typography>
                          ) : logsByExp[exp.id]?.length === 0 ? (
                            <Typography>
                              No logs found for this experiment variable.
                            </Typography>
                          ) : (
                            <TableContainer component={Paper} sx={{ mb: 4 }}>
                              <Table>
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Value</TableCell>
                                    <TableCell>Notes</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {logsByExp[exp.id]?.map((log) => (
                                    <TableRow key={log.id}>
                                      <TableCell>
                                        {new Date(log.date).toLocaleString()}
                                      </TableCell>
                                      <TableCell>{log.value}</TableCell>
                                      <TableCell>{log.notes || "-"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}
                        </Collapse>
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
              label="Variable"
              name="variable"
              value={editForm.variable || ""}
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
            <TextField
              label="Intervals (comma separated)"
              name="time_intervals"
              value={
                Array.isArray(editForm.time_intervals)
                  ? editForm.time_intervals.join(", ")
                  : editForm.time_intervals || ""
              }
              onChange={(e) =>
                setEditForm((prev: any) => ({
                  ...prev,
                  time_intervals: e.target.value
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean),
                }))
              }
              fullWidth
            />
            <TextField
              label="Description"
              name="description"
              value={editForm.description || ""}
              onChange={handleEditChange}
              fullWidth
              multiline
              minRows={2}
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
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Container>
  );
}
