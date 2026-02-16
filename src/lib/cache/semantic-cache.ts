/**
 * Semantic cache – caches AI responses keyed by query embedding similarity.
 *
 * Before calling the full RAG pipeline (vectorSearch → LLM), we generate
 * the query embedding and look for a cached response whose embedding is
 * within a cosine-similarity threshold (~0.95).
 *
 * Implementation: We use a simpler, practical approach — hash the normalised
 * query text (lowercased, trimmed, collapsed whitespace) as the cache key.
 * This catches exact and near-exact duplicates with zero extra embedding cost.
 * A full embedding-based LSH approach can be added later.
 *
 * Cache key format: `sem:{tenantId}:{hash}`
 * TTL: configurable, default 3600s (1 hour)
 */

import { getRedis } from './redis';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedResponse {
  content: string;
  confidence: number;
  citations: Array<{ sourceId: string }>;
  cachedAt: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_TTL_SECONDS = 3600; // 1 hour
const KEY_PREFIX = 'sem';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a query string for cache key generation.
 */
function normaliseQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Generate a deterministic hash for a normalised query.
 */
function hashQuery(tenantId: string, query: string): string {
  const normalised = normaliseQuery(query);
  const hash = crypto
    .createHash('sha256')
    .update(`${tenantId}:${normalised}`)
    .digest('hex')
    .slice(0, 16); // 16 hex chars = 64 bits, collision-safe at expected scale
  return `${KEY_PREFIX}:${tenantId}:${hash}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up a cached response for the given query.
 * Returns null on cache miss or if Redis is not configured.
 */
export async function getCachedResponse(
  tenantId: string,
  query: string
): Promise<CachedResponse | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const key = hashQuery(tenantId, query);
    const cached = await redis.get<CachedResponse>(key);
    return cached ?? null;
  } catch (err) {
    console.error('[semantic-cache] GET error:', err);
    return null;
  }
}

/**
 * Store a response in the cache.
 */
export async function setCachedResponse(
  tenantId: string,
  query: string,
  response: Omit<CachedResponse, 'cachedAt'>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = hashQuery(tenantId, query);
    const value: CachedResponse = {
      ...response,
      cachedAt: new Date().toISOString()
    };
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.error('[semantic-cache] SET error:', err);
  }
}

/**
 * Invalidate all cached responses for a tenant.
 * Called when knowledge sources are updated.
 */
export async function invalidateTenantCache(tenantId: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  try {
    const pattern = `${KEY_PREFIX}:${tenantId}:*`;
    let cursor: string | number = 0;
    let deleted = 0;

    do {
      const result = await redis.scan(cursor as number, {
        match: pattern,
        count: 100
      });
      cursor = result[0] as string | number;
      const keys = result[1];

      if (keys.length > 0) {
        await redis.del(...keys);
        deleted += keys.length;
      }
    } while (Number(cursor) !== 0);

    return deleted;
  } catch (err) {
    console.error('[semantic-cache] INVALIDATE error:', err);
    return 0;
  }
}
