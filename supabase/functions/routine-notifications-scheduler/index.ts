import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPreference {
  id: string
  user_id: string
  routine_reminder_enabled: boolean
  routine_reminder_minutes: number
  test_notification_enabled: boolean
  test_notification_time: string
  created_at: string
  updated_at: string
  routine_notification_timing: string
}

interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
  is_active: boolean
}

interface UserRoutine {
  id: string
  user_id: string
  name: string
  description?: string
  time?: string
  is_active: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔄 Starting routine notifications scheduler...')

    // Get current time in UTC
    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentMinute = now.getUTCMinutes()
    const currentDay = now.getUTCDay() // 0 = Sunday, 1 = Monday, etc.
    
    console.log('⏰ Current UTC time: ' + currentHour + ':' + (currentMinute < 10 ? '0' : '') + currentMinute + ', Day: ' + currentDay)

    // Get all active notification preferences
    const { data: preferences, error: prefsError } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('routine_reminder_enabled', true)

    if (prefsError) {
      console.error('❌ Error fetching notification preferences:', prefsError)
      throw prefsError
    }

    console.log('📋 Found ' + (preferences?.length || 0) + ' users with routine reminders enabled')

    let notificationsSent = 0
    let errors = 0

    for (const pref of preferences || []) {
      try {
        console.log('🎯 Processing notifications for user ' + pref.user_id)

        // Get user's routines
        const { data: routines, error: routinesError } = await supabaseClient
          .from('routines')
          .select('*')
          .eq('user_id', pref.user_id)
          .eq('is_active', true)

        if (routinesError) {
          console.log('⚠️ Could not fetch routines for user ' + pref.user_id + ':', routinesError.message)
          // Continue without routines - we can still send generic notifications
        }

        // Get user's push subscriptions
        const { data: subscriptions, error: subsError } = await supabaseClient
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', pref.user_id)
          .eq('is_active', true)

        if (subsError) {
          console.error('❌ Error fetching subscriptions for user ' + pref.user_id + ':', subsError)
          errors++
          continue
        }

        if (!subscriptions || subscriptions.length === 0) {
          console.log('📵 No active push subscriptions for user ' + pref.user_id)
          continue
        }

        // Determine notification timing
        let shouldNotify = false
        let notificationTime = null

        // Check test notification timing if enabled
        if (pref.test_notification_enabled && pref.test_notification_time) {
          const [testHour, testMinute] = pref.test_notification_time.split(':').map(Number)
          const testTimeDiff = Math.abs((currentHour * 60 + currentMinute) - (testHour * 60 + testMinute))
          
          if (testTimeDiff <= 5) { // Within 5 minutes
            shouldNotify = true
            notificationTime = pref.test_notification_time
            console.log('🧪 Test notification time matched for user ' + pref.user_id)
          }
        }

        // Check routine-based timing
        if (!shouldNotify && routines && routines.length > 0) {
          for (const routine of routines) {
            if (routine.time) {
              const [routineHour, routineMinute] = routine.time.split(':').map(Number)
              
              // Apply reminder offset (routine_reminder_minutes before the routine time)
              const reminderMinutes = pref.routine_reminder_minutes || 0
              const reminderTime = new Date()
              reminderTime.setHours(routineHour, routineMinute - reminderMinutes, 0, 0)
              
              const reminderHour = reminderTime.getHours()
              const reminderMin = reminderTime.getMinutes()
              
              const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (reminderHour * 60 + reminderMin))
              
              if (timeDiff <= 5) { // Within 5 minutes
                shouldNotify = true
                notificationTime = reminderHour + ':' + (reminderMin < 10 ? '0' : '') + reminderMin
                console.log('⏰ Routine reminder time matched for user ' + pref.user_id + ', routine: ' + routine.name)
                break
              }
            }
          }
        }

        // Check routine_notification_timing if no specific routine times
        if (!shouldNotify && pref.routine_notification_timing) {
          // This could be formats like "before", "after", specific times, etc.
          // For now, let's handle it as a time if it looks like HH:MM
          if (pref.routine_notification_timing.includes(':')) {
            const [notifHour, notifMinute] = pref.routine_notification_timing.split(':').map(Number)
            const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (notifHour * 60 + notifMinute))
            
            if (timeDiff <= 5) {
              shouldNotify = true
              notificationTime = pref.routine_notification_timing
              console.log('📅 General notification time matched for user ' + pref.user_id)
            }
          }
        }

        if (!shouldNotify) {
          continue
        }

