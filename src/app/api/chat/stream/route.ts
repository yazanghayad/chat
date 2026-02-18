import { NextRequest } from 'next/server';
import { vectorSearch } from '@/lib/ai/retrieval';
import { generateCompletionStream, type RAGContext } from '@/lib/ai/llm';
import {
  loadTenantPolicies,
  validatePolicies,
  redactPII
} from '@/lib/ai/policy-engine';
import {
  createTenantDocument,
  updateTenantDocument
} from '@/lib/appwrite/tenant-helpers';
import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import type {
  Tenant,
  Conversation,
  Message,
  Citation,
  TenantConfig
} from '@/types/appwrite';
import { ID, Query } from 'node-appwrite';
import { logAuditEventAsync } from '@/lib/audit/logger';
import { applyRateLimits } from '@/lib/rate-limit/middleware';
import { sanitizeText } from '@/lib/sanitize';

/**
 * POST /api/chat/stream
 *
 * Streaming chat endpoint (Server-Sent Events).
 * Authenticated via tenant API key (Bearer token).
 *
 * Same auth flow as /api/chat/message but returns a text/event-stream.
 *
 * SSE events:
 *   data: {"type":"delta","content":"..."}
 *   data: {"type":"done","conversationId":"...","confidence":0.9,"citations":[...]}
 *   data: {"type":"error","message":"..."}
 *   data: {"type":"blocked","message":"..."}
 *   data: {"type":"escalated","message":"...","conversationId":"..."}
 */

const CONFIDENCE_THRESHOLD = 0.7;
const TOP_K = 5;
const MAX_HISTORY_MESSAGES = 10;

const LOW_CONFIDENCE_MESSAGE =
  "I'm sorry, I don't have enough information to answer that question confidently. Let me connect you with a human agent who can help.";

const POLICY_BLOCKED_MESSAGE =
  "I'm unable to process that request due to our content policies. Please rephrase your question or contact our support team directly.";

