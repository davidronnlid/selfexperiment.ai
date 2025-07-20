import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: units, error } = await supabase
      .from('units')
      .select('*')
      .order('unit_group', { ascending: true })
      .order('is_base', { ascending: false })
      .order('label', { ascending: true });

    if (error) {
      console.error('Error fetching units:', error);
      return res.status(500).json({ error: 'Failed to fetch units' });
    }

    return res.status(200).json(units || []);
  } catch (error) {
    console.error('Error in units API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 