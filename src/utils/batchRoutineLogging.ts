import { format, addDays, isSameDay } from "date-fns";

export interface PlannedRoutineLog {
  id: string;
  routine_id: string;
  routine_name: string;
  variable_id: string;
  variable_name: string;
  variable_slug: string;
  default_value: string;
  default_unit: string;
  date: string;
  time_of_day: string;
  time_name?: string;
  weekday: number;
  enabled: boolean;
}

export function generatePlannedRoutineLogs(
  routines: any[],
  startDate: string,
  endDate: string
): PlannedRoutineLog[] {
  console.log("=== GENERATE PLANNED LOGS DEBUG ===");
  console.log("Input routines:", routines);
  console.log("Date range:", startDate, "to", endDate);
  
  const plannedLogs: PlannedRoutineLog[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  console.log("Start date:", start);
  console.log("End date:", end);

  // Iterate through each day in the date range
  let currentDate = start;
  while (currentDate <= end) {
    const currentWeekday = currentDate.getDay();
    // Convert to 1-7 format (1=Monday, 7=Sunday)
    const weekdayFormatted = currentWeekday === 0 ? 7 : currentWeekday;
    const dateString = format(currentDate, "yyyy-MM-dd");

    console.log("Processing date:", dateString, "weekday:", weekdayFormatted);

    // Process each routine
    routines.forEach((routine) => {
      console.log("Processing routine:", routine.routine_name);
      console.log("Routine weekdays:", routine.weekdays);
      
      // Check if this routine should run on this weekday
      if (routine.weekdays?.includes(weekdayFormatted)) {
        console.log("Routine runs on this weekday");
        
        // Process each variable in the routine
        (routine.variables || []).forEach((variable: any) => {
          console.log("Processing variable:", variable.variable_name);
          console.log("Variable weekdays:", variable.weekdays);
          
          // Check if this variable should run on this weekday
          if (variable.weekdays?.includes(weekdayFormatted)) {
            console.log("Variable runs on this weekday");
            
            // Process each time for this variable
            (variable.times || []).forEach((time: any) => {
              console.log("Processing time:", time);
              
              const plannedLog = {
                id: `${routine.id}_${variable.variable_id}_${dateString}_${time.time}`,
                routine_id: routine.id,
                routine_name: routine.routine_name,
                variable_id: variable.variable_id,
                variable_name: variable.variable_name,
                variable_slug: variable.variable_slug,
                default_value: variable.default_value,
                default_unit: variable.default_unit || "",
                date: dateString,
                time_of_day: time.time,
                time_name: time.name || "",
                weekday: weekdayFormatted,
                enabled: true,
              };
              
              console.log("Created planned log:", plannedLog);
              plannedLogs.push(plannedLog);
            });
          } else {
            console.log("Variable does NOT run on this weekday");
          }
        });
      } else {
        console.log("Routine does NOT run on this weekday");
      }
    });

    currentDate = addDays(currentDate, 1);
  }

  console.log("Final planned logs:", plannedLogs);
  console.log("=== END GENERATE DEBUG ===");
  return plannedLogs;
}

/**
 * Group planned logs by routine for display
 */
export function groupPlannedLogsByRoutine(plannedLogs: PlannedRoutineLog[]) {
  const grouped: Record<string, {
    routine: {
      id: string;
      name: string;
    };
    logs: PlannedRoutineLog[];
  }> = {};

  plannedLogs.forEach(log => {
    if (!grouped[log.routine_id]) {
      grouped[log.routine_id] = {
        routine: {
          id: log.routine_id,
          name: log.routine_name,
        },
        logs: [],
      };
    }
    grouped[log.routine_id].logs.push(log);
  });

  return grouped;
}

/**
 * Group planned logs by date for display
 */
export function groupPlannedLogsByDate(plannedLogs: PlannedRoutineLog[]) {
  const grouped: Record<string, PlannedRoutineLog[]> = {};

  plannedLogs.forEach(log => {
    if (!grouped[log.date]) {
      grouped[log.date] = [];
    }
    grouped[log.date].push(log);
  });

  return grouped;
}

/**
 * Group planned logs by variable for display
 */
export function groupPlannedLogsByVariable(plannedLogs: PlannedRoutineLog[]) {
  const grouped: Record<string, PlannedRoutineLog[]> = {};
  
  plannedLogs.forEach(log => {
    if (!grouped[log.variable_id]) {
      grouped[log.variable_id] = [];
    }
    grouped[log.variable_id].push(log);
  });
  
  return grouped;
}

/**
 * Get display name for a group based on grouping mode
 */
export function getGroupDisplayName(groupKey: string, mode: string, logs?: PlannedRoutineLog[]): string {
  switch (mode) {
    case "date":
      return format(new Date(groupKey), "EEEE, MMM d, yyyy");
    case "variable":
      // Use the variable name from the first log in the group
      return logs?.[0]?.variable_name || groupKey;
    default:
      return groupKey;
  }
} 