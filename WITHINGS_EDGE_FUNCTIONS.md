# Withings Edge Functions

This document describes the Withings data processing edge functions that have been moved from Next.js API routes to Supabase Edge Functions for better reliability and performance.

## Overview

The Withings integration now uses two Supabase Edge Functions:

1. **`withings-sync`** - Syncs Withings data for a specific date range
2. **`withings-reimport`** - Reimports all historical Withings data

## Functions

### withings-sync

**Purpose**: Syncs Withings data for a specific date range

**Endpoint**: `POST /functions/v1/withings-sync`

**Request Body**:

```json
{
  "userId": "user-uuid",
  "startdate": 1640995200,
  "enddate": 1640995200,
  "meastype": [1, 5, 6, 8, 76, 77, 88]
}
```

**Response**:

```json
{
  "success": true,
  "count": 10,
  "upserted": 10,
  "rows": [...]
}
```

### withings-reimport

**Purpose**: Reimports all historical Withings data from 2009 to present

**Endpoint**: `POST /functions/v1/withings-reimport`

**Request Body**:

```json
{
  "userId": "user-uuid"
}
```

**Response**:

```json
{
  "success": true,
  "totalUpserted": 150,
  "results": [
    {
      "range": "2009-01",
      "count": 5,
      "upserted": 5
    }
  ],
  "dateRanges": 180
}
```

## Deployment

### Prerequisites

1. Install Supabase CLI
2. Set up environment variables in Supabase dashboard:
   - `WITHINGS_ClientID`
   - `WITHINGS_Secret`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Deploy Functions

Run the deployment script:

```bash
node scripts/deploy-withings-functions.js
```

Or deploy manually:

```bash
# Deploy sync function
supabase functions deploy withings-sync

# Deploy reimport function
supabase functions deploy withings-reimport
```

## Environment Variables

Set these in your Supabase dashboard under Settings > Edge Functions:

- `WITHINGS_ClientID` - Your Withings API client ID
- `WITHINGS_Secret` - Your Withings API secret
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

## Data Processing

Both functions:

1. **Fetch tokens** from the `withings_tokens` table
2. **Refresh tokens** if they're expired
3. **Fetch data** from Withings API
4. **Process and deduplicate** the data
5. **Upsert** to `withings_variable_data_points` table

### Measurement Types

The functions handle these Withings measurement types:

- `1` - Weight (kg)
- `5` - Fat-free mass (kg)
- `6` - Fat ratio (%)
- `8` - Fat mass (kg)
- `76` - Muscle mass (kg)
- `77` - Hydration (kg)
- `88` - Bone mass (kg)

## Frontend Integration

The frontend components have been updated to use the edge functions:

```typescript
// Sync data
const response = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/withings-sync`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      userId,
      startdate,
      enddate,
      meastype: [1, 5, 6, 8, 76, 77, 88],
    }),
  }
);

// Reimport data
const response = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/withings-reimport`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      userId,
    }),
  }
);
```

## Benefits

1. **Better reliability** - Serverless functions with automatic scaling
2. **Improved performance** - No cold starts for data processing
3. **Better error handling** - Centralized error handling and logging
4. **Reduced frontend load** - Data processing happens server-side
5. **Automatic token refresh** - Handles token expiration seamlessly

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check that environment variables are set correctly
2. **Token refresh failures**: Verify Withings API credentials
3. **Data not syncing**: Check the function logs in Supabase dashboard

### Logs

View function logs in the Supabase dashboard under Edge Functions > Logs.

### Testing

Test the functions locally:

```bash
# Test sync function
supabase functions serve withings-sync

# Test reimport function
supabase functions serve withings-reimport
```
