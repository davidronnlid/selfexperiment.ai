# Database Setup Instructions for Auto-Logging

## User-Specific Auto-Logging Function

To enable real-time routine auto-logging, you need to create a database function that processes routines for specific users.

### Step 1: Create the Database Function

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `database/user_specific_auto_logs.sql` into the editor
4. Run the SQL script

### Step 2: Verify the Function

After running the SQL script, verify the function exists by running:

```sql
SELECT * FROM information_schema.routines
WHERE routine_name = 'create_user_routine_auto_logs';
```

### Step 3: Test the Function

You can test the function manually:

```sql
-- Test with a specific user ID and date
SELECT * FROM create_user_routine_auto_logs(
  'your-user-id-here',
  CURRENT_DATE
);
```

### What the Function Does

1. **User-Specific**: Only processes routines for the specified user
2. **Time-Based**: Checks current weekday against routine's weekday settings
3. **Duplicate Prevention**: Prevents duplicate auto-logs for the same date
4. **Manual Override**: Skips auto-logging if user has manually logged the variable
5. **Efficient**: Uses indexes for fast user-specific queries

### Integration

Once the function is created, the auto-logging system will:

1. **Monitor Time**: Check every minute for matching routine times
2. **Match Conditions**: Compare current time and weekday with routine settings
3. **Auto-Log**: Call the database function when conditions match
4. **Notify User**: Display success/error notifications
5. **Prevent Duplicates**: Track processed routines to avoid duplicate calls

### Troubleshooting

If auto-logging isn't working:

1. Check browser console for errors
2. Verify database function exists
3. Ensure user has active routines with proper time/weekday settings
4. Check that routine times match current local time
5. Verify no manual logs exist for the same date/variable

The system includes a 1-minute tolerance for time matching to account for slight delays in checking.
