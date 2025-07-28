import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DataSourceCounts {
  apple_health: number;
  oura: number;
  withings: number;
  modular_health: number;
  total: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, username } = req.query;

  if (!user_id && !username) {
    return res.status(400).json({ error: 'user_id or username is required' });
  }

  try {
    let userId = user_id as string;

    // If username is provided, get user_id from profile
    if (username && !user_id) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('username', username)
        .single();

      if (profileError) {
        return res.status(404).json({ error: 'User not found' });
      }

      userId = profile.user_id;
    }

    // Get counts from all data source tables
    const counts: DataSourceCounts = {
      apple_health: 0,
      oura: 0,
      withings: 0,
      modular_health: 0,
      total: 0
    };

    // Apple Health data points - check both dedicated table and data_points table
    const { count: appleHealthCount, error: appleHealthError } = await supabaseAdmin
      .from('apple_health_variable_data_points')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    console.log('Apple Health dedicated table query result:', { count: appleHealthCount, error: appleHealthError });
    
    // Also check data_points table for Apple Health data
    const { count: appleHealthDataPointsCount, error: appleHealthDataPointsError } = await supabaseAdmin
      .from('data_points')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .contains('source', ['apple_health']);

    console.log('Apple Health data_points table query result:', { count: appleHealthDataPointsCount, error: appleHealthDataPointsError });
    
    counts.apple_health = (appleHealthCount || 0) + (appleHealthDataPointsCount || 0);

    // Oura data points - check both dedicated table and data_points table
    const { count: ouraCount, error: ouraError } = await supabaseAdmin
      .from('oura_variable_data_points')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    console.log('Oura dedicated table query result:', { count: ouraCount, error: ouraError });
    
    // Also check data_points table for Oura data
    const { count: ouraDataPointsCount, error: ouraDataPointsError } = await supabaseAdmin
      .from('data_points')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .contains('source', ['oura']);

    console.log('Oura data_points table query result:', { count: ouraDataPointsCount, error: ouraDataPointsError });
    
    counts.oura = (ouraCount || 0) + (ouraDataPointsCount || 0);

    // Debug: Check if there are any Oura data points at all
    const { count: totalOuraCount, error: totalOuraError } = await supabaseAdmin
      .from('oura_variable_data_points')
      .select('*', { count: 'exact', head: true });

    console.log('Total Oura data points in database:', totalOuraCount);
    if (totalOuraCount && totalOuraCount > 0) {
      const { data: sampleOuraUsers } = await supabaseAdmin
        .from('oura_variable_data_points')
        .select('user_id')
        .limit(5);
      console.log('Sample Oura users:', sampleOuraUsers?.map((u: any) => u.user_id));
    }

    // Withings data points
    const { count: withingsCount } = await supabaseAdmin
      .from('withings_variable_data_points')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    counts.withings = withingsCount || 0;

    // Modular Health data points (manual logs and other sources)
    const { count: modularHealthCount } = await supabaseAdmin
      .from('data_points')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('source', 'cs', '{"apple_health","oura","withings"}'); // Exclude integrated sources

    counts.modular_health = modularHealthCount || 0;

    // Also check if there's any data in data_points with oura/apple_health sources
    const { data: integratedDataPoints, error: integratedError } = await supabaseAdmin
      .from('data_points')
      .select('source')
      .eq('user_id', userId)
      .in('source', ['apple_health', 'oura', 'withings']);

    console.log('Integrated data points found:', integratedDataPoints?.length || 0);
    if (integratedDataPoints && integratedDataPoints.length > 0) {
      console.log('Sample integrated sources:', integratedDataPoints.slice(0, 5).map((d: any) => d.source));
    }

    // Calculate total
    counts.total = counts.apple_health + counts.oura + counts.withings + counts.modular_health;

    return res.status(200).json({
      success: true,
      user_id: userId,
      counts
    });

  } catch (error: any) {
    console.error('Error fetching data source counts:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch data source counts',
      details: error.message 
    });
  }
} 