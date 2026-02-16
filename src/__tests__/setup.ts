import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ── Global mocks for external services ──────────────────────────────────

// Mock next/headers (used by createSessionClient)
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-session-token' })),
    set: vi.fn(),
    delete: vi.fn()
  }))
}));

// Mock Appwrite server clients
vi.mock('@/lib/appwrite/server', () => {
  const mockDatabases = {
    listDocuments: vi.fn().mockResolvedValue({ documents: [], total: 0 }),
    getDocument: vi.fn().mockResolvedValue({}),
    createDocument: vi.fn().mockResolvedValue({ $id: 'mock-doc-id' }),
    updateDocument: vi.fn().mockResolvedValue({}),
    deleteDocument: vi.fn().mockResolvedValue({})
  };
  const mockAccount = {
    get: vi.fn().mockResolvedValue({ $id: 'mock-user-id', name: 'Test User' })
  };
  const mockUsers = {
    list: vi.fn().mockResolvedValue({ users: [], total: 0 })
  };
  const mockTeams = {
    create: vi.fn().mockResolvedValue({ $id: 'mock-team-id' }),
    list: vi.fn().mockResolvedValue({ teams: [], total: 0 })
  };

  return {
    createAdminClient: vi.fn(() => ({
      client: {},
      account: mockAccount,
      databases: mockDatabases,
      users: mockUsers,
      teams: mockTeams
    })),
    createSessionClient: vi.fn(() => ({
      client: {},
      account: mockAccount,
      databases: mockDatabases
    }))
  };
});

// Mock OpenAI
vi.mock('openai', () => {
  const MockOpenAI = vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: { content: 'Mock AI response', role: 'assistant' },
              finish_reason: 'stop'
            }
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        })
      }
    },
    embeddings: {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: new Array(3072).fill(0.1) }]
      })
    }
  }));
  return { default: MockOpenAI };
});

// Mock Upstash Redis
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => ({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1)
    }))
  }
}));

// Mock audit logger (fire-and-forget)
vi.mock('@/lib/audit/logger', () => ({
  logAuditEventAsync: vi.fn()
}));

// Mock rate-limit middleware
vi.mock('@/lib/rate-limit/middleware', () => ({
  applyRateLimits: vi.fn().mockResolvedValue(undefined)
}));

// Suppress console noise in tests
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
