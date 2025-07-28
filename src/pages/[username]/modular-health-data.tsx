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
import { ArrowBack, Analytics } from '@mui/icons-material';
import Link from 'next/link';

interface ModularHealthDataPoint {
  id: string;
  date: string;
  variable_id: string;
  value: number;
  notes: string;
  source: string[];
  display_unit: string;
  created_at: string;
  variables?: {
    label: string;
    category: string;
  };
}

interface DataStats {
  total_count: number;
  date_range: {
    earliest: string;
    latest: string;
  };
  variable_breakdown: Record<string, number>;
  source_breakdown: Record<string, number>;
}

const ITEMS_PER_PAGE = 50;

export default function ModularHealthDataPage() {
  const router = useRouter();
  const { username } = router.query;
  
  const [dataPoints, setDataPoints] = useState<ModularHealthDataPoint[]>([]);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Get source label
  const getSourceLabel = (source: string[]) => {
    if (!source || source.length === 0) return 'Manual';
    
    const sourceMapping: Record<string, string> = {
      'manual': 'Manual Entry',
      'auto': 'Auto-generated',
      'routine': 'Routine',
      'experiment': 'Experiment',
      'import': 'Data Import'
    };
    
    return source.map(s => sourceMapping[s] || s).join(', ');
  };

  // Get source color
  const getSourceColor = (source: string[]) => {
    if (!source || source.length === 0) return 'default';
    
    const primarySource = source[0];
    const colorMapping: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      'manual': 'primary',
      'auto': 'success',
      'routine': 'info',
      'experiment': 'warning',
      'import': 'secondary'
    };
    
    return colorMapping[primarySource] || 'default';
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
    // Get total count (excluding integrated sources)
    const { count, error: countError } = await supabase
      .from('data_points')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('source', 'cs', '{"apple_health","oura","withings"}');

    if (countError) throw countError;

    // Get date range
    const { data: dateRange, error: dateError } = await supabase
      .from('data_points')
      .select('date')
      .eq('user_id', userId)
      .not('source', 'cs', '{"apple_health","oura","withings"}')
      .order('date', { ascending: true })
      .limit(1);

    const { data: latestDate, error: latestError } = await supabase
      .from('data_points')
      .select('date')
      .eq('user_id', userId)
      .not('source', 'cs', '{"apple_health","oura","withings"}')
      .order('date', { ascending: false })
      .limit(1);

    if (dateError || latestError) throw dateError || latestError;

    // Get variable breakdown with labels
    const { data: variableData, error: variableError } = await supabase
      .from('data_points')
      .select(`
        variable_id,
        variables!inner(label)
      `)
      .eq('user_id', userId)
      .not('source', 'cs', '{"apple_health","oura","withings"}');

    if (variableError) throw variableError;

    const variableBreakdown = variableData.reduce((acc: Record<string, number>, item: any) => {
      const label = item.variables?.label || item.variable_id;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    // Get source breakdown
    const { data: sourceData, error: sourceError } = await supabase
      .from('data_points')
      .select('source')
      .eq('user_id', userId)
      .not('source', 'cs', '{"apple_health","oura","withings"}');

    if (sourceError) throw sourceError;

    const sourceBreakdown = sourceData.reduce((acc: Record<string, number>, item) => {
      const source = getSourceLabel(item.source || []);
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    return {
      total_count: count || 0,
      date_range: {
        earliest: dateRange?.[0]?.date || '',
        latest: latestDate?.[0]?.date || ''
      },
      variable_breakdown: variableBreakdown,
      source_breakdown: sourceBreakdown
    };
  };

  // Fetch paginated data
  const fetchData = async (userId: string, page: number) => {
    const offset = (page - 1) * ITEMS_PER_PAGE;
    
    const { data, error } = await supabase
      .from('data_points')
      .select(`
        id, 
        date, 
        variable_id, 
        value, 
        notes, 
        source, 
        display_unit, 
        created_at,
        variables(label, category)
      `)
      .eq('user_id', userId)
      .not('source', 'cs', '{"apple_health","oura","withings"}')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (error) throw error;
    return (data || []).map((item: any) => ({
      ...item,
      variables: Array.isArray(item.variables) ? item.variables[0] : item.variables
    }));
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
        console.error('Error loading Modular Health data:', err);
        setError(err.message || 'Failed to load Modular Health data');
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

  const handleVariableClick = (variableLabel: string) => {
    router.push(`/variable/${variableLabel}`);
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
          <Analytics className="text-gold" fontSize="large" />
          <Typography variant="h3" component="h1" className="font-bold text-white">
            Modular Health Data
          </Typography>
        </Box>
        
        <Typography variant="h6" className="text-gray-400 mb-4">
          @{username} • Manual Logs & Routines
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
                  .map(([variableLabel, count]) => (
                    <Chip
                      key={variableLabel}
                      label={`${variableLabel}: ${count.toLocaleString()}`}
                      variant="outlined"
                      className="text-white border-gold cursor-pointer hover:bg-gold hover:text-black transition-colors"
                      onClick={() => handleVariableClick(variableLabel)}
                    />
                  ))}
              </Box>
          </CardContent>
        </Card>
      )}

      {/* Source Breakdown */}
      {stats && Object.keys(stats.source_breakdown).length > 0 && (
        <Card className="bg-surface border border-border mb-6">
          <CardContent>
            <Typography variant="h6" className="text-gold mb-3">
              Data Distribution by Source
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {Object.entries(stats.source_breakdown)
                .sort(([,a], [,b]) => b - a)
                .map(([source, count]) => (
                  <Chip
                    key={source}
                    label={`${source}: ${count.toLocaleString()}`}
                    variant="outlined"
                    className="text-white border-blue-500"
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
            Recent Modular Health Data (Page {page} of {totalPages})
          </Typography>
          
          {dataPoints.length === 0 ? (
            <Alert severity="info">
              No Modular Health data found for this user.
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
                      <TableCell className="text-gold font-bold">Source</TableCell>
                      <TableCell className="text-gold font-bold">Notes</TableCell>
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
                          <Box>
                            <Typography variant="body2" className="font-medium">
                              {point.variables?.label || point.variable_id}
                            </Typography>
                            {point.variables?.category && (
                              <Typography variant="caption" className="text-gray-400">
                                {point.variables.category}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell className="text-white font-mono">
                          {typeof point.value === 'number' ? point.value.toLocaleString() : point.value}
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {point.display_unit || ''}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getSourceLabel(point.source)}
                            size="small"
                            color={getSourceColor(point.source)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {point.notes && (
                            <Typography variant="body2" className="max-w-xs truncate">
                              {point.notes}
                            </Typography>
                          )}
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