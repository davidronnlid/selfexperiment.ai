import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, startYear = 2020, clearExisting = false } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Call the Supabase edge function
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/oura-sync-all`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          userId,
          startYear,
          clearExisting,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge function error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Edge function error: ${response.status}`,
        details: errorText
      });
    }

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error('API route error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 