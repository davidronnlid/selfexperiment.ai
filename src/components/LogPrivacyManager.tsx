import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
} from "@mui/material";
import { FaEye, FaEyeSlash, FaSearch, FaFilter } from "react-icons/fa";
import { supabase } from "@/utils/supaBase";
import { useUser } from "@/pages/_app";

interface DataPointEntry {
  id: number;
  date: string;
  variable_id: string;
  label?: string;
  value: string;
  notes?: string;
  created_at: string;
  is_hidden?: boolean;
}

interface DataPointPrivacyManagerProps {
  user: any;
}

export default function DataPointPrivacyManager({
  user,
}: DataPointPrivacyManagerProps) {
  const [logs, setLogs] = useState<DataPointEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVariable, setSelectedVariable] = useState<string>("all");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadLogsWithPrivacySettings();
    }
  }, [user]);

  const loadLogsWithPrivacySettings = async () => {
    try {
      setLoading(true);

      // Load logs with privacy settings
      const { data: logsData, error: logsError } = await supabase
        .from("data_points")
        .select("id, date, variable_id, label, value, notes, created_at")
        .eq("user_id", user?.id)
        .order("date", { ascending: false })
        .limit(50); // Assuming maxLogs is 50 for now, as it's not passed as a prop

      if (logsError) throw logsError;

      // Load privacy settings for these logs
      const logIds = logsData?.map((log) => log.id) || [];
      const { data: privacyData, error: privacyError } = await supabase
        .from("app_data_point_privacy_settings")
        .select("*")
        .eq("user_id", user?.id)
        .in("data_point_id", logIds)
        .eq("data_point_type", "daily_data_point");

      if (privacyError) throw privacyError;

      // Merge logs with privacy settings
      const logsWithPrivacy =
        logsData?.map((log) => ({
          ...log,
          is_hidden:
            privacyData?.find((p) => p.data_point_id === log.id)?.is_hidden ||
            false,
        })) || [];

      setLogs(logsWithPrivacy);
    } catch (error) {
      console.error("Error loading logs with privacy settings:", error);
      setMessage({ type: "error", text: "Failed to load logs" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyChange = async (logId: number, isHidden: boolean) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from("app_data_point_privacy_settings")
        .upsert({
          user_id: user?.id,
          data_point_id: logId,
          data_point_type: "daily_data_point",
          is_hidden: isHidden,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update local state
      setLogs((prev) =>
        prev.map((log) =>
          log.id === logId ? { ...log, is_hidden: isHidden } : log
        )
      );

      setMessage({
        type: "success",
        text: `Log ${isHidden ? "hidden" : "shown"} successfully`,
      });
    } catch (error) {
      console.error("Error updating log privacy:", error);
      setMessage({ type: "error", text: "Failed to update log privacy" });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkPrivacyChange = async (isHidden: boolean) => {
    try {
      setSaving(true);

      const filteredLogs = getFilteredLogs();
      const logIds = filteredLogs.map((log) => log.id);

      // Bulk update privacy settings
      const updates = logIds.map((logId) => ({
        user_id: user?.id,
        data_point_id: logId,
        data_point_type: "daily_data_point",
        is_hidden: isHidden,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("app_data_point_privacy_settings")
        .upsert(updates);

      if (error) throw error;

      // Update local state
      setLogs((prev) =>
        prev.map((log) =>
          logIds.includes(log.id) ? { ...log, is_hidden: isHidden } : log
        )
      );

      setMessage({
        type: "success",
        text: `${logIds.length} logs ${
          isHidden ? "hidden" : "shown"
        } successfully`,
      });
    } catch (error) {
      console.error("Error updating bulk privacy:", error);
      setMessage({ type: "error", text: "Failed to update log privacy" });
    } finally {
      setSaving(false);
    }
  };

  const getFilteredLogs = () => {
    return logs.filter((log) => {
      const matchesSearch =
        searchTerm === "" ||
        log.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.value.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesVariable =
        selectedVariable === "all" || log.label === selectedVariable;

      return matchesSearch && matchesVariable;
    });
  };

  const getUniqueVariables = () => {
    const variables = [...new Set(logs.map((log) => log.label))];
    return variables.sort();
  };

  const filteredLogs = getFilteredLogs();
  const hiddenCount = filteredLogs.filter((log) => log.is_hidden).length;
  const visibleCount = filteredLogs.filter((log) => !log.is_hidden).length;

  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Loading log privacy settings...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        📝 Individual Log Privacy
      </Typography>

      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Control which specific logged values are visible to other users. Hidden
        logs will not appear in shared data, even if the variable type is
        shared.
      </Typography>

      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* Filters */}
      {/* showFilters is removed as it's not a prop */}
      {/* <Box
          sx={{
            mb: 3,
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        > */}
      <TextField
        size="small"
        placeholder="Search logs..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <FaSearch />
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 200 }}
      />

      <TextField
        select
        size="small"
        value={selectedVariable}
        onChange={(e) => setSelectedVariable(e.target.value)}
        label="Variable"
        sx={{ minWidth: 150 }}
      >
        <option value="all">All Variables</option>
        {getUniqueVariables().map((variable) => (
          <option key={variable} value={variable}>
            {variable}
          </option>
        ))}
      </TextField>

      <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => handleBulkPrivacyChange(true)}
          disabled={saving || visibleCount === 0}
        >
          Hide All Visible ({visibleCount})
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => handleBulkPrivacyChange(false)}
          disabled={saving || hiddenCount === 0}
        >
          Show All Hidden ({hiddenCount})
        </Button>
      </Box>
      {/* </Box> */}

      {/* Summary */}
      <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Chip
          label={`${filteredLogs.length} total logs`}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={`${visibleCount} visible`}
          color="success"
          icon={<FaEye />}
        />
        <Chip
          label={`${hiddenCount} hidden`}
          color="error"
          icon={<FaEyeSlash />}
        />
      </Box>

      {/* Logs Table */}
      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Privacy</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Variable</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow
                key={log.id}
                sx={{
                  backgroundColor: log.is_hidden ? "grey.50" : "inherit",
                  opacity: log.is_hidden ? 0.7 : 1,
                }}
              >
                <TableCell>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={log.is_hidden}
                        onChange={(e) =>
                          handlePrivacyChange(log.id, e.target.checked)
                        }
                        disabled={saving}
                        icon={<FaEye />}
                        checkedIcon={<FaEyeSlash />}
                      />
                    }
                    label={
                      <Tooltip
                        title={
                          log.is_hidden
                            ? "Hidden from others"
                            : "Visible to others"
                        }
                      >
                        <Typography variant="caption" color="textSecondary">
                          {log.is_hidden ? "Hidden" : "Visible"}
                        </Typography>
                      </Tooltip>
                    }
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(log.date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {new Date(log.date).toLocaleTimeString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {log.label}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{log.value}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {log.notes || "-"}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredLogs.length === 0 && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body2" color="textSecondary">
            No logs found matching your filters.
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
        <Typography variant="body2" color="textSecondary">
          💡 <strong>Tip:</strong> Hidden logs are completely private and won't
          appear in any shared data, even if you've enabled sharing for that
          variable type. This gives you fine-grained control over your privacy.
        </Typography>
      </Box>
    </Paper>
  );
}
