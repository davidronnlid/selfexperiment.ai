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
  routines: unknown[],
  startDate: string,
  endDate: string
): PlannedRoutineLog[] {
  console.log("=== GENERATE PLANNED LOGS DEBUG ===");
  console.log("Input routines count:", routines.length);
  console.log("Input routines detailed:", JSON.stringify(routines, null, 2));
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

    console.log(`\n📅 Processing date: ${dateString}, weekday: ${weekdayFormatted} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][currentWeekday]})`);

    // Process each routine
    routines.forEach((routine: any, routineIndex: number) => {
      console.log(`\n🔄 [${routineIndex + 1}/${routines.length}] Processing routine:`, {
        id: routine.id,
        name: routine.routine_name,
        variables_count: routine.variables?.length || 0,
        routine_weekdays: routine.weekdays,
        has_variables: !!(routine.variables && routine.variables.length > 0)
      });
      
      // For routines, we don't check routine-level weekdays anymore - check variable level weekdays
      // Process each variable in the routine
      if (!routine.variables || routine.variables.length === 0) {
        console.log("❌ Routine has no variables configured");
        return;
      }

      routine.variables.forEach((variable: any, varIndex: number) => {
        console.log(`\n  📊 [${varIndex + 1}/${routine.variables.length}] Processing variable:`, {
          id: variable.variable_id,
          name: variable.variable_name,
          times_count: variable.times?.length || 0,
          weekdays: variable.weekdays,
          default_value: variable.default_value,
          times: variable.times
        });
        
        // Check if this variable should run on this weekday
        if (!variable.weekdays || !Array.isArray(variable.weekdays)) {
          console.log("❌ Variable has no weekdays configured or weekdays is not an array");
          return;
        }

        if (!variable.weekdays.includes(weekdayFormatted)) {
          console.log(`❌ Variable does NOT run on weekday ${weekdayFormatted}. Configured for:`, variable.weekdays);
          return;
        }

        console.log(`✅ Variable runs on weekday ${weekdayFormatted}`);
        
        // Check if variable has times
        if (!variable.times || !Array.isArray(variable.times) || variable.times.length === 0) {
          console.log("❌ Variable has no times configured");
          return;
        }

        // Process each time for this variable
        variable.times.forEach((time: any, timeIndex: number) => {
          console.log(`\n    ⏰ [${timeIndex + 1}/${variable.times.length}] Processing time:`, time);
          
          if (!time || typeof time !== 'object') {
            console.log("❌ Time is not an object:", typeof time, time);
            return;
          }

          if (!time.time) {
            console.log("❌ Time object has no 'time' property:", time);
            return;
          }
          
          const plannedLog = {
            id: `${routine.id}_${variable.variable_id}_${dateString}_${time.time}`,
            routine_id: routine.id,
            routine_name: routine.routine_name,
            variable_id: variable.variable_id,
            variable_name: variable.variable_name || `Variable ${variable.variable_id}`,
            variable_slug: variable.variable_slug || "",
            default_value: variable.default_value,
            default_unit: variable.default_unit || "",
            date: dateString,
            time_of_day: time.time,
            time_name: time.name || "",
            weekday: weekdayFormatted,
            enabled: true,
          };
          
          console.log("✅ Created planned data point:", plannedLog);
          plannedLogs.push(plannedLog);
        });
      });
    });

    currentDate = addDays(currentDate, 1);
  }

  console.log(`\n🎯 FINAL RESULTS:`);
  console.log(`Total planned data points created: ${plannedLogs.length}`);
  if (plannedLogs.length > 0) {
    console.log("Sample planned data points:", plannedLogs.slice(0, 3));
  }
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