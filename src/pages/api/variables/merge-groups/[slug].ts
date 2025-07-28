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

  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Merge group slug is required' });
  }

  try {
    // Hardcoded merge groups for demo
    const mergeGroups = {
      'body_weight': {
        id: 'body_weight_group',
        name: 'Body Weight',
        slug: 'body_weight',
        description: 'Body weight measurements from multiple sources (Withings scale, Apple Health, manual entry)',
        canonical_unit: 'kg',
        unit_group: 'mass',
        category: 'Physical Health',
        primary_source: 'withings',
        enable_correlation_analysis: true,
        mappings: [
          {
            variable_id: 'e722b859-7c3f-494f-8ebf-4db24914803a',
            data_source: 'manual',
            source_priority: 1,
            variables: {
              id: 'e722b859-7c3f-494f-8ebf-4db24914803a',
              slug: 'weight',
              label: 'Weight',
              source_type: 'manual'
            }
          },
          {
            variable_id: '4db5c85b-0f41-4eb9-81de-3b57b5dfa198',
            data_source: 'apple_health',
            source_priority: 2,
            variables: {
              id: '4db5c85b-0f41-4eb9-81de-3b57b5dfa198',
              slug: 'apple_health_weight',
              label: 'Weight (Apple Health)',
              source_type: 'apple_health'
            }
          }
        ]
      }
    };

    const mergeGroup = mergeGroups[slug as keyof typeof mergeGroups];
    if (!mergeGroup) {
      return res.status(404).json({ error: 'Merge group not found' });
    }

    res.status(200).json(mergeGroup);
  } catch (error) {
    console.error('Error fetching merge group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 