import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePolicies, redactPII } from '@/lib/ai/policy-engine';
import type { Policy } from '@/types/appwrite';

// Helper to create a Policy mock (Appwrite document shape)
function mockPolicy(
  overrides: Partial<Policy> & Pick<Policy, 'type' | 'mode' | 'config'>
): Policy {
  return {
    $id: overrides.$id ?? 'policy-1',
    $collectionId: 'policies',
    $databaseId: 'test-db',
    $createdAt: '2025-01-01T00:00:00.000Z',
    $updatedAt: '2025-01-01T00:00:00.000Z',
    $permissions: [],
    $sequence: 0,
    tenantId: 'tenant-1',
    name: overrides.name ?? 'Test Policy',
    type: overrides.type,
    mode: overrides.mode,
    config: overrides.config,
    enabled: overrides.enabled ?? true,
    priority: overrides.priority ?? 1
  } as Policy;
}

describe('Policy Engine - validatePolicies', () => {
  // ── Topic Filter ────────────────────────────────────────────────────────

  describe('topic_filter', () => {
    const policy = mockPolicy({
      type: 'topic_filter',
      mode: 'pre',
      config: {
        blockedTopics: ['competitors', 'lawsuit'],
        blockedPatterns: ['\\bcrypto\\b']
      }
    });

    it('passes when no blocked topic is found', () => {
      const result = validatePolicies(
        'How do I reset my password?',
        [policy],
        'pre'
      );
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('blocks when a blocked topic keyword is found', () => {
      const result = validatePolicies(
        'How do you compare to competitors?',
        [policy],
        'pre'
      );
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].policyType).toBe('topic_filter');
      expect(result.violations[0].message).toContain('competitors');
    });

    it('blocks when a blocked regex pattern matches', () => {
      const result = validatePolicies(
        'Can I pay with crypto?',
        [policy],
        'pre'
      );
      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain('crypto');
    });

    it('is case-insensitive', () => {
      const result = validatePolicies(
        'Tell me about your COMPETITORS',
        [policy],
        'pre'
      );
      expect(result.passed).toBe(false);
    });

    it('ignores policies from a different phase', () => {
      const result = validatePolicies(
        'How do you compare to competitors?',
        [policy],
        'post' // policy is mode: 'pre'
      );
      expect(result.passed).toBe(true);
    });
  });

  // ── PII Filter ──────────────────────────────────────────────────────────

  describe('pii_filter', () => {
    const policy = mockPolicy({
      type: 'pii_filter',
      mode: 'pre',
      config: {
        detect: ['email', 'phone', 'ssn', 'credit_card'],
        action: 'block'
      }
    });

    it('passes when no PII is detected', () => {
      const result = validatePolicies(
        'What are your business hours?',
        [policy],
        'pre'
      );
      expect(result.passed).toBe(true);
    });

    it('blocks email addresses', () => {
      const result = validatePolicies(
        'Contact me at john@example.com',
        [policy],
        'pre'
      );
      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain('email');
    });

    it('blocks phone numbers', () => {
      const result = validatePolicies(
        'Call me at +1 555-123-4567',
        [policy],
        'pre'
      );
      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain('phone');
    });

    it('blocks SSN', () => {
      const result = validatePolicies('My SSN is 123-45-6789', [policy], 'pre');
      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain('ssn');
    });

    it('blocks credit card numbers', () => {
      const ccOnlyPolicy = mockPolicy({
        type: 'pii_filter',
        mode: 'pre',
        config: { action: 'block', detect: ['credit_card'] }
      });
      const result = validatePolicies(
        'My card is 4111-1111-1111-1111',
        [ccOnlyPolicy],
        'pre'
      );
      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain('credit card');
    });
  });

  // ── Tone Filter ─────────────────────────────────────────────────────────

  describe('tone', () => {
    const policy = mockPolicy({
      type: 'tone',
      mode: 'post',
      config: {
        blockedPhrases: ['damn', 'stupid'],
        blockUncertain: true
      }
    });

    it('passes clean responses', () => {
      const result = validatePolicies(
        'Your order has been shipped and should arrive by Friday.',
        [policy],
        'post'
      );
      expect(result.passed).toBe(true);
    });

    it('blocks responses with banned phrases', () => {
      const result = validatePolicies(
        'That is a damn good question.',
        [policy],
        'post'
      );
      expect(result.passed).toBe(false);
      expect(result.violations[0].policyType).toBe('tone');
    });

    it('blocks uncertain responses when blockUncertain is enabled', () => {
      const result = validatePolicies(
        "I'm not sure about that, but maybe check the docs.",
        [policy],
        'post'
      );
      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain('uncertain');
    });
  });

  // ── Length Filter ───────────────────────────────────────────────────────

  describe('length', () => {
    const policy = mockPolicy({
      type: 'length',
      mode: 'post',
      config: { minLength: 20, maxLength: 500 }
    });

    it('passes responses within length bounds', () => {
      const result = validatePolicies(
        'Your order has been shipped and should arrive soon.',
        [policy],
        'post'
      );
      expect(result.passed).toBe(true);
    });

    it('blocks responses that are too short', () => {
      const result = validatePolicies('Yes.', [policy], 'post');
      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain('too short');
    });

    it('blocks responses that are too long', () => {
      const longText = 'x'.repeat(501);
      const result = validatePolicies(longText, [policy], 'post');
      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain('too long');
    });
  });

  // ── Multiple policies ───────────────────────────────────────────────────

  describe('multiple policies', () => {
    it('collects violations from all matching policies', () => {
      const policies = [
        mockPolicy({
          $id: 'p1',
          type: 'tone',
          mode: 'post',
          config: { blockedPhrases: ['stupid'], blockUncertain: false }
        }),
        mockPolicy({
          $id: 'p2',
          type: 'length',
          mode: 'post',
          config: { minLength: 100 }
        })
      ];

      const result = validatePolicies('That is stupid.', policies, 'post');
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
    });
  });
});

describe('Policy Engine - redactPII', () => {
  const redactPolicy = mockPolicy({
    type: 'pii_filter',
    mode: 'pre',
    config: {
      detect: ['email', 'phone', 'ssn'],
      action: 'redact'
    }
  });

  it('redacts email addresses', () => {
    const result = redactPII('Contact me at john@example.com please', [
      redactPolicy
    ]);
    expect(result).toBe('Contact me at [REDACTED] please');
    expect(result).not.toContain('john@example.com');
  });

  it('redacts phone numbers', () => {
    const result = redactPII('My phone is 555-123-4567', [redactPolicy]);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('555-123-4567');
  });

  it('redacts SSNs', () => {
    const result = redactPII('SSN: 123-45-6789', [redactPolicy]);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('123-45-6789');
  });

  it('does not redact when action is "block"', () => {
    const blockPolicy = mockPolicy({
      type: 'pii_filter',
      mode: 'pre',
      config: {
        detect: ['email'],
        action: 'block'
      }
    });
    const input = 'Contact john@example.com';
    const result = redactPII(input, [blockPolicy]);
    expect(result).toBe(input); // unchanged
  });

  it('handles multiple PII types in same text', () => {
    const result = redactPII(
      'Email me at test@test.com or call 555-111-2222, SSN 123-45-6789',
      [redactPolicy]
    );
    expect(result).not.toContain('test@test.com');
    expect(result).not.toContain('555-111-2222');
    expect(result).not.toContain('123-45-6789');
  });

  it('returns original text when no PII policies exist', () => {
    const result = redactPII('Nothing to redact here', []);
    expect(result).toBe('Nothing to redact here');
  });
});
