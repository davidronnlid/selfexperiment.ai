import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Initialize Supabase with service role for server operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@selfdevapp.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

interface RoutineNotificationData {
  userId: string;
  routineName: string;
  timeOfDay: string;
  variables: Array<{
    variable_name: string;
    default_value: string;
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // This endpoint should be called by a cron job or scheduled task
  // In production, you might want to add authentication/authorization

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // Verify VAPID keys are configured
  if (!vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({ 
      error: 'VAPID keys not configured' 
    });
  }

  try {
    // Get all users with active routine reminders
    const { data: usersWithReminders, error: usersError } = await supabase
      .from('notification_preferences')
      .select(`
        user_id,
        routine_reminder_enabled,
        routine_reminder_minutes,
        routine_notification_timing
      `)
      .eq('routine_reminder_enabled', true);

    if (usersError) {
      console.error('Error fetching users with reminders:', usersError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    if (!usersWithReminders || usersWithReminders.length === 0) {
      return res.status(200).json({ 
        message: 'No users with routine reminders enabled',
        sent: 0 
      });
    }

    const currentTime = new Date();
    const results = [];

    // Process each user's routines
    for (const userPref of usersWithReminders) {
      try {
        const routinesData = await getUpcomingRoutines(userPref.user_id, currentTime, userPref);
        
        for (const routine of routinesData) {
          const notificationResult = await sendRoutineNotification(routine, userPref);
          results.push(notificationResult);
        }
      } catch (error) {
        console.error(`Error processing routines for user ${userPref.user_id}:`, error);
        results.push({
          success: false,
          userId: userPref.user_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return res.status(200).json({
      message: `Processed ${totalCount} routine notifications`,
      successful: successCount,
      failed: totalCount - successCount,
      results: results
    });

  } catch (error) {
    console.error('Error in routine notification handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function getUpcomingRoutines(
  userId: string, 
  currentTime: Date,
  userPrefs: any
): Promise<RoutineNotificationData[]> {
  const currentDay = currentTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTimeString = currentTime.toTimeString().slice(0, 5); // HH:MM format
  
  // Calculate the time range to check for routines
  const reminderMinutes = Math.abs(userPrefs.routine_reminder_minutes || 15);
  const timing = userPrefs.routine_notification_timing || 'before';
  
  let startTime: Date, endTime: Date;
  
  if (timing === 'before') {
    // Check for routines that should trigger a "before" notification
    startTime = new Date(currentTime);
    startTime.setMinutes(startTime.getMinutes() + reminderMinutes - 2); // 2 min window
    
    endTime = new Date(currentTime);
    endTime.setMinutes(endTime.getMinutes() + reminderMinutes + 2);
  } else if (timing === 'at_time') {
    // Check for routines that should trigger right now
    startTime = new Date(currentTime);
    startTime.setMinutes(startTime.getMinutes() - 1);
    
    endTime = new Date(currentTime);
    endTime.setMinutes(endTime.getMinutes() + 1);
  } else { // 'after'
    // Check for routines that should trigger an "after" notification
    startTime = new Date(currentTime);
    startTime.setMinutes(startTime.getMinutes() - reminderMinutes - 2);
    
    endTime = new Date(currentTime);
    endTime.setMinutes(endTime.getMinutes() - reminderMinutes + 2);
  }

  // Query routines that match the criteria
  const { data: routines, error } = await supabase
    .from('daily_routines')
    .select(`
      id,
      routine_name,
      weekdays,
      is_active,
      routine_times!inner (
        time_of_day,
        is_active,
        routine_time_variables (
          variable_id,
          default_value,
          variables (
            label
          )
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('routine_times.is_active', true);

  if (error || !routines) {
    console.error('Error fetching routines:', error);
    return [];
  }

  const upcomingRoutines: RoutineNotificationData[] = [];

  for (const routine of routines) {
    // Check if routine is scheduled for today
    if (!routine.weekdays || !routine.weekdays.includes(currentDay)) {
      continue;
    }

    for (const routineTime of routine.routine_times) {
      const routineTimeDate = new Date(currentTime);
      const [hours, minutes] = routineTime.time_of_day.split(':').map(Number);
      routineTimeDate.setHours(hours, minutes, 0, 0);

      // Check if this routine time falls within our notification window
      if (routineTimeDate >= startTime && routineTimeDate <= endTime) {
        // Check if we've already sent a notification for this routine today
        const { data: existingNotification } = await supabase
          .from('notification_history')
          .select('id')
          .eq('user_id', userId)
          .eq('notification_type', 'routine_reminder')
          .gte('sent_at', new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()).toISOString())
          .ilike('context->routine_name', routine.routine_name)
          .single();

        if (existingNotification) {
          console.log(`Already sent reminder for ${routine.routine_name} today`);
          continue;
        }

        upcomingRoutines.push({
          userId,
          routineName: routine.routine_name,
          timeOfDay: routineTime.time_of_day,
          variables: routineTime.routine_time_variables?.map((rtv: any) => ({
            variable_name: rtv.variables?.label || 'Unknown Variable',
            default_value: rtv.default_value
          })) || []
        });
      }
    }
  }

  return upcomingRoutines;
}

async function sendRoutineNotification(
  routine: RoutineNotificationData,
  userPrefs: any
): Promise<any> {
  try {
    // Get user's active push subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', routine.userId)
      .eq('is_active', true);

    if (subscriptionsError || !subscriptions || subscriptions.length === 0) {
      return {
        success: false,
        userId: routine.userId,
        routineName: routine.routineName,
        error: 'No active push subscriptions'
      };
    }

    // Create notification payload
    const timing = userPrefs.routine_notification_timing || 'before';
    const minutes = Math.abs(userPrefs.routine_reminder_minutes || 15);
    
    let title: string, body: string;
    
    if (timing === 'before') {
      title = '⏰ Routine Reminder';
      body = `Your routine "${routine.routineName}" starts in ${minutes} minutes at ${routine.timeOfDay}`;
    } else if (timing === 'at_time') {
      title = '🎯 Routine Time';
      body = `Time for your routine: "${routine.routineName}"`;
    } else { // 'after'
      title = '📝 Routine Check-in';
      body = `How did your routine "${routine.routineName}" go?`;
    }

    // Add variables info if available
    if (routine.variables.length > 0) {
      const variableNames = routine.variables.map(v => v.variable_name).slice(0, 3);
      body += `\nVariables: ${variableNames.join(', ')}${routine.variables.length > 3 ? '...' : ''}`;
    }

    const notificationPayload = {
      title,
      body,
      icon: '/modular-health-logo.png',
      badge: '/modular-health-logo.png',
      data: {
        type: 'routine_reminder',
        routineName: routine.routineName,
        timeOfDay: routine.timeOfDay,
        variables: routine.variables,
        url: '/routines'
      },
      tag: `routine-${routine.routineName}`,
      requireInteraction: true,
      actions: [
        {
          action: 'log_routine',
          title: 'Log Now'
        },
        {
          action: 'open',
          title: 'Open App'
        }
      ]
    };

    // Send to all user's devices
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        );

        return { success: true, subscriptionId: subscription.id };
      } catch (pushError: any) {
        console.error('Error sending push notification:', pushError);
        
        // Mark invalid subscriptions as inactive
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', subscription.id);
        }

        return { success: false, subscriptionId: subscription.id, error: pushError.message };
      }
    });

    const sendResults = await Promise.all(sendPromises);
    const successCount = sendResults.filter(r => r.success).length;

    // Log notification history
    await supabase
      .from('notification_history')
      .insert({
        user_id: routine.userId,
        notification_type: 'routine_reminder',
        title,
        body,
        delivery_status: successCount > 0 ? 'sent' : 'failed',
        delivery_method: 'web_push',
        context: {
          routine_name: routine.routineName,
          time_of_day: routine.timeOfDay,
          variables: routine.variables,
          timing: timing,
          minutes: minutes
        }
      });

    return {
      success: successCount > 0,
      userId: routine.userId,
      routineName: routine.routineName,
      devicesSent: successCount,
      totalDevices: subscriptions.length
    };

  } catch (error) {
    console.error('Error sending routine notification:', error);
    return {
      success: false,
      userId: routine.userId,
      routineName: routine.routineName,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 