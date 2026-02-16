/**
 * GET /api/health
 *
 * Health check endpoint for monitoring.
 * Checks connectivity to core services (Appwrite, Redis, AI provider).
 *
 * No authentication required.
 *
 * Returns:
 * {
 *   status: 'healthy' | 'degraded' | 'unhealthy',
 *   timestamp: ISO string,
 *   version: string,
 *   uptime: number,
 *   services: { appwrite, redis, openai }
 * }
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { isRedisConfigured } from '@/lib/cache/redis';
import { Query } from 'node-appwrite';

// Track process start time for uptime
const startTime = Date.now();

type ServiceStatus = 'ok' | 'error' | 'unconfigured';

interface ServiceCheck {
  status: ServiceStatus;
  latencyMs?: number;
  error?: string;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
}

// ---------------------------------------------------------------------------
// Service checks
// ---------------------------------------------------------------------------

async function checkAppwrite(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const { databases } = createAdminClient();
    await withTimeout(
      databases.listDocuments(APPWRITE_DATABASE, COLLECTION.TENANTS, [
        Query.limit(1)
      ]),
      3000
    );
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

async function checkRedis(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    if (!isRedisConfigured()) {
      return { status: 'unconfigured' };
    }

    const { getRedis } = await import('@/lib/cache/redis');
    const redis = getRedis();
    if (!redis) {
      return { status: 'unconfigured' };
    }
    await withTimeout(redis.ping(), 3000);
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

async function checkOpenAI(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    if (!process.env.OPENAI_API_KEY && !process.env.NVIDIA_API_KEY) {
      return { status: 'unconfigured' };
    }

    const { getAIClient } = await import('@/lib/ai/client');
    const client = getAIClient();
    await withTimeout(client.models.list(), 3000);
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET() {
  const [appwrite, redis, openai] = await Promise.all([
    checkAppwrite(),
    checkRedis(),
    checkOpenAI()
  ]);

  const services = { appwrite, redis, openai };

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Core service (Appwrite) down → unhealthy
  if (appwrite.status === 'error') {
    status = 'unhealthy';
  } else {
    // Optional service errors → degraded
    const optionalServices = [redis, openai];
    const anyError = optionalServices.some((s) => s.status === 'error');
    if (anyError) {
      status = 'degraded';
    }
  }

  // Read version from package.json
  let version = '0.0.0';
  try {
    const pkg = await import('../../../../package.json');
    version = pkg.version ?? '0.0.0';
  } catch {
    // ignore
  }

  const body = {
    status,
    timestamp: new Date().toISOString(),
    version,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services
  };

  return NextResponse.json(body, {
    status: status === 'unhealthy' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-cache, no-store'
    }
  });
}
