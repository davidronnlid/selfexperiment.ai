# Supabase Automated Routine Notifications Setup

This guide shows you how to set up automated routine notifications using Supabase Edge Functions and pg_cron, based on your notification_preferences table structure.

## Overview

The system will:

- ✅ Check for upcoming routines every 10 minutes
- ✅ Respect user notification preferences (timing, enabled/disabled)
- ✅ Send push notifications to all user devices
- ✅ Prevent duplicate notifications per day
- ✅ Handle different notification timings (before/at/after)

## Quick Setup

### 1. Deploy the Edge Function

```bash
# Run the deployment script
node scripts/deploy-routine-notifications-scheduler.js
```

### 2. Set Environment Variables in Supabase

Go to your [Supabase Dashboard](https://supabase.com/dashboard) → Functions → Settings:

```env
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_SUBJECT=mailto:your-email@domain.com
```

Or use the CLI:

```bash
supabase secrets set VAPID_PUBLIC_KEY="your-public-key"
supabase secrets set VAPID_PRIVATE_KEY="your-private-key"
supabase secrets set VAPID_SUBJECT="mailto:support@selfdevapp.com"
```

### 3. Setup Cron Job

Run the SQL from `database/setup_routine_notifications_cron.sql` in your Supabase SQL Editor:

**Important**: Replace `YOUR_PROJECT_REF` with your actual project reference!

### 4. Test the System

```bash
# Manual test
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/routine-notifications-scheduler
```

## Detailed Setup Steps

### Step 1: Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
# or
brew install supabase/tap/supabase

# Login to Supabase
supabase login
```

### Step 2: Link Your Project

```bash
# Initialize if needed
supabase init

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref in your Supabase dashboard URL:
`https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### Step 3: Deploy Edge Function

```bash
# Deploy the function
supabase functions deploy routine-notifications-scheduler

# Check deployment
supabase functions list
```

### Step 4: Configure Environment Variables

#### Option A: Via Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions
2. Click on "Settings"
3. Add the environment variables

#### Option B: Via CLI

```bash
supabase secrets set VAPID_PUBLIC_KEY="BPgRWQdtvSId2Qj6A0MTvDZ4dxtRWnoyid8q403eNoGPYTWJ1Num5YWSS-Zz4cxAbTp2xWUR9ty_RsZp1CREuK4"
supabase secrets set VAPID_PRIVATE_KEY="your_vapid_private_key_here"
supabase secrets set VAPID_SUBJECT="mailto:support@selfdevapp.com"
```

### Step 5: Setup Automated Scheduling

1. **Copy the SQL** from `database/setup_routine_notifications_cron.sql`
2. **Replace** `YOUR_PROJECT_REF` with your actual project reference
3. **Execute in Supabase SQL Editor**

Example of what to replace:

```sql
-- Before
url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/routine-notifications-scheduler'

-- After (with your actual project ref)
url := 'https://abcdefghijklmnop.supabase.co/functions/v1/routine-notifications-scheduler'
```

### Step 6: Verify Setup

```sql
-- Check if cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- View scheduled jobs
SELECT jobname, schedule, active, last_run, next_run
FROM cron.job
WHERE jobname LIKE '%routine%';

-- Manual test
SELECT trigger_routine_notifications();
```

## How It Works

### Based on Your notification_preferences Table

The system reads your existing table structure:

| Column                        | Type | Purpose                         |
| ----------------------------- | ---- | ------------------------------- |
| `routine_reminder_enabled`    | bool | Whether to send reminders       |
| `routine_reminder_minutes`    | int  | Minutes before/after routine    |
| `routine_notification_timing` | text | 'before', 'at_time', or 'after' |

### Notification Logic

1. **Every 10 minutes** (6 AM - 11 PM), the cron job triggers
2. **Finds users** with `routine_reminder_enabled = true`
3. **Calculates time windows** based on user preferences:
   - `before`: routine time - reminder_minutes (±2 min window)
   - `at_time`: exactly at routine time (±1 min window)
   - `after`: routine time + reminder_minutes (±2 min window)
4. **Checks routines** scheduled for current day and time window
5. **Prevents duplicates** by checking notification_history
6. **Sends push notifications** to all user devices

### Example User Settings

```sql
-- User wants notifications 15 minutes before routines
INSERT INTO notification_preferences (user_id, routine_reminder_enabled, routine_reminder_minutes, routine_notification_timing)
VALUES ('user-123', true, 15, 'before');

-- User wants notifications exactly at routine time
INSERT INTO notification_preferences (user_id, routine_reminder_enabled, routine_reminder_minutes, routine_notification_timing)
VALUES ('user-456', true, 0, 'at_time');

-- User wants check-in notifications 30 minutes after routines
INSERT INTO notification_preferences (user_id, routine_reminder_enabled, routine_reminder_minutes, routine_notification_timing)
VALUES ('user-789', true, 30, 'after');
```

## Cron Schedule Options

### Basic Schedule (Recommended)

```sql
-- Every 10 minutes from 6 AM to 11 PM
'*/10 6-23 * * *'
```

### Advanced Schedules

```sql
-- Every 5 minutes during peak hours (7-10 AM and 5-9 PM)
'*/5 7-10,17-21 * * *'

-- Every hour on the hour
'0 */1 * * *'

-- Specific times (8 AM, 12 PM, 5 PM, 9 PM)
'0 8,12,17,21 * * *'
```

## Monitoring & Troubleshooting

### Check Edge Function Logs

1. Go to Supabase Dashboard → Functions
2. Click on `routine-notifications-scheduler`
3. View "Logs" tab

### Check Cron Job Status

```sql
-- View cron jobs
SELECT * FROM cron.job WHERE jobname LIKE '%routine%';

-- Check execution history (if using cron_job_logs table)
SELECT * FROM cron_job_logs ORDER BY executed_at DESC LIMIT 10;
```

### Check Notification History

```sql
-- Recent routine notifications
SELECT * FROM notification_history
WHERE notification_type = 'routine_reminder'
ORDER BY sent_at DESC
LIMIT 20;
```

### Manual Testing

```bash
# Test the Edge Function directly
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/routine-notifications-scheduler

# Test from SQL
SELECT trigger_routine_notifications();
```

## Production Considerations

### Security

- ✅ Service role key is properly configured
- ✅ VAPID private key is kept secure
- ✅ Edge Function uses proper authentication

### Performance

- ✅ 10-minute intervals prevent excessive API calls
- ✅ Duplicate prevention reduces unnecessary notifications
- ✅ Time windows prevent notification spam

### Reliability

- ✅ Failed push subscriptions are automatically marked inactive
- ✅ All notifications are logged for audit trail
- ✅ Graceful error handling prevents system crashes

### Monitoring

- ✅ Edge Function logs all activity
- ✅ Notification history tracks delivery status
- ✅ Cron job status is queryable

## Troubleshooting Common Issues

| Issue                   | Cause                   | Solution                          |
| ----------------------- | ----------------------- | --------------------------------- |
| Function not deploying  | Supabase CLI not linked | Run `supabase link`               |
| No notifications sent   | VAPID keys not set      | Check environment variables       |
| Cron job not running    | pg_cron not enabled     | Enable in SQL Editor              |
| Wrong timezone          | UTC vs local time       | Check user timezone settings      |
| Duplicate notifications | Missing duplicate check | Verify notification_history logic |

## Next Steps

1. **Test thoroughly** with different user preferences
2. **Monitor logs** for the first few days
3. **Adjust timing** based on user feedback
4. **Scale scheduling** if you have many users
5. **Add more notification types** (goals, insights, etc.)

Your automated routine notifications are now ready! 🎉

---

## Support

If you need help:

1. Check the Edge Function logs in Supabase
2. Verify your environment variables are set
3. Test the manual trigger function
4. Check the cron job status queries

The system is designed to be robust and handle various edge cases automatically.
