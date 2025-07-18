import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  TextField,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Science as ScienceIcon,
  Favorite as HeartIcon,
  MonitorHeart as MonitorHeartIcon,
  Scale as ScaleIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useUser } from "./_app";
import { supabase } from "@/utils/supaBase";

// Extended Withings measurement types
const EXTENDED_MEAS_TYPES = {
  // Body Composition (current)
  body_composition: {
    name: "Body Composition",
    icon: <ScaleIcon />,
    types: [
      {
        type: 1,
        name: "weight_kg",
        label: "Weight (kg)",
        description: "Body weight",
      },
      {
        type: 5,
        name: "fat_free_mass_kg",
        label: "Fat-Free Mass (kg)",
        description: "Lean body mass",
      },
      {
        type: 6,
        name: "fat_ratio",
        label: "Fat Ratio (%)",
        description: "Body fat percentage",
      },
      {
        type: 8,
        name: "fat_mass_weight_kg",
        label: "Fat Mass (kg)",
        description: "Fat mass weight",
      },
      {
        type: 76,
        name: "muscle_mass_kg",
        label: "Muscle Mass (kg)",
        description: "Muscle mass",
      },
      {
        type: 77,
        name: "hydration_kg",
        label: "Hydration (kg)",
        description: "Body water content",
      },
      {
        type: 88,
        name: "bone_mass_kg",
        label: "Bone Mass (kg)",
        description: "Bone mass",
      },
    ],
  },

  // Blood Pressure
  blood_pressure: {
    name: "Blood Pressure",
    icon: <MonitorHeartIcon />,
    types: [
      {
        type: 9,
        name: "diastolic_bp",
        label: "Diastolic BP (mmHg)",
        description: "Diastolic blood pressure",
      },
      {
        type: 10,
        name: "systolic_bp",
        label: "Systolic BP (mmHg)",
        description: "Systolic blood pressure",
      },
      {
        type: 11,
        name: "heart_pulse",
        label: "Heart Pulse (bpm)",
        description: "Heart rate during BP measurement",
      },
    ],
  },

  // Heart Rate
  heart_rate: {
    name: "Heart Rate",
    icon: <HeartIcon />,
    types: [
      {
        type: 12,
        name: "heart_rate",
        label: "Heart Rate (bpm)",
        description: "Resting heart rate",
      },
      {
        type: 13,
        name: "heart_rate_variability",
        label: "HRV (ms)",
        description: "Heart rate variability",
      },
    ],
  },

  // Activity & Steps
  activity: {
    name: "Activity",
    icon: <TimelineIcon />,
    types: [
      {
        type: 16,
        name: "steps",
        label: "Steps",
        description: "Daily step count",
      },
      {
        type: 17,
        name: "calories",
        label: "Calories (kcal)",
        description: "Calories burned",
      },
      {
        type: 18,
        name: "distance",
        label: "Distance (m)",
        description: "Distance walked/run",
      },
      {
        type: 19,
        name: "elevation",
        label: "Elevation (m)",
        description: "Elevation gained",
      },
    ],
  },

  // Sleep
  sleep: {
    name: "Sleep",
    icon: <ScienceIcon />,
    types: [
      {
        type: 20,
        name: "sleep_duration",
        label: "Sleep Duration (min)",
        description: "Total sleep time",
      },
      {
        type: 21,
        name: "sleep_light",
        label: "Light Sleep (min)",
        description: "Light sleep duration",
      },
      {
        type: 22,
        name: "sleep_deep",
        label: "Deep Sleep (min)",
        description: "Deep sleep duration",
      },
      {
        type: 23,
        name: "sleep_rem",
        label: "REM Sleep (min)",
        description: "REM sleep duration",
      },
      {
        type: 24,
        name: "sleep_wake",
        label: "Wake Time (min)",
        description: "Time awake during sleep",
      },
    ],
  },

  // Temperature
  temperature: {
    name: "Temperature",
    icon: <ScienceIcon />,
    types: [
      {
        type: 71,
        name: "temperature",
        label: "Temperature (°C)",
        description: "Body temperature",
      },
      {
        type: 73,
        name: "skin_temperature",
        label: "Skin Temperature (°C)",
        description: "Skin temperature",
      },
    ],
  },

  // SpO2
  spo2: {
    name: "Blood Oxygen",
    icon: <MonitorHeartIcon />,
    types: [
      {
        type: 54,
        name: "spo2",
        label: "SpO2 (%)",
        description: "Blood oxygen saturation",
      },
    ],
  },

  // ECG
  ecg: {
    name: "ECG",
    icon: <MonitorHeartIcon />,
    types: [
      {
        type: 91,
        name: "ecg",
        label: "ECG",
        description: "Electrocardiogram data",
      },
    ],
  },

  // Other
  other: {
    name: "Other",
    icon: <ScienceIcon />,
    types: [
      {
        type: 14,
        name: "pulse_wave_velocity",
        label: "Pulse Wave Velocity",
        description: "Arterial stiffness",
      },
      {
        type: 15,
        name: "vo2_max",
        label: "VO2 Max",
        description: "Maximum oxygen consumption",
      },
      {
        type: 25,
        name: "sleep_score",
        label: "Sleep Score",
        description: "Overall sleep quality score",
      },
      {
        type: 26,
        name: "sleep_latency",
        label: "Sleep Latency (min)",
        description: "Time to fall asleep",
      },
      {
        type: 27,
        name: "sleep_efficiency",
        label: "Sleep Efficiency (%)",
        description: "Sleep efficiency percentage",
      },
      {
        type: 28,
        name: "sleep_midpoint",
        label: "Sleep Midpoint",
        description: "Middle of sleep period",
      },
      {
        type: 29,
        name: "sleep_hr_lowest",
        label: "Lowest HR During Sleep",
        description: "Lowest heart rate during sleep",
      },
      {
        type: 30,
        name: "sleep_hr_average",
        label: "Average HR During Sleep",
        description: "Average heart rate during sleep",
      },
      {
        type: 31,
        name: "sleep_hr_highest",
        label: "Highest HR During Sleep",
        description: "Highest heart rate during sleep",
      },
      {
        type: 32,
        name: "sleep_hrv_lowest",
        label: "Lowest HRV During Sleep",
        description: "Lowest HRV during sleep",
      },
      {
        type: 33,
        name: "sleep_hrv_average",
        label: "Average HRV During Sleep",
        description: "Average HRV during sleep",
      },
      {
        type: 34,
        name: "sleep_hrv_highest",
        label: "Highest HRV During Sleep",
        description: "Highest HRV during sleep",
      },
    ],
  },
};

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  count?: number;
  measurementTypes?: string[];
}

