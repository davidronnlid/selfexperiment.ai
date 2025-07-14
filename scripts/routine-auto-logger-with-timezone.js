import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { DateTime } from "https://esm.sh/luxon@3.4.3";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  const { data: routineVars, error } = await supabase
    .from("routine_variables")
    .select("*");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  const matched = [];

  for (const rv of routineVars ?? []) {
    const weekdays = rv.weekdays ?? [];
    const times = rv.times ?? [];

    const userId = await getUserIdFromRoutineId(supabase, rv.routine_id);
    if (!userId) continue;

    // Fetch user's timezone from profiles
    const userTimezone = await getUserTimezone(supabase, userId);

    // Get now in user's timezone
    const now = DateTime.now().setZone(userTimezone);
    const currentWeekday = now.weekday; // 1 (Monday) - 7 (Sunday)
    const currentMinutes = now.hour * 60 + now.minute;
    const todayDate = now.toISODate(); // e.g., '2025-07-14'

    if (!weekdays.includes(currentWeekday)) continue;

    for (const t of times) {
      if (!t.time) continue;

      const [h, m] = t.time.split(":").map(Number);
      const timeInMinutes = h * 60 + m;

      console.log(
        `User ${userId} (${userTimezone}): Now (local): ${currentMinutes}, Target: ${timeInMinutes}, Diff: ${Math.abs(
          currentMinutes - timeInMinutes
        )}`
      );

      if (currentMinutes === timeInMinutes) {
        const targetTimePrefix = `${todayDate}T${String(h).padStart(
          2,
          "0"
        )}:${String(m).padStart(2, "0")}`;

        const { data: existingLogs, error: checkError } = await supabase
          .from("logs")
          .select("id")
          .eq("user_id", userId)
          .eq("variable_id", rv.variable_id)
          .eq("routine_id", rv.routine_id)
          .gte("date", `${targetTimePrefix}:00.000Z`)
          .lt("date", `${targetTimePrefix}:59.999Z`);

        if (checkError || (existingLogs?.length ?? 0) > 0) continue;

        // Create log entry using the user's timezone
        const logTime = now.toUTC().toISO(); // Store in UTC for consistency

        await supabase.from("logs").insert({
          date: logTime,
          value:
            typeof rv.default_value === "string"
              ? rv.default_value
              : JSON.stringify(rv.default_value ?? ""),
          user_id: userId,
          variable_id: rv.variable_id,
          routine_id: rv.routine_id,
          source: ["auto"],
          notes: `Auto-logged from routine (${userTimezone})`,
        });

        matched.push(rv.id);
        console.log(
          `✅ Logged routine variable ${rv.id} for user ${userId} at ${logTime}`
        );
        break; // log only once per routine
      }
    }
  }

  return new Response(
    JSON.stringify({
      logged: matched,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
    }
  );
});

async function getUserIdFromRoutineId(supabase, routineId) {
  const { data, error } = await supabase
    .from("routines")
    .select("user_id")
    .eq("id", routineId)
    .single();
  return data?.user_id ?? null;
}

async function getUserTimezone(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();

  // Default to Europe/Stockholm if no timezone is set
  return data?.timezone || "Europe/Stockholm";
}
