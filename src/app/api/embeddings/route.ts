import { NextRequest, NextResponse } from 'next/server';
import { APPWRITE_BUCKET, APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { createAdminClient } from '@/lib/appwrite/server';
import { COLLECTION } from '@/lib/appwrite/collections';
import { extractTextFromFile, extractTextFromURL } from '@/lib/ai/extraction';
import { splitTextIntoChunks } from '@/lib/ai/chunking';
import {
  generateEmbeddings,
  upsertVectors,
  type ChunkVector
} from '@/lib/ai/retrieval';
import { Storage } from 'node-appwrite';

interface EmbeddingJobBody {
  sourceId: string;
  tenantId: string;
  type: 'file' | 'url';
  fileId?: string;
  fileName?: string;
  url?: string;
}

/**
 * POST /api/embeddings
 *
 * Background embedding job: extracts text from a file or URL, chunks it,
 * generates embeddings via OpenAI, and upserts them into Pinecone.
 *
 * Updates the knowledge_source status to 'ready' or 'failed'.
 */
export async function POST(request: NextRequest) {
  let body: EmbeddingJobBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sourceId, tenantId, type, fileId, fileName, url } = body;

  if (!sourceId || !tenantId || !type) {
    return NextResponse.json(
      { error: 'Missing required fields: sourceId, tenantId, type' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  try {
    // 1. Extract text
    let text: string;

    if (type === 'file') {
      if (!fileId || !fileName) {
        throw new Error('fileId and fileName required for file type');
      }

      const storage = new Storage(admin.client);
      const fileBuffer = await storage.getFileDownload(APPWRITE_BUCKET, fileId);

      // The SDK returns an ArrayBuffer
      const buffer = Buffer.from(fileBuffer);
      text = await extractTextFromFile(buffer, fileName);
    } else if (type === 'url') {
      if (!url) {
        throw new Error('url required for url type');
      }
      text = await extractTextFromURL(url);
    } else {
      throw new Error(`Unsupported type: ${type}`);
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the source');
    }

    // 2. Chunk the text
    const chunks = splitTextIntoChunks(text, {
      chunkSize: 1000,
      chunkOverlap: 200
    });

    if (chunks.length === 0) {
      throw new Error('Text splitting produced no chunks');
    }

    // 3. Generate embeddings (batch – max ~8k tokens per batch for safety)
    const BATCH_SIZE = 20;
    const allVectors: ChunkVector[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await generateEmbeddings(batch);

      for (let j = 0; j < batch.length; j++) {
        allVectors.push({
          id: `${sourceId}#chunk-${i + j}`,
          values: embeddings[j],
          metadata: {
            sourceId,
            tenantId,
            chunkIndex: i + j,
            text: batch[j].slice(0, 1000), // store truncated text for retrieval
            ...(fileName ? { fileName } : {}),
            ...(url ? { url } : {})
          }
        });
      }
    }

    // 4. Upsert into Pinecone (tenant namespace)
    await upsertVectors(tenantId, allVectors);

    // 5. Update source status to 'ready'
    await admin.databases.updateDocument(
      APPWRITE_DATABASE,
      COLLECTION.KNOWLEDGE_SOURCES,
      sourceId,
      {
        status: 'ready',
        metadata: JSON.stringify({
          ...(fileName ? { fileName } : {}),
          ...(url ? { originalUrl: url } : {}),
          chunksCount: chunks.length,
          vectorsCount: allVectors.length,
          processedAt: new Date().toISOString()
        })
      }
    );

    return NextResponse.json({
      success: true,
      chunks: chunks.length,
      vectors: allVectors.length
    });
  } catch (err) {
    console.error('Embedding job failed:', err);

    // Mark source as failed
    try {
      await admin.databases.updateDocument(
        APPWRITE_DATABASE,
        COLLECTION.KNOWLEDGE_SOURCES,
        sourceId,
        {
          status: 'failed',
          metadata: JSON.stringify({
            error: err instanceof Error ? err.message : 'Unknown error',
            failedAt: new Date().toISOString()
          })
        }
      );
    } catch (updateErr) {
      console.error('Failed to update source status:', updateErr);
    }

    return NextResponse.json(
      {
        error: 'Embedding job failed',
        details: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
