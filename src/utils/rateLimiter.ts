// Simple in-memory rate limiter (per process)
// Usage:
//   import { rateLimit } from '@/utils/rateLimiter';
//   const limited = rateLimit(key, { windowMs: 60_000, max: 10 });
//   if (limited) return res.status(429).json({ error: 'Too many requests' });

interface Options {
  windowMs: number; // milliseconds
  max: number; // max actions within window
}

const defaultOptions: Options = { windowMs: 60_000, max: 10 };

// Map<key, { count: number; reset: number }>
const cache = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, options: Partial<Options> = {}): boolean {
  const { windowMs, max } = { ...defaultOptions, ...options };
  const now = Date.now();
  const entry = cache.get(key);
  if (!entry || entry.reset < now) {
    cache.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  if (entry.count >= max) {
    return true;
  }
  entry.count += 1;
  return false;
}