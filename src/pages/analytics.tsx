import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Alert,
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
  const [tabValue, setTabValue] = useState(0);
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Fetch user logs for trends tab
  useEffect(() => {
    if (tabValue === 1 && user) {
      setLogsLoading(true);
      supabase
        .from("daily_logs")
        .select("date,label,value")
        .eq("user_id", user.id)
        .order("date", { ascending: true })
        .then(({ data }) => {
          setUserLogs(data || []);
          setLogsLoading(false);
        });
    }
  }, [tabValue, user]);

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
          <Tab label="Data Analysis" />
          <Tab label="Trends & Patterns" />
          <Tab label="Community Insights" />
        </Tabs>
      </Box>

      {/* Data Analysis Tab */}
      <TabPanel value={tabValue} index={0}>
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

      {/* Trends & Patterns Tab */}
      <TabPanel value={tabValue} index={1}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            📊 Trends & Patterns
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Discover long-term trends and recurring patterns in your data.
          </Typography>
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
