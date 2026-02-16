import { NextRequest, NextResponse } from 'next/server';
import { orchestrate } from '@/lib/ai/orchestrator';
import { chatRequestSchema } from '@/features/conversation/schemas';
import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query } from 'node-appwrite';
import { applyRateLimits } from '@/lib/rate-limit/middleware';
import { sanitizeText } from '@/lib/sanitize';
import type { Tenant, TenantConfig } from '@/types/appwrite';

/**
 * POST /api/chat/message
 *
 * Public-facing chat endpoint for the embeddable widget and external
 * integrations. Authenticated via tenant API key (Bearer token).
 *
 * Headers:
 *   Authorization: Bearer <tenant-api-key>
 *
 * Body:
 *   { message: string, conversationId?: string, userId?: string, channel?: 'web' | 'email' }
 */
export async function POST(request: NextRequest) {
  // ── Authenticate via API key ────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is required' }, { status: 401 });
  }

  // Look up tenant by API key (with grace period for rotated keys)
  let tenant: Tenant;
  try {
    const { databases } = createAdminClient();
    const result = await databases.listDocuments<Tenant>(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      [Query.equal('apiKey', apiKey), Query.limit(1)]
    );

    if (result.documents.length === 0) {
      // Check if it matches a recently-rotated key in grace period
      const allTenants = await databases.listDocuments<Tenant>(
        APPWRITE_DATABASE,
        COLLECTION.TENANTS,
        [Query.limit(100)]
      );

      const match = allTenants.documents.find((t) => {
        try {
          const cfg: TenantConfig =
            typeof t.config === 'string'
              ? JSON.parse(t.config)
              : (t.config as TenantConfig);
          if (
            cfg.previousApiKey === apiKey &&
            cfg.previousApiKeyExpiresAt &&
            new Date(cfg.previousApiKeyExpiresAt) > new Date()
          ) {
            return true;
          }
        } catch {
          /* skip */
        }
        return false;
      });

      if (!match) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
      tenant = match;
    } else {
      tenant = result.documents[0];
    }
  } catch (err) {
    console.error('Tenant lookup failed:', err);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }

  // ── Rate limiting ───────────────────────────────────────────────────────
  const rateLimitResponse = await applyRateLimits(request, tenant);
  if (rateLimitResponse) return rateLimitResponse;

  // ── Parse request body ──────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request',
        details: parsed.error.issues.map((i) => i.message)
      },
      { status: 400 }
    );
  }

  const { message, conversationId, userId, channel } = parsed.data;

  // Sanitize user input
  const cleanMessage = sanitizeText(message);

  // ── Run orchestrator ────────────────────────────────────────────────────
  try {
    const result = await orchestrate({
      tenantId: tenant.$id,
      conversationId: conversationId ?? null,
      userMessage: cleanMessage,
      channel,
      userId: userId ?? undefined
    });

    return NextResponse.json({
      resolved: result.resolved,
      content: result.content,
      conversationId: result.conversationId,
      confidence: result.confidence,
      citations: result.citations,
      escalated: result.escalated
    });
  } catch (err) {
    console.error('Chat orchestration failed:', err);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
