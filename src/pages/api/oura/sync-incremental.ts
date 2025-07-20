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

    console.log(`[Oura Incremental] Starting incremental sync for user ${userId}`);

    // Call the existing Oura fetch endpoint which already does incremental sync (last 90 days)
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/oura/fetch?user_id=${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log(`[Oura Incremental] Successfully synced data for user ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Incremental sync completed successfully',
        syncType: 'incremental',
        data: {
          totalUpserted: result.stats?.inserts || 0,
          stats: result.stats,
        },
        dateRange: {
          description: 'Last 90 days',
        }
      });
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Oura incremental sync failed:', errorData);
      return res.status(500).json({
        success: false,
        error: errorData.error || 'Incremental sync failed',
      });
    }
  } catch (error) {
    console.error('Error calling Oura incremental sync:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
} 