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
import { ArrowBack, MonitorWeight } from '@mui/icons-material';
import Link from 'next/link';

interface WithingsDataPoint {
  id: string;
  date: string;
  variable_id: string;
  value: number;
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

export default function WithingsDataPage() {
  const router = useRouter();
  const { username } = router.query;
  
  const [dataPoints, setDataPoints] = useState<WithingsDataPoint[]>([]);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [variableLabels, setVariableLabels] = useState<Record<string, string>>({});

  // Get variable labels mapping for Withings
  const getVariableLabel = (variableId: string) => {
    // Prefer labels from variables table when available (uuid ids)
    if (variableLabels[variableId]) return variableLabels[variableId];
    const mapping: Record<string, string> = {
      'weight': 'Weight',
      'fat_free_mass_kg': 'Fat-Free Mass',
      'fat_ratio': 'Fat Ratio',
      'fat_mass_weight_kg': 'Fat Mass',
      'muscle_mass_kg': 'Muscle Mass',
      'hydration_kg': 'Hydration',
      'bone_mass_kg': 'Bone Mass',
      'pulse_wave_velocity': 'Pulse Wave Velocity',
      'vo2_max': 'VO2 Max',
      'vascular_age': 'Vascular Age'
    };
    return mapping[variableId] || variableId.replace(/_/g, ' ');
  };

  // Get unit for variable
  const getVariableUnit = (variableId: string) => {
    const units: Record<string, string> = {
      'weight': 'kg',
      'fat_free_mass_kg': 'kg',
      'fat_ratio': '%',
      'fat_mass_weight_kg': 'kg',
      'muscle_mass_kg': 'kg',
      'hydration_kg': 'kg',
      'bone_mass_kg': 'kg',
      'pulse_wave_velocity': 'm/s',
      'vo2_max': 'mL/kg/min',
      'vascular_age': 'years'
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
      .from('withings_variable_data_points')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) throw countError;

    // Get date range
    const { data: dateRange, error: dateError } = await supabase
      .from('withings_variable_data_points')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .limit(1);

    const { data: latestDate, error: latestError } = await supabase
      .from('withings_variable_data_points')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1);

    if (dateError || latestError) throw dateError || latestError;

    // Get variable breakdown
    const { data: variableData, error: variableError } = await supabase
      .from('withings_variable_data_points')
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
      .from('withings_variable_data_points')
      .select('id, date, variable_id, value, created_at')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (error) throw error;
    return data || [];
  };

  // Fetch human-readable labels for variable ids found in stats/data
  const fetchVariableLabels = async (variableIds: string[]) => {
    if (!variableIds || variableIds.length === 0) return;
    const uniqueIds = Array.from(new Set(variableIds.filter(Boolean)));
    if (uniqueIds.length === 0) return;
    const { data, error } = await supabase
      .from('variables')
      .select('id,label')
      .in('id', uniqueIds);
    if (error) return; // best-effort; UI will fallback
    const map = Object.fromEntries((data || []).map((v: { id: string; label: string }) => [v.id, v.label]));
    setVariableLabels((prev) => ({ ...prev, ...map }));
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

        // Load labels for any variable ids (uuids) so UI shows names instead of ids
        const idsForLabels = new Set<string>(Object.keys(statsData.variable_breakdown || {}));
        for (const dp of dataPoints) idsForLabels.add(dp.variable_id);
        await fetchVariableLabels(Array.from(idsForLabels));

      } catch (err: any) {
        console.error('Error loading Withings data:', err);
        setError(err.message || 'Failed to load Withings data');
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
          <MonitorWeight className="text-orange-500" fontSize="large" />
          <Typography variant="h3" component="h1" className="font-bold text-white">
            Withings Data
          </Typography>
        </Box>
        
        <Typography variant="h6" className="text-gray-400 mb-4">
          @{username} • Withings Scale Integration
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
                      className="text-white border-orange-500 cursor-pointer hover:bg-orange-500 hover:text-white transition-colors"
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
            Recent Withings Data (Page {page} of {totalPages})
          </Typography>
          
          {dataPoints.length === 0 ? (
            <Alert severity="info">
              No Withings data found for this user.
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