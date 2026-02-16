/**
 * Vector search – NVIDIA embeddings + Appwrite storage.
 *
 * Stores embedding vectors as JSON in Appwrite's `vectors` collection.
 * Performs cosine similarity search in-process after fetching all tenant
 * vectors. Designed for small-to-medium knowledge bases (< 50k chunks).
 *
 * No Pinecone or any external vector DB required.
 */

import { Query } from 'node-appwrite';
import { getAIClient, getEmbeddingModel } from './client';
import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';

// ---------------------------------------------------------------------------
// Embedding dimensions (NVIDIA nv-embedqa-e5-v5 = 1024)
// ---------------------------------------------------------------------------

const EMBEDDING_DIMENSIONS = 1024;

// ---------------------------------------------------------------------------
// Embeddings (NVIDIA API – OpenAI-compatible)
// ---------------------------------------------------------------------------

/**
 * Generate an embedding vector for the given text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getAIClient();
  const response = await client.embeddings.create({
    model: getEmbeddingModel(),
    input: text,
    dimensions: EMBEDDING_DIMENSIONS
  });
  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single API call.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getAIClient();
  const response = await client.embeddings.create({
    model: getEmbeddingModel(),
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS
  });
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

// ---------------------------------------------------------------------------
// Appwrite vector storage
// ---------------------------------------------------------------------------

export interface ChunkVector {
  /** Unique identifier for the vector (e.g. `sourceId#chunk-0`). */
  id: string;
  /** The embedding vector. */
  values: number[];
  /** Metadata stored alongside the vector. */
  metadata: Record<
    string,
    string | number | boolean | string[] | number[] | boolean[]
  >;
}

/**
 * Upsert chunk vectors into Appwrite under a tenant.
 */
export async function upsertVectors(
  tenantId: string,
  vectors: ChunkVector[]
): Promise<void> {
  const { databases } = await createAdminClient();

  // Batch writes – parallelize within each batch
  const BATCH_SIZE = 25;
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((v) =>
        databases.createDocument(
          APPWRITE_DATABASE,
          COLLECTION.VECTORS,
          v.id.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 36),
          {
            tenantId,
            vectorId: v.id,
            sourceId: String(v.metadata.sourceId ?? ''),
            text: String(v.metadata.text ?? '').slice(0, 10000),
            embedding: JSON.stringify(v.values),
            metadata: JSON.stringify(v.metadata)
          }
        )
      )
    );
  }
}

/**
 * Delete all vectors for a specific knowledge source.
 */
export async function deleteVectorsBySource(
  tenantId: string,
  sourceId: string
): Promise<void> {
  const { databases } = await createAdminClient();

  let cursor: string | undefined;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const queries = [
      Query.equal('tenantId', tenantId),
      Query.equal('sourceId', sourceId),
      Query.limit(100)
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const batch = await databases.listDocuments(
      APPWRITE_DATABASE,
      COLLECTION.VECTORS,
      queries
    );

    if (batch.documents.length === 0) break;

    await Promise.all(
      batch.documents.map((doc) =>
        databases.deleteDocument(APPWRITE_DATABASE, COLLECTION.VECTORS, doc.$id)
      )
    );

    if (batch.documents.length < 100) break;
    cursor = batch.documents[batch.documents.length - 1].$id;
  }
}

// ---------------------------------------------------------------------------
// Vector search (cosine similarity)
// ---------------------------------------------------------------------------

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

/**
 * Query tenant vectors for the most relevant chunks via cosine similarity.
 */
export async function vectorSearch(
  tenantId: string,
  query: string,
  topK = 5
): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);

  // Fetch all tenant vectors from Appwrite
  const { databases } = await createAdminClient();
  const allDocs: Array<{
    vectorId: string;
    embedding: string;
    metadata: string;
  }> = [];

  let cursor: string | undefined;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const queries = [Query.equal('tenantId', tenantId), Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const batch = await databases.listDocuments(
      APPWRITE_DATABASE,
      COLLECTION.VECTORS,
      queries
    );

    for (const doc of batch.documents) {
      allDocs.push(doc as unknown as (typeof allDocs)[0]);
    }

    if (batch.documents.length < 100) break;
    cursor = batch.documents[batch.documents.length - 1].$id;
  }

  if (allDocs.length === 0) return [];

  // Score each vector by cosine similarity
  const scored = allDocs.map((doc) => {
    const embedding: number[] = JSON.parse(doc.embedding);
    const score = cosineSimilarity(queryEmbedding, embedding);
    const metadata: Record<string, unknown> = JSON.parse(doc.metadata);
    return { id: doc.vectorId, score, metadata };
  });

  // Sort descending by score and return top K
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// ---------------------------------------------------------------------------
// Cosine similarity
// ---------------------------------------------------------------------------

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
