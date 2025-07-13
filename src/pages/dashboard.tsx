import { useEffect, useState } from "react";
import { supabase } from "@/utils/supaBase";
import { format, parseISO, addDays } from "date-fns";
import CreatableSelect from "react-select/creatable";
import makeAnimated from "react-select/animated";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { LOG_LABELS } from "@/utils/logLabels";
import { FaTrash, FaEdit, FaCloud } from "react-icons/fa";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";

interface HRRawData {
  bpm: number;
  source?: string;
  timestamp: string;
}

interface LogEntry {
  id: number;
  date: string;
  label: string;
  value: string;
  notes?: string;
}

export default function Analytics() {
  const [allHrRaw, setAllHrRaw] = useState<HRRawData[]>([]);
  const [currentDate, setCurrentDate] = useState<string>(""); // yyyy-MM-dd
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showRawHR, setShowRawHR] = useState(false);
  const animatedComponents = makeAnimated();
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState<{ label: string; value: string }>({
    label: "",
    value: "",
  });
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editValue, setEditValue] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const labelOptions = LOG_LABELS.map((opt) => ({
    label: opt.label,
    value: opt.label,
  }));

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Parallel API and database calls instead of sequential
        const [ouraResponse, readinessRes, sleepRes, hrRawRes, logsRes] =
          await Promise.all([
            fetch("/api/oura/fetch"),
            supabase
              .from("measurements")
              .select("date, metric, value, raw")
              .eq("source", "oura")
              .in("metric", [
                "hr_lowest_true",
                "hr_average_true",
                "temperature_deviation",
                "temperature_trend_deviation",
                "readiness_score",
              ])
              .order("date", { ascending: false })
              .limit(50), // Reduced from 100 to 50
            supabase
              .from("measurements")
              .select("date, metric, value, raw")
              .eq("source", "oura")
              .in("metric", [
                "sleep_score",
                "total_sleep_duration",
                "rem_sleep_duration",
                "deep_sleep_duration",
                "efficiency",
                "sleep_latency",
              ])
              .order("date", { ascending: false })
              .limit(50), // Reduced from 100 to 50
            supabase
              .from("measurements")
              .select("date, metric, raw")
              .eq("source", "oura")
              .eq("metric", "hr_raw_data")
              .order("date", { ascending: false })
              .limit(5), // Reduced from 10 to 5
            // Fetch logs in parallel too
            supabase
              .from("logs")
              .select("id, date, label, value, notes")
              .order("date", { ascending: false })
              .limit(10), // Reduced from 20 to 10
          ]);

        // Process readiness data
        const readinessByDate: Record<string, Record<string, unknown>> = {};
        readinessRes.data?.forEach((entry) => {
          const day = entry.date;
          if (!readinessByDate[day]) readinessByDate[day] = { date: day };
          readinessByDate[day][entry.metric] = entry.value;
          if (entry.metric === "temperature_trend_deviation") {
            readinessByDate[day].trend = entry.value;
          }
        });

        // Process sleep data
        const sleepByDate: Record<string, Record<string, unknown>> = {};
        sleepRes.data?.forEach((entry) => {
          const day = entry.date;
          if (!sleepByDate[day]) sleepByDate[day] = { day: day };
          sleepByDate[day][entry.metric] = entry.value;
        });

        const raw = hrRawRes.data?.flatMap((entry) => entry.raw ?? []) ?? [];

        // De-duplicate with better performance
        const deduplicated = Object.values(
          raw.reduce((acc: Record<string, HRRawData>, curr: HRRawData) => {
            acc[curr.timestamp] = curr;
            return acc;
          }, {} as Record<string, HRRawData>)
        ) as HRRawData[];

        const sorted = deduplicated.sort(
          (a: HRRawData, b: HRRawData) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        const latestDate = sorted[0]?.timestamp?.split("T")[0] ?? "";

        setAllHrRaw(sorted);
        setCurrentDate(latestDate);

        // Set logs data
        if (!logsRes.error && logsRes.data) {
          setLogs(logsRes.data);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("logs")
        .select("id, date, label, value, notes")
        .order("date", { ascending: false })
        .limit(20);
      if (!error && data) setLogs(data);
    };

    fetchData();
    fetchLogs();
  }, []);

  // Filter HR data for selected date (from 00:00 to next day 12:00)
  const hrRawData = allHrRaw.filter((d) => {
    const ts = new Date(d.timestamp);
    const dayStart = new Date(currentDate + "T00:00:00Z");
    const nextNoon = new Date(
      new Date(dayStart).setUTCDate(dayStart.getUTCDate() + 1)
    );
    nextNoon.setUTCHours(12, 0, 0, 0);
    return ts >= dayStart && ts < nextNoon;
  });

  const changeDate = (delta: number) => {
    const newDate = format(addDays(parseISO(currentDate), delta), "yyyy-MM-dd");
    setCurrentDate(newDate);
  };

  // Helper to check if two dates are the same day (ignoring time)
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // Filter logs for the selected date
  const logsForCurrentDate = logs.filter((log) =>
    isSameDay(new Date(log.date), new Date(currentDate))
  );

  // Helper to format time as HH:mm
  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const startEdit = (log: LogEntry) => {
    setEditingLogId(log.id);
    setEditLabel({ label: log.label, value: log.label });
    setEditDate(new Date(log.date));
    setEditValue(log.value);
    setEditNotes(log.notes || "");
  };

  const cancelEdit = () => {
    setEditingLogId(null);
    setEditLabel({ label: "", value: "" });
    setEditDate(new Date());
    setEditValue("");
    setEditNotes("");
  };

  const updateLog = async (logId: number) => {
    try {
      const { error } = await supabase
        .from("logs")
        .update({
          label: editLabel.label,
          value: editValue,
          notes: editNotes,
          date: format(editDate, "yyyy-MM-dd"),
        })
        .eq("id", logId);

      if (error) throw error;

      // Update local state
      setLogs(
        logs.map((log) =>
          log.id === logId
            ? {
                ...log,
                label: editLabel.label,
                value: editValue,
                notes: editNotes,
                date: format(editDate, "yyyy-MM-dd"),
              }
            : log
        )
      );

      cancelEdit();
    } catch (error) {
      console.error("Error updating log:", error);
    }
  };

  const deleteLog = async (logId: number) => {
    try {
      const { error } = await supabase.from("logs").delete().eq("id", logId);

      if (error) throw error;

      // Update local state
      setLogs(logs.filter((log) => log.id !== logId));
    } catch (error) {
      console.error("Error deleting log:", error);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" className="px-4">
        <Box className="flex items-center justify-center min-h-96">
          <Typography variant="h6" className="text-gold">
            Loading dashboard data...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" className="px-4">
      <Box className="space-y-6 lg:space-y-8">
        {/* Header Section */}
        <Box className="text-center mb-6 lg:mb-8">
          <Typography
            variant="h3"
            className="font-bold text-white mb-2 text-2xl lg:text-3xl"
          >
            Dashboard
          </Typography>
          <Typography
            variant="body1"
            className="text-text-secondary text-sm lg:text-base"
          >
            Track your health metrics and daily logs
          </Typography>
        </Box>

        {/* Date Navigation */}
        <Card className="mb-6">
          <CardContent className="p-4 lg:p-6">
            <Box className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <Typography
                variant="h6"
                className="text-white font-semibold text-center lg:text-left"
              >
                Date: {format(parseISO(currentDate), "EEEE, MMMM d, yyyy")}
              </Typography>
              <Box className="flex gap-2 justify-center lg:justify-end">
                <Button
                  variant="outlined"
                  onClick={() => changeDate(-1)}
                  className="min-w-0 px-4"
                  size="small"
                >
                  Previous
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => changeDate(1)}
                  className="min-w-0 px-4"
                  size="small"
                >
                  Next
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Main Content Layout */}
        <Box className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* HR Data Section */}
          <Box className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader
                title={
                  <Typography variant="h6" className="text-white font-semibold">
                    Heart Rate Data
                  </Typography>
                }
                action={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setShowRawHR(!showRawHR)}
                    className="text-xs"
                  >
                    {showRawHR ? "Hide Raw" : "Show Raw"}
                  </Button>
                }
              />
              <CardContent className="p-4 lg:p-6">
                {hrRawData.length > 0 ? (
                  <Box className="space-y-4">
                    <Typography variant="body2" className="text-text-secondary">
                      {hrRawData.length} data points for {currentDate}
                    </Typography>
                    {showRawHR && (
                      <Box className="overflow-x-auto">
                        <TableContainer
                          component={Paper}
                          className="bg-surface"
                        >
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell className="text-white font-semibold">
                                  Time
                                </TableCell>
                                <TableCell className="text-white font-semibold">
                                  BPM
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {hrRawData.slice(0, 10).map((data, index) => (
                                <TableRow key={index}>
                                  <TableCell className="text-text-secondary">
                                    {formatTime(new Date(data.timestamp))}
                                  </TableCell>
                                  <TableCell className="text-gold font-medium">
                                    {data.bpm}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" className="text-text-secondary">
                    No heart rate data available for this date.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Logs Section */}
          <Box>
            <Card className="h-full">
              <CardHeader
                title={
                  <Typography variant="h6" className="text-white font-semibold">
                    Daily Logs
                  </Typography>
                }
              />
              <CardContent className="p-4 lg:p-6">
                {logsForCurrentDate.length > 0 ? (
                  <Box className="space-y-4">
                    {logsForCurrentDate.map((log) => (
                      <Box
                        key={log.id}
                        className="p-3 lg:p-4 bg-surface-light rounded-lg border border-border"
                      >
                        {editingLogId === log.id ? (
                          <Box className="space-y-3">
                            <CreatableSelect
                              isClearable
                              isMulti={false}
                              components={animatedComponents}
                              options={labelOptions}
                              value={editLabel}
                              onChange={(newValue) =>
                                setEditLabel(
                                  newValue || { label: "", value: "" }
                                )
                              }
                              placeholder="Select or create label..."
                              className="text-sm"
                            />
                            <DatePicker
                              selected={editDate}
                              onChange={(date: Date | null) =>
                                date && setEditDate(date)
                              }
                              className="w-full p-2 bg-surface-light border border-border rounded text-white"
                              dateFormat="yyyy-MM-dd"
                            />
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Value"
                              className="w-full p-2 bg-surface-light border border-border rounded text-white"
                            />
                            <textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Notes (optional)"
                              className="w-full p-2 bg-surface-light border border-border rounded text-white resize-none"
                              rows={2}
                            />
                            <Box className="flex gap-2">
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => updateLog(log.id)}
                                className="flex-1"
                              >
                                Save
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={cancelEdit}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          <Box>
                            <Box className="flex items-center justify-between mb-2">
                              <Chip
                                label={log.label}
                                className="bg-gold text-black font-medium"
                                size="small"
                              />
                              <Box className="flex gap-1">
                                <Tooltip title="Edit">
                                  <IconButton
                                    size="small"
                                    onClick={() => startEdit(log)}
                                    className="text-gold hover:text-gold-light"
                                  >
                                    <FaEdit />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={() => deleteLog(log.id)}
                                    className="text-error hover:text-red-400"
                                  >
                                    <FaTrash />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                            <Typography
                              variant="body2"
                              className="text-gold font-medium mb-1"
                            >
                              {log.value}
                            </Typography>
                            {log.notes && (
                              <Typography
                                variant="body2"
                                className="text-text-secondary text-sm"
                              >
                                {log.notes}
                              </Typography>
                            )}
                            <Typography
                              variant="caption"
                              className="text-text-muted"
                            >
                              {format(new Date(log.date), "MMM d, yyyy")}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" className="text-text-secondary">
                    No logs for this date.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Recent Logs Section */}
        <Card>
          <CardHeader
            title={
              <Typography variant="h6" className="text-white font-semibold">
                Recent Logs
              </Typography>
            }
          />
          <CardContent className="p-4 lg:p-6">
            {logs.length > 0 ? (
              <Box className="overflow-x-auto">
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell className="text-white font-semibold">
                          Date
                        </TableCell>
                        <TableCell className="text-white font-semibold">
                          Label
                        </TableCell>
                        <TableCell className="text-white font-semibold">
                          Value
                        </TableCell>
                        <TableCell className="text-white font-semibold mobile-hidden">
                          Notes
                        </TableCell>
                        <TableCell className="text-white font-semibold">
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logs.slice(0, 10).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-text-secondary">
                            {format(new Date(log.date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.label}
                              size="small"
                              className="bg-gold text-black font-medium"
                            />
                          </TableCell>
                          <TableCell className="text-gold font-medium">
                            {log.value}
                          </TableCell>
                          <TableCell className="text-text-secondary mobile-hidden">
                            {log.notes || "-"}
                          </TableCell>
                          <TableCell>
                            <Box className="flex gap-1">
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={() => startEdit(log)}
                                  className="text-gold hover:text-gold-light"
                                >
                                  <FaEdit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  onClick={() => deleteLog(log.id)}
                                  className="text-error hover:text-red-400"
                                >
                                  <FaTrash />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              <Typography variant="body2" className="text-text-secondary">
                No logs found.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
