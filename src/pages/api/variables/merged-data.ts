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

  const { group, userId, days = '30' } = req.query;

  if (!group || !userId) {
    return res.status(400).json({ error: 'Group slug and userId are required' });
  }

  if (typeof group !== 'string' || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const daysNum = parseInt(days as string, 10);
  if (isNaN(daysNum) || daysNum <= 0) {
    return res.status(400).json({ error: 'Invalid days parameter' });
  }

  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysNum);

    // Use fallback implementation directly since we don't have database functions
    return await fallbackMergedDataQuery(group, userId, startDate, endDate, res);
  } catch (error) {
    console.error('Error in merged data API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Fallback implementation using hardcoded variable mappings
async function fallbackMergedDataQuery(
  groupSlug: string, 
  userId: string, 
  startDate: Date, 
  endDate: Date, 
  res: NextApiResponse
) {
  try {
    // Hardcoded variable mappings based on discovered data
    const variableMappings = {
      'body_weight': {
        canonical_unit: 'kg',
        variables: [
          {
            variable_id: 'e722b859-7c3f-494f-8ebf-4db24914803a', // Manual weight
            data_source: 'manual',
            source_priority: 1,
            source_unit: 'kg',
            conversion_factor: 1.0,
            conversion_offset: 0.0
          },
          {
            variable_id: '4db5c85b-0f41-4eb9-81de-3b57b5dfa198', // Apple Health weight
            data_source: 'apple_health',
            source_priority: 2,
            source_unit: 'kg',
            conversion_factor: 1.0,
            conversion_offset: 0.0
          }
        ]
      }
    };

    const mergeConfig = variableMappings[groupSlug as keyof typeof variableMappings];
    if (!mergeConfig) {
      return res.status(404).json({ error: 'Merge group not found' });
    }

    // Get variable IDs
    const variableIds = mergeConfig.variables.map(v => v.variable_id);

    // Fetch data points
    const { data: dataPoints, error: dataError } = await supabaseAdmin
      .from('data_points')
      .select('*')
      .eq('user_id', userId)
      .in('variable_id', variableIds)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (dataError) {
      console.error('Error fetching data points:', dataError);
      return res.status(500).json({ error: 'Failed to fetch data points' });
    }

    // Process and merge data
    const mergedData = dataPoints?.map(dp => {
      const mapping = mergeConfig.variables.find(v => v.variable_id === dp.variable_id);
      if (!mapping) return null;

      const originalValue = parseFloat(dp.value);
      const convertedValue = originalValue * (mapping.conversion_factor || 1) + (mapping.conversion_offset || 0);

      return {
        date: dp.date,
        value: convertedValue,
        source: mapping.data_source,
        variable_id: dp.variable_id,
        original_value: originalValue,
        original_unit: mapping.source_unit,
        data_point_id: dp.id
      };
    }).filter(Boolean) || [];

    res.status(200).json(mergedData);
  } catch (error) {
    console.error('Error in fallback query:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 