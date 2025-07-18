# Withings Edge Functions System

This document describes the new Withings data processing system using Supabase Edge Functions.

## Overview

The Withings integration has been moved from Next.js API routes to Supabase Edge Functions for better reliability, performance, and scalability. All Withings data processing now happens server-side in the cloud.

## Edge Function: `withings-processor`

The main edge function handles all Withings operations:

**Endpoint**: `${SUPABASE_URL}/functions/v1/withings-processor`

### Supported Actions

#### 1. `get-status`

Check connection status and data count.

**Request**:

```json
{
  "action": "get-status",
  "userId": "user-uuid"
}
```

**Response**:

```json
{
  "success": true,
  "action": "get-status",
  "data": {
    "connected": true,
    "dataCount": 1250,
    "expiresAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 2. `sync`

Sync Withings data for a specific date range.

**Request**:

```json
{
  "action": "sync",
  "userId": "user-uuid",
  "startdate": 1704067200,
  "enddate": 1704153600,
  "meastype": [1, 5, 6, 8, 76, 77, 88]
}
```

**Response**:

```json
{
  "success": true,
  "action": "sync",
  "data": {
    "count": 15,
    "upserted": 12,
    "dateRange": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-02T00:00:00.000Z"
    }
  }
}
```

#### 3. `reimport`

Reimport all historical Withings data (clears existing data first).

**Request**:

```json
{
  "action": "reimport",
  "userId": "user-uuid"
}
```

**Response**:

```json
{
  "success": true,
  "action": "reimport",
  "data": {
    "totalUpserted": 1250,
    "dateRangesProcessed": 180,
    "dateRange": {
      "start": "2009-01-01T00:00:00.000Z",
      "end": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### 4. `disconnect`

Disconnect from Withings (deletes tokens and data).

**Request**:

```json
{
  "action": "disconnect",
  "userId": "user-uuid"
}
```

**Response**:

```json
{
  "success": true,
  "action": "disconnect",
  "message": "Successfully disconnected from Withings"
}
```

## Frontend Integration

### WithingsIntegration Component

The `WithingsIntegration` component has been updated to use the edge function:

```typescript
// Check connection status
const checkConnection = useCallback(async () => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/withings-processor`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: "get-status",
        userId,
      }),
    }
  );
  // Handle response...
}, [userId]);

// Sync data
const syncData = async () => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/withings-processor`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: "sync",
        userId,
        startdate,
        enddate,
        meastype: [1, 5, 6, 8, 76, 77, 88],
      }),
    }
  );
  // Handle response...
};

// Reimport data
const reimportData = async () => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/withings-processor`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: "reimport",
        userId,
      }),
    }
  );
  // Handle response...
};

// Disconnect
const handleDisconnect = async () => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/withings-processor`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: "disconnect",
        userId,
      }),
    }
  );
  // Handle response...
};
```

### ComprehensiveHealthDashboard Component

The dashboard component also uses the edge function for Withings operations:

```typescript
// Check Withings connection
const checkConnections = useCallback(async () => {
  // Check Oura connection...

  // Check Withings connection using edge function
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/withings-processor`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: "get-status",
        userId,
      }),
    }
  );
  // Handle response...
}, [userId]);
```

## Benefits

1. **Better Reliability**: Serverless functions with automatic scaling and retry logic
2. **Improved Performance**: No cold starts for data processing, faster response times
3. **Centralized Error Handling**: All Withings operations use the same error handling and logging
4. **Reduced Frontend Load**: Data processing happens server-side
5. **Automatic Token Refresh**: Handles token expiration seamlessly
6. **Better Security**: Service role key used server-side, not exposed to frontend

## Environment Variables

The edge function requires these environment variables:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `WITHINGS_ClientID` - Your Withings client ID
- `WITHINGS_Secret` - Your Withings client secret

## Data Processing

The edge function processes Withings data and stores it in the `withings_variable_data_points` table with this structure:

```sql
CREATE TABLE withings_variable_data_points (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  variable TEXT NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, variable)
);
```

### Supported Measurement Types

- `1` - Weight (kg) → `weight_kg`
- `5` - Fat-free mass (kg) → `fat_free_mass_kg`
- `6` - Fat ratio (%) → `fat_ratio`
- `8` - Fat mass (kg) → `fat_mass_weight_kg`
- `76` - Muscle mass (kg) → `muscle_mass_kg`
- `77` - Hydration (kg) → `hydration_kg`
- `88` - Bone mass (kg) → `bone_mass_kg`

## Migration from Old System

The old Next.js API routes (`/api/withings/fetch`, `/api/withings/reimport`) are still available but deprecated. All new development should use the edge function.

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check that environment variables are set correctly
2. **Token Refresh Failed**: Verify Withings credentials are valid
3. **No Data Returned**: Check date ranges and measurement types
4. **Database Errors**: Verify table structure and permissions

### Logs

Edge function logs can be viewed in the Supabase dashboard under Functions > Logs.

## Future Enhancements

1. **Scheduled Syncs**: Add automatic daily/weekly data syncing
2. **Progress Tracking**: Real-time progress updates for long operations
3. **Data Validation**: Enhanced data quality checks
4. **Webhook Support**: Real-time data updates from Withings
