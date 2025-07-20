import React, { useState } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import { useUser } from "./_app";
import { useRouter } from "next/router";
import CorrelationAnalysis from "@/components/CorrelationAnalysis";
import ComprehensiveHealthDashboard from "@/components/ComprehensiveHealthDashboard";
import DataSourcesAnalysis from "@/components/DataSourcesAnalysis";
import { FaChartLine, FaLink } from "react-icons/fa";

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
      style={{ overflow: "auto", height: "auto" }}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3, overflow: "auto" }}>{children}</Box>
      )}
    </div>
  );
}

export default function Analyze() {
  const { user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

  // Show success messages if redirected from callbacks
  const showOuraSuccess = router.query.oura === "success";
  const showWithingsSuccess = router.query.withings === "success";

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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
        overflow: "auto",
        height: "auto",
      }}
    >
      <Typography variant="h3" component="h1" gutterBottom align="center">
        📊 Comprehensive Health Analytics
      </Typography>

      <Typography
        variant="h6"
        color="textSecondary"
        align="center"
        sx={{ mb: 4 }}
      >
        Analyze your health data to discover patterns and insights
      </Typography>

      {/* Success Messages */}
      {showOuraSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Oura Ring connected successfully! Your data is now being synchronized.
        </Alert>
      )}
      {showWithingsSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Withings device connected successfully! Your data is now being
          synchronized.
        </Alert>
      )}

      {/* Data Source Connections - Hidden but can be easily restored
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <FaLink />
            <Typography variant="h6">Data Source Connections</Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                border: "1px solid #e0e0e0",
                borderRadius: 1,
                flex: 1,
              }}
            >
              <Box sx={{ fontSize: "1.5rem" }}>🛏️</Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Oura Ring
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Sleep and recovery data
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                color="success"
                sx={{ mr: 1 }}
              >
                Connected
              </Button>
              <Button variant="outlined" size="small" color="warning">
                Sync
              </Button>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                border: "1px solid #e0e0e0",
                borderRadius: 1,
                flex: 1,
              }}
            >
              <Box sx={{ fontSize: "1.5rem" }}>⚖️</Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Withings Scale
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Body composition data
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                color="success"
                sx={{ mr: 1 }}
              >
                Connected
              </Button>
              <Button variant="outlined" size="small" color="warning">
                Sync
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
      */}

      {/* Main Analytics Tabs */}
      <Paper elevation={3} sx={{ overflow: "auto", height: "auto" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              "& .MuiTab-root": {
                minHeight: 64,
                fontSize: "0.9rem",
                fontWeight: 500,
              },
              "& .Mui-selected": {
                color: "#FFD700",
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#FFD700",
                height: 3,
              },
            }}
          >
            <Tab
              icon={<FaChartLine />}
              label="Overview"
              iconPosition="start"
              sx={{ textTransform: "none" }}
            />
            <Tab
              icon={<FaLink />}
              label="Correlations"
              iconPosition="start"
              sx={{ textTransform: "none" }}
            />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              📈 Health Overview
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Get a comprehensive view of your health data across all connected
              sources.
            </Typography>

            {/* Data Sources Included in Analysis - Shared Component */}
            {user && <DataSourcesAnalysis userId={user.id} />}

            {user && <ComprehensiveHealthDashboard userId={user.id} />}
          </Box>
        </TabPanel>

        {/* Correlations Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              🔗 Variable Correlations
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Discover relationships between your health variables with detailed
              statistical analysis and interactive charts.
            </Typography>

            {/* Data Sources Included in Analysis - Shared Component */}
            {user && <DataSourcesAnalysis userId={user.id} />}

            {user && <CorrelationAnalysis userId={user.id} />}
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
}
