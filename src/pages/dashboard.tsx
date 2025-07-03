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
      await fetch("/api/oura/fetch");

      const [readinessRes, sleepRes, hrRawRes] = await Promise.all([
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
          .limit(100),

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
          .limit(100),

        supabase
          .from("measurements")
          .select("date, metric, raw")
          .eq("source", "oura")
          .eq("metric", "hr_raw_data")
          .order("date", { ascending: false })
          .limit(10),
      ]);

      const readinessByDate: Record<string, Record<string, unknown>> = {};
      readinessRes.data?.forEach((entry) => {
        const day = entry.date;
        if (!readinessByDate[day]) readinessByDate[day] = { date: day };
        readinessByDate[day][entry.metric] = entry.value;
        if (entry.metric === "temperature_trend_deviation") {
          readinessByDate[day].trend = entry.value;
        }
      });

      const sleepByDate: Record<string, Record<string, unknown>> = {};
      sleepRes.data?.forEach((entry) => {
        const day = entry.date;
        if (!sleepByDate[day]) sleepByDate[day] = { day: day };
        sleepByDate[day][entry.metric] = entry.value;
      });

      const raw = hrRawRes.data?.flatMap((entry) => entry.raw ?? []) ?? [];

      // De-duplicate
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
      setLoading(false);
    };

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("daily_logs")
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
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  // Get interval string for first and last HR log
  let interval = "-";
  if (hrRawData.length > 0) {
    const sortedHR = [...hrRawData].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const first = new Date(sortedHR[0].timestamp);
    const last = new Date(sortedHR[sortedHR.length - 1].timestamp);
    interval = `${formatTime(first)} — ${formatTime(last)}`;
  }

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
    const { error } = await supabase
      .from("daily_logs")
      .update({
        label: editLabel.value,
        date: editDate.toISOString(),
        value: editValue,
        notes: editNotes,
      })
      .eq("id", logId);
    if (!error) {
      setEditingLogId(null);
      setEditLabel({ label: "", value: "" });
      setEditDate(new Date());
      setEditValue("");
      setEditNotes("");
      // Refresh logs
      const { data, error: fetchError } = await supabase
        .from("daily_logs")
        .select("id, date, label, value, notes")
        .order("date", { ascending: false })
        .limit(20);
      if (!fetchError && data) setLogs(data);
    }
  };

  const deleteLog = async (logId: number) => {
    if (!confirm("Are you sure you want to delete this log?")) return;
    const { error } = await supabase
      .from("daily_logs")
      .delete()
      .eq("id", logId);
    if (!error) {
      // Refresh logs
      const { data, error: fetchError } = await supabase
        .from("daily_logs")
        .select("id, date, label, value, notes")
        .order("date", { ascending: false })
        .limit(20);
      if (!fetchError && data) setLogs(data);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <Container maxWidth="md">
        <Paper elevation={4} className="p-10 rounded-2xl shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <Typography
              variant="h3"
              className="flex items-center gap-3 font-extrabold tracking-tight"
            >
              <span role="img" aria-label="chart">
                📊
              </span>{" "}
              My Analytics
            </Typography>
            <Button
              href="/api/oura/auth"
              variant="contained"
              startIcon={<FaCloud />}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-md rounded-lg px-6 py-2 text-lg"
              size="large"
            >
              Connect Oura
            </Button>
          </div>
          <div className="flex items-center justify-center space-x-4 mb-8">
            <Button
              onClick={() => changeDate(-1)}
              variant="outlined"
              className="min-w-0 px-4 py-2 rounded-lg text-lg font-bold"
            >
              ←
            </Button>
            <Typography variant="h5" className="font-semibold px-4">
              {new Date(currentDate).toLocaleDateString()}
            </Typography>
            <Button
              onClick={() => changeDate(1)}
              variant="outlined"
              className="min-w-0 px-4 py-2 rounded-lg text-lg font-bold"
            >
              →
            </Button>
          </div>
          {loading ? (
            <Alert severity="info">Loading data...</Alert>
          ) : (
            <>
              <section>
                <Typography variant="h5" className="mb-4 font-bold">
                  Daily Logs
                </Typography>
                <TableContainer
                  component={Paper}
                  className="shadow-sm rounded-xl"
                >
                  <Table size="medium" className="rounded-xl overflow-hidden">
                    <TableHead className="bg-gray-100">
                      <TableRow>
                        <TableCell className="font-bold text-lg">
                          Date
                        </TableCell>
                        <TableCell className="font-bold text-lg">
                          Variable
                        </TableCell>
                        <TableCell className="font-bold text-lg">
                          Value
                        </TableCell>
                        <TableCell className="font-bold text-lg">
                          Notes
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logsForCurrentDate.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            align="center"
                            className="text-gray-400"
                          >
                            No logs yet for this date.
                          </TableCell>
                        </TableRow>
                      ) : (
                        logsForCurrentDate.map((log, idx) => (
                          <TableRow
                            key={log.id}
                            className={
                              editingLogId === log.id
                                ? "bg-purple-50"
                                : idx % 2 === 0
                                ? "bg-white"
                                : "bg-gray-50"
                            }
                            hover
                            style={{
                              borderLeft:
                                editingLogId === log.id
                                  ? "4px solid #a78bfa"
                                  : undefined,
                            }}
                          >
                            {editingLogId === log.id ? (
                              <>
                                <TableCell className="p-2 align-top">
                                  <DatePicker
                                    selected={editDate}
                                    onChange={(d: Date | null) =>
                                      d && setEditDate(d)
                                    }
                                    showTimeSelect
                                    timeFormat="HH:mm"
                                    timeIntervals={5}
                                    timeCaption="Time"
                                    dateFormat="yyyy-MM-dd HH:mm"
                                    className="w-full border px-2 py-1 rounded"
                                  />
                                </TableCell>
                                <TableCell className="p-2 align-top">
                                  <CreatableSelect
                                    isClearable
                                    components={animatedComponents}
                                    options={labelOptions}
                                    value={editLabel}
                                    onChange={(newValue) => {
                                      if (
                                        newValue &&
                                        !Array.isArray(newValue)
                                      ) {
                                        setEditLabel(
                                          newValue as {
                                            label: string;
                                            value: string;
                                          }
                                        );
                                      } else {
                                        setEditLabel({ label: "", value: "" });
                                      }
                                    }}
                                    onCreateOption={(inputValue) => {
                                      if (inputValue.length <= 25) {
                                        const newOption = {
                                          label: inputValue,
                                          value: inputValue,
                                        };
                                        labelOptions.push(newOption);
                                        setEditLabel(newOption);
                                      }
                                    }}
                                    className="w-full"
                                  />
                                </TableCell>
                                <TableCell className="p-2 align-top">
                                  <input
                                    className="w-full border px-2 py-1 rounded"
                                    value={editValue}
                                    onChange={(e) =>
                                      setEditValue(e.target.value)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="p-2 align-top flex gap-2 items-center">
                                  <textarea
                                    className="w-full border px-2 py-1 rounded"
                                    rows={2}
                                    value={editNotes}
                                    onChange={(e) =>
                                      setEditNotes(e.target.value)
                                    }
                                  />
                                  <Tooltip title="Save">
                                    <IconButton
                                      color="success"
                                      size="small"
                                      onClick={() => updateLog(log.id)}
                                    >
                                      <FaEdit />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Cancel">
                                    <IconButton
                                      color="default"
                                      size="small"
                                      onClick={cancelEdit}
                                    >
                                      ✕
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="p-3 align-top">
                                  {new Date(log.date).toLocaleString()}
                                </TableCell>
                                <TableCell className="p-3 align-top">
                                  <Chip
                                    label={log.label}
                                    className="bg-purple-100 text-purple-700 font-semibold"
                                  />
                                </TableCell>
                                <TableCell className="p-3 align-top">
                                  {log.value}
                                </TableCell>
                                <TableCell className="p-3 align-top flex items-center gap-2">
                                  <span>{log.notes || "-"}</span>
                                  <Tooltip title="Edit">
                                    <IconButton
                                      color="primary"
                                      size="small"
                                      onClick={() => startEdit(log)}
                                    >
                                      <FaEdit />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton
                                      color="error"
                                      size="small"
                                      onClick={() => deleteLog(log.id)}
                                    >
                                      <FaTrash />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </section>

              <section>
                <Typography
                  variant="h6"
                  className="text-2xl font-medium mt-16 mb-4"
                >
                  Heart Rate Data
                </Typography>
                <Typography variant="h6" className="text-lg font-semibold mb-2">
                  RHR Summary
                </Typography>
                <Table className="min-w-full border border-gray-300 mb-6">
                  <TableBody>
                    <TableRow>
                      <TableCell className="p-2 text-left">
                        Lowest RHR (bpm)
                      </TableCell>
                      <TableCell className="p-2 text-left">
                        Average RHR (bpm)
                      </TableCell>
                      <TableCell className="p-2 text-left">
                        Time Asleep
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="p-2">
                        {hrRawData.length > 0
                          ? Math.min(...hrRawData.map((hr) => hr.bpm))
                          : "-"}
                      </TableCell>
                      <TableCell className="p-2">
                        {hrRawData.length > 0
                          ? (
                              hrRawData.reduce((sum, hr) => sum + hr.bpm, 0) /
                              hrRawData.length
                            ).toFixed(1)
                          : "-"}
                      </TableCell>
                      <TableCell className="p-2">
                        {hrRawData.length > 0 ? (
                          <>
                            {interval}
                            {(() => {
                              const sortedHR = [...hrRawData].sort(
                                (a, b) =>
                                  new Date(a.timestamp).getTime() -
                                  new Date(b.timestamp).getTime()
                              );
                              const first = new Date(sortedHR[0].timestamp);
                              const last = new Date(
                                sortedHR[sortedHR.length - 1].timestamp
                              );
                              const diffMs = last.getTime() - first.getTime();
                              const hours = Math.floor(
                                diffMs / (1000 * 60 * 60)
                              );
                              const minutes = Math.floor(
                                (diffMs % (1000 * 60 * 60)) / (1000 * 60)
                              );
                              return ` (${hours}h ${minutes}m)`;
                            })()}
                          </>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Typography variant="h6" className="text-lg font-semibold mb-2">
                  Raw Heart Rate Data
                </Typography>
                <Button
                  onClick={() => setShowRawHR(!showRawHR)}
                  className="mb-2 text-sm text-purple-600 hover:text-purple-800 underline"
                >
                  {showRawHR ? "▼ Hide" : "▶ Show"} raw heart rate data
                </Button>
                {showRawHR && (
                  <Table className="min-w-full border border-gray-300">
                    <TableBody>
                      <TableRow>
                        <TableCell className="p-2 text-left">
                          Timestamp
                        </TableCell>
                        <TableCell className="p-2 text-left">BPM</TableCell>
                      </TableRow>
                      {hrRawData.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="p-4 text-center text-gray-500"
                          >
                            No HR data for this date
                          </TableCell>
                        </TableRow>
                      ) : (
                        hrRawData
                          .sort(
                            (a, b) =>
                              new Date(a.timestamp).getTime() -
                              new Date(b.timestamp).getTime()
                          )
                          .map((hr: HRRawData, i: number) => (
                            <TableRow key={i} className="border-t">
                              <TableCell className="p-2">
                                {new Date(hr.timestamp).toLocaleString()}
                              </TableCell>
                              <TableCell className="p-2">{hr.bpm}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </section>
            </>
          )}
        </Paper>
      </Container>
    </div>
  );
}
