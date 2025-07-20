# Withings Integration Test Page

This document explains how to use the new Withings test page to test the edge functions and integration.

## Accessing the Test Page

1. **Via Navigation Menu**:

   - Log into your account
   - Click on your profile picture/avatar in the top right
   - Select "🏥 Withings Test" from the dropdown menu

2. **Direct URL**:
   - Navigate to `/withings-test` in your browser

## Features

The test page provides the following functionality:

### 1. User Information Display

- Shows your current user ID and email
- Displays Supabase URL and anon key (partially masked)
- Automatically uses your authenticated session

### 2. Connection Status

- Checks if you're connected to Withings
- Shows data point count and last sync time
- Refresh button to check current status

### 3. Test Controls

#### Sync All Settings

- **Start Year**: Choose the year to start syncing from (default: 2009)
- **Clear Existing**: Toggle to clear existing data before syncing

#### Test Buttons

- **Test Sync All (2009-Present)**: Tests the new `withings-sync-all` edge function
- **Test Processor (2024-Present)**: Tests the existing `withings-processor` edge function

### 4. Test Results

- Real-time display of test results
- Shows success/failure status
- Displays response data and error messages
- Includes timing information for each test

## Prerequisites

Before testing, ensure you have:

1. **Withings Account Connected**:

   - You need to have connected your Withings account
   - Visit `/withings-integration` to connect if not already done

2. **Environment Variables Set**:

   - `WITHINGS_ClientID` and `WITHINGS_Secret` must be configured in Supabase
   - Edge functions must be deployed

3. **Edge Functions Deployed**:
   - `withings-sync-all` function should be deployed
   - `withings-processor` function should be deployed

## Testing Workflow

1. **Check Connection**: First verify your Withings connection status
2. **Test Small Sync**: Use "Test Processor" to sync recent data (2024-present)
3. **Test Full Sync**: Use "Test Sync All" to sync all data since 2009
4. **Monitor Results**: Watch the test results for any errors or issues

## Expected Results

### Successful Sync Response

```json
{
  "success": true,
  "data": {
    "totalUpserted": 1234,
    "dateRangesProcessed": 180,
    "dateRangesFailed": 0,
    "totalDateRanges": 180,
    "dateRange": {
      "start": "2009-01-01T00:00:00.000Z",
      "end": "2024-12-19T00:00:00.000Z"
    }
  }
}
```

### Common Error Scenarios

- **Not Connected**: "User not connected to Withings"
- **Invalid Tokens**: "Failed to refresh access token"
- **API Limits**: "Rate limit exceeded"
- **Network Issues**: "Failed to fetch data from Withings API"

## Troubleshooting

### Connection Issues

1. Check if you're logged into the app
2. Verify Withings account is connected
3. Check browser console for detailed error messages

### Sync Failures

1. Verify environment variables are set correctly
2. Check Supabase edge function logs
3. Ensure Withings API credentials are valid
4. Check for rate limiting issues

### Performance Notes

- Large data syncs (2009-present) may take several minutes
- The page shows progress indicators during testing
- Test results are displayed in real-time as they complete

## Security Notes

- The test page uses your authenticated session
- No sensitive data is exposed in the UI
- Anon key is partially masked for security
- All API calls use proper authentication headers

## Next Steps

After successful testing:

1. Monitor the data in your Supabase database
2. Check the `withings_variable_data_points` table
3. Verify data appears in your analytics and tracking pages
4. Consider setting up automated sync schedules if needed
