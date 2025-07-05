import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Alert,
  Divider,
  Button,
  LinearProgress,
  IconButton,
  Card,
  CardContent,
  Tooltip,
  Fade,
} from "@mui/material";
import { useUser } from "./_app";
import { supabase } from "@/utils/supaBase";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { useRouter } from "next/router";
import { differenceInDays, addDays, formatISO, parseISO } from "date-fns";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import chroma from "chroma-js";
import Select from "react-select";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Utility to fetch missing Withings data in batches
interface FetchMissingWithingsDataParams {
  userId: string;
  accessToken: string;
  latestDate?: string;
  onProgress?: (count: number) => void;
}

async function fetchMissingWithingsData({
  userId,
  accessToken,
  latestDate,
  onProgress,
}: FetchMissingWithingsDataParams): Promise<any[]> {
  const today = new Date();
  let startDate = latestDate
    ? addDays(parseISO(latestDate), 1)
    : addDays(today, -89);
  let allRows: any[] = [];
  let batchStart = new Date(startDate);
  let batchEnd = new Date(startDate);
  batchEnd.setDate(batchEnd.getDate() + 29);
  let totalFetched = 0;
  const MEAS_TYPES = [1, 5, 6, 8, 76, 77, 88];

  while (batchStart < today) {
    const startUnix = Math.floor(batchStart.getTime() / 1000);
    const endUnix = Math.floor(
      Math.min(batchEnd.getTime(), today.getTime()) / 1000
    );
    const url = `/api/withings/fetch?startdate=${startUnix}&enddate=${endUnix}&meastype=${MEAS_TYPES.join(
      ","
    )}`;
    const resp = await fetch(url);
    const result = await resp.json();
    if (result.success && result.rows) {
      allRows = allRows.concat(result.rows);
      totalFetched += result.rows.length;
      if (onProgress) onProgress(totalFetched);
    }
    batchStart.setDate(batchStart.getDate() + 30);
    batchEnd.setDate(batchEnd.getDate() + 30);
  }
  return allRows;
}

