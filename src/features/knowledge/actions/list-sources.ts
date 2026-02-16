'use server';

import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { createAdminClient, createSessionClient } from '@/lib/appwrite/server';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query } from 'node-appwrite';
import type { KnowledgeSource } from '@/types/appwrite';
import { deleteVectorsBySource } from '@/lib/ai/retrieval';

/**
 * List knowledge sources for a tenant (server action).
 */
export async function listSourcesAction(
  tenantId: string
): Promise<{ success: boolean; sources?: KnowledgeSource[]; error?: string }> {
  try {
    const { databases } = await createSessionClient();

    const result = await databases.listDocuments<KnowledgeSource>(
      APPWRITE_DATABASE,
      COLLECTION.KNOWLEDGE_SOURCES,
      [
        Query.equal('tenantId', tenantId),
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ]
    );

    return { success: true, sources: result.documents };
  } catch (err) {
    console.error('listSourcesAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to list sources'
    };
  }
}

/**
 * Delete a knowledge source and its associated vectors.
 */
export async function deleteSourceAction(
  sourceId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await createSessionClient(); // validate session

    const admin = createAdminClient();

    // Get the source to check tenant ownership
    const source = await admin.databases.getDocument<KnowledgeSource>(
      APPWRITE_DATABASE,
      COLLECTION.KNOWLEDGE_SOURCES,
      sourceId
    );

    if (source.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    // Delete vectors from Pinecone
    try {
      await deleteVectorsBySource(tenantId, sourceId);
    } catch (err) {
      console.error('Failed to delete vectors:', err);
      // Continue with deleting the document anyway
    }

    // Delete file from storage if it exists
    if (source.fileId) {
      try {
        const { Storage } = await import('node-appwrite');
        const storage = new Storage(admin.client);
        const { APPWRITE_BUCKET } = await import('@/lib/appwrite/constants');
        await storage.deleteFile(APPWRITE_BUCKET, source.fileId);
      } catch (err) {
        console.error('Failed to delete file from storage:', err);
      }
    }

    // Delete the document
    await admin.databases.deleteDocument(
      APPWRITE_DATABASE,
      COLLECTION.KNOWLEDGE_SOURCES,
      sourceId
    );

    return { success: true };
  } catch (err) {
    console.error('deleteSourceAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete source'
    };
  }
}
