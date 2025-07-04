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
} from "@mui/material";
import Link from "next/link";
import { useUser } from "./_app";

interface LogEntry {
  id: number;
  date: string;
  label: string;
  value: string;
  notes?: string;
}

export default function ActiveExperimentsPage() {
  const { user } = useUser();
  const [activeExperiment, setActiveExperiment] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const exp = localStorage.getItem("activeExperiment");
    if (exp) {
      setActiveExperiment(JSON.parse(exp));
    }
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user || !activeExperiment) return;
      setLoading(true);
      const { data } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("label", activeExperiment.variable)
        .order("date", { ascending: false });
      setLogs(data || []);
      setLoading(false);
    };
    if (activeExperiment) fetchLogs();
  }, [user, activeExperiment]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Active Experiment
      </Typography>
      {!activeExperiment ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          You have no active experiment. <br />
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
        <>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              {activeExperiment.variable}
            </Typography>
            <Typography>
              Date Range:{" "}
              {new Date(activeExperiment.start_date).toLocaleDateString()} to{" "}
              {new Date(activeExperiment.end_date).toLocaleDateString()}
            </Typography>
            <Typography>
              Frequency: {activeExperiment.frequency} logs/day
            </Typography>
            {activeExperiment.time_intervals && (
              <Typography>
                Intervals: {activeExperiment.time_intervals.join(", ")}
              </Typography>
            )}
            <Typography sx={{ mt: 2 }}>
              <b>Description:</b>{" "}
              {activeExperiment.description || "No description provided."}
            </Typography>
          </Paper>
          <Typography variant="h6" gutterBottom>
            Logs for {activeExperiment.variable}
          </Typography>
          {loading ? (
            <Typography>Loading logs...</Typography>
          ) : logs.length === 0 ? (
            <Typography>No logs found for this experiment variable.</Typography>
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
                  {logs.map((log) => (
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
        </>
      )}
    </Container>
  );
}
