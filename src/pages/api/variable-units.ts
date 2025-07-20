import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { VariableUnit } from '../../types/variables';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res);
      case 'PUT':
        return handlePut(req, res);
      case 'DELETE':
        return handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in variable-units API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/variable-units?variable_id=xxx or /api/variable-units?unit_id=xxx
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { variable_id, unit_id } = req.query;

  let query = supabase
    .from('variable_units')
    .select(`
      variable_id,
      unit_id,
      priority,
      note,
      units(id, label, symbol, unit_group, is_base),
      variables(id, slug, label)
    `)
    .order('priority', { ascending: true });

  if (variable_id) {
    query = query.eq('variable_id', variable_id);
  }

  if (unit_id) {
    query = query.eq('unit_id', unit_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching variable_units:', error);
    return res.status(500).json({ error: 'Failed to fetch variable_units' });
  }

  return res.status(200).json(data || []);
}

// POST /api/variable-units - Create new variable_unit relationship
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { variable_id, unit_id, priority = 1, note } = req.body;

  if (!variable_id || !unit_id) {
    return res.status(400).json({ 
      error: 'variable_id and unit_id are required' 
    });
  }

  // Check if the relationship already exists
  const { data: existing } = await supabase
    .from('variable_units')
    .select('*')
    .eq('variable_id', variable_id)
    .eq('unit_id', unit_id)
    .single();

  if (existing) {
    return res.status(409).json({ 
      error: 'Variable-unit relationship already exists' 
    });
  }

  const { data, error } = await supabase
    .from('variable_units')
    .insert({
      variable_id,
      unit_id,
      priority,
      note
    })
    .select(`
      variable_id,
      unit_id,
      priority,
      note,
      units(id, label, symbol, unit_group, is_base),
      variables(id, slug, label)
    `)
    .single();

  if (error) {
    console.error('Error creating variable_unit:', error);
    return res.status(500).json({ error: 'Failed to create variable_unit' });
  }

  return res.status(201).json(data);
}

// PUT /api/variable-units - Update variable_unit relationship
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { variable_id, unit_id, priority, note } = req.body;

  if (!variable_id || !unit_id) {
    return res.status(400).json({ 
      error: 'variable_id and unit_id are required' 
    });
  }

  const updateData: Partial<VariableUnit> = {};
  if (priority !== undefined) updateData.priority = priority;
  if (note !== undefined) updateData.note = note;

  const { data, error } = await supabase
    .from('variable_units')
    .update(updateData)
    .eq('variable_id', variable_id)
    .eq('unit_id', unit_id)
    .select(`
      variable_id,
      unit_id,
      priority,
      note,
      units(id, label, symbol, unit_group, is_base),
      variables(id, slug, label)
    `)
    .single();

  if (error) {
    console.error('Error updating variable_unit:', error);
    return res.status(500).json({ error: 'Failed to update variable_unit' });
  }

  return res.status(200).json(data);
}

// DELETE /api/variable-units - Remove variable_unit relationship
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { variable_id, unit_id } = req.body;

  if (!variable_id || !unit_id) {
    return res.status(400).json({ 
      error: 'variable_id and unit_id are required' 
    });
  }

  const { error } = await supabase
    .from('variable_units')
    .delete()
    .eq('variable_id', variable_id)
    .eq('unit_id', unit_id);

  if (error) {
    console.error('Error deleting variable_unit:', error);
    return res.status(500).json({ error: 'Failed to delete variable_unit' });
  }

  return res.status(204).send('');
} 