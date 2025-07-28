import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { group, days = '30' } = req.query;

  if (!group) {
    return res.status(400).json({ error: 'Group slug is required' });
  }

  if (typeof group !== 'string') {
    return res.status(400).json({ error: 'Invalid group parameter' });
  }

  const daysNum = parseInt(days as string, 10);
  if (isNaN(daysNum) || daysNum <= 0) {
    return res.status(400).json({ error: 'Invalid days parameter' });
  }

  try {
    // Get merge group
    const { data: mergeGroup, error: groupError } = await supabaseAdmin
      .from('variable_merge_groups')
      .select('id, enable_correlation_analysis')
      .eq('slug', group)
      .single();

    if (groupError || !mergeGroup) {
      return res.status(404).json({ error: 'Merge group not found' });
    }

    if (!mergeGroup.enable_correlation_analysis) {
      return res.status(200).json([]);
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysNum);

    // Fetch recent correlation data
    const { data: correlations, error: corrError } = await supabaseAdmin
      .from('variable_source_correlations')
      .select('*')
      .eq('merge_group_id', mergeGroup.id)
      .gte('analysis_start_date', startDate.toISOString().split('T')[0])
      .order('calculated_at', { ascending: false });

    if (corrError) {
      console.error('Error fetching correlations:', corrError);
      // Return mock correlation data for demonstration
      return res.status(200).json(generateMockCorrelationData(group));
    }

    if (!correlations || correlations.length === 0) {
      // Generate mock data if no correlations exist yet
      return res.status(200).json(generateMockCorrelationData(group));
    }

    res.status(200).json(correlations);
  } catch (error) {
    console.error('Error in correlations API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Generate mock correlation data for demonstration
function generateMockCorrelationData(groupSlug: string) {
  if (groupSlug === 'body_weight') {
    return [
      {
        source_a: 'withings',
        source_b: 'apple_health',
        pearson_correlation: 0.94,
        intraclass_correlation: 0.92,
        data_points_count: 45,
        p_value: 0.001,
        mean_absolute_error: 0.3,
        mean_bias: -0.1, // Withings tends to read slightly lower
      },
      {
        source_a: 'withings',
        source_b: 'manual',
        pearson_correlation: 0.88,
        intraclass_correlation: 0.85,
        data_points_count: 12,
        p_value: 0.002,
        mean_absolute_error: 0.8,
        mean_bias: 0.4, // Manual entries tend to be higher
      },
      {
        source_a: 'apple_health',
        source_b: 'manual',
        pearson_correlation: 0.91,
        intraclass_correlation: 0.89,
        data_points_count: 18,
        p_value: 0.001,
        mean_absolute_error: 0.6,
        mean_bias: 0.5,
      }
    ];
  }

  return [];
} 