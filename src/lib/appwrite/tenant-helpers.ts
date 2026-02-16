import { Query } from 'node-appwrite';
import type { Models } from 'node-appwrite';
import { createSessionClient, createAdminClient } from './server';
import { APPWRITE_DATABASE } from './constants';
import { COLLECTION } from './collections';

// ---------------------------------------------------------------------------
// Tenant-scoped reads
// ---------------------------------------------------------------------------

/**
 * List documents for a tenant (server-side, uses current session).
 */
export async function getTenantDocuments<T extends Models.Document>(
  collectionId: string,
  tenantId: string,
  queries: string[] = [],
  limit = 25
): Promise<Models.DocumentList<T>> {
  const { databases } = await createSessionClient();
  return databases.listDocuments<T>(APPWRITE_DATABASE, collectionId, [
    Query.equal('tenantId', tenantId),
    Query.limit(limit),
    ...queries
  ]);
}

/**
 * Get a single document by ID (server-side, uses current session).
 */
export async function getTenantDocument<T extends Models.Document>(
  collectionId: string,
  documentId: string
): Promise<T> {
  const { databases } = await createSessionClient();
  return databases.getDocument<T>(APPWRITE_DATABASE, collectionId, documentId);
}

// ---------------------------------------------------------------------------
// Tenant-scoped writes (admin client – bypasses document-level permissions)
// ---------------------------------------------------------------------------

/**
 * Create a document scoped to a tenant.
 */
export async function createTenantDocument<T extends Models.Document>(
  collectionId: string,
  tenantId: string,
  data: Record<string, unknown>
): Promise<T> {
  const { databases } = createAdminClient();
  const { ID } = await import('node-appwrite');
  return databases.createDocument(
    APPWRITE_DATABASE,
    collectionId,
    ID.unique(),
    { tenantId, ...data } as any
  ) as Promise<T>;
}

/**
 * Update an existing document.
 */
export async function updateTenantDocument<T extends Models.Document>(
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>
): Promise<T> {
  const { databases } = createAdminClient();
  return databases.updateDocument(
    APPWRITE_DATABASE,
    collectionId,
    documentId,
    data as any
  ) as Promise<T>;
}

/**
 * Delete a document.
 */
export async function deleteTenantDocument(
  collectionId: string,
  documentId: string
): Promise<void> {
  const { databases } = createAdminClient();
  await databases.deleteDocument(APPWRITE_DATABASE, collectionId, documentId);
}

// ---------------------------------------------------------------------------
// Convenience: get or create tenant for current user
// ---------------------------------------------------------------------------

export async function getOrCreateTenant(userId: string, name: string) {
  const { databases } = createAdminClient();
  const { ID } = await import('node-appwrite');

  const existing = await databases.listDocuments(
    APPWRITE_DATABASE,
    COLLECTION.TENANTS,
    [Query.equal('userId', userId), Query.limit(1)]
  );

  if (existing.documents.length > 0) {
    return existing.documents[0];
  }

  // Create team for the new tenant
  let teamId: string | undefined;
  try {
    const { createTeam } = await import('./teams');
    teamId = await createTeam(name, userId);
  } catch (err) {
    console.warn('Failed to create team for new tenant:', err);
  }

  return databases.createDocument(
    APPWRITE_DATABASE,
    COLLECTION.TENANTS,
    ID.unique(),
    {
      name,
      plan: 'trial',
      config: JSON.stringify({ teamId }),
      apiKey: crypto.randomUUID().replace(/-/g, ''),
      userId
    }
  );
}
