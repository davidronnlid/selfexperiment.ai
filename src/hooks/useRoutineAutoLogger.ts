import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/utils/supaBase";

interface RoutineTime {
  time: string;
  name?: string;
}

interface RoutineVariable {
  id: string;
  variable_id: string;
  variable_name: string;
  weekdays: number[];
  times: RoutineTime[];
  default_value: any;
  default_unit?: string;
}

interface RoutineAutoLoggerOptions {
  userId: string;
  onAutoLogCreated?: (summary: any) => void;
  onError?: (error: Error) => void;
  checkIntervalMs?: number; // How often to check (default: 60000ms = 1 minute)
  enabled?: boolean;
}

interface AutoLogResult {
  success: boolean;
  summary?: any;
  error?: string;
}

export function useRoutineAutoLogger({
  userId,
  onAutoLogCreated,
  onError,
  checkIntervalMs = 60000, // Default: check every minute
  enabled = true, // Re-enabled with better filtering
}: RoutineAutoLoggerOptions) {
  const [isRunning, setIsRunning] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [processedToday, setProcessedToday] = useState<Set<string>>(new Set());

  // Use refs to track the latest values without causing re-renders
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedTodayRef = useRef<Set<string>>(new Set());
  const processedThisMinuteRef = useRef<Set<string>>(new Set());

  // Helper function to get current local time components
  const getCurrentTimeInfo = useCallback(() => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format
    const currentTimeMinute = now.toTimeString().slice(0, 5); // HH:MM format
    const currentWeekday = now.getDay(); // 0=Sunday, 6=Saturday
    // Convert to 1-7 format (1=Monday, 7=Sunday) to match database
    const weekdayConverted = currentWeekday === 0 ? 7 : currentWeekday;
    const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD

    return {
      currentTime,
      currentTimeMinute,
      currentWeekday: weekdayConverted,
      currentDate,
      now,
    };
  }, []);

  // Function to fetch active routine variables for the user
  const fetchActiveRoutineVariables = useCallback(async () => {
    try {
      // Fetch routine variables with their associated variable info
      const { data: routineVariables, error } = await supabase
        .from("routine_variables")
        .select(
          `
          id,
          variable_id,
          weekdays,
          times,
          default_value,
          default_unit,
          variables!inner(label),
          routines!inner(user_id, is_active)
        `
        )
        .eq("routines.user_id", userId)
        .eq("routines.is_active", true);

      if (error) {
        throw new Error(`Failed to fetch routine variables: ${error.message}`);
      }

      // Transform the data to match our interface
      const transformedData: RoutineVariable[] = (routineVariables || []).map(
        (rv: any) => ({
          id: rv.id,
          variable_id: rv.variable_id,
          variable_name: rv.variables.label,
          weekdays: rv.weekdays || [],
          times: rv.times || [],
          default_value: rv.default_value,
          default_unit: rv.default_unit,
        })
      );

      return transformedData;
    } catch (error) {
      console.error("Error fetching routine variables:", error);
      return [];
    }
  }, [userId]);

  // Function to check if routine variable should be auto-logged
  const shouldAutoLogVariable = useCallback(
    (
      routineVariable: RoutineVariable,
      timeInfo: ReturnType<typeof getCurrentTimeInfo>
    ) => {
      const { currentTime, currentTimeMinute, currentWeekday, currentDate } =
        timeInfo;

      // Check if current weekday is in the allowed weekdays
      if (!routineVariable.weekdays.includes(currentWeekday)) {
        return false;
      }

      // Check if any of the times match current time
      const matchingTimes = routineVariable.times.filter(
        (time: RoutineTime) => {
          // Parse time to compare with current time
          const routineTime = time.time;
          const routineTimeSeconds =
            routineTime.length === 5 ? `${routineTime}:00` : routineTime;

          // Check if current time matches routine time (within 1 minute tolerance)
          const currentTimeMs = new Date(`1970-01-01T${currentTime}`).getTime();
          const routineTimeMs = new Date(
            `1970-01-01T${routineTimeSeconds}`
          ).getTime();
          const timeDiff = Math.abs(currentTimeMs - routineTimeMs);
          const toleranceMs = 60000; // 1 minute tolerance

          const isMatch = timeDiff <= toleranceMs;

          // More detailed logging for debugging
          if (isMatch) {
            console.log(
              `[Auto-Logger] TIME MATCH: ${routineVariable.variable_name} - Current: ${currentTime}, Routine: ${routineTimeSeconds}, Diff: ${timeDiff}ms`
            );
          }

          return isMatch;
        }
      );

      if (matchingTimes.length === 0) return false;

      // Check if we've already processed this variable today
      const variableKey = `${routineVariable.variable_id}_${currentDate}`;
      const alreadyProcessedToday = processedTodayRef.current.has(variableKey);

      if (alreadyProcessedToday) {
        console.log(
          `[Auto-Logger] Already processed today: ${routineVariable.variable_name}`
        );
        return false;
      }

      // Check if we've already processed this variable in the current minute
      const variableMinuteKey = `${routineVariable.variable_id}_${currentDate}_${currentTimeMinute}`;
      const alreadyProcessedThisMinute =
        processedThisMinuteRef.current.has(variableMinuteKey);

      if (alreadyProcessedThisMinute) {
        console.log(
          `[Auto-Logger] Already processed this minute: ${routineVariable.variable_name} at ${currentTimeMinute}`
        );
        return false;
      }

      return true;
    },
    []
  );

  // Function to trigger auto-logging
  const triggerAutoLogging = useCallback(async (): Promise<AutoLogResult> => {
    try {
      setIsRunning(true);

      const timeInfo = getCurrentTimeInfo();
      const { currentTimeMinute } = timeInfo;

      // Clear minute-based tracking if the minute has changed
      const currentMinuteKey = `${timeInfo.currentDate}_${currentTimeMinute}`;
      if (
        !processedThisMinuteRef.current.has("_current_minute") ||
        !processedThisMinuteRef.current.has(currentMinuteKey)
      ) {
        console.log(
          `[Auto-Logger] New minute: ${currentTimeMinute} - Clearing minute-based tracking`
        );
        processedThisMinuteRef.current.clear();
        processedThisMinuteRef.current.add("_current_minute");
        processedThisMinuteRef.current.add(currentMinuteKey);
      }

      const routineVariables = await fetchActiveRoutineVariables();

      // Filter variables that should be auto-logged
      const variablesToLog = routineVariables.filter((variable) =>
        shouldAutoLogVariable(variable, timeInfo)
      );

      // Debug logging
      console.log(
        `[Auto-Logger] ${timeInfo.currentTime} - Checking ${routineVariables.length} routine variables`
      );
      console.log(`[Auto-Logger] Current weekday: ${timeInfo.currentWeekday}`);
      console.log(`[Auto-Logger] Variables to log: ${variablesToLog.length}`);

      if (variablesToLog.length > 0) {
        console.log(
          `[Auto-Logger] Variables that match time:`,
          variablesToLog.map((v) => ({
            name: v.variable_name,
            times: v.times,
            weekdays: v.weekdays,
          }))
        );
      }

      if (variablesToLog.length === 0) {
        return { success: true, summary: { auto_logs_created: 0 } };
      }

      // Call the auto-logging API
      const response = await fetch("/api/routines/create-auto-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetDate: timeInfo.currentDate,
          userId: userId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Auto-Logger] API Error: ${response.status} - ${errorText}`
        );
        throw new Error(`Auto-logging API failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Mark processed variables for both daily and minute-based tracking
      variablesToLog.forEach((variable) => {
        const variableKey = `${variable.variable_id}_${timeInfo.currentDate}`;
        const variableMinuteKey = `${variable.variable_id}_${timeInfo.currentDate}_${currentTimeMinute}`;

        processedTodayRef.current.add(variableKey);
        processedThisMinuteRef.current.add(variableMinuteKey);
      });

      setProcessedToday(new Set(processedTodayRef.current));

      // Notify success
      if (onAutoLogCreated && result.summary?.auto_logs_created > 0) {
        onAutoLogCreated(result.summary);
      }

      return { success: true, summary: result.summary };
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      console.error(`[Auto-Logger] Error:`, err);
      if (onError) {
        onError(err);
      }
      return { success: false, error: err.message };
    } finally {
      setIsRunning(false);
    }
  }, [
    userId,
    getCurrentTimeInfo,
    fetchActiveRoutineVariables,
    shouldAutoLogVariable,
    onAutoLogCreated,
    onError,
  ]);

  // Function to clear today's processed variables (call at midnight)
  const clearProcessedToday = useCallback(() => {
    processedTodayRef.current.clear();
    processedThisMinuteRef.current.clear();
    setProcessedToday(new Set());
    console.log(
      `[Auto-Logger] Cleared daily and minute-based tracking at midnight`
    );
  }, []);

  // Function to clear minute-based tracking
  const clearProcessedThisMinute = useCallback(() => {
    processedThisMinuteRef.current.clear();
    console.log(`[Auto-Logger] Cleared minute-based tracking`);
  }, []);

  // Check routine function (can be called manually)
  const checkRoutines = useCallback(async () => {
    if (!enabled || isRunning) return;

    const result = await triggerAutoLogging();
    setLastCheck(new Date());
    return result;
  }, [enabled, isRunning, triggerAutoLogging]);

  // Start/stop the auto-logger
  const start = useCallback(() => {
    if (intervalRef.current) return; // Already running

    // Initial check
    checkRoutines();

    // Set up interval
    intervalRef.current = setInterval(checkRoutines, checkIntervalMs);
  }, [checkRoutines, checkIntervalMs]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Effect to start/stop based on enabled state
  useEffect(() => {
    if (enabled && userId) {
      start();
    } else {
      stop();
    }

    return () => stop();
  }, [enabled, userId, start, stop]);

  // Effect to clear processed variables at midnight
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const midnightTimeout = setTimeout(() => {
      clearProcessedToday();

      // Set up daily midnight clearing
      const dailyInterval = setInterval(
        clearProcessedToday,
        24 * 60 * 60 * 1000
      );

      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);

    return () => clearTimeout(midnightTimeout);
  }, [clearProcessedToday]);

  return {
    isRunning,
    lastCheck,
    processedToday,
    checkRoutines,
    start,
    stop,
    clearProcessedToday,
    clearProcessedThisMinute,
  };
}
