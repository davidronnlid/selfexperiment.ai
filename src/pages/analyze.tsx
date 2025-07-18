import React from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  Divider,
  Button,
} from "@mui/material";
import { useUser } from "./_app";
import { useRouter } from "next/router";
import ManualLogsChart from "@/components/ManualLogsChart";
import ManualLogsTable from "@/components/ManualLogsTable";
import CorrelationAnalysis from "@/components/CorrelationAnalysis";
import ComprehensiveHealthDashboard from "@/components/ComprehensiveHealthDashboard";

export default function Analyze() {
  const { user } = useUser();
  const router = useRouter();

  // Show success messages if redirected from callbacks
  const showOuraSuccess = router.query.oura === "success";
  const showWithingsSuccess = router.query.withings === "success";

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">Please log in to access analyze features.</Alert>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: 4,
        minHeight: "100vh",
        overflow: "visible",
      }}
    >
      <Typography variant="h3" component="h1" gutterBottom align="center">
        📊 Analytics
      </Typography>

      <Typography
        variant="h6"
        color="textSecondary"
        align="center"
        sx={{ mb: 4 }}
      >
        Analyze your health data to discover patterns and insights
      </Typography>

      {/* Data Analysis - No tabs needed since it's the only section */}
      <Paper elevation={3} sx={{ p: 4, overflow: "visible" }}>
        <Typography variant="h5" gutterBottom>
          🔬 Data Analysis
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Analyze your health data to discover patterns and insights.
        </Typography>

        {user && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              overflow: "visible",
              minHeight: "fit-content",
            }}
          >
            {showOuraSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Oura Ring connected successfully! Your data is now being
                synchronized.
              </Alert>
            )}
            {showWithingsSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Withings device connected successfully! Your data is now being
                synchronized.
              </Alert>
            )}
            <ManualLogsChart userId={user.id} />
            <Divider />
            <CorrelationAnalysis userId={user.id} />
            <Divider />
            <ManualLogsTable userId={user.id} />
            <Divider />
            <ComprehensiveHealthDashboard userId={user.id} />
          </Box>
        )}
      </Paper>
    </Container>
  );
}
