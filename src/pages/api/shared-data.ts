import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await handleGet(req, res);
      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Shared data API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { action, userId, variableId, viewerId, limit } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    switch (action) {
      case 'variables':
        // Get shared variables for a user
        const { data: sharedVars, error: varsError } = await supabase.rpc(
          'get_user_shared_variables',
          { target_user_id: userId }
        );

        if (varsError) throw varsError;
        return res.status(200).json({ data: sharedVars });

      case 'data-points':
        // Get shared data points for a user and optionally a specific variable
        const { data: dataPoints, error: dataError } = await supabase.rpc(
          'get_all_shared_data_points',
          {
            target_user_id: userId,
            target_variable_id: variableId || null,
            viewer_user_id: viewerId || null,
            limit_count: parseInt(limit as string) || 50
          }
        );

        if (dataError) throw dataError;
        return res.status(200).json({ data: dataPoints });

      case 'check-shared':
        // Check if a specific variable is shared by a user
        if (!variableId || typeof variableId !== 'string') {
          return res.status(400).json({ error: 'variableId is required for check-shared action' });
        }

        const { data: isShared, error: checkError } = await supabase.rpc(
          'is_variable_shared',
          {
            target_user_id: userId,
            target_variable_id: variableId
          }
        );

        if (checkError) throw checkError;
        return res.status(200).json({ data: { isShared } });

      default:
        return res.status(400).json({ 
          error: 'Invalid action. Use: variables, data-points, or check-shared' 
        });
    }
  } catch (error) {
    console.error('Error in shared data API:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch shared data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Types for TypeScript support
export interface SharedVariable {
  variable_id: string;
  variable_label: string;
  variable_slug: string;
  variable_icon: string;
  data_point_count: number;
  latest_value: string;
  latest_date: string;
}

export interface SharedDataPoint {
  id: string;
  user_id: string;
  variable_id: string;
  variable_label: string;
  value: string;
  notes: string;
  date: string;
  created_at: string;
  source: string;
} 