export default function Analytics() {
  const { user } = useUser();
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [ouraData, setOuraData] = useState<any[]>([]);
  const [ouraLoading, setOuraLoading] = useState(false);
  const [ouraSyncing, setOuraSyncing] = useState(false);
  const [withingsConnected, setWithingsConnected] = useState(false);
  const [withingsWeights, setWithingsWeights] = useState<any[]>([]);
  const [withingsSyncing, setWithingsSyncing] = useState(false);
  const [withingsSyncProgress, setWithingsSyncProgress] = useState(0);
  const [withingsReimportProgress, setWithingsReimportProgress] =
    useState<null | {
      upserted: number;
      totalBatches: number;
      batchesCompleted: number;
      rowsFetched: number;
      message: string;
      totalAvailable?: number;
    }>(null);
  const [withingsReimportEta, setWithingsReimportEta] = useState<number | null>(
    null
  );
  const [withingsReimportStart, setWithingsReimportStart] = useState<
    number | null
  >(null);
  const [withingsReimportWaiting, setWithingsReimportWaiting] = useState<
    number | null
  >(null); // seconds
  // State for selected metrics (multi-select)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  // State for collapsible years in table
  const [expandedYears, setExpandedYears] = useState<{
    [year: string]: boolean;
  }>({});

  // Show Oura success message if redirected from callback
  const showOuraSuccess = router.query.oura === "success";
  // Show Withings success message if redirected from callback
  const showWithingsSuccess = router.query.withings === "success";

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Fetch user logs for trends tab
  useEffect(() => {
    if (tabValue === 1 && user) {
      setLogsLoading(true);
      console.log("Current user.id:", user.id);
      supabase
        .from("daily_logs")
        .select("date,label,value,user_id")
        .eq("user_id", user.id)
        .order("date", { ascending: true })
        .then(({ data }) => {
          console.log("Logs returned from Supabase:", data);
          setUserLogs(data || []);
          setLogsLoading(false);
        });
    }
  }, [tabValue, user]);

  // Fetch Oura data for the last 2 weeks for the current user
  useEffect(() => {
    if (tabValue === 1 && user) {
      setOuraLoading(true);
      // Get date 14 days ago
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13); // include today
      const isoDate = twoWeeksAgo.toISOString().slice(0, 10);
      supabase
        .from("oura_measurements")
        .select("metric, date, value, user_id")
        .eq("user_id", user.id)
        .gte("date", isoDate)
        .order("date", { ascending: true })
        .then(({ data }) => {
          setOuraData(data || []);
          setOuraLoading(false);
        });
    }
  }, [tabValue, user]);

  // Function to re-import all Withings data from 2009-05-01
  const reimportAllWithingsData = async () => {
    if (!user) return;
    setWithingsSyncing(true);
    setWithingsSyncProgress(0);
    setWithingsReimportProgress(null);
    setWithingsReimportEta(null);
    setWithingsReimportStart(Date.now());
    setWithingsReimportWaiting(null);

    try {
      // Get access token
      const { data: tokenRow } = await supabase
        .from("withings_tokens")
        .select("access_token")
        .eq("user_id", user.id)
        .single();

      if (!tokenRow?.access_token) {
        alert(
          "No Withings access token found. Please reconnect your Withings account."
        );
        setWithingsSyncing(false);
        return;
      }

      // Progressive polling loop
      let done = false;
      let lastProgress = null;
      let lastBatchesCompleted = 0;
      let lastTime = Date.now();
      let eta = null;
      while (!done) {
        const response = await fetch("/api/withings/reimport", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            accessToken: tokenRow.access_token,
          }),
        });
        if (!response.ok) throw new Error("Failed to re-import Withings data");
        const result = await response.json();
        setWithingsReimportProgress(result);
        // Calculate progress percent
        const percent =
          result.totalBatches > 0
            ? Math.round((result.batchesCompleted / result.totalBatches) * 100)
            : 0;
        setWithingsSyncProgress(percent);
        // Estimate ETA
        if (result.batchesCompleted > 0 && result.totalBatches > 0) {
          const now = Date.now();
          const elapsed = (now - (withingsReimportStart || now)) / 1000; // seconds
          const avgPerBatch = elapsed / result.batchesCompleted;
          const remaining = result.totalBatches - result.batchesCompleted;
          eta = Math.round(remaining * avgPerBatch);
          setWithingsReimportEta(eta);
        }
        // Show waiting if progress hasn't changed for >10s (rate limit likely)
        if (lastProgress && result.batchesCompleted === lastBatchesCompleted) {
          const now = Date.now();
          if (now - lastTime > 10000) {
            setWithingsReimportWaiting(eta || 60);
          }
        } else {
          setWithingsReimportWaiting(null);
          lastBatchesCompleted = result.batchesCompleted;
          lastTime = Date.now();
        }
        // Refetch partial data after each batch
        const { data } = await supabase
          .from("withings_weights")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });
        setWithingsWeights(data || []);
        // Done?
        if (result.batchesCompleted >= result.totalBatches) {
          done = true;
        } else {
          // Wait a bit before polling again
          await new Promise((res) => setTimeout(res, 1500));
        }
        lastProgress = result;
      }
      alert(
        `Successfully re-imported ${
          withingsReimportProgress?.upserted || 0
        } Withings data points!`
      );
    } catch (error) {
      console.error("Error re-importing Withings data:", error);
      alert("Failed to re-import Withings data. Please try again.");
    } finally {
      setWithingsSyncing(false);
      setWithingsSyncProgress(0);
      setWithingsReimportEta(null);
      setWithingsReimportStart(null);
      setWithingsReimportWaiting(null);
    }
  };

  // Function to sync Oura data for the current user
  const syncOuraData = async () => {
    setOuraSyncing(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      alert("Not authenticated");
      setOuraSyncing(false);
      return;
    }
    const res = await fetch("/api/oura/fetch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      // Refetch Oura data after sync
      setTimeout(() => {
        setTabValue(1); // Ensure we're on the right tab
        setOuraLoading(true);
        // Get date 14 days ago
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);
        const isoDate = twoWeeksAgo.toISOString().slice(0, 10);
        supabase
          .from("oura_measurements")
          .select("metric, date, value, user_id")
          .eq("user_id", user?.id)
          .gte("date", isoDate)
          .order("date", { ascending: true })
          .then(({ data }) => {
            setOuraData(data || []);
            setOuraLoading(false);
          });
      }, 2000); // Wait a bit for the backend to finish
    } else {
      alert("Failed to sync Oura data");
    }
    setOuraSyncing(false);
  };

  // Oura Connect Button handler
  const handleOuraConnect = async () => {
    if (!user) {
      alert("You must be logged in to connect Oura.");
      return;
    }
    const userId = user!.id;
    const clientId = process.env.NEXT_PUBLIC_OURA_CLIENT_ID!;
    const redirectUri = encodeURIComponent(
      "http://localhost:3000/api/oura/callback"
    );
    const scope = "email personal daily heartrate";
    const authUrl = `https://cloud.ouraring.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&state=${userId}`;
    window.location.href = authUrl;
  };

  // Check Withings connection and fetch weights
  useEffect(() => {
    if (!user) return;
    console.log("[Analytics] Checking Withings connection for user:", user.id);
    supabase
      .from("withings_tokens")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        console.log("[Analytics] Withings tokens query result:", {
          data,
          error,
        });
        setWithingsConnected(!!data && data.length > 0);
        console.log(
          "[Analytics] Setting withingsConnected to:",
          !!data && data.length > 0
        );
      });
    supabase
      .from("withings_weights")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        console.log("[Analytics] Withings weights query result:", {
          data,
          error,
        });
        setWithingsWeights(data || []);
      });
  }, [user]);

  const connectWithings = () => {
    // Use a real browser redirect to ensure cookies are sent
    window.location.href = "/api/withings/auth";
  };

  // On analytics page load, check for missing Withings data and fetch if needed
  useEffect(() => {
    if (!user || !withingsConnected) return;
    const syncIfNeeded = async () => {
      setWithingsSyncing(true);
      // Get latest date in Supabase
      const { data: latestRow } = await supabase
        .from("withings_weights")
        .select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .single();
      const latestDate = latestRow?.date;
      const todayStr = formatISO(new Date(), { representation: "date" });
      if (latestDate && latestDate >= todayStr) {
        setWithingsSyncing(false);
        return; // Already up to date
      }
      // Get access token
      const { data: tokenRow } = await supabase
        .from("withings_tokens")
        .select("access_token")
        .eq("user_id", user.id)
        .single();
      if (!tokenRow?.access_token) {
        setWithingsSyncing(false);
        return;
      }
      // Fetch missing data in batches
      await fetchMissingWithingsData({
        userId: user.id,
        accessToken: tokenRow.access_token,
        latestDate,
        onProgress: (count) => setWithingsSyncProgress(count),
      });
      // Refetch weights after sync
      const { data } = await supabase
        .from("withings_weights")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      setWithingsWeights(data || []);
      setWithingsSyncing(false);
      setWithingsSyncProgress(0);
    };
    syncIfNeeded();
  }, [user, withingsConnected]);

  // Helper for toggling metric selection
  const handleMetricClick = (metric: string) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metric)) {
        // Deselect if already selected
        return prev.filter((m) => m !== metric);
      } else {
        // Select (allow multi-select with ctrl/cmd, else single)
        if (window.event && (window.event as MouseEvent).ctrlKey) {
          return [...prev, metric];
        } else {
          return [metric];
        }
      }
    });
  };

  // Helper for toggling year expansion
  const handleYearToggle = (year: string) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }));
  };

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">
          Please log in to access analytics features.
        </Alert>
      </Container>
    );
  }

  const allWithingsSorted = withingsWeights.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Define metricKeys as a flat string[] of metric names
  const metricKeys = Array.from(
    new Set(
      allWithingsSorted.flatMap((row) =>
        Object.keys(row).filter(
          (k) =>
            k !== "id" && k !== "user_id" && k !== "date" && k !== "raw_data"
        )
      )
    )
  );

  // Define the plugin here so it can access metricKeys and selectedMetrics
  const goldLegendPlugin = {
    id: "goldLegendPlugin",
    afterDraw(chart: any) {
      if (!chart.legend || !chart.legend.legendItems) return;
      const ctx = chart.ctx;
      chart.legend.legendItems.forEach((item: any) => {
        const color = item.fontColor || "white";
        ctx.save();
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = color;
        const text = item.text;
        const x = item.left !== undefined ? item.left + 30 : 0;
        const y = item.top !== undefined ? item.top + 12 : 0;
        ctx.fillText(text, x, y);
        ctx.restore();
      });
    },
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        📊 Analytics & Insights
      </Typography>

      <Typography
        variant="h6"
        color="textSecondary"
        align="center"
        sx={{ mb: 4 }}
      >
        Analyze your data and manage privacy settings
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="analytics tabs"
        >
          <Tab label="Trends & Patterns" />
          <Tab label="Data Analysis" />
          <Tab label="Community Insights" />
        </Tabs>
      </Box>

      {/* Trends & Patterns Tab */}
      <TabPanel value={tabValue} index={0}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            📊 Trends & Patterns
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Discover long-term trends and recurring patterns in your data.
          </Typography>
          {/* Oura Connect Button */}
          {ouraData.length === 0 && !ouraLoading && (
            <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                To view your Oura data, connect your Oura account below.
              </Alert>
              <Button
                variant="contained"
                color="primary"
                onClick={handleOuraConnect}
                sx={{ mb: 2 }}
              >
                Connect Oura Account
              </Button>
            </Box>
          )}
          {showOuraSuccess && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Oura connection successful! You can now view your Oura data for
              the last couple of weeks below.
            </Alert>
          )}
          {showWithingsSuccess && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Withings connection successful! You can now view and sync your
              Withings weight data below.
            </Alert>
          )}
          <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={syncOuraData}
              disabled={ouraSyncing}
            >
              {ouraSyncing ? "Syncing Oura Data..." : "Sync Oura Data"}
            </Button>
          </Box>
          {/* Withings Connect/Sync Buttons */}
          {!withingsConnected ? (
            <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                To view your Withings data, connect your Withings account below.
              </Alert>
              <Button
                variant="contained"
                color="primary"
                onClick={connectWithings}
                sx={{ mb: 2 }}
              >
                Connect Withings Account
              </Button>
            </Box>
          ) : (
            <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={reimportAllWithingsData}
                disabled={withingsSyncing}
              >
                {withingsSyncing
                  ? "Re-importing..."
                  : "Re-import All Withings Data"}
              </Button>
            </Box>
          )}
          {withingsSyncing && withingsReimportProgress && (
            <Alert severity="info" sx={{ mb: 2, alignItems: "center" }}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box flex={1}>
                  <b>Withings Data Import Progress:</b>{" "}
                  {withingsReimportProgress.batchesCompleted} /{" "}
                  {withingsReimportProgress.totalBatches} batches (
                  {withingsSyncProgress}%)
                  <br />
                  {withingsReimportEta !== null && (
                    <span>
                      Estimated time remaining:{" "}
                      {Math.ceil(withingsReimportEta / 60)} min{" "}
                      {withingsReimportEta % 60} sec
                    </span>
                  )}
                  {withingsReimportWaiting && (
                    <span style={{ color: "orange", marginLeft: 8 }}>
                      Rate limited, waiting {withingsReimportWaiting} seconds
                      before continuing...
                    </span>
                  )}
                </Box>
                <Box flex={1}>
                  <LinearProgress
                    variant="determinate"
                    value={withingsSyncProgress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
              </Box>
            </Alert>
          )}
          {withingsReimportProgress &&
            !withingsSyncing &&
            withingsReimportProgress.totalAvailable !== undefined && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Imported {withingsReimportProgress.upserted} out of{" "}
                {withingsReimportProgress.totalAvailable} available Withings
                records (
                {withingsReimportProgress.totalAvailable > 0
                  ? (
                      (withingsReimportProgress.upserted /
                        withingsReimportProgress.totalAvailable) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                %)
              </Alert>
            )}
          {/* Withings Weight Chart */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Withings Metrics (Normalized, All Available Data)
          </Typography>
          {allWithingsSorted.length === 0 ? (
            <Alert severity="info">No Withings data found.</Alert>
          ) : (
            <>
              {/* Metric selection */}
              <Box sx={{ mb: 2, maxWidth: 400 }}>
                <Select
                  isMulti
                  options={metricKeys.map((k) => ({
                    label: k.replace(/_/g, " "),
                    value: k,
                  }))}
                  value={
                    selectedMetrics.length > 0
                      ? metricKeys
                          .filter((k) => selectedMetrics.includes(k))
                          .map((k) => ({
                            label: k.replace(/_/g, " "),
                            value: k,
                          }))
                      : metricKeys.slice(0, 3).map((k) => ({
                          label: k.replace(/_/g, " "),
                          value: k,
                        }))
                  }
                  onChange={(opts) =>
                    setSelectedMetrics(opts.map((o) => o.value))
                  }
                  placeholder="Select metrics to display..."
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: "#23272b",
                      color: "#fff",
                      borderColor: state.isFocused ? "#6366f1" : "#444",
                      boxShadow: state.isFocused
                        ? "0 0 0 2px #6366f1"
                        : undefined,
                      minHeight: 44,
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: "#181a1b",
                      color: "#fff",
                      zIndex: 9999,
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isFocused ? "#6366f1" : "#23272b",
                      color: state.isFocused ? "#fff" : "#fff",
                      cursor: "pointer",
                    }),
                    multiValue: (base) => ({
                      ...base,
                      backgroundColor: "#6366f1",
                      color: "#fff",
                    }),
                    multiValueLabel: (base) => ({
                      ...base,
                      color: "#fff",
                    }),
                    multiValueRemove: (base) => ({
                      ...base,
                      color: "#fff",
                      ":hover": {
                        backgroundColor: "#ef4444",
                        color: "#fff",
                      },
                    }),
                    input: (base) => ({
                      ...base,
                      color: "#fff",
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: "#aaa",
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: "#fff",
                    }),
                    indicatorSeparator: (base) => ({
                      ...base,
                      backgroundColor: "#444",
                    }),
                    dropdownIndicator: (base, state) => ({
                      ...base,
                      color: state.isFocused ? "#6366f1" : "#fff",
                      ":hover": { color: "#6366f1" },
                    }),
                    clearIndicator: (base) => ({
                      ...base,
                      color: "#fff",
                      ":hover": { color: "#ef4444" },
                    }),
                  }}
                />
              </Box>
              {/* Normalized Multi-metric Chart */}
              {(() => {
                // Prepare original values for tooltips
                const originalValues: Record<string, (number | null)[]> = {};
                metricKeys.forEach((k) => {
                  originalValues[k] = allWithingsSorted.map((w) =>
                    w[k] !== undefined && w[k] !== null ? Number(w[k]) : null
                  );
                });
                // Color palette (colorblind-friendly)
                const palette = chroma
                  .scale([
                    "#0072B2",
                    "#E69F00",
                    "#009E73",
                    "#F0E442",
                    "#56B4E9",
                    "#D55E00",
                    "#CC79A7",
                    "#999999",
                  ])
                  .colors(metricKeys.length);
                // Prepare normalized datasets
                const activeMetrics =
                  selectedMetrics.length > 0
                    ? selectedMetrics
                    : metricKeys.slice(0, 3);
                const datasets = activeMetrics.map((k, i) => {
                  const values = originalValues[k];
                  // Filter out nulls for min/max
                  const safeValidValues = values
                    .map((v) =>
                      typeof v === "number" && isFinite(v) ? v : undefined
                    )
                    .filter((v): v is number => typeof v === "number");
                  const min =
                    safeValidValues.length > 0
                      ? Math.min(...safeValidValues)
                      : 0;
                  const max =
                    safeValidValues.length > 0
                      ? Math.max(...safeValidValues)
                      : 1;
                  const normalized = values.map((v) =>
                    typeof v !== "number" || !isFinite(v)
                      ? null
                      : max === min
                      ? 1
                      : (v - min) / (max - min)
                  );
                  return {
                    label: k.replace(/_/g, " "),
                    data: normalized,
                    borderColor: palette[i % palette.length],
                    backgroundColor: chroma(palette[i % palette.length])
                      .alpha(0.3)
                      .css(),
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    hidden: false,
                  };
                });
                return (
                  <Box
                    sx={{ background: "#23272b", borderRadius: 3, p: 2, mb: 3 }}
                  >
                    <Line
                      data={{
                        labels: allWithingsSorted.map((w) =>
                          new Date(w.date).toLocaleDateString()
                        ),
                        datasets,
                      }}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            display: true,
                            position: "top",
                            labels: {
                              color: "#fff",
                              font: { size: 14 },
                              usePointStyle: true,
                              padding: 20,
                            },
                            onClick: (e, legendItem, legend) => {
                              const ci = legend.chart;
                              const idx = legendItem.datasetIndex;
                              if (typeof idx !== "number") return;
                              const isVisible = ci.isDatasetVisible(idx);
                              ci.setDatasetVisibility(idx, !isVisible);
                              ci.update();
                            },
                            onHover: (e, legendItem, legend) => {
                              const ci = legend.chart;
                              const idx = legendItem.datasetIndex;
                              if (typeof idx !== "number") return;
                              ci.data.datasets.forEach((ds, i) => {
                                ci.setDatasetVisibility(
                                  i,
                                  i === idx || ci.isDatasetVisible(i)
                                );
                              });
                              ci.update();
                            },
                            onLeave: (e, legendItem, legend) => {
                              const ci = legend.chart;
                              ci.data.datasets.forEach((ds, i) => {
                                ci.setDatasetVisibility(i, true);
                              });
                              ci.update();
                            },
                          },
                          tooltip: {
                            enabled: true,
                            callbacks: {
                              label: function (ctx) {
                                const metric = ctx.dataset.label;
                                if (!metric) return "";
                                const idx = ctx.dataIndex;
                                const orig =
                                  originalValues[metric.replace(/ /g, "_")]?.[
                                    idx
                                  ] ?? null;
                                return `${metric}: ${
                                  orig !== null && orig !== undefined
                                    ? orig.toFixed(2)
                                    : "-"
                                }`;
                              },
                            },
                            backgroundColor: "#222",
                            titleColor: "#fff",
                            bodyColor: "#fff",
                            borderColor: "#888",
                            borderWidth: 1,
                          },
                        },
                        scales: {
                          x: {
                            ticks: {
                              color: "#fff",
                              font: { size: 16 },
                              autoSkip: true,
                              maxTicksLimit: 8, // Show fewer date labels
                            },
                            grid: { color: "#444" },
                          },
                          y: {
                            title: {
                              display: true,
                              text: "Normalized Value (0–1)",
                              color: "#fff",
                              font: { size: 18 },
                            },
                            ticks: {
                              color: "#fff",
                              font: { size: 16 },
                            },
                            grid: { color: "#444" },
                          },
                        },
                      }}
                      height={180}
                    />
                  </Box>
                );
              })()}
              {/* Enhanced Table */}
              <Box sx={{ overflowX: "auto", borderRadius: 3, mb: 4 }}>
                <table
                  className="withings-table-dark"
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <thead
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#181a1b",
                      zIndex: 2,
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          minWidth: 80,
                          width: 80,
                          position: "sticky",
                          left: 0,
                          background: "#181a1b",
                          zIndex: 3,
                        }}
                      >
                        Date
                      </th>
                      {metricKeys.map((k) => (
                        <th
                          key={k}
                          style={{ minWidth: 90, background: "#181a1b" }}
                        >
                          {k.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allWithingsSorted.map((row, i) => (
                      <tr
                        key={row.date}
                        style={{
                          background: i % 2 === 0 ? "#23272b" : "#1a1c1e",
                        }}
                      >
                        <td
                          style={{
                            position: "sticky",
                            left: 0,
                            background: "#23272b",
                            fontWeight: 500,
                          }}
                        >
                          {new Date(row.date).toLocaleDateString()}
                        </td>
                        {metricKeys.map((k) => (
                          <td
                            key={k}
                            style={{
                              textAlign:
                                typeof row[k] === "number" ? "right" : "left",
                            }}
                          >
                            {row[k] !== undefined && row[k] !== null
                              ? row[k]
                              : "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </>
          )}
          {logsLoading ? (
            <Typography>Loading your trends...</Typography>
          ) : userLogs.length === 0 ? (
            <Alert severity="info">No logs found to display trends.</Alert>
          ) : (
            Object.entries(
              userLogs.reduce(
                (
                  acc: Record<string, { date: string; value: string }[]>,
                  log: { label: string; date: string; value: string }
                ) => {
                  if (!acc[log.label]) acc[log.label] = [];
                  acc[log.label].push(log);
                  return acc;
                },
                {} as Record<string, { date: string; value: string }[]>
              )
            ).map(([label, logs]) => {
              const logsArr = logs as { date: string; value: string }[];
              const data = {
                labels: logsArr.map((l) =>
                  new Date(l.date).toLocaleDateString()
                ),
                datasets: [
                  {
                    label,
                    data: logsArr.map((l) => Number(l.value)),
                    fill: false,
                    borderColor: "#6366f1",
                    backgroundColor: "#6366f1",
                    tension: 0.2,
                  },
                ],
              };
              return (
                <Box key={label} sx={{ mb: 5 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    {label}
                  </Typography>
                  <Line
                    data={data}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                    }}
                    height={120}
                  />
                </Box>
              );
            })
          )}
          <Divider sx={{ my: 4 }} />
          <Typography variant="h6" sx={{ mb: 2 }}>
            Oura Data (Last 2 Weeks)
          </Typography>
          {ouraLoading ? (
            <Typography>Loading Oura data...</Typography>
          ) : ouraData.length === 0 ? (
            <Alert severity="info">
              No Oura data found for the last 2 weeks.
            </Alert>
          ) : (
            Object.entries(
              ouraData.reduce(
                (
                  acc: Record<string, { date: string; value: number }[]>,
                  row: any
                ) => {
                  if (!acc[row.metric]) acc[row.metric] = [];
                  acc[row.metric].push({
                    date: row.date,
                    value: Number(row.value),
                  });
                  return acc;
                },
                {} as Record<string, { date: string; value: number }[]>
              )
            ).map(([metric, rows]) => {
              const data = {
                labels: rows.map((r) => new Date(r.date).toLocaleDateString()),
                datasets: [
                  {
                    label: metric,
                    data: rows.map((r) => r.value),
                    fill: false,
                    borderColor: "#10b981",
                    backgroundColor: "#10b981",
                    tension: 0.2,
                  },
                ],
              };
              return (
                <Box key={metric} sx={{ mb: 5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    {metric}
                  </Typography>
                  <Line
                    data={data}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                    }}
                    height={120}
                  />
                </Box>
              );
            })
          )}
        </Paper>
      </TabPanel>

      {/* Data Analysis Tab */}
      <TabPanel value={tabValue} index={1}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            📈 Data Analysis
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Analyze your logged data to discover patterns and insights.
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Data analysis features are coming soon. This will include:
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              <li>Correlation analysis between variables</li>
              <li>Statistical summaries and trends</li>
              <li>Custom chart creation</li>
              <li>Export capabilities</li>
            </Box>
          </Alert>
        </Paper>
      </TabPanel>

      {/* Community Insights Tab */}
      <TabPanel value={tabValue} index={2}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            👥 Community Insights
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Compare your data with the community (anonymized and
            privacy-respecting).
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Community insights features are coming soon. This will include:
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              <li>Anonymous community averages</li>
              <li>Benchmark comparisons</li>
              <li>Shared experiment results</li>
              <li>Community challenges and goals</li>
            </Box>
          </Alert>
        </Paper>
      </TabPanel>
    </Container>
  );
}
