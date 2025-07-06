import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { supabase } from "@/utils/supaBase";
import { format, parseISO, differenceInDays, subDays } from "date-fns";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import WarningIcon from "@mui/icons-material/Warning";
import ScienceIcon from "@mui/icons-material/Science";
import PsychologyIcon from "@mui/icons-material/Psychology";
import TimelineIcon from "@mui/icons-material/Timeline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SchoolIcon from "@mui/icons-material/School";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  ChartTooltip,
  Legend
);

interface ManualLog {
  id: number;
  date: string;
  variable: string;
  value: string;
  notes?: string;
  created_at: string;
}

interface CorrelationAnalysisProps {
  userId: string;
}

interface CorrelationResult {
  variable1: string;
  variable2: string;
  correlation: number;
  strength: "strong" | "moderate" | "weak" | "none";
  direction: "positive" | "negative";
  dataPoints: number;
}

interface CausalAnalysisStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  examples: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const causalAnalysisSteps: CausalAnalysisStep[] = [
  {
    id: 'temporal',
    title: 'Temporal Precedence',
    description: 'Verify that the proposed cause occurs before the effect in time',
    icon: <TimelineIcon />,
    examples: [
      'Check if changes in Variable 1 consistently happen before changes in Variable 2',
      'Look for time lags between variables',
      'Identify if the pattern holds across multiple time periods'
    ],
    difficulty: 'beginner'
  },
  {
    id: 'confounding',
    title: 'Control for Confounding Variables',
    description: 'Identify and account for other variables that might influence both',
    icon: <PsychologyIcon />,
    examples: [
      'Consider external factors (weather, stress, health events)',
      'Look for third variables that might explain both measurements',
      'Test if the correlation persists when controlling for other factors'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'mechanism',
    title: 'Establish Biological/Logical Mechanism',
    description: 'Identify a plausible pathway for how one variable affects the other',
    icon: <ScienceIcon />,
    examples: [
      'Research scientific literature for known relationships',
      'Consider biological pathways or logical connections',
      'Test if the proposed mechanism makes sense given the data'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'intervention',
    title: 'Test with Controlled Changes',
    description: 'The gold standard: deliberately change one variable and observe the effect',
    icon: <SchoolIcon />,
    examples: [
      'Design a personal experiment changing only Variable 1',
      'Use randomized self-experimentation periods',
      'Compare periods with and without the intervention'
    ],
    difficulty: 'advanced'
  }
];

export default function CorrelationAnalysis({
  userId,
}: CorrelationAnalysisProps) {
  const [logs, setLogs] = useState<ManualLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVar1, setSelectedVar1] = useState<string>("");
  const [selectedVar2, setSelectedVar2] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 90));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [showCausalDialog, setShowCausalDialog] = useState(false);
  const [showCorrelationWarning, setShowCorrelationWarning] = useState(false);

  useEffect(() => {
    fetchManualLogs();
  }, [userId, startDate, endDate]);

  useEffect(() => {
    if (logs.length > 0 && !selectedVar1) {
      const numericVariables = getNumericVariables();
      if (numericVariables.length >= 2) {
        setSelectedVar1(numericVariables[0]);
        setSelectedVar2(numericVariables[1]);
      }
    }
  }, [logs, selectedVar1]);

  const fetchManualLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("daily_logs")
        .select("id, date, variable, value, notes, created_at")
        .eq("user_id", userId)
        .gte("date", startDate?.toISOString() || subDays(new Date(), 90).toISOString())
        .lte("date", endDate?.toISOString() || new Date().toISOString())
        .order("date", { ascending: true });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching manual logs:", err);
      setError("Failed to load manual logs");
    } finally {
      setLoading(false);
    }
  };

  const handleVar1Change = (event: SelectChangeEvent) => {
    setSelectedVar1(event.target.value);
  };

  const handleVar2Change = (event: SelectChangeEvent) => {
    setSelectedVar2(event.target.value);
  };

  const isNumeric = (value: string): boolean => {
    return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
  };

  const getNumericVariables = () => {
    const variables = new Set(
      logs.filter((log) => isNumeric(log.value)).map((log) => log.variable)
    );
    return Array.from(variables).sort();
  };

  // Calculate Pearson correlation coefficient
  const calculateCorrelation = (x: number[], y: number[]): number => {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  };

  const getCorrelationStrength = (
    correlation: number
  ): "strong" | "moderate" | "weak" | "none" => {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return "strong";
    if (abs >= 0.3) return "moderate";
    if (abs >= 0.1) return "weak";
    return "none";
  };

  const getCorrelationColor = (correlation: number): string => {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return correlation > 0 ? "#4caf50" : "#f44336";
    if (abs >= 0.3) return correlation > 0 ? "#8bc34a" : "#ff9800";
    if (abs >= 0.1) return correlation > 0 ? "#cddc39" : "#ffeb3b";
    return "#9e9e9e";
  };

  // Get data points for two variables on the same dates
  const getMatchedDataPoints = (var1: string, var2: string) => {
    const var1Logs = logs.filter(
      (log) => log.variable === var1 && isNumeric(log.value)
    );
    const var2Logs = logs.filter(
      (log) => log.variable === var2 && isNumeric(log.value)
    );

    const matchedData: {
      date: string;
      var1Value: number;
      var2Value: number;
    }[] = [];

    var1Logs.forEach((log1) => {
      const matchingLog2 = var2Logs.find((log2) => log2.date === log1.date);
      if (matchingLog2) {
        matchedData.push({
          date: log1.date,
          var1Value: parseFloat(log1.value),
          var2Value: parseFloat(matchingLog2.value),
        });
      }
    });

    return matchedData;
  };

  const allCorrelations = useMemo(() => {
    const numericVariables = getNumericVariables();
    const correlations: CorrelationResult[] = [];

    for (let i = 0; i < numericVariables.length; i++) {
      for (let j = i + 1; j < numericVariables.length; j++) {
        const var1 = numericVariables[i];
        const var2 = numericVariables[j];
        const matchedData = getMatchedDataPoints(var1, var2);

        if (matchedData.length >= 3) {
          const x = matchedData.map((d) => d.var1Value);
          const y = matchedData.map((d) => d.var2Value);
          const correlation = calculateCorrelation(x, y);

          correlations.push({
            variable1: var1,
            variable2: var2,
            correlation: Math.round(correlation * 1000) / 1000,
            strength: getCorrelationStrength(correlation),
            direction: correlation > 0 ? "positive" : "negative",
            dataPoints: matchedData.length,
          });
        }
      }
    }

    return correlations.sort(
      (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)
    );
  }, [logs]);

  const selectedCorrelation = useMemo(() => {
    if (!selectedVar1 || !selectedVar2 || selectedVar1 === selectedVar2)
      return null;

    const matchedData = getMatchedDataPoints(selectedVar1, selectedVar2);
    if (matchedData.length < 3) return null;

    const x = matchedData.map((d) => d.var1Value);
    const y = matchedData.map((d) => d.var2Value);
    const correlation = calculateCorrelation(x, y);

    // Show warning for strong correlations
    if (Math.abs(correlation) > 0.5 && !showCorrelationWarning) {
      setShowCorrelationWarning(true);
    }

    return {
      data: matchedData,
      correlation: Math.round(correlation * 1000) / 1000,
      strength: getCorrelationStrength(correlation),
      direction: correlation > 0 ? "positive" : "negative",
    };
  }, [logs, selectedVar1, selectedVar2, showCorrelationWarning]);

  const scatterChartData = useMemo(() => {
    if (!selectedCorrelation) return null;

    return {
      datasets: [
        {
          label: `${selectedVar1} vs ${selectedVar2}`,
          data: selectedCorrelation.data.map((d) => ({
            x: d.var1Value,
            y: d.var2Value,
          })),
          backgroundColor: getCorrelationColor(selectedCorrelation.correlation),
          borderColor: getCorrelationColor(selectedCorrelation.correlation),
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [selectedCorrelation, selectedVar1, selectedVar2]);

  const scatterChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `${selectedVar1}: ${context.parsed.x}, ${selectedVar2}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: { display: true, text: selectedVar1 },
      },
      y: {
        display: true,
        title: { display: true, text: selectedVar2 },
      },
    },
  };

  const handleCausalAnalysisPrompt = () => {
    setShowCausalDialog(true);
  };

  const handleCorrelationWarningClose = () => {
    setShowCorrelationWarning(false);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  const numericVariables = getNumericVariables();

  if (numericVariables.length < 2) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        You need at least 2 numeric variables to perform correlation analysis.
        Start logging more different types of data to see correlations!
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Correlation ≠ Causation Warning */}
        {showCorrelationWarning && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            icon={<WarningIcon />}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleCausalAnalysisPrompt}
              >
                Learn More
              </Button>
            }
            onClose={handleCorrelationWarningClose}
          >
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              Important: Correlation Does Not Imply Causation
            </Typography>
            <Typography variant="body2">
              A strong correlation between {selectedVar1} and {selectedVar2} doesn't mean one causes the other. 
              Click "Learn More" to explore steps toward establishing causation.
            </Typography>
          </Alert>
        )}

        <Box
          sx={{
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AnalyticsIcon color="primary" />
            <Typography variant="h6" component="h3">
              Correlation Analysis
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              slotProps={{ textField: { size: 'small' } }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              slotProps={{ textField: { size: 'small' } }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Variable 1</InputLabel>
              <Select
                value={selectedVar1}
                label="Variable 1"
                onChange={handleVar1Change}
              >
                {numericVariables.map((variable) => (
                  <MenuItem key={variable} value={variable}>
                    {variable}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Variable 2</InputLabel>
              <Select
                value={selectedVar2}
                label="Variable 2"
                onChange={handleVar2Change}
              >
                {numericVariables
                  .filter((v) => v !== selectedVar1)
                  .map((variable) => (
                    <MenuItem key={variable} value={variable}>
                      {variable}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Stack spacing={3}>
          {/* Scatter Plot and Table */}
          <Box
            sx={{
              display: "flex",
              gap: 3,
              flexDirection: { xs: "column", md: "row" },
            }}
          >
            {selectedCorrelation && scatterChartData && (
              <Box sx={{ flex: selectedCorrelation ? 2 : 1 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h4" gutterBottom>
                      {selectedVar1} vs {selectedVar2}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                      <Chip
                        label={`Correlation: ${selectedCorrelation.correlation}`}
                        size="small"
                        sx={{
                          bgcolor: getCorrelationColor(
                            selectedCorrelation.correlation
                          ),
                          color: "white",
                        }}
                      />
                      <Chip
                        label={`${selectedCorrelation.strength} ${selectedCorrelation.direction}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${selectedCorrelation.data.length} data points`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                    <Box sx={{ height: 400 }}>
                      <Scatter
                        data={scatterChartData}
                        options={scatterChartOptions}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Correlation Table */}
            <Box sx={{ flex: selectedCorrelation ? 1 : 1 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h4" gutterBottom>
                    All Correlations
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Ranked by correlation strength
                  </Typography>
                  {allCorrelations.length === 0 ? (
                    <Alert severity="info">
                      No correlations found. Make sure you have overlapping data
                      for multiple variables.
                    </Alert>
                  ) : (
                    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Variables</TableCell>
                            <TableCell align="right">Correlation</TableCell>
                            <TableCell align="right">Strength</TableCell>
                            <TableCell align="right">Points</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {allCorrelations.map((corr, index) => (
                            <TableRow key={index} hover>
                              <TableCell>
                                <Typography variant="body2">
                                  {corr.variable1} × {corr.variable2}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    gap: 0.5,
                                  }}
                                >
                                  {corr.direction === "positive" ? (
                                    <TrendingUpIcon
                                      fontSize="small"
                                      color="success"
                                    />
                                  ) : (
                                    <TrendingDownIcon
                                      fontSize="small"
                                      color="error"
                                    />
                                  )}
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: "bold" }}
                                  >
                                    {corr.correlation}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={corr.strength}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    fontSize: "0.75rem",
                                    color: getCorrelationColor(corr.correlation),
                                    borderColor: getCorrelationColor(
                                      corr.correlation
                                    ),
                                  }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {corr.dataPoints}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Enhanced Insights with Causal Analysis Prompt */}
          {selectedCorrelation && (
            <Card>
              <CardContent>
                <Typography variant="h6" component="h4" gutterBottom>
                  Interpretation & Next Steps
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 2, bgcolor: "action.hover" }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                        Statistical Finding
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedVar1} and {selectedVar2} show a {selectedCorrelation.strength} {selectedCorrelation.direction} correlation (r = {selectedCorrelation.correlation})
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 2, bgcolor: "warning.light", color: "warning.contrastText" }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                        ⚠️ Caution Required
                      </Typography>
                      <Typography variant="body2">
                        This correlation alone cannot prove that one variable causes changes in the other.
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleCausalAnalysisPrompt}
                    startIcon={<ScienceIcon />}
                    size="large"
                  >
                    Explore Causal Analysis Steps
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          {allCorrelations.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" component="h4" gutterBottom>
                  Key Insights
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {allCorrelations.slice(0, 3).map((corr, index) => (
                    <Box
                      key={index}
                      sx={{
                        flex: { xs: "1 1 100%", sm: "1 1 calc(33.33% - 16px)" },
                      }}
                    >
                      <Paper elevation={1} sx={{ p: 2, bgcolor: "action.hover" }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: "bold", mb: 1 }}
                        >
                          {corr.variable1} & {corr.variable2}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {corr.strength === "strong" &&
                            Math.abs(corr.correlation) >= 0.7 &&
                            `Strong ${corr.direction} relationship (${corr.correlation})`}
                          {corr.strength === "moderate" &&
                            `Moderate ${corr.direction} relationship (${corr.correlation})`}
                          {corr.strength === "weak" &&
                            `Weak ${corr.direction} relationship (${corr.correlation})`}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Stack>

        {/* Causal Analysis Dialog */}
        <Dialog
          open={showCausalDialog}
          onClose={() => setShowCausalDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScienceIcon color="primary" />
              Moving from Correlation to Causation
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              Establishing causation requires more than correlation. Here are systematic steps to build stronger evidence:
            </Alert>
            
            <Stack spacing={2}>
              {causalAnalysisSteps.map((step, index) => (
                <Accordion key={step.id}>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`panel${index}a-content`}
                    id={`panel${index}a-header`}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {step.icon}
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {index + 1}. {step.title}
                        </Typography>
                        <Chip 
                          label={step.difficulty} 
                          size="small" 
                          color={
                            step.difficulty === 'beginner' ? 'success' :
                            step.difficulty === 'intermediate' ? 'warning' : 'error'
                          }
                        />
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {step.description}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      For your {selectedVar1} ↔ {selectedVar2} analysis:
                    </Typography>
                    <List dense>
                      {step.examples.map((example, i) => (
                        <ListItem key={i}>
                          <ListItemText 
                            primary={example}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCausalDialog(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