export default function WithingsDev() {
  const { user, loading } = useUser();
  const [connected, setConnected] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>(
    {}
  );
  const [selectedCategory, setSelectedCategory] =
    useState<string>("body_composition");
  const [customMeastypes, setCustomMeastypes] =
    useState<string>("1,5,6,8,76,77,88");
  const [dateRange, setDateRange] = useState<string>("30"); // days
  const [rawData, setRawData] = useState<any>(null);

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      if (!user?.id) return;

      try {
        const { data: tokens } = await supabase
          .from("withings_tokens")
          .select("access_token")
          .eq("user_id", user.id)
          .limit(1);

        setConnected(!!tokens && tokens.length > 0);
      } catch (error) {
        console.error("Error checking connection:", error);
        setConnected(false);
      }
    };

    checkConnection();
  }, [user?.id]);

  // Test specific measurement types
  const testMeasurementTypes = async (category: string, types: number[]) => {
    if (!user?.id) return;

    setTesting(true);
    try {
      const now = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const startdate = Math.floor(startDate.getTime() / 1000);
      const enddate = Math.floor(now.getTime() / 1000);

      console.log(`Testing ${category} with types: ${types.join(",")}`);
      console.log(
        `Date range: ${startDate.toISOString()} to ${now.toISOString()}`
      );

      const response = await fetch(
        `/api/withings/fetch?startdate=${startdate}&enddate=${enddate}&meastype=${types.join(
          ","
        )}&user_id=${user.id}`,
        { method: "GET" }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setTestResults((prev) => ({
          ...prev,
          [category]: {
            success: true,
            data: result.rows,
            count: result.count,
            measurementTypes: types.map((t) => t.toString()),
          },
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          [category]: {
            success: false,
            error: result.error || "Unknown error",
            measurementTypes: types.map((t) => t.toString()),
          },
        }));
      }
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [category]: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          measurementTypes: types.map((t) => t.toString()),
        },
      }));
    } finally {
      setTesting(false);
    }
  };

  // Test custom measurement types
  const testCustomMeastypes = async () => {
    if (!user?.id) return;

    const types = customMeastypes
      .split(",")
      .map((t) => parseInt(t.trim()))
      .filter((t) => !isNaN(t));
    if (types.length === 0) {
      alert("Please enter valid measurement types");
      return;
    }

    await testMeasurementTypes("custom", types);
  };

  // Test all categories
  const testAllCategories = async () => {
    if (!user?.id) return;

    setTesting(true);
    const results: Record<string, TestResult> = {};

    for (const [category, categoryData] of Object.entries(
      EXTENDED_MEAS_TYPES
    )) {
      try {
        const types = categoryData.types.map((t) => t.type);
        const now = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(dateRange));

        const startdate = Math.floor(startDate.getTime() / 1000);
        const enddate = Math.floor(now.getTime() / 1000);

        const response = await fetch(
          `/api/withings/fetch?startdate=${startdate}&enddate=${enddate}&meastype=${types.join(
            ","
          )}&user_id=${user.id}`,
          { method: "GET" }
        );

        const result = await response.json();

        if (response.ok && result.success) {
          results[category] = {
            success: true,
            data: result.rows,
            count: result.count,
            measurementTypes: types.map((t) => t.toString()),
          };
        } else {
          results[category] = {
            success: false,
            error: result.error || "Unknown error",
            measurementTypes: types.map((t) => t.toString()),
          };
        }
      } catch (error) {
        results[category] = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          measurementTypes: categoryData.types.map((t) => t.type.toString()),
        };
      }
    }

    setTestResults(results);
    setTesting(false);
  };

  // Get available data from database
  const fetchAvailableData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("withings_variable_data_points")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(100);

      if (error) throw error;

      setRawData(data);
    } catch (error) {
      console.error("Error fetching available data:", error);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        🔬 Withings Data Explorer
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>Explore Additional Withings Data Types</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Test different measurement types to see what additional health data is
          available from your Withings devices.
          <br />
          User ID: {user?.id || "Not logged in"}
          <br />
          Connection Status: {connected ? "✅ Connected" : "❌ Not Connected"}
        </Typography>
      </Alert>

      {!connected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body1">
            You need to connect your Withings account first.
          </Typography>
          <Button
            variant="contained"
            onClick={() => (window.location.href = "/api/withings/auth")}
            sx={{ mt: 1 }}
          >
            Connect Withings
          </Button>
        </Alert>
      )}

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Controls
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRange}
                  label="Date Range"
                  onChange={(e: SelectChangeEvent) =>
                    setDateRange(e.target.value)
                  }
                >
                  <MenuItem value="7">Last 7 days</MenuItem>
                  <MenuItem value="30">Last 30 days</MenuItem>
                  <MenuItem value="90">Last 90 days</MenuItem>
                  <MenuItem value="365">Last year</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  onClick={testAllCategories}
                  disabled={testing || !connected}
                  startIcon={
                    testing ? <CircularProgress size={16} /> : <RefreshIcon />
                  }
                >
                  Test All Categories
                </Button>

                <Button
                  variant="outlined"
                  onClick={fetchAvailableData}
                  disabled={!connected}
                >
                  View Available Data
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => (window.location.href = "/api/withings/auth")}
                >
                  Reconnect Withings
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Custom Measurement Types */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Custom Measurement Types
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                label="Measurement Types (comma-separated)"
                value={customMeastypes}
                onChange={(e) => setCustomMeastypes(e.target.value)}
                placeholder="e.g., 1,5,6,8,76,77,88"
                helperText="Enter Withings measurement type IDs separated by commas"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Button
                variant="contained"
                onClick={testCustomMeastypes}
                disabled={testing || !connected}
                fullWidth
              >
                Test Custom Types
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Measurement Categories */}
      {Object.entries(EXTENDED_MEAS_TYPES).map(([category, categoryData]) => (
        <Accordion key={category} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {categoryData.icon}
              <Typography variant="h6">{categoryData.name}</Typography>
              {testResults[category] && (
                <Chip
                  icon={
                    testResults[category].success ? (
                      <CheckCircleIcon />
                    ) : (
                      <ErrorIcon />
                    )
                  }
                  label={testResults[category].success ? "Success" : "Failed"}
                  color={testResults[category].success ? "success" : "error"}
                  size="small"
                />
              )}
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Available Measurement Types:
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                  {categoryData.types.map((type) => (
                    <Chip
                      key={type.type}
                      label={`${type.type}: ${type.label}`}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Button
                  variant="outlined"
                  onClick={() =>
                    testMeasurementTypes(
                      category,
                      categoryData.types.map((t) => t.type)
                    )
                  }
                  disabled={testing || !connected}
                  fullWidth
                >
                  Test {categoryData.name}
                </Button>
              </Grid>
            </Grid>

            {/* Test Results */}
            {testResults[category] && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Test Results:
                </Typography>

                {testResults[category].success ? (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Success!</strong> Found{" "}
                      {testResults[category].count || 0} data points.
                    </Typography>
                    {testResults[category].data &&
                      testResults[category].data.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            Sample Data:
                          </Typography>
                          <pre
                            style={{
                              fontSize: "12px",
                              marginTop: "4px",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {JSON.stringify(
                              testResults[category].data?.slice(0, 2),
                              null,
                              2
                            )}
                          </pre>
                        </Box>
                      )}
                  </Alert>
                ) : (
                  <Alert severity="error">
                    <Typography variant="body2">
                      <strong>Error:</strong> {testResults[category].error}
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Available Data Table */}
      {rawData && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Available Data in Database ({rawData.length} records)
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Variable</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell>Source</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rawData.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(item.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{item.variable}</TableCell>
                      <TableCell align="right">{item.value}</TableCell>
                      <TableCell>Withings</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Summary
          </Typography>
          <Typography variant="body2" color="textSecondary">
            This page allows you to explore what additional health data is
            available from your Withings devices.
            <br />
            • Test different measurement categories to see what data is
            available
            <br />
            • Use custom measurement types to test specific data points
            <br />
            • View existing data in your database
            <br />• Common additional data types include blood pressure, heart
            rate, SpO2, and more
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
