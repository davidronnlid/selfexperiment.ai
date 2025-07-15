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
import OuraIntegration from "@/components/OuraIntegration";
import WithingsIntegration from "@/components/WithingsIntegration";

export default function Analytics() {
  const { user } = useUser();
  const router = useRouter();

  // Show success messages if redirected from callbacks
  const showOuraSuccess = router.query.oura === "success";
  const showWithingsSuccess = router.query.withings === "success";

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
        Analyze your app data to discover patterns and insights
      </Typography>

      {/* Data Analysis - No tabs needed since it's the only section */}
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          🔬 Data Analysis
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Analyze your app data to discover patterns and insights.
        </Typography>

        {user && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
            <Typography variant="h6" sx={{ mb: 2 }}>
              🔗 External Data Sources
            </Typography>
            <OuraIntegration userId={user.id} />
            <WithingsIntegration userId={user.id} />
          </Box>
        )}
      </Paper>
    </Container>
  );
}
