import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supaBase";

interface HRData {
  bpm: number;
  source?: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { data: tokens } = await supabase
    .from("oura_tokens")
    .select("access_token")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!tokens?.[0]) return res.status(500).json({ error: "No token" });

  const token = tokens[0].access_token;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const startDate = fmt(start);
  const endDate = fmt(end);

  const fetchData = async (ep: string) => {
    const resp = await fetch(
      `https://api.ouraring.com/v2/usercollection/${ep}?start_date=${startDate}&end_date=${endDate}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!resp.ok) throw new Error(`fetch ${ep} ${resp.status}`);
    return resp.json();
  };

  try {
    const [readinessRes, sleepRes, hrRes] = await Promise.all([
      fetchData("daily_readiness"),
      fetchData("daily_sleep"),
      fetchData("heartrate"),
    ]);

    console.log("⌚ HR data sample:", hrRes.data.slice(0, 5));

    const inserts: Record<string, unknown>[] = [];

    for (const item of readinessRes.data) {
      inserts.push(
        {
          source: "oura",
          metric: "readiness_score",
          date: item.day,
          value: item.score,
          raw: item,
        },
        {
          source: "oura",
          metric: "temperature_deviation",
          date: item.day,
          value: item.temperature_deviation,
          raw: item,
        },
        {
          source: "oura",
          metric: "temperature_trend_deviation",
          date: item.day,
          value: item.temperature_trend_deviation,
          raw: item,
        }
      );
    }

    for (const item of sleepRes.data) {
      inserts.push(
        {
          source: "oura",
          metric: "sleep_score",
          date: item.day,
          value: item.score,
          raw: item,
        },
        {
          source: "oura",
          metric: "total_sleep_duration",
          date: item.day,
          value: item.total_sleep_duration,
          raw: item,
        },
        {
          source: "oura",
          metric: "rem_sleep_duration",
          date: item.day,
          value: item.rem_sleep_duration,
          raw: item,
        },
        {
          source: "oura",
          metric: "deep_sleep_duration",
          date: item.day,
          value: item.deep_sleep_duration,
          raw: item,
        },
        {
          source: "oura",
          metric: "efficiency",
          date: item.day,
          value: item.efficiency,
          raw: item,
        },
        {
          source: "oura",
          metric: "sleep_latency",
          date: item.day,
          value: item.sleep_latency,
          raw: item,
        }
      );
    }

    const hrByDay: Record<string, number[]> = {};
    hrRes.data.forEach((pt: HRData) => {
      const day = pt.timestamp.split("T")[0];
      if (!hrByDay[day]) hrByDay[day] = [];
      if (typeof pt.bpm === "number") {
        hrByDay[day].push(pt.bpm);
      }
    });

    for (const [day, arr] of Object.entries(hrByDay)) {
      if (arr.length === 0) continue;
      const minHR = Math.min(...arr);
      const avgHR = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      inserts.push(
        {
          source: "oura",
          metric: "hr_lowest_true",
          date: day,
          value: minHR,
          raw: null,
        },
        {
          source: "oura",
          metric: "hr_average_true",
          date: day,
          value: avgHR,
          raw: null,
        },
        {
          source: "oura",
          metric: "hr_raw_data",
          date: day,
          value: null,
          raw: hrRes.data.filter((d: HRData) => d.timestamp.startsWith(day)),
        }
      );
    }

    console.log(`📝 Inserting ${inserts.length} items to measurements...`);
    const { error: insertErr } = await supabase
      .from("measurements")
      .upsert(inserts, { onConflict: "date,metric,source" });
    if (insertErr) throw insertErr;

    res.status(200).json({ inserted: inserts.length });
  } catch (e: unknown) {
    const err = e as Error;
    console.error("❌", err);
    res.status(500).json({ error: err.message });
  }
}
