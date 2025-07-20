import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Test database connectivity
  let databaseStatus = 'unknown';
  let pushSubscriptionsCount = 0;
  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const { data, error, count } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      databaseStatus = `error: ${error.message}`;
    } else {
      databaseStatus = 'connected';
      pushSubscriptionsCount = count || 0;
    }
  } catch (error) {
    databaseStatus = `connection_failed: ${error instanceof Error ? error.message : 'unknown'}`;
  }

  // Test web-push configuration
  let webPushStatus = 'not_configured';
  try {
    if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      webPushStatus = 'configured';
    } else {
      webPushStatus = 'missing_vapid_keys';
    }
  } catch (error) {
    webPushStatus = `configuration_error: ${error instanceof Error ? error.message : 'unknown'}`;
  }

  const response = {
    timestamp: new Date().toISOString(),
    server: {
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      nodeVersion: process.version,
    },
    vapidKeys: {
      publicKeyExists: !!vapidPublicKey,
      privateKeyExists: !!vapidPrivateKey,
      subjectExists: !!vapidSubject,
      publicKeyPrefix: vapidPublicKey ? vapidPublicKey.substring(0, 10) + '...' : 'NOT_SET',
      subjectValue: vapidSubject || 'NOT_SET',
    },
    environment: {
      supabaseUrlExists: !!supabaseUrl,
      supabaseServiceKeyExists: !!supabaseServiceKey,
      supabaseUrlPrefix: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'NOT_SET',
    },
    database: {
      status: databaseStatus,
      pushSubscriptionsCount,
    },
    webPush: {
      status: webPushStatus,
      libraryVersion: require('web-push/package.json').version,
    },
    diagnostics: {
      canSendNotifications: vapidPublicKey && vapidPrivateKey && vapidSubject && databaseStatus === 'connected',
      issues: [
        ...(vapidPublicKey ? [] : ['NEXT_PUBLIC_VAPID_PUBLIC_KEY not set']),
        ...(vapidPrivateKey ? [] : ['VAPID_PRIVATE_KEY not set']),
        ...(vapidSubject ? [] : ['VAPID_SUBJECT not set']),
        ...(supabaseUrl ? [] : ['NEXT_PUBLIC_SUPABASE_URL not set']),
        ...(supabaseServiceKey ? [] : ['SUPABASE_SERVICE_ROLE_KEY not set']),
        ...(databaseStatus === 'connected' ? [] : [`Database issue: ${databaseStatus}`]),
      ],
    },
  };

  res.status(200).json(response);
} 