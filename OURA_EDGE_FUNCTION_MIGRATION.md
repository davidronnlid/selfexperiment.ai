# Oura Edge Function Migration Guide

## Overview

This guide covers the migration of Oura Ring integration from client-side API routes to Supabase Edge Functions, following the same successful pattern used for Withings integration. The new system provides better performance, security, and scalability.

## What Changed

### Before (API Routes)

- Client-side data fetching via `/api/oura/fetch`
- Data stored in `oura_variable_logs` table with string variable names
- Manual token refresh handling
- Limited batch processing capabilities

### After (Edge Functions)

- Server-side data syncing via `/api/v1/functions/oura-sync-all` edge function
- Data stored in `oura_variable_data_points` table with UUID foreign keys
- Automatic token refresh and error handling
- Efficient batch processing with date range chunking
- Better rate limit management

## New Database Schema

### Table Structure

```sql
CREATE TABLE oura_variable_data_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    value DECIMAL(10,4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, date, variable_id)
);
```

### Supported Variables

The system automatically creates these variables in the `variables` table:

| Variable Slug                 | Label                       | Unit       | Category   |
| ----------------------------- | --------------------------- | ---------- | ---------- |
| `readiness_score`             | Readiness Score             | score      | Recovery   |
| `sleep_score`                 | Sleep Score                 | score      | Sleep      |
| `total_sleep_duration`        | Total Sleep Duration        | seconds    | Sleep      |
| `rem_sleep_duration`          | REM Sleep Duration          | seconds    | Sleep      |
| `deep_sleep_duration`         | Deep Sleep Duration         | seconds    | Sleep      |
| `light_sleep_duration`        | Light Sleep Duration        | seconds    | Sleep      |
| `efficiency`                  | Sleep Efficiency            | percentage | Sleep      |
| `sleep_latency`               | Sleep Latency               | seconds    | Sleep      |
| `temperature_deviation`       | Temperature Deviation       | celsius    | Recovery   |
| `temperature_trend_deviation` | Temperature Trend Deviation | celsius    | Recovery   |
| `hr_lowest_true`              | Lowest Heart Rate           | bpm        | Heart Rate |
| `hr_average_true`             | Average Heart Rate          | bpm        | Heart Rate |

## Edge Function Features

### Comprehensive Data Sync

- **Historical Data**: Fetches all data from 2020 onwards (configurable)
- **Multiple Endpoints**: Syncs daily readiness, sleep, and heart rate data
- **Batch Processing**: Processes data in 30-day chunks to avoid timeouts
- **Automatic Variables**: Creates/updates variable definitions automatically

### Error Handling & Recovery

- **Token Refresh**: Automatically refreshes expired tokens
- **Retry Logic**: Handles temporary API failures gracefully
- **Partial Success**: Continues processing even if some date ranges fail
- **Detailed Logging**: Comprehensive error reporting and progress tracking

### Performance Optimizations

- **Rate Limiting**: Built-in delays to respect Oura API limits
- **Data Deduplication**: Uses upsert to prevent duplicate entries
- **Efficient Queries**: Optimized database operations
- **Progress Tracking**: Real-time sync progress and statistics

## Migration Steps

### 1. Deploy Database Schema

Run the database migration script in your Supabase SQL Editor:

```sql
-- Copy and run database/create_oura_variable_data_points.sql
```

This will:

- Create the new `oura_variable_data_points` table
- Add proper indexes and RLS policies
- Insert Oura variables into the `variables` table
- Set up foreign key relationships

### 2. Deploy Edge Function

Deploy the new edge function:

```bash
supabase functions deploy oura-sync-all
```

### 3. Set Environment Variables

Ensure these environment variables are set in your Supabase project:

```bash
supabase secrets set OURA_CLIENT_ID=your_oura_client_id
supabase secrets set OURA_CLIENT_SECRET=your_oura_client_secret
```

### 4. Test the Integration

Use the new `/oura-test` page to:

- Verify connection status
- Test data syncing
- Search specific date ranges
- View sync statistics

### 5. Update Frontend Components

The following components have been updated to use the new system:

- `ComprehensiveHealthDashboard.tsx` - Uses edge function for syncing
- Added `OuraDataPreview` component with date search
- Updated data fetching to use proper joins with variables table

## API Usage

### Edge Function Endpoint

```typescript
POST /api/v1/functions/oura-sync-all

// Request Body
{
  "user_id": "uuid",
  "start_year": 2020,        // Optional, defaults to 2020
  "clear_existing": false    // Optional, whether to clear existing data
}

// Response
{
  "success": true,
  "message": "Oura sync completed successfully",
  "stats": {
    "readinessProcessed": 150,
    "sleepProcessed": 150,
    "heartRateProcessed": 1000,
    "totalInserted": 500,
    "dateRangesProcessed": 5,
    "successRate": "100.0%",
    "errors": []
  }
}
```