export async function POST(request: NextRequest) {
  // ── Authenticate ────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key is required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let tenant: Tenant;
  try {
    const { databases } = createAdminClient();
    const result = await databases.listDocuments<Tenant>(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      [Query.equal('apiKey', apiKey), Query.limit(1)]
    );
    if (result.documents.length === 0) {
      // Check grace period for rotated API keys
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
        return new Response(JSON.stringify({ error: 'Invalid API key' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      tenant = match;
    } else {
      tenant = result.documents[0];
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: {
    message: string;
    conversationId?: string | null;
    userId?: string;
    channel?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { message, userId } = body;
  const channel = (body.channel ?? 'web') as Conversation['channel'];
  let conversationId = body.conversationId ?? null;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Sanitize user input
  const cleanMessage = sanitizeText(message);

  // ── Rate limiting ───────────────────────────────────────────────────────
  const rateLimitResponse = await applyRateLimits(request, tenant);
  if (rateLimitResponse) return rateLimitResponse;

  // ── SSE stream ──────────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  function sseEvent(data: Record<string, unknown>): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Load policies
        let policies: Awaited<ReturnType<typeof loadTenantPolicies>> = [];
        try {
          policies = await loadTenantPolicies(tenant.$id);
        } catch {
          // Continue without policies
        }

        // Step 2: Pre-policy check
        const preCheck = validatePolicies(message, policies, 'pre');
        if (!preCheck.passed) {
          conversationId = await ensureConversation(
            conversationId,
            tenant.$id,
            channel,
            userId ?? null
          );
          await saveMessage(conversationId, 'user', message, null, []);

          logAuditEventAsync(tenant.$id, 'policy.violated', {
            conversationId,
            phase: 'pre',
            violations: preCheck.violations.map((v) => v.message)
          });

          controller.enqueue(
            sseEvent({ type: 'blocked', message: POLICY_BLOCKED_MESSAGE })
          );
          controller.close();
          return;
        }

        const cleanedMessage = redactPII(cleanMessage, policies);

        // Step 3: Ensure conversation
        conversationId = await ensureConversation(
          conversationId,
          tenant.$id,
          channel,
          userId ?? null
        );
        await saveMessage(conversationId, 'user', message, null, []);

        // Step 4: RAG retrieval
        let results: SearchResult[] = [];
        try {
          results = await vectorSearch(tenant.$id, cleanedMessage, TOP_K);
        } catch {
          // Continue with no results
        }

        const avgScore =
          results.length > 0
            ? results.reduce((s, r) => s + r.score, 0) / results.length
            : 0;

        // Step 5: Confidence check
        if (results.length === 0 || avgScore < CONFIDENCE_THRESHOLD) {
          await saveMessage(
            conversationId,
            'assistant',
            LOW_CONFIDENCE_MESSAGE,
            avgScore,
            []
          );
          await updateConversationStatus(conversationId, 'escalated');

          logAuditEventAsync(tenant.$id, 'conversation.escalated', {
            conversationId,
            confidence: avgScore,
            reason: 'low_confidence'
          });

          controller.enqueue(
            sseEvent({
              type: 'escalated',
              message: LOW_CONFIDENCE_MESSAGE,
              conversationId,
              confidence: avgScore
            })
          );
          controller.close();
          return;
        }

        // Step 6: Build RAG context + stream LLM
        const history = await loadConversationHistory(conversationId);
        const historyWithoutCurrent = history.slice(0, -1);

        const ragContext: RAGContext = {
          query: cleanedMessage,
          chunks: results.map((r) => ({
            text: r.text || ((r.metadata.text as string) ?? ''),
            sourceId: r.id,
            score: r.score
          })),
          conversationHistory:
            historyWithoutCurrent.length > 0 ? historyWithoutCurrent : undefined
        };

        // Stream response to client
        let fullContent = '';

        const streamGenerator = generateCompletionStream(ragContext);
        const reader = streamGenerator.getReader();
        let readerDone = false;

        while (!readerDone) {
          const { value, done } = await reader.read();
          if (done) {
            readerDone = true;
            break;
          }
          if (value) {
            fullContent += value;
            controller.enqueue(sseEvent({ type: 'delta', content: value }));
          }
        }

        // Step 7: Post-policy check
        const postCheck = validatePolicies(fullContent, policies, 'post');
        if (!postCheck.passed) {
          const fallback =
            "I have an answer but it didn't pass our quality checks. Let me connect you with a human agent.";

          await saveMessage(
            conversationId,
            'assistant',
            fallback,
            avgScore,
            []
          );
          await updateConversationStatus(conversationId, 'escalated');

          logAuditEventAsync(tenant.$id, 'policy.violated', {
            conversationId,
            phase: 'post',
            violations: postCheck.violations.map((v) => v.message)
          });

          controller.enqueue(
            sseEvent({
              type: 'escalated',
              message: fallback,
              conversationId
            })
          );
          controller.close();
          return;
        }

        // Step 8: Save response with citations
        const citations = extractCitations(results);
        const msgId = await saveMessage(
          conversationId,
          'assistant',
          fullContent,
          avgScore,
          citations
        );

        if (avgScore >= CONFIDENCE_THRESHOLD) {
          await updateConversationStatus(conversationId, 'resolved');
        }

        logAuditEventAsync(tenant.$id, 'conversation.resolved', {
          conversationId,
          messageId: msgId,
          confidence: avgScore
        });

        controller.enqueue(
          sseEvent({
            type: 'done',
            conversationId,
            confidence: avgScore,
            citations
          })
        );
        controller.close();
      } catch (err) {
        console.error('Streaming chat error:', err);
        controller.enqueue(
          sseEvent({
            type: 'error',
            message: 'An error occurred while processing your request.'
          })
        );
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
}

// ---------------------------------------------------------------------------
// Helpers (same patterns as orchestrator.ts)
// ---------------------------------------------------------------------------

interface SearchResult {
  id: string;
  score: number;
  text: string;
  metadata: Record<string, unknown>;
}

async function ensureConversation(
  conversationId: string | null,
  tenantId: string,
  channel: Conversation['channel'],
  userId: string | null
): Promise<string> {
  if (conversationId) return conversationId;

  const doc = await createTenantDocument<Conversation>(
    COLLECTION.CONVERSATIONS,
    tenantId,
    {
      channel,
      status: 'active',
      userId: userId ?? null,
      metadata: JSON.stringify({}),
      resolvedAt: null,
      firstResponseAt: null,
      csatScore: null,
      assignedTo: null
    }
  );

  return doc.$id;
}

async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  confidence: number | null,
  citations: Citation[]
): Promise<string> {
  const { databases } = createAdminClient();
  const doc = await databases.createDocument(
    APPWRITE_DATABASE,
    COLLECTION.MESSAGES,
    ID.unique(),
    {
      conversationId,
      role,
      content,
      confidence,
      citations: JSON.stringify(citations),
      metadata: JSON.stringify({})
    }
  );

  // Track first response time
  if (role === 'assistant') {
    try {
      const conv = await databases.getDocument(
        APPWRITE_DATABASE,
        COLLECTION.CONVERSATIONS,
        conversationId
      );
      if (!(conv as Record<string, unknown>).firstResponseAt) {
        await databases.updateDocument(
          APPWRITE_DATABASE,
          COLLECTION.CONVERSATIONS,
          conversationId,
          { firstResponseAt: new Date().toISOString() }
        );
      }
    } catch {
      // Non-critical
    }
  }

  return doc.$id;
}

async function updateConversationStatus(
  conversationId: string,
  status: 'active' | 'resolved' | 'escalated'
): Promise<void> {
  try {
    const updates: Record<string, unknown> = { status };
    if (status === 'resolved') {
      updates.resolvedAt = new Date().toISOString();
    }
    await updateTenantDocument(
      COLLECTION.CONVERSATIONS,
      conversationId,
      updates
    );
  } catch (err) {
    console.error('Failed to update conversation status:', err);
  }
}

async function loadConversationHistory(
  conversationId: string
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  try {
    const { databases } = createAdminClient();
    const result = await databases.listDocuments<Message>(
      APPWRITE_DATABASE,
      COLLECTION.MESSAGES,
      [
        Query.equal('conversationId', conversationId),
        Query.orderDesc('$createdAt'),
        Query.limit(MAX_HISTORY_MESSAGES)
      ]
    );
    return result.documents.reverse().map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));
  } catch {
    return [];
  }
}

function extractCitations(results: SearchResult[]): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const result of results) {
    const sourceId = result.metadata.sourceId as string;
    if (sourceId && !seen.has(sourceId)) {
      seen.add(sourceId);
      citations.push({ sourceId });
    }
  }
  return citations;
}
