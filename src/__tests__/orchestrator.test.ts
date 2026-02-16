import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ── Module mocks (must come before import of orchestrator) ──────────────
// We mock each dependency that the orchestrator imports

vi.mock('@/lib/ai/retrieval', () => ({
  vectorSearch: vi.fn()
}));

vi.mock('@/lib/ai/llm', () => ({
  generateCompletion: vi.fn()
}));

vi.mock('@/lib/ai/policy-engine', () => ({
  loadTenantPolicies: vi.fn(),
  validatePolicies: vi.fn(),
  redactPII: vi.fn((text: string) => text)
}));

vi.mock('@/lib/ai/procedure-executor', () => ({
  findMatchingProcedure: vi.fn().mockResolvedValue(null),
  executeProcedure: vi.fn()
}));

vi.mock('@/lib/cache/semantic-cache', () => ({
  getCachedResponse: vi.fn().mockResolvedValue(null),
  setCachedResponse: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/lib/appwrite/tenant-helpers', () => ({
  createTenantDocument: vi.fn().mockResolvedValue({ $id: 'conv-123' }),
  updateTenantDocument: vi.fn().mockResolvedValue({})
}));

// Now import the subjects
import { orchestrate, type OrchestratorInput } from '@/lib/ai/orchestrator';
import { vectorSearch } from '@/lib/ai/retrieval';
import { generateCompletion } from '@/lib/ai/llm';
import {
  loadTenantPolicies,
  validatePolicies,
  redactPII
} from '@/lib/ai/policy-engine';
import {
  findMatchingProcedure,
  executeProcedure
} from '@/lib/ai/procedure-executor';
import {
  getCachedResponse,
  setCachedResponse
} from '@/lib/cache/semantic-cache';
import { createTenantDocument } from '@/lib/appwrite/tenant-helpers';
import { createAdminClient } from '@/lib/appwrite/server';

// ── Helpers ─────────────────────────────────────────────────────────────

const baseInput: OrchestratorInput = {
  tenantId: 'tenant-1',
  conversationId: null,
  userMessage: 'How do I reset my password?',
  channel: 'web',
  userId: 'user-1'
};

