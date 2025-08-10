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

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  url?: string;
}

interface SendNotificationRequest {
  userId: string;
  payload: PushNotificationPayload;
  notificationType?: string;
}

interface SubscribeRequest {
  userId: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  deviceInfo?: {
    userAgent?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    platform?: string;
    browser?: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify environment variables
  if (!vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({ 
      error: 'VAPID keys not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.' 
    });
  }

  try {
    switch (req.method) {
      case 'POST':
        if (req.query.action === 'subscribe') {
          return await handleSubscribe(req, res);
        } else if (req.query.action === 'send') {
          return await handleSendNotification(req, res);
        } else {
          return res.status(400).json({ error: 'Invalid action. Use ?action=subscribe or ?action=send' });
        }

      case 'GET':
        if (req.query.action === 'subscriptions') {
          return await handleGetSubscriptions(req, res);
        } else {
          return res.status(400).json({ error: 'Invalid action. Use ?action=subscriptions' });
        }

      case 'DELETE':
        if (req.query.action === 'unsubscribe') {
          return await handleUnsubscribe(req, res);
        } else {
          return res.status(400).json({ error: 'Invalid action. Use ?action=unsubscribe' });
        }

      default:
        res.setHeader('Allow', ['POST', 'GET', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Push notification API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleSubscribe(req: NextApiRequest, res: NextApiResponse) {
  const { userId, subscription, deviceInfo }: SubscribeRequest = req.body;

  if (!userId || !subscription) {
    return res.status(400).json({ error: 'userId and subscription are required' });
  }

  try {
    // Save subscription to database
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        user_agent: deviceInfo?.userAgent,
        device_type: deviceInfo?.deviceType,
        platform: deviceInfo?.platform,
        browser: deviceInfo?.browser,
        is_active: true,
        last_used_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,endpoint'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving push subscription:', error);
      return res.status(500).json({ error: 'Failed to save subscription' });
    }

    console.log('Push subscription saved:', data.id);
    return res.status(200).json({ 
      success: true, 
      subscriptionId: data.id,
      message: 'Push subscription saved successfully'
    });

  } catch (error) {
    console.error('Error in handleSubscribe:', error);
    return res.status(500).json({ error: 'Failed to process subscription' });
  }
}

async function handleSendNotification(req: NextApiRequest, res: NextApiResponse) {
  const { userId, payload, notificationType }: SendNotificationRequest = req.body;

  if (!userId || !payload) {
    return res.status(400).json({ error: 'userId and payload are required' });
  }

  try {
    // Get user's active push subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      return res.status(500).json({ error: 'Failed to fetch user subscriptions' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ error: 'No active push subscriptions found for user' });
    }

    const notificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/modular-health-logo.png',
      badge: payload.badge || '/modular-health-logo.png',
      data: {
        ...payload.data,
        url: payload.url || '/',
      },
      tag: payload.tag,
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: 'Open App',
        }
      ]
    };

    // Send notification to all user's devices
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

        // Update last_used_at for successful sends
        await supabase
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', subscription.id);

        // Log successful notification
        await supabase
          .from('notification_history')
          .insert({
            user_id: userId,
            notification_type: notificationType || 'manual',
            title: payload.title,
            body: payload.body,
            delivery_status: 'sent',
            delivery_method: 'web_push',
            push_subscription_id: subscription.id,
            context: payload.data,
          });

        return { success: true, subscriptionId: subscription.id };

      } catch (pushError: any) {
        console.error('Error sending push notification:', pushError);

        // Handle expired or invalid subscriptions
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          // Mark subscription as inactive
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', subscription.id);
        }

        // Log failed notification
        await supabase
          .from('notification_history')
          .insert({
            user_id: userId,
            notification_type: notificationType || 'manual',
            title: payload.title,
            body: payload.body,
            delivery_status: 'failed',
            delivery_method: 'web_push',
            push_subscription_id: subscription.id,
            error_message: pushError.message,
            context: payload.data,
          });

        return { 
          success: false, 
          subscriptionId: subscription.id, 
          error: pushError.message 
        };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return res.status(200).json({
      success: true,
      message: `Notification sent to ${successCount} device(s)`,
      results: {
        total: results.length,
        successful: successCount,
        failed: failCount,
      },
      details: results,
    });

  } catch (error) {
    console.error('Error in handleSendNotification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}

async function handleGetSubscriptions(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, device_type, platform, browser, is_active, last_used_at, created_at')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    return res.status(200).json({
      success: true,
      subscriptions: subscriptions || [],
    });

  } catch (error) {
    console.error('Error in handleGetSubscriptions:', error);
    return res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
}

async function handleUnsubscribe(req: NextApiRequest, res: NextApiResponse) {
  const { userId, endpoint } = req.body;

  if (!userId || !endpoint) {
    return res.status(400).json({ error: 'userId and endpoint are required' });
  }

  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Error unsubscribing:', error);
      return res.status(500).json({ error: 'Failed to unsubscribe' });
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
    });

  } catch (error) {
    console.error('Error in handleUnsubscribe:', error);
    return res.status(500).json({ error: 'Failed to unsubscribe' });
  }
} 