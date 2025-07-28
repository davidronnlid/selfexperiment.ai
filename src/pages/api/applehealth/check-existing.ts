import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user_id, start_date, end_date, data_type } = req.body

    if (!user_id || !start_date || !end_date || !data_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, start_date, end_date, data_type' 
      })
    }

    console.log(`🔍 Checking existing data for user ${user_id}: ${start_date} to ${end_date} (${data_type})`)

    // Calculate total days in range
    const startDateTime = new Date(start_date)
    const endDateTime = new Date(end_date)
    const timeDiff = endDateTime.getTime() - startDateTime.getTime()
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1

    // Query for existing data in the date range
    const { data: existingData, error } = await supabaseAdmin
      .from('apple_health_variable_data_points')
      .select('date, variable_id, value')
      .eq('user_id', user_id)
      .eq('variable_id', data_type) // 'steps' 
      .gte('date', start_date)
      .lte('date', end_date)
      .order('date')

    if (error) {
      console.error('Database error checking existing data:', error)
      return res.status(500).json({ error: 'Database error', details: error })
    }

    const existingDates = existingData?.map(row => row.date) || []
    const existingCount = existingDates.length

    console.log(`📊 Found ${existingCount}/${totalDays} existing days for ${data_type}`)

    // Return comprehensive information
    return res.status(200).json({
      success: true,
      user_id,
      data_type,
      date_range: {
        start_date,
        end_date,
        total_days: totalDays
      },
      existing_count: existingCount,
      total_days: totalDays,
      existing_dates: existingDates,
      coverage_percentage: totalDays > 0 ? Math.round((existingCount / totalDays) * 100) : 0,
      is_complete: existingCount === totalDays && totalDays > 0,
      message: existingCount === totalDays && totalDays > 0 
        ? `All ${totalDays} days already synced`
        : existingCount > 0 
          ? `${existingCount} of ${totalDays} days already synced`
          : `No existing data found for ${totalDays} days`
    })

  } catch (error) {
    console.error('Error checking existing data:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
} 