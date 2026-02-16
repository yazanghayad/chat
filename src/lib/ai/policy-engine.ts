/**
 * Policy engine – validates user queries and AI responses against
 * tenant-configured policies.
 *
 * Policies run in two phases:
 *   - **pre**: Before RAG retrieval / LLM generation (filters user input)
 *   - **post**: After LLM generation (filters AI output)
 *
 * Supported policy types:
 *   - `topic_filter` (pre)  – Blocks queries about disallowed topics
 *   - `pii_filter`   (pre)  – Detects and blocks PII in user input
 *   - `tone`         (post) – Ensures response tone is appropriate
 *   - `length`       (post) – Enforces min/max response length
 */

import { Query } from 'node-appwrite';
import type { Policy } from '@/types/appwrite';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { createAdminClient } from '@/lib/appwrite/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PolicyResult {
  /** Whether the content passed all policy checks. */
  passed: boolean;
  /** List of violations (empty if passed). */
  violations: PolicyViolation[];
}

export interface PolicyViolation {
  /** The policy that was violated. */
  policyId: string;
  policyName: string;
  policyType: Policy['type'];
  /** Human-readable violation message. */
  message: string;
}

// ---------------------------------------------------------------------------
// Policy configuration types
// ---------------------------------------------------------------------------

interface TopicFilterConfig {
  /** List of blocked topic keywords / phrases. */
  blockedTopics: string[];
  /** Optional: also block messages that match these regex patterns. */
  blockedPatterns?: string[];
}

interface PIIFilterConfig {
  /** Types of PII to detect. */
  detect: Array<'email' | 'phone' | 'ssn' | 'credit_card' | 'ip_address'>;
  /** Action: 'block' rejects the message, 'redact' replaces PII with [REDACTED]. */
  action: 'block' | 'redact';
}

interface ToneConfig {
  /** Disallowed tones / keywords in the response. */
  blockedPhrases: string[];
  /** If true, block responses that sound uncertain. */
  blockUncertain?: boolean;
}

interface LengthConfig {
  /** Minimum character length for a response. */
  minLength?: number;
  /** Maximum character length for a response. */
  maxLength?: number;
}

// ---------------------------------------------------------------------------
// PII detection patterns
// ---------------------------------------------------------------------------

const PII_PATTERNS: Record<string, RegExp> = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
};

// ---------------------------------------------------------------------------
// Load tenant policies
// ---------------------------------------------------------------------------

/**
 * Fetch all enabled policies for a tenant, sorted by priority (descending).
 */
export async function loadTenantPolicies(tenantId: string): Promise<Policy[]> {
  const { databases } = createAdminClient();

  const result = await databases.listDocuments<Policy>(
    APPWRITE_DATABASE,
    COLLECTION.POLICIES,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('enabled', true),
      Query.orderDesc('priority'),
      Query.limit(100)
    ]
  );

  return result.documents;
}

// ---------------------------------------------------------------------------
// Individual policy validators
// ---------------------------------------------------------------------------

function validateTopicFilter(
  content: string,
  config: TopicFilterConfig,
  policy: Policy
): PolicyViolation | null {
  const lower = content.toLowerCase();

  for (const topic of config.blockedTopics) {
    if (lower.includes(topic.toLowerCase())) {
      return {
        policyId: policy.$id,
        policyName: policy.name,
        policyType: 'topic_filter',
        message: `Message contains blocked topic: "${topic}"`
      };
    }
  }

  if (config.blockedPatterns) {
    for (const pattern of config.blockedPatterns) {
      try {
        if (new RegExp(pattern, 'i').test(content)) {
          return {
            policyId: policy.$id,
            policyName: policy.name,
            policyType: 'topic_filter',
            message: `Message matches blocked pattern: "${pattern}"`
          };
        }
      } catch {
        // Skip invalid regex patterns
      }
    }
  }

  return null;
}

function validatePIIFilter(
  content: string,
  config: PIIFilterConfig,
  policy: Policy
): PolicyViolation | null {
  for (const piiType of config.detect) {
    const pattern = PII_PATTERNS[piiType];
    if (!pattern) continue;

    // Reset regex state
    pattern.lastIndex = 0;

    if (pattern.test(content)) {
      if (config.action === 'block') {
        return {
          policyId: policy.$id,
          policyName: policy.name,
          policyType: 'pii_filter',
          message: `Message contains ${piiType.replace('_', ' ')} – PII not allowed`
        };
      }
      // 'redact' action: we don't block, but the caller should redact.
      // We return null (pass) but the redaction happens separately.
    }
  }

  return null;
}

