import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { userId, startYear = 2020, clearExisting = false } = req.body || {};

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: "userId is required" });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        success: false,
        error: "Server is missing Supabase configuration",
      });
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/oura-sync-incremental`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ userId, startYear, clearExisting }),
      }
    );

    const resultText = await response.text();
    let result: any = {};
    try {
      result = JSON.parse(resultText);
    } catch {
      result = { raw: resultText };
    }

    if (!response.ok) {
      return res.status(response.status).json({ success: false, ...result });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error calling Oura incremental sync:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
}

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