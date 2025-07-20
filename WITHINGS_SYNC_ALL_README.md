# Withings Sync All Edge Function

## Overview

The `withings-sync-all` edge function is a comprehensive solution for fetching all Withings health data for a user since January 2009 and storing it in the Supabase database. This function is designed to handle large data imports efficiently with automatic token refresh and error handling.

## Features

- **Complete Historical Data Import**: Fetches all available Withings data from 2009 to present
- **Automatic Token Management**: Handles token refresh automatically when tokens expire
- **Batch Processing**: Processes data in monthly chunks to avoid timeouts
- **Error Recovery**: Continues processing even if individual date ranges fail
- **Data Deduplication**: Prevents duplicate entries in the database
- **Progress Tracking**: Provides detailed progress and results information
- **Flexible Configuration**: Allows custom start year and existing data clearing options

## Database Schema

The function stores data in the `withings_variable_data_points` table with the following structure:

```sql
CREATE TABLE withings_variable_data_points (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  date TIMESTAMPTZ NOT NULL,
  variable TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  UNIQUE(user_id, date, variable)
);
```

## Supported Measurement Types

The function handles the following Withings measurement types:

| Withings Type | Variable Name      | Description                  |
| ------------- | ------------------ | ---------------------------- |
| 1             | weight_kg          | Weight in kilograms          |
| 5             | fat_free_mass_kg   | Fat-free mass in kilograms   |
| 6             | fat_ratio          | Fat ratio percentage         |
| 8             | fat_mass_weight_kg | Fat mass weight in kilograms |
| 76            | muscle_mass_kg     | Muscle mass in kilograms     |
| 77            | hydration_kg       | Hydration in kilograms       |
| 88            | bone_mass_kg       | Bone mass in kilograms       |

## API Endpoint

```
POST /functions/v1/withings-sync-all
```

### Request Body

```typescript
{
  userId: string;           // Required: User ID to sync data for
  clearExisting?: boolean;  // Optional: Clear existing data first (default: true)
  startYear?: number;       // Optional: Start year for data import (default: 2009)
}
```

### Response Format

```typescript
{
  success: boolean;
  data?: {
    totalUpserted: number;           // Total data points stored
    dateRangesProcessed: number;     // Number of date ranges successfully processed
    dateRangesFailed: number;        // Number of date ranges that failed
    totalDateRanges: number;         // Total number of date ranges attempted
    dateRange: {
      start: string;                 // ISO date string of start date
      end: string;                   // ISO date string of end date
    }
  };
  error?: string;                    // Error message if failed
}
```

## Environment Variables

The function requires the following environment variables to be set in your Supabase project:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `WITHINGS_ClientID`: Your Withings application client ID
- `WITHINGS_Secret`: Your Withings application secret

## Usage Examples

### JavaScript/TypeScript

```javascript
const response = await fetch(
  "https://your-project.supabase.co/functions/v1/withings-sync-all",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      userId: "user-uuid-here",
      clearExisting: true,
      startYear: 2009,
    }),
  }
);

const result = await response.json();
console.log("Sync completed:", result.data);
```

### cURL

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/withings-sync-all' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'apikey: your-anon-key' \
  -d '{
    "userId": "user-uuid-here",
    "clearExisting": true,
    "startYear": 2009
  }'
```

## Deployment

### Using Supabase CLI

```bash
# Navigate to your project directory
cd your-project

# Deploy the function
supabase functions deploy withings-sync-all

# Set environment variables (if not already set)
supabase secrets set WITHINGS_ClientID=your-client-id
supabase secrets set WITHINGS_Secret=your-secret
```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Edge Functions
3. Create a new function named `withings-sync-all`
4. Copy the function code from `supabase/functions/withings-sync-all/index.ts`
5. Set the required environment variables in Settings > Edge Functions

## Error Handling

The function includes comprehensive error handling:

- **Token Expiration**: Automatically refreshes expired tokens
- **Network Errors**: Retries failed requests with exponential backoff
- **Partial Failures**: Continues processing even if some date ranges fail
- **Data Validation**: Validates data before storing to prevent invalid entries
- **Rate Limiting**: Processes data in batches to avoid API rate limits

## Performance Considerations

- **Batch Processing**: Data is processed in monthly chunks to avoid timeouts
- **Upsert Operations**: Uses database upserts to prevent duplicates
- **Memory Management**: Processes data in small batches to manage memory usage
- **Progress Logging**: Provides detailed logs for monitoring progress

## Monitoring

The function provides detailed console logs for monitoring:

```
[Withings Sync All] Starting full sync for user user-id from 2009
[Withings Sync All] Cleared existing data for user user-id
[Withings Sync All] Processing 180 date ranges for user user-id
[Withings Sync All] Processing range 1/180: 2009-01 for user user-id
[Withings Sync All] Range 2009-01: 5 records, 15 upserted
...
```

## Troubleshooting

### Common Issues

1. **"Not connected to Withings"**: User needs to connect their Withings account first
2. **"Failed to refresh Withings token"**: Check Withings API credentials
3. **"Unexpected server error"**: Check function logs for detailed error information

### Debug Steps

1. Check that the user has valid Withings tokens in the `withings_tokens` table
2. Verify environment variables are correctly set
3. Check function logs in the Supabase dashboard
4. Test with a smaller date range first

## Security

- Uses service role key for database operations
- Validates user authentication
- Sanitizes all input data
- Uses parameterized queries to prevent injection attacks

## Limitations

- Maximum execution time: 60 seconds (Supabase Edge Function limit)
- For very large datasets, consider running multiple smaller imports
- Requires user to have connected their Withings account first

## Related Functions

- `withings-processor`: General-purpose Withings data processing
- `withings-sync`: Sync recent data only
- `withings-reimport`: Reimport existing data

## Support

For issues or questions about this function, check:

1. Supabase Edge Function logs
2. Withings API documentation
3. Function console output for detailed error messages
