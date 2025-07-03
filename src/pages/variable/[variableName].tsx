import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supaBase";
import { FaTrash } from "react-icons/fa";

interface LogEntry {
  id: number;
  date: string;
  label: string;
  value: string;
  notes?: string;
}

export default function VariableLogsPage() {
  const router = useRouter();
  const { variableName } = router.query;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    if (!variableName) return;
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("daily_logs")
        .select("id, date, label, value, notes")
        .eq("label", variableName)
        .order("date", { ascending: false });
      if (!error && data) setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, [variableName]);

  const startEdit = (log: LogEntry) => {
    setEditingLogId(log.id);
    setEditValue(log.value);
    setEditNotes(log.notes || "");
  };

  const cancelEdit = () => {
    setEditingLogId(null);
    setEditValue("");
    setEditNotes("");
  };

  const updateLog = async (logId: number) => {
    const { error } = await supabase
      .from("daily_logs")
      .update({ value: editValue, notes: editNotes })
      .eq("id", logId);
    if (!error) {
      setEditingLogId(null);
      setEditValue("");
      setEditNotes("");
      // Refresh logs
      const { data, error: fetchError } = await supabase
        .from("daily_logs")
        .select("id, date, label, value, notes")
        .eq("label", variableName)
        .order("date", { ascending: false });
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
        .eq("label", variableName)
        .order("date", { ascending: false });
      if (!fetchError && data) setLogs(data);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Logs for: <span className="text-purple-700">{variableName}</span>
      </h1>
      {loading ? (
        <p>Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500">No logs found for this variable.</p>
      ) : (
        <table className="min-w-full border border-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left font-semibold text-gray-700">
                Date
              </th>
              <th className="p-3 text-left font-semibold text-gray-700">
                Value
              </th>
              <th className="p-3 text-left font-semibold text-gray-700">
                Notes
              </th>
              <th className="p-3 text-left font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-t border-gray-100 hover:bg-purple-50 transition-colors duration-150"
              >
                <td className="p-3 align-top">
                  {new Date(log.date).toLocaleString()}
                </td>
                {editingLogId === log.id ? (
                  <>
                    <td className="p-3 align-top">
                      <input
                        className="w-full border px-2 py-1 rounded"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                    </td>
                    <td className="p-3 align-top">
                      <textarea
                        className="w-full border px-2 py-1 rounded"
                        rows={2}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                      />
                    </td>
                    <td className="p-3 align-top flex gap-2">
                      <button
                        className="px-3 py-1 text-xs font-semibold rounded bg-green-500 text-white hover:bg-green-600 transition"
                        onClick={() => updateLog(log.id)}
                      >
                        Save
                      </button>
                      <button
                        className="px-3 py-1 text-xs font-semibold rounded bg-gray-300 text-gray-700 hover:bg-gray-400 transition"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3 align-top">{log.value}</td>
                    <td className="p-3 align-top">{log.notes || "-"}</td>
                    <td className="p-3 align-top flex gap-2">
                      <button
                        className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition"
                        onClick={() => startEdit(log)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-700 hover:bg-red-200 transition flex items-center"
                        title="Delete log"
                        onClick={() => deleteLog(log.id)}
                      >
                        <FaTrash size={14} />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
