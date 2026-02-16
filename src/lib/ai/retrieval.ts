/**
 * Vector search – Pinecone integration with OpenAI embeddings.
 *
 * Each tenant gets its own namespace in the Pinecone index to ensure
 * multi-tenant data isolation.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// ---------------------------------------------------------------------------
// Singletons (reused across requests in the same process)
// ---------------------------------------------------------------------------

let _pinecone: Pinecone | null = null;
let _openai: OpenAI | null = null;

function getPinecone(): Pinecone {
  if (!_pinecone) {
    _pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY ?? ''
    });
  }
  return _pinecone;
}

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });
  }
  return _openai;
}

const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMENSIONS = 3072;
const INDEX_NAME = process.env.PINECONE_INDEX ?? 'support-ai';

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

/**
 * Generate an embedding vector for the given text using OpenAI.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS
  });
  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single API call.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS
  });
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

// ---------------------------------------------------------------------------
// Pinecone upsert
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
 * Upsert chunk vectors into Pinecone under a tenant namespace.
 */
export async function upsertVectors(
  tenantId: string,
  vectors: ChunkVector[]
): Promise<void> {
  const pinecone = getPinecone();
  const index = pinecone.index(INDEX_NAME);
  const ns = index.namespace(tenantId);

  // Pinecone supports up to 100 vectors per upsert call
  const BATCH_SIZE = 100;
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    await ns.upsert({
      records: batch as Parameters<typeof ns.upsert>[0]['records']
    });
  }
}

/**
 * Delete all vectors for a specific source (by metadata filter or prefix).
 */
export async function deleteVectorsBySource(
  tenantId: string,
  sourceId: string
): Promise<void> {
  const pinecone = getPinecone();
  const index = pinecone.index(INDEX_NAME);
  const ns = index.namespace(tenantId);

  await ns.deleteMany({ filter: { sourceId } });
}

// ---------------------------------------------------------------------------
// Pinecone query (used later in Fas 4, but exposed here)
// ---------------------------------------------------------------------------

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

/**
 * Query the vector index for the most relevant chunks.
 */
export async function vectorSearch(
  tenantId: string,
  query: string,
  topK = 5
): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);

  const pinecone = getPinecone();
  const index = pinecone.index(INDEX_NAME);
  const ns = index.namespace(tenantId);

  const results = await ns.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true
  });

  return (results.matches ?? []).map((m) => ({
    id: m.id,
    score: m.score ?? 0,
    metadata: (m.metadata as Record<string, unknown>) ?? {}
  }));
}
