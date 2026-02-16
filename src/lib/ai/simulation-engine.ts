/**
 * Simulation engine – runs test conversations in dry-run mode.
 *
 * Used to verify AI behaviour before deploying changes to knowledge
 * base, procedures, or policies.
 */

import { vectorSearch, type SearchResult } from '@/lib/ai/retrieval';
import { generateCompletion, type RAGContext } from '@/lib/ai/llm';
import {
  loadTenantPolicies,
  validatePolicies,
  redactPII
} from '@/lib/ai/policy-engine';
import {
  findMatchingProcedure,
  executeProcedure,
  type ProcedureResult
} from '@/lib/ai/procedure-executor';
import type { Policy, Citation } from '@/types/appwrite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimulationInput {
  tenantId: string;
  messages: string[];
  /** If true, also test procedure matching. */
  testProcedures?: boolean;
}

export interface SimulationTurn {
  userMessage: string;
  assistantResponse: string | null;
  confidence: number;
  citations: Citation[];
  procedureTriggered: string | null;
  procedureResult: ProcedureResult | null;
  policyBlocked: boolean;
  policyViolations: string[];
  escalated: boolean;
}

export interface SimulationResult {
  success: boolean;
  turns: SimulationTurn[];
  metrics: {
    avgConfidence: number;
    resolutionRate: number;
    escalationRate: number;
    proceduresUsed: string[];
    totalTurns: number;
  };
  error?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CONFIDENCE_THRESHOLD = 0.7;
const TOP_K = 5;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Run a simulated multi-turn conversation without saving anything to the DB.
 */
export async function runSimulation(
  input: SimulationInput
): Promise<SimulationResult> {
  const { tenantId, messages, testProcedures = false } = input;
  const turns: SimulationTurn[] = [];

  // Load policies once
  let policies: Policy[] = [];
  try {
    policies = await loadTenantPolicies(tenantId);
  } catch {
    // Continue without policies
  }

  // Simulated conversation history
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const userMessage of messages) {
    const turn: SimulationTurn = {
      userMessage,
      assistantResponse: null,
      confidence: 0,
      citations: [],
      procedureTriggered: null,
      procedureResult: null,
      policyBlocked: false,
      policyViolations: [],
      escalated: false
    };

    // Pre-policy check
    const preCheck = validatePolicies(userMessage, policies, 'pre');
    if (!preCheck.passed) {
      turn.policyBlocked = true;
      turn.policyViolations = preCheck.violations.map((v) => v.message);
      turns.push(turn);
      continue;
    }

    const cleanedMessage = redactPII(userMessage, policies);

    // Check for procedure match
    if (testProcedures) {
      try {
        const procedure = await findMatchingProcedure(tenantId, cleanedMessage);
        if (procedure) {
          turn.procedureTriggered = procedure.name;

          const result = await executeProcedure(procedure, {
            tenantId,
            conversationId: 'simulation',
            variables: {},
            dryRun: true
          });

          turn.procedureResult = result;

          if (result.finalMessage) {
            turn.assistantResponse = result.finalMessage;
            turn.confidence = 1.0; // Procedure responses are always high confidence
            history.push({ role: 'user', content: userMessage });
            history.push({
              role: 'assistant',
              content: result.finalMessage
            });
            turns.push(turn);
            continue;
          }
        }
      } catch {
        // Procedure matching failed, fall through to RAG
      }
    }

    // RAG retrieval
    let results: SearchResult[] = [];
    try {
      results = await vectorSearch(tenantId, cleanedMessage, TOP_K);
    } catch {
      // Vector search unavailable
    }

    const avgScore =
      results.length > 0
        ? results.reduce((s, r) => s + r.score, 0) / results.length
        : 0;
    turn.confidence = avgScore;

    // Confidence check
    if (results.length === 0 || avgScore < CONFIDENCE_THRESHOLD) {
      turn.escalated = true;
      turn.assistantResponse =
        "I'm sorry, I don't have enough information to answer that question confidently.";
      history.push({ role: 'user', content: userMessage });
      turns.push(turn);
      continue;
    }

    // LLM generation
    const ragContext: RAGContext = {
      query: cleanedMessage,
      chunks: results.map((r) => ({
        text: (r.metadata.text as string) ?? '',
        sourceId: r.id,
        score: r.score
      })),
      conversationHistory: history.length > 0 ? [...history] : undefined
    };

    try {
      const llmResponse = await generateCompletion(ragContext);
      turn.assistantResponse = llmResponse.content;

      // Post-policy check
      const postCheck = validatePolicies(llmResponse.content, policies, 'post');
      if (!postCheck.passed) {
        turn.policyBlocked = true;
        turn.policyViolations = postCheck.violations.map((v) => v.message);
        turn.escalated = true;
        turn.assistantResponse = null;
      }

      // Citations
      turn.citations = extractCitations(results);
    } catch {
      turn.escalated = true;
      turn.assistantResponse = null;
    }

    // Add to history
    history.push({ role: 'user', content: userMessage });
    if (turn.assistantResponse) {
      history.push({ role: 'assistant', content: turn.assistantResponse });
    }

    turns.push(turn);
  }

  // Compute metrics
  const totalTurns = turns.length;
  const resolvedTurns = turns.filter(
    (t) => t.assistantResponse && !t.escalated && !t.policyBlocked
  ).length;
  const escalatedTurns = turns.filter((t) => t.escalated).length;
  const procedures = turns
    .map((t) => t.procedureTriggered)
    .filter(Boolean) as string[];

  return {
    success: true,
    turns,
    metrics: {
      avgConfidence:
        totalTurns > 0
          ? turns.reduce((s, t) => s + t.confidence, 0) / totalTurns
          : 0,
      resolutionRate: totalTurns > 0 ? resolvedTurns / totalTurns : 0,
      escalationRate: totalTurns > 0 ? escalatedTurns / totalTurns : 0,
      proceduresUsed: Array.from(new Set(procedures)),
      totalTurns
    }
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
