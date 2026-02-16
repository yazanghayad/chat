import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTenantDocuments,
  getTenantDocument,
  createTenantDocument,
  updateTenantDocument,
  deleteTenantDocument,
  getOrCreateTenant
} from '@/lib/appwrite/tenant-helpers';
import { createSessionClient, createAdminClient } from '@/lib/appwrite/server';

// The mocks from setup.ts are already active. We type-cast to access .mock
const mockCreateSession = createSessionClient as ReturnType<typeof vi.fn>;
const mockCreateAdmin = createAdminClient as ReturnType<typeof vi.fn>;

describe('Tenant Helpers', () => {
  let sessionDatabases: any;
  let adminDatabases: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get references to the mock databases returned by the factories
    sessionDatabases = {
      listDocuments: vi.fn().mockResolvedValue({
        documents: [{ $id: 'doc-1', tenantId: 'tenant-1', name: 'Test' }],
        total: 1
      }),
      getDocument: vi.fn().mockResolvedValue({
        $id: 'doc-1',
        tenantId: 'tenant-1',
        name: 'Test'
      })
    };

    adminDatabases = {
      listDocuments: vi.fn().mockResolvedValue({
        documents: [],
        total: 0
      }),
      createDocument: vi.fn().mockResolvedValue({
        $id: 'new-doc-id',
        tenantId: 'tenant-1'
      }),
      updateDocument: vi.fn().mockResolvedValue({
        $id: 'doc-1',
        tenantId: 'tenant-1',
        name: 'Updated'
      }),
      deleteDocument: vi.fn().mockResolvedValue({})
    };

    mockCreateSession.mockResolvedValue({
      client: {},
      account: {},
      databases: sessionDatabases
    });

    mockCreateAdmin.mockReturnValue({
      client: {},
      account: {},
      databases: adminDatabases,
      users: {},
      teams: {}
    });
  });

  // ── getTenantDocuments ──────────────────────────────────────────────────

  describe('getTenantDocuments', () => {
    it('calls listDocuments with tenantId filter', async () => {
      const result = await getTenantDocuments('policies', 'tenant-1');

      expect(mockCreateSession).toHaveBeenCalled();
      expect(sessionDatabases.listDocuments).toHaveBeenCalledWith(
        expect.any(String), // database ID
        'policies',
        expect.arrayContaining([
          expect.stringContaining('tenant-1') // Query.equal('tenantId', ...)
        ])
      );
      expect(result.documents).toHaveLength(1);
    });

    it('merges additional queries', async () => {
      await getTenantDocuments('policies', 'tenant-1', ['extra-query'], 100);

      const calls = sessionDatabases.listDocuments.mock.calls[0];
      const queries = calls[2]; // third argument is the queries array
      expect(queries.length).toBeGreaterThanOrEqual(3); // tenantId + limit + extra
    });
  });

  // ── getTenantDocument ───────────────────────────────────────────────────

  describe('getTenantDocument', () => {
    it('fetches a single document by ID', async () => {
      const result = await getTenantDocument('policies', 'doc-1');

      expect(sessionDatabases.getDocument).toHaveBeenCalledWith(
        expect.any(String),
        'policies',
        'doc-1'
      );
      expect(result.$id).toBe('doc-1');
    });
  });

  // ── createTenantDocument ────────────────────────────────────────────────

  describe('createTenantDocument', () => {
    it('creates a document with tenantId injected', async () => {
      const result = await createTenantDocument('policies', 'tenant-1', {
        name: 'New Policy',
        type: 'topic_filter'
      });

      expect(mockCreateAdmin).toHaveBeenCalled();
      expect(adminDatabases.createDocument).toHaveBeenCalledWith(
        expect.any(String), // database
        'policies',
        expect.any(String), // ID.unique()
        expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'New Policy',
          type: 'topic_filter'
        })
      );
      expect(result.$id).toBe('new-doc-id');
    });
  });

  // ── updateTenantDocument ────────────────────────────────────────────────

  describe('updateTenantDocument', () => {
    it('updates a document by ID', async () => {
      await updateTenantDocument('policies', 'doc-1', { name: 'Updated' });

      expect(adminDatabases.updateDocument).toHaveBeenCalledWith(
        expect.any(String),
        'policies',
        'doc-1',
        expect.objectContaining({ name: 'Updated' })
      );
    });
  });

  // ── deleteTenantDocument ────────────────────────────────────────────────

  describe('deleteTenantDocument', () => {
    it('deletes a document by ID', async () => {
      await deleteTenantDocument('policies', 'doc-1');

      expect(adminDatabases.deleteDocument).toHaveBeenCalledWith(
        expect.any(String),
        'policies',
        'doc-1'
      );
    });
  });

  // ── getOrCreateTenant ───────────────────────────────────────────────────

  describe('getOrCreateTenant', () => {
    it('returns existing tenant when found', async () => {
      adminDatabases.listDocuments.mockResolvedValueOnce({
        documents: [{ $id: 'existing-tenant', userId: 'user-1' }],
        total: 1
      });

      const result = await getOrCreateTenant('user-1', 'My Company');

      expect(result.$id).toBe('existing-tenant');
      expect(adminDatabases.createDocument).not.toHaveBeenCalled();
    });

    it('creates a new tenant when none exists', async () => {
      adminDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0
      });
      adminDatabases.createDocument.mockResolvedValueOnce({
        $id: 'new-tenant-id',
        userId: 'user-1',
        name: 'My Company'
      });

      const result = await getOrCreateTenant('user-1', 'My Company');

      expect(adminDatabases.createDocument).toHaveBeenCalled();
      expect(result.$id).toBe('new-tenant-id');
    });
  });
});
