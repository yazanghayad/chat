'use server';

/**
 * Knowledge versioning server actions.
 *
 * Manages version history for knowledge sources and supports rollback
 * to previous versions with version-aware vector queries.
 */

import { createSessionClient, createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE, APPWRITE_BUCKET } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { ID, Query } from 'node-appwrite';
import {
  deleteVectorsBySource,
  upsertVectors,
  generateEmbeddings,
  type ChunkVector
} from '@/lib/ai/retrieval';
import { splitTextIntoChunks } from '@/lib/ai/chunking';
import { logAuditEventAsync } from '@/lib/audit/logger';
import { invalidateTenantCache } from '@/lib/cache/semantic-cache';
import type { KnowledgeSource } from '@/types/appwrite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VersionInfo {
  version: number;
  createdAt: string;
  chunkCount: number;
  vectorCount: number;
  storageFileId: string | null;
}

// ---------------------------------------------------------------------------
// List versions
// ---------------------------------------------------------------------------

/**
 * List all versions for a knowledge source.
 */
export async function listVersionsAction(
  sourceId: string,
  tenantId: string
): Promise<{
  success: boolean;
  versions?: VersionInfo[];
  currentVersion?: number;
  error?: string;
}> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();
    const source = await databases.getDocument<KnowledgeSource>(
      APPWRITE_DATABASE,
      COLLECTION.KNOWLEDGE_SOURCES,
      sourceId
    );

    if (source.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    // Parse version metadata from source metadata
    const metadata = (() => {
      try {
        return typeof source.metadata === 'string'
          ? JSON.parse(source.metadata as unknown as string)
          : source.metadata;
      } catch {
        return {};
      }
    })();

    const versionHistory: VersionInfo[] = metadata.versionHistory ?? [];

    return {
      success: true,
      versions: versionHistory,
      currentVersion: source.version ?? 1
    };
  } catch (err) {
    console.error('listVersionsAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to list versions'
    };
  }
}

// ---------------------------------------------------------------------------
// Save version snapshot (called before update)
// ---------------------------------------------------------------------------

/**
 * Save the current version's content to Appwrite Storage for rollback.
 * Returns the storage file ID.
 */
export async function saveVersionSnapshot(
  sourceId: string,
  tenantId: string,
  content: string,
  version: number
): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { Storage } = await import('node-appwrite');
    const storage = new Storage(admin.client);

    // Create a file in storage with the version content
    const fileName = `knowledge_v${version}_${sourceId}.txt`;
    const blob = new File([content], fileName, { type: 'text/plain' });

    const file = await storage.createFile(APPWRITE_BUCKET, ID.unique(), blob);

    return file.$id;
  } catch (err) {
    console.error('saveVersionSnapshot error:', err);
    return null;
  }
}

/**
 * Retrieve content from a version snapshot stored in Appwrite Storage.
 */
export async function getVersionContent(
  fileId: string
): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { Storage } = await import('node-appwrite');
    const storage = new Storage(admin.client);

    const result = await storage.getFileDownload(APPWRITE_BUCKET, fileId);

    // Convert to string
    if (result instanceof ArrayBuffer) {
      return new TextDecoder().decode(result);
    }
    return new TextDecoder().decode(result as ArrayBuffer);
  } catch (err) {
    console.error('getVersionContent error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rollback to a previous version
// ---------------------------------------------------------------------------

/**
 * Rollback a knowledge source to a previous version.
 * 1. Fetch the stored content for the target version
 * 2. Delete current vectors
 * 3. Re-chunk and re-embed the old content
 * 4. Update the source document
 */
export async function rollbackVersionAction(
  sourceId: string,
  tenantId: string,
  targetVersion: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const admin = createAdminClient();
    const source = await admin.databases.getDocument<KnowledgeSource>(
      APPWRITE_DATABASE,
      COLLECTION.KNOWLEDGE_SOURCES,
      sourceId
    );

    if (source.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    // Parse metadata to find the target version
    const metadata = (() => {
      try {
        return typeof source.metadata === 'string'
          ? JSON.parse(source.metadata as unknown as string)
          : source.metadata;
      } catch {
        return {};
      }
    })();

    const versionHistory: VersionInfo[] = metadata.versionHistory ?? [];
    const targetVersionInfo = versionHistory.find(
      (v) => v.version === targetVersion
    );

    if (!targetVersionInfo) {
      return {
        success: false,
        error: `Version ${targetVersion} not found in history`
      };
    }

    if (!targetVersionInfo.storageFileId) {
      return {
        success: false,
        error: `Version ${targetVersion} has no stored content for rollback`
      };
    }

    // 1. Get the old content
    const content = await getVersionContent(targetVersionInfo.storageFileId);
    if (!content) {
      return { success: false, error: 'Failed to retrieve version content' };
    }

    // 2. Mark as processing
    await admin.databases.updateDocument(
      APPWRITE_DATABASE,
      COLLECTION.KNOWLEDGE_SOURCES,
      sourceId,
      { status: 'processing' }
    );

    // 3. Delete current vectors
    await deleteVectorsBySource(tenantId, sourceId);

    // 4. Re-chunk and re-embed
    const chunks = splitTextIntoChunks(content, {
      chunkSize: 1000,
      chunkOverlap: 200
    });

    const BATCH_SIZE = 20;
    const allVectors: ChunkVector[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await generateEmbeddings(batch);

      for (let j = 0; j < batch.length; j++) {
        allVectors.push({
          id: `${sourceId}#v${targetVersion}#chunk-${i + j}`,
          values: embeddings[j],
          metadata: {
            sourceId,
            tenantId,
            chunkIndex: i + j,
            version: targetVersion,
            text: batch[j].slice(0, 1000)
          }
        });
      }
    }

    await upsertVectors(tenantId, allVectors);

    // 5. Update source document
    const newVersion = (source.version ?? 1) + 1;
    const updatedHistory = [
      ...versionHistory,
      {
        version: newVersion,
        createdAt: new Date().toISOString(),
        chunkCount: chunks.length,
        vectorCount: allVectors.length,
        storageFileId: targetVersionInfo.storageFileId,
        rollbackFrom: source.version,
        rollbackTo: targetVersion
      }
    ];

    await admin.databases.updateDocument(
      APPWRITE_DATABASE,
      COLLECTION.KNOWLEDGE_SOURCES,
      sourceId,
      {
        status: 'ready',
        version: newVersion,
        metadata: JSON.stringify({
          ...metadata,
          versionHistory: updatedHistory,
          chunksCount: chunks.length,
          vectorsCount: allVectors.length,
          processedAt: new Date().toISOString(),
          rolledBackFrom: source.version,
          rolledBackTo: targetVersion
        })
      }
    );

    // 6. Invalidate semantic cache
    await invalidateTenantCache(tenantId);

    logAuditEventAsync(tenantId, 'knowledge.rollback', {
      sourceId,
      fromVersion: source.version,
      toVersion: targetVersion,
      newVersion,
      chunks: chunks.length,
      vectors: allVectors.length
    });

    return { success: true };
  } catch (err) {
    console.error('rollbackVersionAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Rollback failed'
    };
  }
}