function setupHappyPath() {
  // Tenant config
  const adminDb = (createAdminClient as Mock)().databases;
  adminDb.getDocument.mockResolvedValue({
    $id: 'tenant-1',
    config: JSON.stringify({ confidenceThreshold: 0.7 })
  });
  adminDb.listDocuments.mockResolvedValue({ documents: [], total: 0 });
  adminDb.createDocument.mockResolvedValue({ $id: 'msg-123' });

  // Policies: all pass
  (loadTenantPolicies as Mock).mockResolvedValue([]);
  (validatePolicies as Mock).mockReturnValue({
    passed: true,
    violations: []
  });
  (redactPII as Mock).mockImplementation((t: string) => t);

  // No procedure match
  (findMatchingProcedure as Mock).mockResolvedValue(null);

  // No cache hit
  (getCachedResponse as Mock).mockResolvedValue(null);

  // Vector search returns good results
  (vectorSearch as Mock).mockResolvedValue([
    {
      id: 'chunk-1',
      score: 0.92,
      metadata: {
        text: 'To reset your password, go to Settings > Security.',
        sourceId: 'source-1'
      }
    },
    {
      id: 'chunk-2',
      score: 0.88,
      metadata: {
        text: 'Click "Forgot Password" on the login page.',
        sourceId: 'source-1'
      }
    }
  ]);

  // LLM generates a response
  (generateCompletion as Mock).mockResolvedValue({
    content:
      'To reset your password, go to Settings > Security and click "Reset Password".',
    model: 'gpt-4o',
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    finishReason: 'stop'
  });
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('AI Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPath();
  });

  // ── Happy path ──────────────────────────────────────────────────────────

  it('resolves a query through the full RAG pipeline', async () => {
    const result = await orchestrate(baseInput);

    expect(result.resolved).toBe(true);
    expect(result.content).toContain('reset your password');
    expect(result.conversationId).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.citations).toHaveLength(1); // source-1 (deduplicated)
    expect(result.escalated).toBe(false);
    expect(result.blockedReason).toBeNull();
    expect(result.debug.prePolicyPassed).toBe(true);
    expect(result.debug.postPolicyPassed).toBe(true);
    expect(result.debug.tokensUsed).toBe(150);
  });

  it('calls vectorSearch with tenant ID and message', async () => {
    await orchestrate(baseInput);

    expect(vectorSearch).toHaveBeenCalledWith(
      'tenant-1',
      'How do I reset my password?',
      expect.any(Number)
    );
  });

  it('calls generateCompletion with RAG context', async () => {
    await orchestrate(baseInput);

    expect(generateCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'How do I reset my password?',
        chunks: expect.arrayContaining([
          expect.objectContaining({ text: expect.any(String) })
        ])
      }),
      expect.any(Object)
    );
  });

  it('caches successful responses', async () => {
    await orchestrate(baseInput);

    expect(setCachedResponse).toHaveBeenCalledWith(
      'tenant-1',
      'How do I reset my password?',
      expect.objectContaining({
        content: expect.any(String),
        confidence: expect.any(Number),
        citations: expect.any(Array)
      }),
      undefined
    );
  });

  // ── Pre-policy blocked ────────────────────────────────────────────────

  it('blocks when pre-policy check fails', async () => {
    (validatePolicies as Mock).mockImplementation(
      (_content: string, _policies: unknown[], phase: string) => {
        if (phase === 'pre') {
          return {
            passed: false,
            violations: [
              {
                policyId: 'p-1',
                policyName: 'Topic Filter',
                policyType: 'topic_filter',
                message: 'Blocked topic: competitors'
              }
            ]
          };
        }
        return { passed: true, violations: [] };
      }
    );

    const result = await orchestrate(baseInput);

    expect(result.resolved).toBe(false);
    expect(result.blockedReason).toContain('competitors');
    expect(result.escalated).toBe(false);
    // Should NOT have called vector search or LLM
    expect(vectorSearch).not.toHaveBeenCalled();
    expect(generateCompletion).not.toHaveBeenCalled();
  });

  // ── Low confidence → escalation ────────────────────────────────────────

  it('escalates when retrieval confidence is below threshold', async () => {
    (vectorSearch as Mock).mockResolvedValue([
      {
        id: 'chunk-1',
        score: 0.3,
        metadata: { text: 'Irrelevant', sourceId: 's1' }
      }
    ]);

    const result = await orchestrate(baseInput);

    expect(result.resolved).toBe(false);
    expect(result.escalated).toBe(true);
    expect(result.confidence).toBeLessThan(0.7);
    expect(result.content).toContain('human agent');
    // Should NOT call LLM for low-confidence queries
    expect(generateCompletion).not.toHaveBeenCalled();
  });

  it('escalates when vector search returns no results', async () => {
    (vectorSearch as Mock).mockResolvedValue([]);

    const result = await orchestrate(baseInput);

    expect(result.resolved).toBe(false);
    expect(result.escalated).toBe(true);
    expect(result.confidence).toBe(0);
  });

  // ── Post-policy violation → escalation ─────────────────────────────────

  it('escalates when post-policy check fails', async () => {
    (validatePolicies as Mock).mockImplementation(
      (_content: string, _policies: unknown[], phase: string) => {
        if (phase === 'post') {
          return {
            passed: false,
            violations: [
              {
                policyId: 'p-2',
                policyName: 'Tone',
                policyType: 'tone',
                message: 'Blocked uncertain tone'
              }
            ]
          };
        }
        return { passed: true, violations: [] };
      }
    );

    const result = await orchestrate(baseInput);

    expect(result.resolved).toBe(false);
    expect(result.escalated).toBe(true);
    expect(result.blockedReason).toContain('uncertain tone');
    expect(result.debug.postPolicyPassed).toBe(false);
  });

  // ── PII redaction ──────────────────────────────────────────────────────

  it('passes redacted text to vector search', async () => {
    (redactPII as Mock).mockReturnValue('How do I reset [REDACTED]?');

    await orchestrate(baseInput);

    expect(vectorSearch).toHaveBeenCalledWith(
      'tenant-1',
      'How do I reset [REDACTED]?',
      expect.any(Number)
    );
  });

  // ── Procedure match (short-circuits RAG) ───────────────────────────────

  it('executes a matched procedure and skips RAG', async () => {
    (findMatchingProcedure as Mock).mockResolvedValue({
      $id: 'proc-1',
      name: 'Refund Procedure',
      steps: []
    });
    (executeProcedure as Mock).mockResolvedValue({
      success: true,
      finalMessage: 'Your refund of $29.99 has been processed.',
      steps: [{ id: 'step-1' }]
    });

    const result = await orchestrate(baseInput);

    expect(result.resolved).toBe(true);
    expect(result.content).toContain('refund');
    expect(result.confidence).toBe(1.0);
    // Should NOT call vector search or LLM
    expect(vectorSearch).not.toHaveBeenCalled();
    expect(generateCompletion).not.toHaveBeenCalled();
  });

  // ── Cache hit (short-circuits RAG) ─────────────────────────────────────

  it('returns cached response when available', async () => {
    (getCachedResponse as Mock).mockResolvedValue({
      content: 'Cached answer about passwords.',
      confidence: 0.95,
      citations: [{ sourceId: 'src-1' }]
    });

    const result = await orchestrate(baseInput);

    expect(result.resolved).toBe(true);
    expect(result.content).toBe('Cached answer about passwords.');
    expect(result.confidence).toBe(0.95);
    // Should NOT call vector search or LLM
    expect(vectorSearch).not.toHaveBeenCalled();
    expect(generateCompletion).not.toHaveBeenCalled();
  });

  // ── LLM failure → graceful fallback ────────────────────────────────────

  it('returns error fallback when LLM throws', async () => {
    (generateCompletion as Mock).mockRejectedValue(new Error('API timeout'));

    const result = await orchestrate(baseInput);

    expect(result.resolved).toBe(false);
    expect(result.content).toContain('error');
    expect(result.escalated).toBe(false);
  });

  // ── Dry-run mode ───────────────────────────────────────────────────────

  it('returns result without persisting in dry-run mode', async () => {
    const adminDb = (createAdminClient as Mock)().databases;

    const result = await orchestrate({ ...baseInput, dryRun: true });

    expect(result.resolved).toBe(true);
    expect(result.messageId).toBeNull();
    // createDocument should only be called for ensureConversation, not for saving messages
  });

  // ── Existing conversation ID ───────────────────────────────────────────

  it('reuses existing conversation ID when provided', async () => {
    const result = await orchestrate({
      ...baseInput,
      conversationId: 'existing-conv-123'
    });

    expect(result.conversationId).toBe('existing-conv-123');
    // createTenantDocument should NOT be called for conversation creation
    expect(createTenantDocument).not.toHaveBeenCalledWith(
      'conversations',
      expect.any(String),
      expect.any(Object)
    );
  });

  // ── Debug metadata ─────────────────────────────────────────────────────

  it('includes debug metadata in the result', async () => {
    const result = await orchestrate(baseInput);

    expect(result.debug).toMatchObject({
      retrievalResults: 2,
      avgRetrievalScore: expect.any(Number),
      prePolicyPassed: true,
      postPolicyPassed: true,
      prePolicyViolations: [],
      postPolicyViolations: [],
      tokensUsed: 150,
      durationMs: expect.any(Number)
    });
    expect(result.debug.durationMs).toBeGreaterThanOrEqual(0);
  });
});
