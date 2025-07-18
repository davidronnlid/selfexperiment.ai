# Withings Dev Page - Extended Data Exploration

## Overview

The Withings Dev Page (`/withings-dev`) is a comprehensive development tool for exploring additional health data types available from Withings devices beyond the current body composition measurements. This page allows you to test different measurement categories and discover what additional health metrics are available.

## Features

### 🔬 Measurement Categories

The dev page supports testing of these extended measurement categories:

#### Body Composition (Current)

- **Weight (kg)** - Body weight measurements
- **Fat-Free Mass (kg)** - Lean body mass
- **Fat Ratio (%)** - Body fat percentage
- **Fat Mass (kg)** - Fat mass weight
- **Muscle Mass (kg)** - Muscle mass
- **Hydration (kg)** - Body water content
- **Bone Mass (kg)** - Bone mass

#### Blood Pressure

- **Diastolic BP (mmHg)** - Diastolic blood pressure
- **Systolic BP (mmHg)** - Systolic blood pressure
- **Heart Pulse (bpm)** - Heart rate during BP measurement

#### Heart Rate

- **Heart Rate (bpm)** - Resting heart rate
- **HRV (ms)** - Heart rate variability

#### Activity & Steps

- **Steps** - Daily step count
- **Calories (kcal)** - Calories burned
- **Distance (m)** - Distance walked/run
- **Elevation (m)** - Elevation gained

#### Sleep

- **Sleep Duration (min)** - Total sleep time
- **Light Sleep (min)** - Light sleep duration
- **Deep Sleep (min)** - Deep sleep duration
- **REM Sleep (min)** - REM sleep duration
- **Wake Time (min)** - Time awake during sleep

#### Temperature

- **Temperature (°C)** - Body temperature
- **Skin Temperature (°C)** - Skin temperature

#### Blood Oxygen

- **SpO2 (%)** - Blood oxygen saturation

#### ECG

- **ECG** - Electrocardiogram data

#### Other Health Metrics

- **Pulse Wave Velocity** - Arterial stiffness
- **VO2 Max** - Maximum oxygen consumption
- **Sleep Score** - Overall sleep quality score
- **Sleep Latency (min)** - Time to fall asleep
- **Sleep Efficiency (%)** - Sleep efficiency percentage
- **Sleep Midpoint** - Middle of sleep period
- **Sleep HR Metrics** - Heart rate during sleep (lowest, average, highest)
- **Sleep HRV Metrics** - HRV during sleep (lowest, average, highest)

## Usage

### 1. Access the Dev Page

Navigate to `/withings-dev` in your browser.

### 2. Check Connection Status

The page will show whether you're connected to Withings. If not connected, click "Connect Withings" to authenticate.

### 3. Test Measurement Categories

#### Test All Categories

Click "Test All Categories" to test all available measurement types at once.

#### Test Individual Categories

Expand any category accordion and click "Test [Category Name]" to test specific measurement types.

#### Custom Measurement Types

Enter specific measurement type IDs (comma-separated) in the custom field and click "Test Custom Types".

### 4. View Results

Each test will show:

- ✅ **Success**: Number of data points found and sample data
- ❌ **Error**: Error message if the test failed
- 📊 **Data Preview**: Sample of the actual data returned

### 5. View Available Data

Click "View Available Data" to see what data is already stored in your database.

## API Updates

### Extended Measurement Type Mapping

The following APIs have been updated to support extended measurement types:

- `src/pages/api/withings/fetch.ts`
- `supabase/functions/withings-sync/index.ts`
- `supabase/functions/withings-reimport/index.ts`

### Improved Data Filtering

The filtering logic has been updated to be more flexible:

- **Before**: Only accepted rows with valid weight data
- **After**: Accepts any row with at least one valid measurement

## Testing

### Run the Test Script

```bash
node scripts/test_withings_dev.js
```

This script will:

1. Find a test user with Withings connection
2. Test all measurement categories
3. Show results for each category
4. Display existing data in the database

### Manual Testing

1. Connect a user to Withings
2. Visit `/withings-dev`
3. Test different measurement categories
4. Check the results and sample data

## Common Measurement Types

### Body Composition (1, 5, 6, 8, 76, 77, 88)

Most common and widely available across Withings scales.

### Blood Pressure (9, 10, 11)

Available with Withings blood pressure monitors.

### Heart Rate (12, 13)

Available with Withings watches and some scales.

### Activity (16, 17, 18, 19)

Available with Withings watches and activity trackers.

### Sleep (20-34)

Available with Withings sleep tracking devices.

### Temperature (71, 73)

Available with some newer Withings devices.

### SpO2 (54)

Available with Withings watches that support blood oxygen monitoring.

### ECG (91)

Available with Withings watches that support ECG functionality.

## Troubleshooting

### No Data Found

- **Check Device Compatibility**: Not all measurement types are available on all devices
- **Check Date Range**: Try different date ranges (7, 30, 90, 365 days)
- **Check Connection**: Ensure your Withings account is properly connected
- **Check Permissions**: Some measurement types may require additional permissions

### API Errors

- **401 Unauthorized**: Reconnect your Withings account
- **No Data**: The measurement type may not be available for your device
- **Rate Limiting**: Wait a few minutes and try again

### Database Issues

- **No Records**: Data may not be syncing properly
- **Missing Variables**: Check if the measurement type is supported

## Next Steps

After exploring available data types:

1. **Identify Valuable Metrics**: Determine which additional metrics provide useful insights
2. **Update Integration**: Add supported measurement types to the main Withings integration
3. **Update UI**: Add new metrics to dashboards and analytics
4. **Data Validation**: Ensure new data types are properly validated and formatted
5. **User Experience**: Consider how new metrics fit into the overall health tracking experience

## Technical Notes

### Measurement Type IDs

Withings uses numeric IDs for different measurement types. The mapping is maintained in:

- `MEAS_TYPE_MAP` in API files
- `EXTENDED_MEAS_TYPES` in the dev page

### Data Storage

All data is stored in the `withings_variable_data_points` table with:

- `user_id`: User identifier
- `date`: Measurement date
- `variable`: Measurement type name
- `value`: Measurement value

### API Endpoints

- **Sync**: `/api/withings/fetch` - Fetch specific measurement types
- **Edge Function**: `/functions/v1/withings-sync` - Serverless sync
- **Reimport**: `/functions/v1/withings-reimport` - Full data reimport

## Contributing

To add new measurement types:

1. **Update Mapping**: Add new type IDs to `MEAS_TYPE_MAP` in all API files
2. **Update Dev Page**: Add new types to `EXTENDED_MEAS_TYPES`
3. **Test**: Use the dev page to verify the new types work
4. **Document**: Update this README with new measurement types
5. **Deploy**: Deploy updated edge functions if needed

## Support

For issues with the Withings dev page:

1. Check the browser console for errors
2. Verify Withings connection status
3. Test with different measurement types
4. Check the test script output
5. Review API logs for detailed error information