function validateTone(
  content: string,
  config: ToneConfig,
  policy: Policy
): PolicyViolation | null {
  const lower = content.toLowerCase();

  for (const phrase of config.blockedPhrases) {
    if (lower.includes(phrase.toLowerCase())) {
      return {
        policyId: policy.$id,
        policyName: policy.name,
        policyType: 'tone',
        message: `Response contains blocked phrase: "${phrase}"`
      };
    }
  }

  if (config.blockUncertain) {
    const uncertainPhrases = [
      "i'm not sure",
      "i don't know",
      'i am not certain',
      'i cannot determine',
      'it might be',
      'possibly',
      'i think maybe'
    ];
    for (const phrase of uncertainPhrases) {
      if (lower.includes(phrase)) {
        return {
          policyId: policy.$id,
          policyName: policy.name,
          policyType: 'tone',
          message: 'Response sounds uncertain – violates tone policy'
        };
      }
    }
  }

  return null;
}

function validateLength(
  content: string,
  config: LengthConfig,
  policy: Policy
): PolicyViolation | null {
  if (config.minLength && content.length < config.minLength) {
    return {
      policyId: policy.$id,
      policyName: policy.name,
      policyType: 'length',
      message: `Response too short (${content.length} chars, minimum ${config.minLength})`
    };
  }

  if (config.maxLength && content.length > config.maxLength) {
    return {
      policyId: policy.$id,
      policyName: policy.name,
      policyType: 'length',
      message: `Response too long (${content.length} chars, maximum ${config.maxLength})`
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main validation function
// ---------------------------------------------------------------------------

/**
 * Run a single policy against content. Returns a violation or null.
 */
function runPolicy(content: string, policy: Policy): PolicyViolation | null {
  // Policy config is stored as JSON string or object in Appwrite
  const config =
    typeof policy.config === 'string'
      ? JSON.parse(policy.config)
      : policy.config;

  switch (policy.type) {
    case 'topic_filter':
      return validateTopicFilter(content, config as TopicFilterConfig, policy);
    case 'pii_filter':
      return validatePIIFilter(content, config as PIIFilterConfig, policy);
    case 'tone':
      return validateTone(content, config as ToneConfig, policy);
    case 'length':
      return validateLength(content, config as LengthConfig, policy);
    default:
      return null;
  }
}

/**
 * Validate content against all tenant policies for a specific phase.
 *
 * @param content  - The text to validate (user message or AI response)
 * @param policies - Pre-loaded policies from `loadTenantPolicies()`
 * @param phase    - 'pre' (before LLM) or 'post' (after LLM)
 */
export function validatePolicies(
  content: string,
  policies: Policy[],
  phase: 'pre' | 'post'
): PolicyResult {
  const phasePolicies = policies.filter((p) => p.mode === phase);
  const violations: PolicyViolation[] = [];

  for (const policy of phasePolicies) {
    const violation = runPolicy(content, policy);
    if (violation) {
      violations.push(violation);
    }
  }

  return {
    passed: violations.length === 0,
    violations
  };
}

// ---------------------------------------------------------------------------
// PII redaction utility
// ---------------------------------------------------------------------------

/**
 * Redact PII from text based on PII filter policies. Returns cleaned text.
 */
export function redactPII(content: string, policies: Policy[]): string {
  const piiPolicies = policies.filter(
    (p) => p.type === 'pii_filter' && p.enabled
  );

  let redacted = content;

  for (const policy of piiPolicies) {
    const config =
      typeof policy.config === 'string'
        ? JSON.parse(policy.config)
        : policy.config;

    if ((config as PIIFilterConfig).action !== 'redact') continue;

    for (const piiType of (config as PIIFilterConfig).detect) {
      const pattern = PII_PATTERNS[piiType];
      if (!pattern) continue;

      // Create a fresh regex to avoid stale lastIndex
      const freshPattern = new RegExp(pattern.source, pattern.flags);
      redacted = redacted.replace(freshPattern, '[REDACTED]');
    }
  }

  return redacted;
}
