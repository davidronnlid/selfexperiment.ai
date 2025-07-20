import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // Calculate start date for incremental sync (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    const startYear = startDate.getFullYear();

    console.log(`[Withings Incremental] Syncing last 30 days for user ${userId} from ${startDate.toISOString()}`);

    // Call the withings-sync-all edge function with recent date range
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
          clearExisting: false, // Incremental sync - don't clear existing data
          startYear, // Only sync from the calculated recent start year
        }),
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`[Withings Incremental] Successfully synced ${result.data?.totalUpserted || 0} data points`);
      return res.status(200).json({
        ...result,
        message: 'Incremental sync completed successfully',
        syncType: 'incremental',
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        }
      });
    } else {
      console.error('Withings incremental sync failed:', result);
      return res.status(500).json({
        success: false,
        error: result.error || 'Incremental sync failed',
      });
    }
  } catch (error) {
    console.error('Error calling withings incremental sync:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
} 