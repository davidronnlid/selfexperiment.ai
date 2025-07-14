import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/utils/supaBase";

interface RoutineTime {
  is_active: boolean;
  time_of_day: string;
}

interface Routine {
  id: string;
  is_active: boolean;
  weekdays: number[];
  times: RoutineTime[];
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
  enabled = true,
}: RoutineAutoLoggerOptions) {
  const [isRunning, setIsRunning] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [processedToday, setProcessedToday] = useState<Set<string>>(new Set());

  // Use refs to track the latest values without causing re-renders
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedTodayRef = useRef<Set<string>>(new Set());

  // Helper function to get current local time components
  const getCurrentTimeInfo = useCallback(() => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format
    const currentWeekday = now.getDay(); // 0=Sunday, 6=Saturday
    // Convert to 1-7 format (1=Monday, 7=Sunday) to match database
    const weekdayConverted = currentWeekday === 0 ? 7 : currentWeekday;
    const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD

    return {
      currentTime,
      currentWeekday: weekdayConverted,
      currentDate,
      now,
    };
  }, []);

  // Function to fetch active routines for the user
  const fetchActiveRoutines = useCallback(async () => {
    try {
      const { data: routines, error } = await supabase.rpc(
        "get_user_routines",
        {
          p_user_id: userId,
        }
      );

      if (error) {
        throw new Error(`Failed to fetch routines: ${error.message}`);
      }

      return routines || [];
    } catch (error) {
      console.error("Error fetching routines:", error);
      return [];
    }
  }, [userId]);

  // Function to check if routine should be auto-logged
  const shouldAutoLogRoutine = useCallback(
    (routine: Routine, timeInfo: ReturnType<typeof getCurrentTimeInfo>) => {
      const { currentTime, currentWeekday, currentDate } = timeInfo;

      // Check if routine is active
      if (!routine.is_active) return false;

      // Check if routine has weekday restriction
      if (!routine.weekdays || !routine.weekdays.includes(currentWeekday)) {
        return false;
      }

      // Check if routine has any times that match current time
      const matchingTimes = (routine.times || []).filter(
        (time: RoutineTime) => {
          if (!time.is_active) return false;

          // Parse time_of_day to compare with current time
          const routineTime = time.time_of_day;
          const routineTimeSeconds =
            routineTime.length === 5 ? `${routineTime}:00` : routineTime;

          // Check if current time matches routine time (within 1 minute tolerance)
          const currentTimeMs = new Date(`1970-01-01T${currentTime}`).getTime();
          const routineTimeMs = new Date(
            `1970-01-01T${routineTimeSeconds}`
          ).getTime();
          const timeDiff = Math.abs(currentTimeMs - routineTimeMs);
          const toleranceMs = 60000; // 1 minute tolerance

          return timeDiff <= toleranceMs;
        }
      );

      if (matchingTimes.length === 0) return false;

      // Check if we've already processed this routine today
      const routineKey = `${routine.id}_${currentDate}`;
      return !processedTodayRef.current.has(routineKey);
    },
    []
  );

  // Function to trigger auto-logging
  const triggerAutoLogging = useCallback(async (): Promise<AutoLogResult> => {
    try {
      setIsRunning(true);

      const timeInfo = getCurrentTimeInfo();
      const routines = await fetchActiveRoutines();

      // Filter routines that should be auto-logged
      const routinesToLog = routines.filter((routine: Routine) =>
        shouldAutoLogRoutine(routine, timeInfo)
      );

      if (routinesToLog.length === 0) {
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
          userId: userId, // Pass userId to make it user-specific
        }),
      });

      if (!response.ok) {
        throw new Error(`Auto-logging API failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Mark processed routines
      routinesToLog.forEach((routine: Routine) => {
        const routineKey = `${routine.id}_${timeInfo.currentDate}`;
        processedTodayRef.current.add(routineKey);
      });

      setProcessedToday(new Set(processedTodayRef.current));

      // Notify success
      if (onAutoLogCreated && result.summary?.auto_logs_created > 0) {
        onAutoLogCreated(result.summary);
      }

      return { success: true, summary: result.summary };
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
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
    fetchActiveRoutines,
    shouldAutoLogRoutine,
    onAutoLogCreated,
    onError,
  ]);

  // Function to clear today's processed routines (call at midnight)
  const clearProcessedToday = useCallback(() => {
    processedTodayRef.current.clear();
    setProcessedToday(new Set());
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

  // Effect to clear processed routines at midnight
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
  };
}
