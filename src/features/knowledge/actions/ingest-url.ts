'use server';

import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { createAdminClient, createSessionClient } from '@/lib/appwrite/server';
import { COLLECTION } from '@/lib/appwrite/collections';
import { ID } from 'node-appwrite';

/**
 * Ingest a URL: create knowledge_source record and trigger background
 * scraping + embedding.
 */
export async function ingestUrlAction(
  tenantId: string,
  url: string
): Promise<{ success: boolean; sourceId?: string; error?: string }> {
  try {
    // Validate session
    const { account } = await createSessionClient();
    await account.get();

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return { success: false, error: 'Invalid URL' };
    }

    const admin = createAdminClient();

    // Create knowledge_source document
    const source = await admin.databases.createDocument(
      APPWRITE_DATABASE,
      COLLECTION.KNOWLEDGE_SOURCES,
      ID.unique(),
      {
        tenantId,
        type: 'url',
        url,
        fileId: null,
        status: 'processing',
        version: 1,
        metadata: JSON.stringify({ originalUrl: url })
      }
    );

    // Trigger background embedding job
    triggerEmbeddingJob(source.$id, tenantId, url).catch((err) =>
      console.error('Failed to trigger embedding job:', err)
    );

    return { success: true, sourceId: source.$id };
  } catch (err) {
    console.error('ingestUrlAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'URL ingestion failed'
    };
  }
}

/**
 * Trigger the embedding job via Inngest (preferred) or fallback to API route.
 */
async function triggerEmbeddingJob(
  sourceId: string,
  tenantId: string,
  url: string
): Promise<void> {
  try {
    const { inngest } = await import('@/lib/inngest/client');
    await inngest.send({
      name: 'knowledge/chunk-and-embed',
      data: {
        sourceId,
        tenantId,
        type: 'url' as const,
        url,
        version: 1
      }
    });
    return;
  } catch {
    // Inngest not available, fall back to API
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceId,
      tenantId,
      url,
      type: 'url'
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Embedding API returned ${response.status}: ${body}`);
  }
}
