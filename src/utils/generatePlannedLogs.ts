import { supabase } from "@/utils/supaBase";

// Generate historical logs for the past 2 weeks for a routine
export async function generateHistoricalLogsForRoutine(
  routine: any,
  userId: string
) {
  const today = new Date();
  const historicalLogs: any[] = [];

  console.log(
    `Generating historical logs for routine ${routine.id} with ${
      routine.times?.length || 0
    } times`
  );

  for (let i = 1; i <= 14; i++) {
    const logDate = new Date(today);
    logDate.setDate(today.getDate() - i);

    for (const [timeIdx, time] of routine.times.entries()) {
      if (!time.is_active) continue;
      // Ensure time_of_day is in HH:MM:SS format
      let timeOfDay = time.time_of_day;
      if (timeOfDay.length === 5) timeOfDay += ":00";
      // Compose logged_at as UTC
      const datePart = logDate.toISOString().split("T")[0];
      const loggedAt = `${datePart}T${timeOfDay}Z`;
      for (const variable of time.variables) {
        historicalLogs.push({
          user_id: userId,
          variable_id: variable.variable_id,
          value: variable.default_value,
          display_unit: variable.default_unit,
          created_at: loggedAt,
          source: ["planned"],
          context: {
            routine_id: routine.id,
            routine_time_id: time.time_id || timeIdx,
          },
        });
      }
    }
  }

  console.log(
    `Generated ${historicalLogs.length} historical logs for routine ${routine.id}`
  );

  if (historicalLogs.length > 0) {
    const { error } = await supabase.from("logs").insert(historicalLogs);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Error inserting historical logs:", error);
    } else {
      console.log(
        `Successfully inserted ${historicalLogs.length} historical logs`
      );
    }
  }
}

// Call this after a routine is created, passing the routine object and userId
export async function generatePlannedLogsForRoutine(
  routine: any,
  userId: string
) {
  const today = new Date();
  const plannedLogs: any[] = [];

  console.log(
    `Generating planned logs for routine ${routine.id} with ${
      routine.times?.length || 0
    } times`
  );

  for (let i = 0; i < 14; i++) {
    const logDate = new Date(today);
    logDate.setDate(today.getDate() + i);

    for (const [timeIdx, time] of routine.times.entries()) {
      if (!time.is_active) continue;
      // Ensure time_of_day is in HH:MM:SS format
      let timeOfDay = time.time_of_day;
      if (timeOfDay.length === 5) timeOfDay += ":00";
      // Compose logged_at as UTC
      const datePart = logDate.toISOString().split("T")[0];
      const loggedAt = `${datePart}T${timeOfDay}Z`;
      for (const variable of time.variables) {
        plannedLogs.push({
          user_id: userId,
          variable_id: variable.variable_id,
          value: variable.default_value,
          display_unit: variable.default_unit,
          created_at: loggedAt,
          source: ["planned"],
          context: {
            routine_id: routine.id,
            routine_time_id: time.time_id || timeIdx,
          },
        });
      }
    }
  }

  console.log(
    `Generated ${plannedLogs.length} planned logs for routine ${routine.id}`
  );

  if (plannedLogs.length > 0) {
    const { error } = await supabase.from("logs").insert(plannedLogs);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Error inserting planned logs:", error);
    } else {
      console.log(`Successfully inserted ${plannedLogs.length} planned logs`);
    }
  }
}

// Generate both historical and planned logs for a new routine
export async function generateAllLogsForRoutine(routine: any, userId: string) {
  // Generate historical logs for the past 2 weeks
  await generateHistoricalLogsForRoutine(routine, userId);

  // Generate planned logs for the next 2 weeks
  await generatePlannedLogsForRoutine(routine, userId);
}

// Generate historical logs for existing routines that don't have them
export async function generateHistoricalLogsForExistingRoutines(
  userId: string
) {
  const { data: routines } = await supabase.rpc("get_user_routines", {
    p_user_id: userId,
  });

  if (!routines) return;

  for (const routine of routines) {
    // Check if this routine already has historical logs
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 14);
    const startISO = start.toISOString().slice(0, 10) + "T00:00:00Z";

    const { data: existingLogs } = await supabase
      .from("logs")
      .select("id")
      .eq("user_id", userId)
      .eq("source", "planned")
      .contains("context", { routine_id: routine.id })
      .lt("created_at", startISO)
      .limit(1);

    // If no historical logs exist for this routine, generate them
    if (!existingLogs || existingLogs.length === 0) {
      await generateHistoricalLogsForRoutine(routine, userId);
    }
  }
}
