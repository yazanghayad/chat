/**
 * Content gap detector – identifies topics where the AI struggles
 * and generates suggested knowledge base articles.
 *
 * This is the core of the Fin "Flywheel" – the AI self-improvement loop.
 */

import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { ID, Query } from 'node-appwrite';
import { generateEmbedding } from '@/lib/ai/retrieval';
import type {
  Conversation,
  Message,
  ContentSuggestion
} from '@/types/appwrite';
import OpenAI from 'openai';
import { logAuditEventAsync } from '@/lib/audit/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UnresolvedQuery {
  conversationId: string;
  firstMessage: string;
  embedding?: number[];
}

interface QueryCluster {
  topic: string;
  queries: string[];
  count: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_UNRESOLVED_TO_ANALYZE = 200;
const SIMILARITY_THRESHOLD = 0.85; // Cosine similarity for grouping
const MIN_CLUSTER_SIZE = 2; // Minimum queries to form a suggestion

// ---------------------------------------------------------------------------
// Main detector
// ---------------------------------------------------------------------------

/**
 * Detect content gaps for a tenant by analysing recent escalated/unresolved
 * conversations, clustering similar queries, and generating draft articles.
 */
export async function detectContentGaps(
  tenantId: string,
  lookbackDays = 30
): Promise<ContentSuggestion[]> {
  const { databases } = createAdminClient();

  // 1. Fetch escalated conversations from the last N days
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);

  const conversations = await databases.listDocuments<Conversation>(
    APPWRITE_DATABASE,
    COLLECTION.CONVERSATIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('status', 'escalated'),
      Query.greaterThanEqual('$createdAt', since.toISOString()),
      Query.orderDesc('$createdAt'),
      Query.limit(MAX_UNRESOLVED_TO_ANALYZE)
    ]
  );

  if (conversations.documents.length === 0) {
    return [];
  }

  // 2. Get first user message from each conversation
  const unresolvedQueries: UnresolvedQuery[] = [];

  for (const conv of conversations.documents) {
    try {
      const msgs = await databases.listDocuments<Message>(
        APPWRITE_DATABASE,
        COLLECTION.MESSAGES,
        [
          Query.equal('conversationId', conv.$id),
          Query.equal('role', 'user'),
          Query.orderAsc('$createdAt'),
          Query.limit(1)
        ]
      );

      if (msgs.documents.length > 0) {
        unresolvedQueries.push({
          conversationId: conv.$id,
          firstMessage: msgs.documents[0].content
        });
      }
    } catch {
      // Skip individual failures
    }
  }

  if (unresolvedQueries.length < MIN_CLUSTER_SIZE) {
    return [];
  }

  // 3. Generate embeddings for clustering
  for (const query of unresolvedQueries) {
    try {
      query.embedding = await generateEmbedding(query.firstMessage);
    } catch {
      // Skip queries that fail to embed
    }
  }

  const queriesWithEmbeddings = unresolvedQueries.filter(
    (q) => q.embedding !== undefined
  );

  // 4. Cluster similar queries using cosine similarity
  const clusters = clusterQueries(queriesWithEmbeddings);

  // 5. Filter out existing suggestions (avoid duplicates)
  const existingSuggestions = await databases.listDocuments<ContentSuggestion>(
    APPWRITE_DATABASE,
    COLLECTION.CONTENT_SUGGESTIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('status', 'pending'),
      Query.limit(100)
    ]
  );
  const existingTopics = new Set(
    existingSuggestions.documents.map((s) => s.topic.toLowerCase())
  );

  const newClusters = clusters.filter(
    (c) => !existingTopics.has(c.topic.toLowerCase())
  );

  // 6. Generate draft articles for each cluster
  const suggestions: ContentSuggestion[] = [];

  for (const cluster of newClusters.slice(0, 10)) {
    try {
      const draftContent = await generateDraftArticle(cluster);

      const doc = await databases.createDocument<ContentSuggestion>(
        APPWRITE_DATABASE,
        COLLECTION.CONTENT_SUGGESTIONS,
        ID.unique(),
        {
          tenantId,
          topic: cluster.topic,
          frequency: cluster.count,
          exampleQueries: JSON.stringify(
            cluster.queries.slice(0, 5)
          ) as unknown as string[],
          suggestedContent: draftContent,
          status: 'pending'
        }
      );

      suggestions.push(doc);

      logAuditEventAsync(tenantId, 'suggestion.created', {
        suggestionId: doc.$id,
        topic: cluster.topic,
        frequency: cluster.count
      });
    } catch (err) {
      console.error('Failed to create suggestion:', err);
    }
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// Clustering (simple greedy cosine-similarity grouping)
// ---------------------------------------------------------------------------

function clusterQueries(queries: UnresolvedQuery[]): QueryCluster[] {
  const assigned = new Set<number>();
  const clusters: QueryCluster[] = [];

  for (let i = 0; i < queries.length; i++) {
    if (assigned.has(i)) continue;
    if (!queries[i].embedding) continue;

    const cluster: string[] = [queries[i].firstMessage];
    assigned.add(i);

    for (let j = i + 1; j < queries.length; j++) {
      if (assigned.has(j)) continue;
      if (!queries[j].embedding) continue;

      const similarity = cosineSimilarity(
        queries[i].embedding!,
        queries[j].embedding!
      );

      if (similarity >= SIMILARITY_THRESHOLD) {
        cluster.push(queries[j].firstMessage);
        assigned.add(j);
      }
    }

    if (cluster.length >= MIN_CLUSTER_SIZE) {
      // Generate a topic label from the first query (truncated)
      const topic = cluster[0].substring(0, 80).trim();
      clusters.push({
        topic,
        queries: cluster,
        count: cluster.length
      });
    }
  }

  // Sort by frequency (most common gaps first)
  return clusters.sort((a, b) => b.count - a.count);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// ---------------------------------------------------------------------------
// Draft article generation via LLM
// ---------------------------------------------------------------------------

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });
  }
  return _openai;
}

async function generateDraftArticle(cluster: QueryCluster): Promise<string> {
  const openai = getOpenAI();

  const exampleQuestions = cluster.queries
    .slice(0, 5)
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a technical writer creating help center articles. Write a clear, comprehensive article that would answer the following customer questions. Use markdown formatting with headers, bullet points, and step-by-step instructions where appropriate. Keep the tone professional and helpful.`
      },
      {
        role: 'user',
        content: `These are ${cluster.count} customer questions about the same topic that our AI couldn't answer:\n\n${exampleQuestions}\n\nWrite a help article that would answer all of these questions.`
      }
    ],
    max_tokens: 1500,
    temperature: 0.4
  });

  return response.choices[0]?.message?.content ?? '';
}
