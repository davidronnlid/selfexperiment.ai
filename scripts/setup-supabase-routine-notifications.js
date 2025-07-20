console.log(`
🚀 Supabase Automated Routine Notifications Setup

Based on your notification_preferences table structure, here's how to set up 
automated routine notifications that will work even when users' apps are closed.

📋 YOUR CURRENT TABLE STRUCTURE DETECTED:
✅ notification_preferences table with:
   - routine_reminder_enabled (bool)
   - routine_reminder_minutes (int) 
   - routine_notification_timing (text)

🎯 SETUP STEPS:

1. 📦 Deploy the Edge Function:
   node scripts/deploy-routine-notifications-scheduler.js

2. 🔑 Set VAPID Keys in Supabase Dashboard:
   Go to: https://supabase.com/dashboard → Functions → Settings
   Add your VAPID keys from .env.local

3. ⏰ Setup Cron Job:
   Run SQL from: database/setup_routine_notifications_cron.sql
   (Remember to replace YOUR_PROJECT_REF with your actual project ref!)

4. 🧪 Test the System:
   curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/routine-notifications-scheduler

🔧 HOW IT WORKS:

✅ Runs every 10 minutes (6 AM - 11 PM)
✅ Finds users with routine_reminder_enabled = true
✅ Calculates notification windows based on user preferences:
   - 'before': sends X minutes before routine time
   - 'at_time': sends exactly at routine time  
   - 'after': sends X minutes after routine time
✅ Prevents duplicate notifications per day
✅ Sends to all user devices via Web Push
✅ Logs all activity for monitoring

📱 EXAMPLE USER SETTINGS:

User wants 15min before notifications:
routine_reminder_enabled = true
routine_reminder_minutes = 15  
routine_notification_timing = 'before'

User wants notifications exactly at routine time:
routine_reminder_enabled = true
routine_reminder_minutes = 0
routine_notification_timing = 'at_time'

User wants check-in 30min after:
routine_reminder_enabled = true
routine_reminder_minutes = 30
routine_notification_timing = 'after'

⏱️ CRON SCHEDULE OPTIONS:

Basic (Recommended):
'*/10 6-23 * * *' = Every 10 minutes, 6 AM to 11 PM

Peak Hours:
'*/5 7-10,17-21 * * *' = Every 5 minutes during morning/evening

Specific Times:  
'0 8,12,17,21 * * *' = 8 AM, 12 PM, 5 PM, 9 PM only

🔍 MONITORING:

- Edge Function logs in Supabase Dashboard
- notification_history table tracks all sent notifications
- Cron job status: SELECT * FROM cron.job WHERE jobname LIKE '%routine%';
- Manual trigger: SELECT trigger_routine_notifications();

📖 FULL DOCUMENTATION:
docs/SUPABASE_ROUTINE_NOTIFICATIONS_SETUP.md

🚨 IMPORTANT:
- Replace YOUR_PROJECT_REF in all SQL with your actual project reference
- Set VAPID environment variables in Supabase Dashboard  
- Test thoroughly before relying on automated notifications
- Monitor logs for the first few days

✅ This system will send push notifications to iOS PWAs even when closed! 🎉
`);

// Check if user has set up the prerequisites
const hasVapidKeys =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;

if (hasVapidKeys) {
  console.log(`
✅ VAPID keys detected in .env.local
Ready to deploy Edge Function!

🎯 Next: Run the deployment script:
node scripts/deploy-routine-notifications-scheduler.js
`);
} else {
  console.log(`
⚠️  VAPID keys not found in environment

📋 First complete the push notification setup:
1. Add VAPID keys to .env.local (already done based on earlier steps)
2. Setup push subscriptions database (run if not done):
   node scripts/setup-push-subscriptions-table.js
3. Then deploy the routine notifications scheduler
`);
}

console.log(`
🔗 QUICK LINKS:
- Supabase Dashboard: https://supabase.com/dashboard
- Full Setup Guide: docs/SUPABASE_ROUTINE_NOTIFICATIONS_SETUP.md
- Edge Function Code: supabase/functions/routine-notifications-scheduler/index.ts
- Cron Setup SQL: database/setup_routine_notifications_cron.sql
`);
