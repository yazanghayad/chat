/**
 * AI Orchestrator – the core RAG pipeline.
 *
 * Coordinates the full flow from user message to AI response:
 *
 *   1. Load tenant policies
 *   2. Pre-policy check (topic filter, PII filter on user input)
 *   3. RAG retrieval (vector search for relevant knowledge)
 *   4. Confidence check (minimum score threshold)
 *   5. LLM generation with retrieved context
 *   6. Post-policy check (tone, length on AI response)
 *   7. Save conversation + messages
 *   8. Return response with citations
 */

import { vectorSearch, type SearchResult } from './retrieval';
import {
  generateCompletion,
  type LLMCompletionOptions,
  type RAGContext
} from './llm';
import {
  loadTenantPolicies,
  validatePolicies,
  redactPII,
  type PolicyResult
} from './policy-engine';
import {
  createTenantDocument,
  updateTenantDocument
} from '@/lib/appwrite/tenant-helpers';
import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { logAuditEventAsync } from '@/lib/audit/logger';
import { findMatchingProcedure, executeProcedure } from './procedure-executor';
import {
  getCachedResponse,
  setCachedResponse
} from '@/lib/cache/semantic-cache';
import type {
  Conversation,
  Message,
  Policy,
  Citation,
  TenantConfig
} from '@/types/appwrite';
import { ID, Query } from 'node-appwrite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrchestratorInput {
  /** The tenant requesting the AI response. */
  tenantId: string;
  /** Existing conversation ID, or null to start a new one. */
  conversationId: string | null;
  /** The user's message. */
  userMessage: string;
  /** Channel the message came from. */
  channel?: 'web' | 'email' | 'whatsapp' | 'sms' | 'voice';
  /** Optional user identifier (end-customer, not admin). */
  userId?: string;
  /** LLM options override. */
  llmOptions?: LLMCompletionOptions;
  /** Dry-run mode: skip persistence (for simulations). */
  dryRun?: boolean;
}

export interface OrchestratorResult {
  /** Whether the AI successfully resolved the query. */
  resolved: boolean;
  /** The AI response content. Null if blocked by policy or low confidence. */
  content: string | null;
  /** Conversation ID (new or existing). */
  conversationId: string;
  /** Message ID of the saved assistant response. */
  messageId: string | null;
  /** Confidence score (average of top RAG results). */
  confidence: number;
  /** Citations used in the response. */
  citations: Citation[];
  /** If the query was blocked, the reason why. */
  blockedReason: string | null;
  /** Whether the conversation was escalated to a human. */
  escalated: boolean;
  /** Debug metadata for the orchestration run. */
  debug: OrchestratorDebug;
}

export interface OrchestratorDebug {
  retrievalResults: number;
  avgRetrievalScore: number;
  prePolicyPassed: boolean;
  postPolicyPassed: boolean;
  prePolicyViolations: string[];
  postPolicyViolations: string[];
  tokensUsed: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Minimum average retrieval score to proceed with LLM generation. */
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/** Maximum number of chunks to retrieve from vector search. */
const TOP_K = 5;

/** Maximum conversation history messages to include for context. */
const DEFAULT_MAX_HISTORY_MESSAGES = 10;

/** Fallback message when confidence is too low. */
const LOW_CONFIDENCE_MESSAGE =
  "I'm sorry, I don't have enough information to answer that question confidently. Let me connect you with a human agent who can help.";

/** Message returned when a pre-policy blocks the query. */
const POLICY_BLOCKED_MESSAGE =
  "I'm unable to process that request due to our content policies. Please rephrase your question or contact our support team directly.";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Load recent conversation history for multi-turn context.
 * Uses admin client directly since messages don't have tenantId.
 */
async function loadConversationHistory(
  conversationId: string,
  maxMessages: number = DEFAULT_MAX_HISTORY_MESSAGES
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  try {
    const { databases } = createAdminClient();
    const result = await databases.listDocuments<Message>(
      APPWRITE_DATABASE,
      COLLECTION.MESSAGES,
      [
        Query.equal('conversationId', conversationId),
        Query.orderDesc('$createdAt'),
        Query.limit(maxMessages)
      ]
    );

    // Reverse to get chronological order
    return result.documents.reverse().map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));
  } catch {
    return [];
  }
}

