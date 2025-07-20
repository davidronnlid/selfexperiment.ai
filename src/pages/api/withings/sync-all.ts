import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { userId, clearExisting = false, startYear = 2020 } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // Call the withings-sync-all edge function
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/withings-sync-all`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          userId,
          clearExisting,
          startYear,
        }),
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      return res.status(200).json(result);
    } else {
      console.error('Withings sync-all failed:', result);
      return res.status(500).json({
        success: false,
        error: result.error || 'Sync failed',
      });
    }
  } catch (error) {
    console.error('Error calling withings-sync-all:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
} 