### Frontend Integration

```typescript
// Sync Oura data
const syncOuraData = async () => {
  const response = await fetch("/api/v1/functions/oura-sync-all", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      user_id: userId,
      start_year: 2020,
      clear_existing: false,
    }),
  });

  const result = await response.json();
  if (result.success) {
    console.log("Sync completed:", result.stats);
  }
};

// Query synced data
const { data: ouraData } = await supabase
  .from("oura_variable_data_points")
  .select(
    `
    date, 
    value, 
    variables!inner(slug, label)
  `
  )
  .eq("user_id", userId)
  .order("date", { ascending: false });
```

## Testing & Debugging

### Test Page Features

The `/oura-test` page provides:

- **Connection Status**: Shows if Oura tokens are valid
- **Data Preview**: Recent data with variable labels
- **Date Search**: Search specific date ranges
- **Sync Testing**: Test the edge function with progress tracking
- **Debug Info**: Console logging for troubleshooting

### Common Issues

1. **Missing Environment Variables**

   - Check Supabase secrets are set correctly
   - Verify Oura client ID and secret

2. **Token Refresh Failures**

   - Ensure refresh token is still valid
   - Reconnect if tokens are expired

3. **Data Not Appearing**

   - Check RLS policies are correctly applied
   - Verify foreign key relationships
   - Use debug console to inspect raw data

4. **Sync Timeouts**
   - Large datasets are processed in chunks
   - Monitor progress via console logs
   - Individual chunk failures don't stop the entire sync

## Data Migration

### Migrating from Old System

If you have existing data in `oura_variable_logs`, you can migrate it:

```sql
-- Example migration script (customize as needed)
INSERT INTO oura_variable_data_points (user_id, date, variable_id, value, created_at)
SELECT
  ovl.user_id,
  ovl.date,
  v.id as variable_id,
  ovl.value,
  ovl.created_at
FROM oura_variable_logs ovl
JOIN variables v ON v.slug = ovl.variable_id
WHERE v.source_type = 'oura'
ON CONFLICT (user_id, date, variable_id) DO NOTHING;
```

### Data Verification

After migration, verify data integrity:

```sql
-- Check data counts
SELECT
  v.label,
  COUNT(*) as count,
  MIN(ovdp.date) as earliest_date,
  MAX(ovdp.date) as latest_date
FROM oura_variable_data_points ovdp
JOIN variables v ON v.id = ovdp.variable_id
WHERE ovdp.user_id = 'your-user-id'
GROUP BY v.label
ORDER BY v.label;
```

## Benefits of the New System

### Performance

- **Faster Syncing**: Edge functions run closer to the database
- **Batch Processing**: Efficient handling of large datasets
- **Better Caching**: Improved data access patterns

### Reliability

- **Automatic Recovery**: Built-in error handling and retries
- **Token Management**: Automatic refresh of expired tokens
- **Data Integrity**: Foreign key constraints prevent orphaned data

### Scalability

- **Rate Limiting**: Respects API limits to prevent blocking
- **Efficient Storage**: Normalized data structure reduces storage needs
- **Better Queries**: Foreign key relationships enable efficient joins

### Developer Experience

- **Better Debugging**: Comprehensive logging and error reporting
- **Test Interface**: Built-in testing page for easy validation
- **Consistent API**: Follows same patterns as Withings integration

## Future Enhancements

### Planned Features

1. **Real-time Sync**: Webhook support for instant data updates
2. **Selective Sync**: Choose specific variables to sync
3. **Data Validation**: Enhanced data quality checks
4. **Analytics**: Built-in trend analysis and insights

### Monitoring

- **Sync Logs**: Track sync frequency and success rates
- **Error Alerts**: Notifications for failed syncs
- **Usage Analytics**: Monitor API usage and rate limits

## Support

### Troubleshooting Steps

1. Check connection status on `/oura-test` page
2. Review browser console for error messages
3. Verify environment variables are set
4. Test with small date ranges first
5. Check Supabase function logs for detailed errors

### Common Solutions

- **Token Issues**: Reconnect your Oura account
- **Missing Data**: Run full sync with `clear_existing: true`
- **Slow Performance**: Check for rate limiting delays
- **Database Errors**: Verify table structure and permissions

The new Oura edge function integration provides a robust, scalable foundation for health data tracking with excellent developer experience and user reliability.
