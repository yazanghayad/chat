/**
 * Inngest background functions.
 *
 * Durable, retryable functions that replace fire-and-forget fetch calls
 * for long-running operations (chunking, embedding, cache invalidation).
 */

import { inngest } from './client';
import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { splitTextIntoChunks } from '@/lib/ai/chunking';
import {
  generateEmbeddings,
  upsertVectors,
  deleteVectorsBySource,
  type ChunkVector
} from '@/lib/ai/retrieval';
import { extractTextFromFile, extractTextFromURL } from '@/lib/ai/extraction';
import { invalidateTenantCache } from '@/lib/cache/semantic-cache';
import { logAuditEventAsync } from '@/lib/audit/logger';

// ---------------------------------------------------------------------------
// Types for events
// ---------------------------------------------------------------------------

type KnowledgeChunkEmbedEvent = {
  name: 'knowledge/chunk-and-embed';
  data: {
    sourceId: string;
    tenantId: string;
    type: 'url' | 'file' | 'manual';
    url?: string;
    fileId?: string;
    content?: string;
    title?: string;
    version?: number;
  };
};

type CacheInvalidateEvent = {
  name: 'cache/invalidate-tenant';
  data: {
    tenantId: string;
  };
};

type GapDetectionEvent = {
  name: 'cron/detect-gaps';
  data: {
    tenantId?: string;
  };
};

// Union type for all events
export type SupportAIEvents =
  | KnowledgeChunkEmbedEvent
  | CacheInvalidateEvent
  | GapDetectionEvent;

// ---------------------------------------------------------------------------
// Function: knowledge/chunk-and-embed
// ---------------------------------------------------------------------------

export const chunkAndEmbed = inngest.createFunction(
  {
    id: 'knowledge-chunk-and-embed',
    retries: 3,
    concurrency: [{ limit: 5 }]
  },
  { event: 'knowledge/chunk-and-embed' },
  async ({ event, step }) => {
    const { sourceId, tenantId, type, url, fileId, content, title, version } =
      event.data;

    const admin = createAdminClient();

    // Step 1: Extract text
    const text = await step.run('extract-text', async () => {
      switch (type) {
        case 'url': {
          if (!url) throw new Error('URL is required for url type');
          return extractTextFromURL(url);
        }
        case 'file': {
          if (!fileId) throw new Error('fileId is required for file type');
          // Download file from Appwrite Storage, then extract text
          const { Storage } = await import('node-appwrite');
          const { APPWRITE_BUCKET } = await import('@/lib/appwrite/constants');
          const storage = new Storage(admin.client);
          const fileData = await storage.getFileDownload(
            APPWRITE_BUCKET,
            fileId
          );
          const buffer = Buffer.from(
            fileData instanceof ArrayBuffer ? fileData : fileData
          );
          const fileName = title ?? 'unknown.txt';
          return extractTextFromFile(buffer, fileName);
        }
        case 'manual': {
          if (!content) throw new Error('Content is required for manual type');
          return content;
        }
        default:
          throw new Error(`Unknown source type: ${type}`);
      }
    });

    // Step 2: Chunk text
    const chunks = await step.run('chunk-text', async () => {
      const result = splitTextIntoChunks(text, {
        chunkSize: 1000,
        chunkOverlap: 200
      });

      if (result.length === 0) {
        throw new Error('Text splitting produced no chunks');
      }

      return result;
    });

    // Step 3: Delete old vectors (if re-processing)
    await step.run('delete-old-vectors', async () => {
      await deleteVectorsBySource(tenantId, sourceId);
    });

    // Step 4: Generate embeddings and upsert in batches
    const vectorCount = await step.run('embed-and-upsert', async () => {
      const BATCH_SIZE = 20;
      const allVectors: ChunkVector[] = [];

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const embeddings = await generateEmbeddings(batch);

        for (let j = 0; j < batch.length; j++) {
          const vectorId = version
            ? `${sourceId}#v${version}#chunk-${i + j}`
            : `${sourceId}#chunk-${i + j}`;

          allVectors.push({
            id: vectorId,
            values: embeddings[j],
            metadata: {
              sourceId,
              tenantId,
              chunkIndex: i + j,
              text: batch[j].slice(0, 1000),
              ...(version != null ? { version } : {}),
              ...(title ? { title } : {}),
              ...(url ? { url } : {})
            }
          });
        }
      }

      await upsertVectors(tenantId, allVectors);
      return allVectors.length;
    });

    // Step 5: Update source status to ready
    await step.run('update-status', async () => {
      await admin.databases.updateDocument(
        APPWRITE_DATABASE,
        COLLECTION.KNOWLEDGE_SOURCES,
        sourceId,
        {
          status: 'ready',
          metadata: JSON.stringify({
            title: title ?? url ?? 'file',
            chunksCount: chunks.length,
            vectorsCount: vectorCount,
            processedAt: new Date().toISOString()
          })
        }
      );

      logAuditEventAsync(tenantId, 'knowledge.processed', {
        sourceId,
        type,
        chunks: chunks.length,
        vectors: vectorCount
      });
    });

    // Step 6: Invalidate semantic cache
    await step.run('invalidate-cache', async () => {
      await invalidateTenantCache(tenantId);
    });

    return {
      sourceId,
      chunks: chunks.length,
      vectors: vectorCount
    };
  }
);

// ---------------------------------------------------------------------------
// Function: cache/invalidate-tenant
// ---------------------------------------------------------------------------

export const invalidateCache = inngest.createFunction(
  {
    id: 'cache-invalidate-tenant',
    retries: 2
  },
  { event: 'cache/invalidate-tenant' },
  async ({ event }) => {
    const { tenantId } = event.data;
    const deleted = await invalidateTenantCache(tenantId);
    return { tenantId, keysDeleted: deleted };
  }
);

// ---------------------------------------------------------------------------
// Exported list of all functions for the serve handler
// ---------------------------------------------------------------------------

export const inngestFunctions = [chunkAndEmbed, invalidateCache];
