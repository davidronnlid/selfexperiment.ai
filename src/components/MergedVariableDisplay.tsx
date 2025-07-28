import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Tooltip,
  IconButton,
  Switch,
  FormControlLabel,
  Grid,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Analytics as AnalyticsIcon,
  Sync as SyncIcon,
  TrendingUp as TrendingUpIcon,
  CompareArrows as CompareIcon,
} from '@mui/icons-material';
// Note: Install recharts with: npm install recharts
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

// Types
interface DataPoint {
  date: string;
  value: number;
  source: string;
  variable_id: string;
  original_value: number;
  original_unit: string;
  data_point_id: string;
}

interface CorrelationData {
  source_a: string;
  source_b: string;
  pearson_correlation: number;
  intraclass_correlation: number;
  data_points_count: number;
  p_value: number;
  mean_absolute_error: number;
  mean_bias: number;
}

interface MergeGroup {
  id: string;
  name: string;
  slug: string;
  description: string;
  canonical_unit: string;
  primary_source: string;
  enable_correlation_analysis: boolean;
}

interface MergedVariableDisplayProps {
  mergeGroupSlug: string;
  userId: string;
  onConfigChange?: (config: any) => void;
}

export default function MergedVariableDisplay({
  mergeGroupSlug,
  userId,
  onConfigChange
}: MergedVariableDisplayProps) {
  // State
  const [mergeGroup, setMergeGroup] = useState<MergeGroup | null>(null);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [correlations, setCorrelations] = useState<CorrelationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showAllSources, setShowAllSources] = useState(true);
  const [showCorrelations, setShowCorrelations] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState(30); // days
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchMergedVariableData();
  }, [mergeGroupSlug, userId, selectedDateRange]);

  const fetchMergedVariableData = async () => {
    setLoading(true);
    try {
      // Fetch merge group info
      const groupResponse = await fetch(`/api/variables/merge-groups/${mergeGroupSlug}`);
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setMergeGroup(groupData);
      }

      // Fetch merged data points
      const dataResponse = await fetch(
        `/api/variables/merged-data?group=${mergeGroupSlug}&userId=${userId}&days=${selectedDateRange}`
      );
      if (dataResponse.ok) {
        const data = await dataResponse.json();
        setDataPoints(data);
      }

      // Fetch correlation analysis
      if (showCorrelations) {
        const corrResponse = await fetch(
          `/api/variables/correlations?group=${mergeGroupSlug}&days=${selectedDateRange}`
        );
        if (corrResponse.ok) {
          const corrData = await corrResponse.json();
          setCorrelations(corrData);
        }
      }
    } catch (error) {
      console.error('Error fetching merged variable data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts
  const chartData = useMemo(() => {
    const dateGroups = dataPoints.reduce((acc, point) => {
      const date = point.date;
      if (!acc[date]) acc[date] = {};
      acc[date][point.source] = point.value;
      acc[date].date = date;
      return acc;
    }, {} as any);

    return Object.values(dateGroups).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [dataPoints]);

  // Get unique sources
  const sources = useMemo(() => {
    const sourceSet = new Set(dataPoints.map(dp => dp.source));
    return Array.from(sourceSet);
  }, [dataPoints]);

  // Source colors for charts
  const sourceColors = {
    'withings': '#00BCD4',
    'apple_health': '#FF9800',
    'manual': '#4CAF50',
    'oura': '#9C27B0',
  };

  // Correlation quality assessment
  const getCorrelationQuality = (icc: number) => {
    if (icc >= 0.9) return { level: 'Excellent', color: 'success' };
    if (icc >= 0.75) return { level: 'Good', color: 'info' };
    if (icc >= 0.6) return { level: 'Moderate', color: 'warning' };
    return { level: 'Poor', color: 'error' };
  };

  // Render correlation matrix
  const renderCorrelationMatrix = () => (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Source Pair</TableCell>
            <TableCell align="center">Intraclass Correlation</TableCell>
            <TableCell align="center">Pearson Correlation</TableCell>
            <TableCell align="center">Data Points</TableCell>
            <TableCell align="center">Mean Bias</TableCell>
            <TableCell align="center">Quality</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {correlations.map((corr, index) => {
            const quality = getCorrelationQuality(corr.intraclass_correlation);
            return (
              <TableRow key={index}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={corr.source_a} 
                      size="small" 
                      sx={{ backgroundColor: sourceColors[corr.source_a as keyof typeof sourceColors] }}
                    />
                    <CompareIcon fontSize="small" />
                    <Chip 
                      label={corr.source_b} 
                      size="small"
                      sx={{ backgroundColor: sourceColors[corr.source_b as keyof typeof sourceColors] }}
                    />
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="bold">
                    {corr.intraclass_correlation.toFixed(3)}
                  </Typography>
                </TableCell>
                <TableCell align="center">{corr.pearson_correlation.toFixed(3)}</TableCell>
                <TableCell align="center">{corr.data_points_count}</TableCell>
                <TableCell align="center">
                  <Typography variant="body2" color={corr.mean_bias > 0 ? 'error' : 'success'}>
                    {corr.mean_bias > 0 ? '+' : ''}{corr.mean_bias.toFixed(2)} {mergeGroup?.canonical_unit}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={quality.level} 
                    size="small" 
                    color={quality.color as any}
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render data table with source information
  const renderDataTable = () => (
    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Value</TableCell>
            <TableCell>Source</TableCell>
            <TableCell>Original Value</TableCell>
            <TableCell>Original Unit</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dataPoints
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((point, index) => (
            <TableRow key={index}>
              <TableCell>{format(parseISO(point.date), 'MMM dd, yyyy')}</TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight="bold">
                  {point.value.toFixed(2)} {mergeGroup?.canonical_unit}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip 
                  label={point.source} 
                  size="small"
                  sx={{ backgroundColor: sourceColors[point.source as keyof typeof sourceColors] }}
                />
              </TableCell>
              <TableCell>{point.original_value.toFixed(2)}</TableCell>
              <TableCell>{point.original_unit}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render chart (simplified version until recharts is installed)
  const renderChart = () => (
    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc', borderRadius: 1 }}>
      <Box sx={{ textAlign: 'center' }}>
        <TrendingUpIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" color="textSecondary">
          Chart Visualization
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Install recharts package to view timeline charts
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          Data: {dataPoints.length} points from {sources.length} sources
        </Typography>
      </Box>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!mergeGroup) {
    return (
      <Alert severity="error">
        Merge group "{mergeGroupSlug}" not found or not configured.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            {mergeGroup.name}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            {mergeGroup.description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip 
              label={`${dataPoints.length} data points`} 
              size="small" 
              icon={<TimelineIcon />}
            />
            <Chip 
              label={`${sources.length} sources`} 
              size="small" 
              icon={<SyncIcon />}
            />
            {correlations.length > 0 && (
              <Chip 
                label={`${correlations.length} correlations`} 
                size="small" 
                icon={<AnalyticsIcon />}
              />
            )}
          </Box>
        </Box>
        <IconButton onClick={() => setConfigDialogOpen(true)}>
          <SettingsIcon />
        </IconButton>
      </Box>

      {/* Controls */}
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch 
              checked={showAllSources} 
              onChange={(e) => setShowAllSources(e.target.checked)}
            />
          }
          label="Show all sources"
        />
        <FormControlLabel
          control={
            <Switch 
              checked={showCorrelations} 
              onChange={(e) => setShowCorrelations(e.target.checked)}
            />
          }
          label="Show correlation analysis"
        />
      </Box>

      {/* Main content */}
      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Timeline Chart" icon={<TrendingUpIcon />} />
            <Tab label="Data Table" icon={<TimelineIcon />} />
            {showCorrelations && <Tab label="Correlation Analysis" icon={<AnalyticsIcon />} />}
          </Tabs>

          <Box sx={{ mt: 2 }}>
            {activeTab === 0 && renderChart()}
            {activeTab === 1 && renderDataTable()}
            {activeTab === 2 && showCorrelations && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Source Agreement Analysis
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Intraclass correlation coefficient (ICC) measures how well different sources agree. 
                  Values closer to 1.0 indicate better agreement.
                </Typography>
                {renderCorrelationMatrix()}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)}>
        <DialogTitle>Variable Merge Configuration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Configure how data sources are merged and displayed for {mergeGroup.name}.
          </Typography>
          {/* Add configuration options here */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setConfigDialogOpen(false)}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 