import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supaBase';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Pagination,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Card,
  CardContent
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import Link from 'next/link';

interface OuraDataPoint {
  id: string;
  date: string;
  variable_id: string;
  value: number;
  raw: any;
  created_at: string;
}

interface DataStats {
  total_count: number;
  date_range: {
    earliest: string;
    latest: string;
  };
  variable_breakdown: Record<string, number>;
}

const ITEMS_PER_PAGE = 50;

export default function OuraDataPage() {
  const router = useRouter();
  const { username } = router.query;
  
  const [dataPoints, setDataPoints] = useState<OuraDataPoint[]>([]);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Get variable labels mapping for Oura
  const getVariableLabel = (variableId: string) => {
    const mapping: Record<string, string> = {
      'readiness_score': 'Readiness Score',
      'sleep_score': 'Sleep Score',
      'activity_score': 'Activity Score',
      'total_sleep_duration': 'Total Sleep Duration',
      'light_sleep': 'Light Sleep',
      'deep_sleep': 'Deep Sleep',
      'rem_sleep': 'REM Sleep',
      'restfulness': 'Restfulness',
      'sleep_efficiency': 'Sleep Efficiency',
      'sleep_latency': 'Sleep Latency',
      'resting_heart_rate': 'Resting Heart Rate',
      'hrv': 'Heart Rate Variability',
      'body_temperature': 'Body Temperature',
      'active_calories': 'Active Calories',
      'total_calories': 'Total Calories',
      'steps': 'Steps',
      'non_wear_time': 'Non-Wear Time',
      'equivalent_walking_distance': 'Walking Distance'
    };
    return mapping[variableId] || variableId.replace(/_/g, ' ');
  };

  // Get unit for variable
  const getVariableUnit = (variableId: string) => {
    const units: Record<string, string> = {
      'readiness_score': '/100',
      'sleep_score': '/100',
      'activity_score': '/100',
      'total_sleep_duration': 'minutes',
      'light_sleep': 'minutes',
      'deep_sleep': 'minutes',
      'rem_sleep': 'minutes',
      'restfulness': '/100',
      'sleep_efficiency': '%',
      'sleep_latency': 'minutes',
      'resting_heart_rate': 'bpm',
      'hrv': 'ms',
      'body_temperature': '°C',
      'active_calories': 'cal',
      'total_calories': 'cal',
      'steps': 'steps',
      'non_wear_time': 'minutes',
      'equivalent_walking_distance': 'meters'
    };
    return units[variableId] || '';
  };

  // Fetch user profile to get user_id from username
  const fetchUserProfile = async (username: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();
    
    if (error) throw error;
    return data.id;
  };

  // Fetch data statistics
  const fetchDataStats = async (userId: string) => {
    // Get total count
    const { count, error: countError } = await supabase
      .from('oura_variable_data_points')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) throw countError;

    // Get date range
    const { data: dateRange, error: dateError } = await supabase
      .from('oura_variable_data_points')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .limit(1);

    const { data: latestDate, error: latestError } = await supabase
      .from('oura_variable_data_points')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1);

    if (dateError || latestError) throw dateError || latestError;

    // Get variable breakdown
    const { data: variableData, error: variableError } = await supabase
      .from('oura_variable_data_points')
      .select('variable_id')
      .eq('user_id', userId);

    if (variableError) throw variableError;

    const variableBreakdown = variableData.reduce((acc: Record<string, number>, item) => {
      acc[item.variable_id] = (acc[item.variable_id] || 0) + 1;
      return acc;
    }, {});

    return {
      total_count: count || 0,
      date_range: {
        earliest: dateRange?.[0]?.date || '',
        latest: latestDate?.[0]?.date || ''
      },
      variable_breakdown: variableBreakdown
    };
  };

  // Fetch paginated data
  const fetchData = async (userId: string, page: number) => {
    const offset = (page - 1) * ITEMS_PER_PAGE;
    
    const { data, error } = await supabase
      .from('oura_variable_data_points')
      .select('id, date, variable_id, value, raw, created_at')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (error) throw error;
    return data || [];
  };

  useEffect(() => {
    if (!username) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const userId = await fetchUserProfile(username as string);
        
        // Fetch stats and data in parallel
        const [statsData, dataPoints] = await Promise.all([
          fetchDataStats(userId),
          fetchData(userId, page)
        ]);

        setStats(statsData);
        setDataPoints(dataPoints);
        setTotalPages(Math.ceil(statsData.total_count / ITEMS_PER_PAGE));

      } catch (err: any) {
        console.error('Error loading Oura data:', err);
        setError(err.message || 'Failed to load Oura data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [username, page]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVariableClick = (variableId: string) => {
    router.push(`/variable/${variableId}`);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" className="py-8">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" className="py-8">
        <Alert severity="error" className="mb-4">
          {error}
        </Alert>
        <Link href="/analyze" passHref>
          <Button startIcon={<ArrowBack />} variant="outlined">
            Back to Analyze
          </Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" className="py-8">
      {/* Header */}
      <Box className="mb-6">
        <Link href="/analyze" passHref>
          <Button startIcon={<ArrowBack />} variant="outlined" className="mb-4">
            Back to Analyze
          </Button>
        </Link>
        
        <Box display="flex" alignItems="center" gap={2} className="mb-4">
          <Box className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
            O
          </Box>
          <Typography variant="h3" component="h1" className="font-bold text-white">
            Oura Data
          </Typography>
        </Box>
        
        <Typography variant="h6" className="text-gray-400 mb-4">
          @{username} • Oura Ring Integration
        </Typography>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-surface border border-border">
            <CardContent>
              <Typography variant="h6" className="text-gold mb-2">
                Total Data Points
              </Typography>
              <Typography variant="h4" className="text-white font-bold">
                {stats.total_count.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>

          <Card className="bg-surface border border-border">
            <CardContent>
              <Typography variant="h6" className="text-gold mb-2">
                Date Range
              </Typography>
              <Typography variant="body1" className="text-white">
                {stats.date_range.earliest ? new Date(stats.date_range.earliest).toLocaleDateString() : 'N/A'}
              </Typography>
              <Typography variant="body2" className="text-gray-400">
                to {stats.date_range.latest ? new Date(stats.date_range.latest).toLocaleDateString() : 'N/A'}
              </Typography>
            </CardContent>
          </Card>

          <Card className="bg-surface border border-border">
            <CardContent>
              <Typography variant="h6" className="text-gold mb-2">
                Variables Tracked
              </Typography>
              <Typography variant="h4" className="text-white font-bold">
                {Object.keys(stats.variable_breakdown).length}
              </Typography>
            </CardContent>
          </Card>

          <Card className="bg-surface border border-border">
            <CardContent>
              <Typography variant="h6" className="text-gold mb-2">
                Current Page
              </Typography>
              <Typography variant="h4" className="text-white font-bold">
                {page} / {totalPages}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Variable Breakdown */}
      {stats && Object.keys(stats.variable_breakdown).length > 0 && (
        <Card className="bg-surface border border-border mb-6">
          <CardContent>
            <Typography variant="h6" className="text-gold mb-3">
              Data Distribution by Variable
            </Typography>
                          <Box display="flex" flexWrap="wrap" gap={1}>
                {Object.entries(stats.variable_breakdown)
                  .sort(([,a], [,b]) => b - a)
                  .map(([variableId, count]) => (
                    <Chip
                      key={variableId}
                      label={`${getVariableLabel(variableId)}: ${count.toLocaleString()}`}
                      variant="outlined"
                      className="text-white border-purple-500 cursor-pointer hover:bg-purple-500 hover:text-white transition-colors"
                      onClick={() => handleVariableClick(variableId)}
                    />
                  ))}
              </Box>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card className="bg-surface border border-border">
        <CardContent>
          <Typography variant="h6" className="text-gold mb-4">
            Recent Oura Data (Page {page} of {totalPages})
          </Typography>
          
          {dataPoints.length === 0 ? (
            <Alert severity="info">
              No Oura data found for this user.
            </Alert>
          ) : (
            <>
              <TableContainer component={Paper} className="bg-surface-light">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="text-gold font-bold">Date</TableCell>
                      <TableCell className="text-gold font-bold">Variable</TableCell>
                      <TableCell className="text-gold font-bold">Value</TableCell>
                      <TableCell className="text-gold font-bold">Unit</TableCell>
                      <TableCell className="text-gold font-bold">Recorded At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dataPoints.map((point) => (
                      <TableRow key={point.id} className="hover:bg-surface">
                        <TableCell className="text-white">
                          {new Date(point.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-white">
                          <Link 
                            href={`/variable/${encodeURIComponent(point.variable_id)}`}
                            style={{ 
                              color: '#FFD700', 
                              textDecoration: 'underline',
                              fontWeight: 500
                            }}
                            title={`View ${getVariableLabel(point.variable_id)} variable page`}
                          >
                            {getVariableLabel(point.variable_id)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-white font-mono">
                          {typeof point.value === 'number' ? point.value.toLocaleString() : point.value}
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {getVariableUnit(point.variable_id)}
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {new Date(point.created_at).toLocaleDateString()} {' '}
                          {new Date(point.created_at).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <Box display="flex" justifyContent="center" className="mt-6">
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  className="text-white"
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
} 