import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  const response = {
    timestamp: new Date().toISOString(),
    vapidPublicKeyExists: !!vapidPublicKey,
    vapidPrivateKeyExists: !!vapidPrivateKey,
    vapidPublicKeyPrefix: vapidPublicKey ? vapidPublicKey.substring(0, 10) + '...' : 'NOT_SET',
    nodeEnv: process.env.NODE_ENV,
    // Don't expose the actual keys for security
  };

  res.status(200).json(response);
} 