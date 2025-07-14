# Simple Auto-Logging Setup Instructions

## Overview

This implementation creates an auto-logging system that works with your existing database structure where `routine_variables` has `weekdays` and `times` arrays directly.

## Database Structure

Your current structure:

- `routine_variables` table with `weekdays` (int4[]) and `times` (jsonb[]) columns
- `logs` table with basic logging columns
- `variables` and `routines` tables for metadata

## Setup Steps

### 1. Create the Database Function

**Option A: Manual Setup (Recommended)**

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the entire contents of `database/simple_routine_auto_logs.sql`
4. Run the SQL script

**Option B: Try the Setup Script**

```bash
node scripts/setup_simple_auto_logs.js
```

(This will likely require manual setup as shown above)

### 2. Verify the Function

After setup, verify the function exists:

```sql
SELECT * FROM information_schema.routines
WHERE routine_name = 'create_simple_routine_auto_logs';
```

### 3. Test the Function

Test manually with your user ID:

```sql
SELECT * FROM create_simple_routine_auto_logs(
  'your-user-id-here',
  CURRENT_DATE
);
```

## How It Works

### Database Function

- **Input**: User ID and target date
- **Process**:
  1. Gets current time and weekday
  2. Finds routine variables where today's weekday is in the `weekdays` array
  3. Checks if any times in the `times` array match current time (±1 minute)
  4. Creates auto-logs if no existing logs found
- **Output**: Results showing which variables were auto-logged

### Client-Side Hook

- **Monitoring**: Checks every minute for matching conditions
- **Time Matching**: Compares current time with routine times (1-minute tolerance)
- **Duplicate Prevention**: Tracks processed variables to avoid duplicates
- **User Feedback**: Shows notifications when auto-logging occurs

### API Integration

- **Endpoint**: `/api/routines/create-auto-logs`
- **Authentication**: Requires user ID
- **Real-time**: Called when conditions match

## Data Structure Expected

### Routine Variables Table

```sql
routine_variables:
- id: UUID
- variable_id: UUID (references variables.id)
- weekdays: INTEGER[] (e.g., [1,2,3,4,5] for weekdays)
- times: JSONB[] (e.g., [{"time": "09:00"}, {"time": "18:00"}])
- default_value: JSONB (value to log)
- default_unit: TEXT (optional unit)
```

### Times Array Format

```json
[
  { "time": "09:00", "name": "Morning" },
  { "time": "18:00", "name": "Evening" }
]
```

### Weekdays Array Format

```sql
{1,2,3,4,5,6,7}  -- All days
{1,2,3,4,5}      -- Weekdays only
{6,7}            -- Weekends only
```

(1=Monday, 7=Sunday)

## Testing the System

1. **Create a routine variable** with:

   - Current weekday in the `weekdays` array
   - Current time (within 1 minute) in the `times` array
   - A `default_value` to log

2. **Wait for auto-logging**:

   - System checks every minute
   - When conditions match, auto-log is created
   - Notification appears in the app

3. **Check the logs table**:
   - New entry should appear with `source` = `['routine']`
   - `value` should match the `default_value`
   - `created_at` should be today at the routine time

## Troubleshooting

### Auto-logging not working?

1. Check browser console for errors
2. Verify database function exists
3. Ensure routine variable has correct weekdays/times
4. Check that no manual log exists for today
5. Verify user is authenticated

### Function creation failed?

1. Check Supabase permissions
2. Run SQL manually in dashboard
3. Verify table names match your database

### Time not matching?

1. Check timezone settings
2. Verify time format in `times` array
3. Ensure 1-minute tolerance is sufficient

## Benefits

- ✅ **Simple Structure**: Works with your existing database
- ✅ **Real-time**: Automatic execution when conditions match
- ✅ **Flexible**: Each variable can have its own schedule
- ✅ **Efficient**: Minimal database queries
- ✅ **User-friendly**: Clear notifications and error handling