/**
 * Compute average score from search results.
 */
function averageScore(results: SearchResult[]): number {
  if (results.length === 0) return 0;
  return results.reduce((sum, r) => sum + r.score, 0) / results.length;
}

/**
 * Extract unique source IDs from search results for citations.
 */
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

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Load tenant config from the config JSON blob.
 */
async function loadTenantConfig(tenantId: string): Promise<TenantConfig> {
  try {
    const { databases } = createAdminClient();
    const tenant = await databases.getDocument(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      tenantId
    );
    const raw = tenant.config;
    if (typeof raw === 'string') return JSON.parse(raw);
    return (raw ?? {}) as TenantConfig;
  } catch {
    return {};
  }
}

/**
 * Process a user message through the full RAG pipeline.
 */
export async function orchestrate(
  input: OrchestratorInput
): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const {
    tenantId,
    userMessage,
    channel = 'web',
    userId = null,
    llmOptions = {},
    dryRun = false
  } = input;
  let { conversationId } = input;

  const debug: OrchestratorDebug = {
    retrievalResults: 0,
    avgRetrievalScore: 0,
    prePolicyPassed: true,
    postPolicyPassed: true,
    prePolicyViolations: [],
    postPolicyViolations: [],
    tokensUsed: 0,
    durationMs: 0
  };

  // ── Step 0: Load tenant config ──────────────────────────────────────────
  const tenantConfig = await loadTenantConfig(tenantId);
  const CONFIDENCE_THRESHOLD =
    tenantConfig.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const MAX_HISTORY_MESSAGES =
    tenantConfig.maxHistoryMessages ?? DEFAULT_MAX_HISTORY_MESSAGES;

  // ── Step 1: Load tenant policies ────────────────────────────────────────
  let policies: Policy[] = [];
  try {
    policies = await loadTenantPolicies(tenantId);
  } catch (err) {
    console.error('Failed to load policies, continuing without:', err);
  }

  // ── Step 2: Pre-policy check ────────────────────────────────────────────
  const preCheck: PolicyResult = validatePolicies(userMessage, policies, 'pre');

  if (!preCheck.passed) {
    debug.prePolicyPassed = false;
    debug.prePolicyViolations = preCheck.violations.map((v) => v.message);
    debug.durationMs = Date.now() - startTime;

    // Still create the conversation + save the user message for audit
    conversationId = await ensureConversation(
      conversationId,
      tenantId,
      channel,
      userId
    );

    await saveMessage(conversationId, 'user', userMessage, null, []);

    logAuditEventAsync(tenantId, 'policy.violated', {
      conversationId,
      mode: 'pre',
      violations: debug.prePolicyViolations
    });

    return {
      resolved: false,
      content: POLICY_BLOCKED_MESSAGE,
      conversationId,
      messageId: null,
      confidence: 0,
      citations: [],
      blockedReason: debug.prePolicyViolations.join('; '),
      escalated: false,
      debug
    };
  }

  // Redact PII if any redaction policies exist
  const cleanedMessage = redactPII(userMessage, policies);

  // ── Step 3: Ensure conversation exists ──────────────────────────────────
  conversationId = await ensureConversation(
    conversationId,
    tenantId,
    channel,
    userId
  );

  // Audit: conversation created / message received
  const isNewConversation = !input.conversationId;
  if (isNewConversation) {
    logAuditEventAsync(tenantId, 'conversation.created', {
      conversationId,
      channel
    });
  }
  logAuditEventAsync(tenantId, 'message.received', {
    conversationId,
    channel
  });

  // Save the user message
  if (!dryRun) {
    await saveMessage(conversationId, 'user', userMessage, null, []);
  }

  // ── Step 3.5: Procedure matching (before RAG) ──────────────────────────
  try {
    const matchedProcedure = await findMatchingProcedure(
      tenantId,
      cleanedMessage
    );
    if (matchedProcedure) {
      logAuditEventAsync(tenantId, 'procedure.triggered', {
        conversationId,
        procedureId: matchedProcedure.$id,
        procedureName: matchedProcedure.name
      });

      const procedureResult = await executeProcedure(matchedProcedure, {
        tenantId,
        conversationId,
        variables: { 'user.id': userId ?? '', 'user.message': cleanedMessage }
      });

      if (procedureResult.success && procedureResult.finalMessage) {
        logAuditEventAsync(tenantId, 'procedure.completed', {
          conversationId,
          procedureId: matchedProcedure.$id,
          stepsExecuted: procedureResult.steps.length
        });

        const msgId = dryRun
          ? null
          : await saveMessage(
              conversationId,
              'assistant',
              procedureResult.finalMessage,
              1.0,
              []
            );

        if (!dryRun) {
          await updateConversationStatus(conversationId, 'resolved');
        }

        debug.durationMs = Date.now() - startTime;

        return {
          resolved: true,
          content: procedureResult.finalMessage,
          conversationId,
          messageId: msgId,
          confidence: 1.0,
          citations: [],
          blockedReason: null,
          escalated: false,
          debug
        };
      }
    }
  } catch (err) {
    // Procedure matching is optional – fall through to RAG
    console.error('Procedure matching failed, falling back to RAG:', err);
  }

  // ── Step 3.6: Semantic cache check (before RAG) ────────────────────────
  try {
    const cached = await getCachedResponse(tenantId, cleanedMessage);
    if (cached) {
      logAuditEventAsync(tenantId, 'cache.hit', { conversationId });

      const msgId = dryRun
        ? null
        : await saveMessage(
            conversationId,
            'assistant',
            cached.content,
            cached.confidence,
            cached.citations
          );

      if (!dryRun && cached.confidence >= CONFIDENCE_THRESHOLD) {
        await updateConversationStatus(conversationId, 'resolved');
      }

      debug.durationMs = Date.now() - startTime;

      return {
        resolved: cached.confidence >= CONFIDENCE_THRESHOLD,
        content: cached.content,
        conversationId,
        messageId: msgId,
        confidence: cached.confidence,
        citations: cached.citations,
        blockedReason: null,
        escalated: false,
        debug
      };
    }
  } catch (err) {
    // Cache miss is fine – continue to RAG
    console.warn('Semantic cache check failed:', err);
  }
  logAuditEventAsync(tenantId, 'cache.miss', { conversationId });

  // ── Step 4: RAG retrieval ───────────────────────────────────────────────
  let retrievalResults: SearchResult[] = [];
  try {
    retrievalResults = await vectorSearch(tenantId, cleanedMessage, TOP_K);
  } catch (err) {
    console.error('Vector search failed:', err);
  }

  debug.retrievalResults = retrievalResults.length;
  debug.avgRetrievalScore = averageScore(retrievalResults);

  // ── Step 5: Confidence check ────────────────────────────────────────────
  const confidence = debug.avgRetrievalScore;

  if (retrievalResults.length === 0 || confidence < CONFIDENCE_THRESHOLD) {
    debug.durationMs = Date.now() - startTime;

    // Escalate – save a low-confidence assistant message
    const msgId = dryRun
      ? null
      : await saveMessage(
          conversationId,
          'assistant',
          LOW_CONFIDENCE_MESSAGE,
          confidence,
          []
        );

    // Mark conversation as escalated
    if (!dryRun) {
      await updateConversationStatus(conversationId, 'escalated');
    }

    logAuditEventAsync(tenantId, 'conversation.escalated', {
      conversationId,
      reason: 'low_confidence',
      confidence
    });

    return {
      resolved: false,
      content: LOW_CONFIDENCE_MESSAGE,
      conversationId,
      messageId: msgId,
      confidence,
      citations: [],
      blockedReason: null,
      escalated: true,
      debug
    };
  }

  // ── Step 6: LLM generation with context ─────────────────────────────────
  const conversationHistory = await loadConversationHistory(
    conversationId,
    MAX_HISTORY_MESSAGES
  );

  // Remove the last user message we just saved (it's the current query)
  const historyWithoutCurrent = conversationHistory.slice(0, -1);

  const ragContext: RAGContext = {
    query: cleanedMessage,
    chunks: retrievalResults.map((r) => ({
      text: (r.metadata.text as string) ?? '',
      sourceId: r.id,
      score: r.score
    })),
    conversationHistory:
      historyWithoutCurrent.length > 0 ? historyWithoutCurrent : undefined,
    systemPromptPrefix: tenantConfig.customSystemPrompt ?? undefined
  };

  let llmResponse;
  try {
    llmResponse = await generateCompletion(ragContext, {
      ...llmOptions,
      model: tenantConfig.model ?? llmOptions.model
    });
  } catch (err) {
    console.error('LLM generation failed:', err);
    debug.durationMs = Date.now() - startTime;

    const fallback =
      'I apologize, but I encountered an error generating a response. Please try again or contact support.';
    const msgId = await saveMessage(
      conversationId,
      'assistant',
      fallback,
      confidence,
      []
    );

    return {
      resolved: false,
      content: fallback,
      conversationId,
      messageId: msgId,
      confidence,
      citations: [],
      blockedReason: null,
      escalated: false,
      debug
    };
  }

  debug.tokensUsed = llmResponse.usage.totalTokens;

  // ── Step 7: Post-policy check ───────────────────────────────────────────
  const postCheck: PolicyResult = validatePolicies(
    llmResponse.content,
    policies,
    'post'
  );

  if (!postCheck.passed) {
    debug.postPolicyPassed = false;
    debug.postPolicyViolations = postCheck.violations.map((v) => v.message);
    debug.durationMs = Date.now() - startTime;

    logAuditEventAsync(tenantId, 'policy.violated', {
      conversationId,
      mode: 'post',
      violations: debug.postPolicyViolations
    });

    const fallback =
      "I have an answer but it didn't pass our quality checks. Let me connect you with a human agent.";
    const msgId = dryRun
      ? null
      : await saveMessage(
          conversationId,
          'assistant',
          fallback,
          confidence,
          []
        );

    if (!dryRun) {
      await updateConversationStatus(conversationId, 'escalated');
    }

    logAuditEventAsync(tenantId, 'conversation.escalated', {
      conversationId,
      reason: 'post_policy_violation'
    });

    return {
      resolved: false,
      content: fallback,
      conversationId,
      messageId: msgId,
      confidence,
      citations: [],
      blockedReason: debug.postPolicyViolations.join('; '),
      escalated: true,
      debug
    };
  }

  // ── Step 8: Save response + citations ───────────────────────────────────
  const citations = extractCitations(retrievalResults);

  const msgId = dryRun
    ? null
    : await saveMessage(
        conversationId,
        'assistant',
        llmResponse.content,
        confidence,
        citations
      );

  // Mark conversation as resolved if confidence is high
  if (confidence >= CONFIDENCE_THRESHOLD && !dryRun) {
    await updateConversationStatus(conversationId, 'resolved');
  }

  // Audit: message sent + conversation resolved
  logAuditEventAsync(tenantId, 'message.sent', {
    conversationId,
    confidence,
    citations: citations.length,
    tokensUsed: debug.tokensUsed
  });

  if (confidence >= CONFIDENCE_THRESHOLD) {
    logAuditEventAsync(tenantId, 'conversation.resolved', {
      conversationId,
      confidence,
      retrievalResults: debug.retrievalResults
    });
  }

  // Cache the successful response
  try {
    await setCachedResponse(
      tenantId,
      cleanedMessage,
      {
        content: llmResponse.content,
        confidence,
        citations
      },
      tenantConfig.cacheTtlSeconds
    );
  } catch {
    // Non-critical – skip cache write
  }

  debug.durationMs = Date.now() - startTime;

  return {
    resolved: true,
    content: llmResponse.content,
    conversationId,
    messageId: msgId,
    confidence,
    citations,
    blockedReason: null,
    escalated: false,
    debug
  };
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

/**
 * Ensure a conversation exists. Creates one if conversationId is null.
 */
async function ensureConversation(
  conversationId: string | null,
  tenantId: string,
  channel: 'web' | 'email' | 'whatsapp' | 'sms' | 'voice',
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
      resolvedAt: null
    }
  );

  return doc.$id;
}

/**
 * Save a message to the messages collection.
 * Messages are scoped by conversationId, not tenantId.
 */
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

  return doc.$id;
}

/**
 * Update conversation status.
 */
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
