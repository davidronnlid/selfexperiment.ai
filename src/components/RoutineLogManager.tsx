import React, { useState, useCallback } from "react";
import { Box, Typography, Button } from "@mui/material";
import RoutineVariableLogEditor from "./RoutineVariableLogEditor";
import { supabase } from "@/utils/supaBase";
import { Variable } from "@/types/variables";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import { VariableLinkSimple } from "./VariableLink";

interface RoutineLogManagerProps {
  user: any;
  variables: Variable[];
  routines: any[];
  reloadRoutines?: () => void;
  username?: string;
}

// Props: user, variables, routines, reloadRoutines
export default function RoutineLogManager({
  user,
  variables,
  routines,
  reloadRoutines,
  username,
}: RoutineLogManagerProps) {
  // Debug: log routines prop
  console.log("RoutineLogManager routines:", routines);
  // Add index signatures for state objects
  const [routineLogs, setRoutineLogs] = useState<
    Record<string, Record<string, any[]>>
  >({});
  const [routineEditValues, setRoutineEditValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [routineSaving, setRoutineSaving] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [routineValidationErrors, setRoutineValidationErrors] = useState<
    Record<string, Record<string, string>>
  >({});
  const [logHistoryOpen, setLogHistoryOpen] = useState<Record<string, boolean>>(
    {}
  );
  const [logHistory, setLogHistory] = useState<Record<string, any[]>>({});
  const [logHistoryEdit, setLogHistoryEdit] = useState<
    Record<string, Record<string, string | null>>
  >({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  // Fetch logs for a routine (2-week range)
  const fetchRoutineLogs = useCallback(async () => {
    if (!user || !routines) return;
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 14);
    const end = new Date(today);
    end.setDate(today.getDate() + 14);
    const startISO = start.toISOString().slice(0, 10) + "T00:00:00Z";
    const endISO = end.toISOString().slice(0, 10) + "T23:59:59Z";

    // Extract all variable IDs from the new multi-time schema
    const allVariableIds = routines.flatMap((r: any) =>
      (r.times || []).flatMap((time: any) =>
        (time.variables || []).map((v: any) => v.variable_id)
      )
    );

    const { data: logsData } = await supabase
      .from("logs")
      .select("id, variable_id, value, created_at, source")
      .eq("user_id", user.id)
      .in("variable_id", allVariableIds)
      .gte("created_at", startISO)
      .lte("created_at", endISO);

    // Organize logs by routine-time-variable combination
    const logsByRoutine: Record<string, Record<string, any[]>> = {};
    routines.forEach((routine: any) => {
      logsByRoutine[routine.id] = {};
      (routine.times || []).forEach((time: any) => {
        const timeKey = `${routine.id}_${time.time_id}`;
        logsByRoutine[timeKey] = {};
        (time.variables || []).forEach((v: any) => {
          const logs = (logsData || []).filter(
            (l: any) => l.variable_id === v.variable_id
          );
          logsByRoutine[timeKey][v.variable_id] = logs;
        });
      });
    });
    setRoutineLogs(logsByRoutine);

    // Set initial edit values for today's logs
    const initialEdit: Record<string, Record<string, string>> = {};
    routines.forEach((routine: any) => {
      (routine.times || []).forEach((time: any) => {
        const timeKey = `${routine.id}_${time.time_id}`;
        initialEdit[timeKey] = {};
        (time.variables || []).forEach((v: any) => {
          const today = new Date().toISOString().slice(0, 10);
          const logs = logsByRoutine[timeKey]?.[v.variable_id] || [];
          const todayLog = logs.find(
            (l: any) => l.created_at.slice(0, 10) === today
          );
          initialEdit[timeKey][v.variable_id] = todayLog?.value || "";
        });
      });
    });
    setRoutineEditValues(initialEdit);
  }, [user, routines]);

  // Call fetchRoutineLogs on mount or when routines change
  React.useEffect(() => {
    fetchRoutineLogs();
  }, [fetchRoutineLogs]);

  // Handlers for editing, saving, deleting
  const handleRoutineEditChange = (
    routineId: string,
    variableId: string,
    value: string
  ) => {
    setRoutineEditValues((prev) => ({
      ...prev,
      [routineId]: { ...prev[routineId], [variableId]: value },
    }));
  };
  const handleRoutineSave = async (routineId: string, variableId: string) => {
    if (!user) return;
    const value = routineEditValues[routineId][variableId];
    const variableMeta = variables.find((v) => v.id === variableId) || {
      label: variableId,
    };

    // Extract routine and time info from routineId (format: "routineId_timeId")
    const [actualRoutineId, timeId] = routineId.split("_");
    const routine = routines.find((r) => r.id === actualRoutineId);
    const time = routine?.times?.find((t: any) => t.time_id === timeId);

    // Simple validation: not empty
    if (!value) {
      setRoutineValidationErrors((prev) => ({
        ...prev,
        [routineId]: { ...prev[routineId], [variableId]: "Value required" },
      }));
      return;
    }
    setRoutineSaving((prev) => ({
      ...prev,
      [routineId]: { ...prev[routineId], [variableId]: true },
    }));

    // Find log for today if exists
    const today = new Date().toISOString().slice(0, 10);
    const logs = routineLogs[routineId]?.[variableId] || [];
    const log = logs.find((l) => l.created_at.slice(0, 10) === today);

    // Use the time from the routine for the log timestamp
    const logTime = time?.time_of_day || "10:00:00";
    const logTimestamp = today + "T" + logTime;

    if (log) {
      await supabase.from("logs").update({ value: value }).eq("id", log.id);
    } else {
      await supabase.from("logs").insert({
        user_id: user.id,
        variable_id: variableId,
        value: value,
        created_at: logTimestamp,
        source: ["manual"],
      });
    }
    setRoutineSaving((prev) => ({
      ...prev,
      [routineId]: { ...prev[routineId], [variableId]: false },
    }));
    await fetchRoutineLogs();

    // After refresh, set input to the new value from logs
    const refreshedLogs = routineLogs[routineId]?.[variableId] || [];
    const latest = refreshedLogs.find(
      (l) => l.created_at.slice(0, 10) === today
    );
    setRoutineEditValues((prev) => ({
      ...prev,
      [routineId]: {
        ...prev[routineId],
        [variableId]: latest?.value || value,
      },
    }));

    const timeDisplay = time?.time_name
      ? `${time.time_name} (${time.time_of_day?.slice(0, 5)})`
      : time?.time_of_day?.slice(0, 5);
    setSnackbar({
      open: true,
      message: `${variableMeta.label} set to ${value} for ${timeDisplay} by @${
        username || "user"
      }`,
    });
    if (reloadRoutines) reloadRoutines();
  };

  const handleRoutineDelete = async (routineId: string, variableId: string) => {
    if (!user) return;
    // Find log for today if exists
    const today = new Date().toISOString().slice(0, 10);
    const logs = routineLogs[routineId]?.[variableId] || [];
    const log = logs.find((l) => l.created_at.slice(0, 10) === today);
    if (!log) return;
    await supabase.from("logs").delete().eq("id", log.id);
    await fetchRoutineLogs();
    // After refresh, clear the input
    setRoutineEditValues((prev) => ({
      ...prev,
      [routineId]: { ...prev[routineId], [variableId]: "" },
    }));
    if (reloadRoutines) reloadRoutines();
  };

  const handleRoutineCancel = (routineId: string, variableId: string) => {
    // Revert input to last saved value from logs
    const logs = routineLogs[routineId]?.[variableId] || [];
    const today = new Date().toISOString().slice(0, 10);
    const log = logs.find((l) => l.created_at.slice(0, 10) === today);
    setRoutineEditValues((prev) => ({
      ...prev,
      [routineId]: {
        ...prev[routineId],
        [variableId]: log?.value || "",
      },
    }));
  };
  // Log history modal logic (reuse from log/now)
  // ... (omitted for brevity, will be filled in next step)

  // Render routines and variables with log management
  return (
    <Box mt={2} mb={5}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Routines Log Management
      </Typography>
      <>
        {routines.map((routine) => (
          <Box
            key={routine.id}
            mb={3}
            sx={{ background: "#232323", color: "#fff", borderRadius: 3, p: 2 }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: "1.2rem" }}>
              {routine.routine_name}
            </Typography>
            {/* Multi-time schema: render times and their variables */}
            {(routine.times || []).map((time: any) => (
              <Box
                key={time.time_id}
                mb={2}
                sx={{ background: "#222", borderRadius: 2, p: 2, mt: 2 }}
              >
                <Typography
                  sx={{
                    fontWeight: 600,
                    color: "#FFD600",
                    fontSize: "1.1rem",
                    mb: 1,
                  }}
                >
                  {time.time_name
                    ? `${time.time_name} (${time.time_of_day?.slice(0, 5)})`
                    : time.time_of_day?.slice(0, 5)}
                </Typography>
                {(time.variables || []).map((v: any) => {
                  const variableMeta = variables.find(
                    (meta) => meta.id === v.variable_id
                  );
                  return (
                    <Box
                      key={v.variable_id}
                      mb={2}
                      sx={{
                        background: "#181818",
                        borderRadius: 2,
                        p: 2,
                        border: "2px solid #444",
                      }}
                    >
                      <VariableLinkSimple
                        variableId={v.variable_id}
                        variableLabel={
                          variableMeta
                            ? variableMeta.label
                            : v.variable_name || "Unknown Variable"
                        }
                        variables={variables}
                        variant="body1"
                        sx={{
                          fontWeight: 900,
                          color: "#222",
                          fontSize: "1.2rem",
                          background: "#FFD600",
                          px: 2,
                          py: 0.5,
                          borderRadius: 1,
                          display: "inline-block",
                          mb: 1,
                        }}
                      />
                      {/* TODO: Add log editor for each variable at this time */}
                      <RoutineVariableLogEditor
                        value={
                          routineEditValues?.[
                            `${routine.id}_${time.time_id}`
                          ]?.[v.variable_id] ?? ""
                        }
                        onChange={(val) =>
                          handleRoutineEditChange(
                            `${routine.id}_${time.time_id}`,
                            v.variable_id,
                            val
                          )
                        }
                        onSave={() =>
                          handleRoutineSave(
                            `${routine.id}_${time.time_id}`,
                            v.variable_id
                          )
                        }
                        onDelete={() =>
                          handleRoutineDelete(
                            `${routine.id}_${time.time_id}`,
                            v.variable_id
                          )
                        }
                        onCancel={() =>
                          handleRoutineCancel(
                            `${routine.id}_${time.time_id}`,
                            v.variable_id
                          )
                        }
                        variable={
                          variableMeta || {
                            id: v.variable_id,
                            slug: (v.variable_name || "")
                              .toLowerCase()
                              .replace(/ /g, "_"),
                            label: v.variable_name || "",
                            data_type: "continuous",
                            source_type: "manual",
                            created_at: "",
                            updated_at: "",
                            is_active: true,
                          }
                        }
                        loading={
                          routineSaving?.[`${routine.id}_${time.time_id}`]?.[
                            v.variable_id
                          ]
                        }
                        error={
                          routineValidationErrors?.[
                            `${routine.id}_${time.time_id}`
                          ]?.[v.variable_id]
                        }
                      />
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        ))}
      </>
    </Box>
  );
}
