/**
 * Upstash Redis singleton client.
 *
 * Provides a shared Redis instance for caching and rate limiting.
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 */

import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

/**
 * Get or create the Upstash Redis singleton.
 * Returns null if env vars are not configured.
 */
export function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * Check if Redis is configured and available.
 */
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}
