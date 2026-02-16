/**
 * Rate limiting – per-tenant and per-IP throttling using Upstash Ratelimit.
 *
 * Two limiters:
 *   1. Per-tenant – keyed by tenantId, plan-based limits
 *   2. Per-IP – keyed by IP address, global limit
 *
 * Both use a sliding window algorithm for smooth rate limiting.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { getRedis, isRedisConfigured } from '@/lib/cache/redis';
import type { NextRequest } from 'next/server';
import type { Tenant } from '@/types/appwrite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// ---------------------------------------------------------------------------
// Plan-based limits (requests per minute)
// ---------------------------------------------------------------------------

const PLAN_LIMITS: Record<string, number> = {
  trial: 100,
  growth: 500,
  enterprise: 2000
};

const IP_LIMIT = 60; // per minute
const DASHBOARD_LIMIT = 200; // per minute per session

// ---------------------------------------------------------------------------
// Limiter factories (lazy, share Redis instance)
// ---------------------------------------------------------------------------

let _tenantLimiters: Map<string, Ratelimit> = new Map();
let _ipLimiter: Ratelimit | null = null;
let _dashboardLimiter: Ratelimit | null = null;

function getTenantLimiter(plan: string): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.trial;
  const key = `tenant_${plan}`;

  if (!_tenantLimiters.has(key)) {
    _tenantLimiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, '1 m'),
        prefix: 'rl:tenant',
        analytics: true
      })
    );
  }

  return _tenantLimiters.get(key)!;
}

function getIpLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  if (!_ipLimiter) {
    _ipLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(IP_LIMIT, '1 m'),
      prefix: 'rl:ip',
      analytics: true
    });
  }
  return _ipLimiter;
}

function getDashboardLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  if (!_dashboardLimiter) {
    _dashboardLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(DASHBOARD_LIMIT, '1 m'),
      prefix: 'rl:dash',
      analytics: true
    });
  }
  return _dashboardLimiter;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract client IP from a Next.js request.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check per-tenant rate limit.
 */
export async function checkTenantRateLimit(
  tenant: Tenant
): Promise<RateLimitResult> {
  if (!isRedisConfigured()) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const limiter = getTenantLimiter(tenant.plan);
  if (!limiter) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const result = await limiter.limit(tenant.$id);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset
  };
}

/**
 * Check per-IP rate limit.
 */
export async function checkIpRateLimit(ip: string): Promise<RateLimitResult> {
  if (!isRedisConfigured()) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const limiter = getIpLimiter();
  if (!limiter) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const result = await limiter.limit(ip);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset
  };
}

/**
 * Check dashboard rate limit (per session cookie hash).
 */
export async function checkDashboardRateLimit(
  sessionKey: string
): Promise<RateLimitResult> {
  if (!isRedisConfigured()) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const limiter = getDashboardLimiter();
  if (!limiter) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const result = await limiter.limit(sessionKey);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset
  };
}
