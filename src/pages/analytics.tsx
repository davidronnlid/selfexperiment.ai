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
  Tooltip,
  Legend,
} from "chart.js";
import { useRouter } from "next/router";
import ManualLogsChart from "@/components/ManualLogsChart";
import ManualLogsTable from "@/components/ManualLogsTable";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
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

export default function Analytics() {
  const { user } = useUser();
  const router = useRouter();
  const [tabValue, setTabValue] = useState(1); // Default to Data Analysis tab
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [ouraData, setOuraData] = useState<any[]>([]);
  const [ouraLoading, setOuraLoading] = useState(false);
  const [ouraSyncing, setOuraSyncing] = useState(false);

  // Show Oura success message if redirected from callback
  const showOuraSuccess = router.query.oura === "success";

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Fetch user logs for trends tab
  useEffect(() => {
    if (tabValue === 0 && user) {
      setLogsLoading(true);
      console.log("Current user.id:", user.id);
      supabase
        .from("logs")
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
    if (tabValue === 0 && user) {
      setOuraLoading(true);
      // Get date 14 days ago
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13); // include today
      const isoDate = twoWeeksAgo.toISOString().slice(0, 10);
      supabase
        .from("measurements")
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
          .from("measurements")
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

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">
          Please log in to access analytics features.
        </Alert>
      </Container>
    );
  }

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
            📈 Trends & Patterns
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
            🔬 Data Analysis
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Analyze your manually logged data to discover patterns and insights.
          </Typography>

          {user && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <ManualLogsChart userId={user.id} />
              <Divider />
              <ManualLogsTable userId={user.id} />
            </Box>
          )}
        </Paper>
      </TabPanel>

      {/* Community Insights Tab */}
      <TabPanel value={tabValue} index={2}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            🌍 Community Insights
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
