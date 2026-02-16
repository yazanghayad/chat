/**
 * Rate limit middleware wrapper for API route handlers.
 *
 * Usage:
 *   export const POST = withRateLimit(handler, { type: 'tenant' });
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  checkTenantRateLimit,
  checkIpRateLimit,
  getClientIp,
  type RateLimitResult
} from './index';
import { logAuditEventAsync } from '@/lib/audit/logger';
import type { Tenant } from '@/types/appwrite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitOptions {
  /** Which limiter to apply. */
  type: 'ip' | 'tenant' | 'both';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset)
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply per-IP rate limiting to an incoming request.
 * Returns a 429 response if the limit is exceeded, or null if OK.
 */
export async function applyIpRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const result = await checkIpRateLimit(ip);

  if (!result.success) {
    return rateLimitResponse(result);
  }

  return null;
}

/**
 * Apply per-tenant rate limiting.
 * Returns a 429 response if the limit is exceeded, or null if OK.
 */
export async function applyTenantRateLimit(
  tenant: Tenant,
  tenantId?: string
): Promise<NextResponse | null> {
  const result = await checkTenantRateLimit(tenant);

  if (!result.success) {
    logAuditEventAsync(tenantId ?? tenant.$id, 'rate_limit.exceeded', {
      plan: tenant.plan,
      limit: result.limit
    });
    return rateLimitResponse(result);
  }

  return null;
}

/**
 * Apply both IP and tenant rate limiting.
 * Returns a 429 response if either limit is exceeded, or null if OK.
 */
export async function applyRateLimits(
  request: NextRequest,
  tenant: Tenant
): Promise<NextResponse | null> {
  // Check IP first (cheaper)
  const ipResult = await applyIpRateLimit(request);
  if (ipResult) return ipResult;

  // Then check tenant
  const tenantResult = await applyTenantRateLimit(tenant);
  if (tenantResult) return tenantResult;

  return null;
}