        // Check if we already sent a notification today
        const today = now.toISOString().split('T')[0]
        const { data: existingNotification } = await supabaseClient
          .from('notification_history')
          .select('id')
          .eq('user_id', pref.user_id)
          .gte('sent_at', today + 'T00:00:00Z')
          .lt('sent_at', today + 'T23:59:59Z')
          .single()

        if (existingNotification) {
          console.log('⏭️ Already sent notification to user ' + pref.user_id + ' today')
          continue
        }

        // Prepare notification payload
        let notificationTitle = 'Time for your routine!'
        let notificationBody = 'Don\'t forget to complete your daily routine.'
        
        // Customize based on available routines
        if (routines && routines.length > 0) {
          const activeRoutines = routines.filter(r => r.is_active)
          if (activeRoutines.length === 1) {
            notificationTitle = 'Time for ' + activeRoutines[0].name + '!'
            notificationBody = activeRoutines[0].description || ('Don\'t forget to complete your ' + activeRoutines[0].name + ' routine.')
          } else if (activeRoutines.length > 1) {
            notificationTitle = 'Time for your routines!'
            notificationBody = 'You have ' + activeRoutines.length + ' routines to complete.'
          }
        }
        
        const notificationPayload = {
          title: notificationTitle,
          body: notificationBody,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'routine-reminder-' + pref.user_id,
          data: {
            userId: pref.user_id,
            url: '/log/auto',
            routines: routines ? routines.map(r => r.id) : []
          },
          actions: [
            {
              action: 'log-now',
              title: 'Log Now'
            },
            {
              action: 'remind-later',
              title: 'Remind Later'
            }
          ]
        }

        // Send push notifications to all user's subscriptions
        let successCount = 0
        for (const subscription of subscriptions) {
          try {
            const pushResponse = await sendPushNotification(subscription, notificationPayload)
            
            if (pushResponse.success) {
              successCount++
            } else {
              console.error('❌ Failed to send push to subscription ' + subscription.id + ':', pushResponse.error)
              
              // Mark subscription as inactive if it failed
              if (pushResponse.shouldDeactivate) {
                await supabaseClient
                  .from('push_subscriptions')
                  .update({ is_active: false, updated_at: new Date().toISOString() })
                  .eq('id', subscription.id)
              }
            }
          } catch (pushError) {
            console.error('❌ Error sending push notification:', pushError)
            errors++
          }
        }

        // Log the notification attempt
        const { error: logError } = await supabaseClient
          .from('notification_history')
          .insert({
            user_id: pref.user_id,
            routine_id: null, // Since we're identifying by user_id, not specific routine
            notification_type: 'push',
            title: notificationTitle,
            body: notificationBody,
            sent_at: now.toISOString(),
            delivery_status: successCount > 0 ? 'delivered' : 'failed',
            delivery_details: {
              total_subscriptions: subscriptions.length,
              successful_deliveries: successCount,
              failed_deliveries: subscriptions.length - successCount,
              notification_time: notificationTime,
              routines_count: routines ? routines.length : 0
            }
          })

        if (logError) {
          console.error('❌ Error logging notification:', logError)
          errors++
        } else {
          notificationsSent++
          console.log('✅ Sent notification to user ' + pref.user_id + ' (' + successCount + '/' + subscriptions.length + ' subscriptions)')
        }

      } catch (prefError) {
        console.error('❌ Error processing preferences for user ' + pref.user_id + ':', prefError)
        errors++
      }
    }

    const result = {
      success: true,
      timestamp: now.toISOString(),
      notifications_sent: notificationsSent,
      errors: errors,
      total_users_checked: preferences?.length || 0
    }

    console.log('🎉 Routine notifications scheduler completed:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Fatal error in routine notifications scheduler:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

// Helper function to send push notifications
async function sendPushNotification(
  subscription: PushSubscription, 
  payload: any
): Promise<{ success: boolean; error?: string; shouldDeactivate?: boolean }> {
  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      return { 
        success: false, 
        error: 'VAPID keys not configured' 
      }
    }

    // Import the web-push library
    const webPush = await import('https://esm.sh/web-push@3.6.6')
    
    webPush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    )

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key
      }
    }

    await webPush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    )

    return { success: true }

  } catch (error) {
    console.error('Push notification error:', error)
    
    // Check if subscription is invalid and should be deactivated
    const shouldDeactivate = 
      error.statusCode === 410 || // Gone
      error.statusCode === 404 || // Not Found
      (error.statusCode === 400 && error.body?.includes('expired'))

    return { 
      success: false, 
      error: error.message,
      shouldDeactivate 
    }
  }
} 