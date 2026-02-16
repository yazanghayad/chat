/**
 * Analytics engine – aggregate conversation metrics for the dashboard.
 */

import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query, type Models } from 'node-appwrite';
import type { Conversation, Message } from '@/types/appwrite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsMetrics {
  /** Percentage of conversations resolved by AI. */
  resolutionRate: number;
  /** Average confidence score across all resolved conversations. */
  avgConfidence: number;
  /** Total conversations in the period. */
  totalConversations: number;
  /** Total resolved by AI. */
  totalResolved: number;
  /** Total escalated to human. */
  totalEscalated: number;
  /** Total still active. */
  totalActive: number;
  /** Breakdown by channel. */
  channelBreakdown: Record<string, number>;
  /** Breakdown by status. */
  statusBreakdown: Record<string, number>;
  /** Time series data (daily counts). */
  timeseries: TimeseriesPoint[];
  /** Top topics from first messages. */
  topTopics: TopicEntry[];
}

export interface TimeseriesPoint {
  date: string; // ISO date (YYYY-MM-DD)
  total: number;
  resolved: number;
  escalated: number;
}

export interface TopicEntry {
  topic: string;
  count: number;
  avgConfidence: number;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Fetch analytics for a tenant within a date range.
 */
export async function getAnalytics(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsMetrics> {
  const { databases } = createAdminClient();

  // Fetch all conversations in range
  const conversations = await fetchAllPaginated<Conversation>(
    databases,
    COLLECTION.CONVERSATIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.greaterThanEqual('$createdAt', startDate.toISOString()),
      Query.lessThanEqual('$createdAt', endDate.toISOString())
    ]
  );

  // Fetch all messages for resolved conversations to compute avg confidence
  const resolvedConvIds = conversations
    .filter((c) => c.status === 'resolved')
    .map((c) => c.$id);

  let avgConfidence = 0;
  if (resolvedConvIds.length > 0) {
    const confidenceScores = await fetchConfidenceScores(
      databases,
      resolvedConvIds.slice(0, 100) // Limit for performance
    );
    avgConfidence =
      confidenceScores.length > 0
        ? confidenceScores.reduce((s, c) => s + c, 0) / confidenceScores.length
        : 0;
  }

  // Compute metrics
  const totalConversations = conversations.length;
  const totalResolved = conversations.filter(
    (c) => c.status === 'resolved'
  ).length;
  const totalEscalated = conversations.filter(
    (c) => c.status === 'escalated'
  ).length;
  const totalActive = conversations.filter((c) => c.status === 'active').length;

  const resolutionRate =
    totalConversations > 0 ? totalResolved / totalConversations : 0;

  // Channel breakdown
  const channelBreakdown: Record<string, number> = {};
  for (const conv of conversations) {
    channelBreakdown[conv.channel] = (channelBreakdown[conv.channel] ?? 0) + 1;
  }

  // Status breakdown
  const statusBreakdown: Record<string, number> = {
    active: totalActive,
    resolved: totalResolved,
    escalated: totalEscalated
  };

  // Time series (daily)
  const timeseries = buildTimeseries(conversations, startDate, endDate);

  // Top topics (from first messages of escalated conversations – these are the gaps)
  const topTopics = await extractTopTopics(
    databases,
    conversations.slice(0, 200)
  );

  return {
    resolutionRate,
    avgConfidence,
    totalConversations,
    totalResolved,
    totalEscalated,
    totalActive,
    channelBreakdown,
    statusBreakdown,
    timeseries,
    topTopics
  };
}

// ---------------------------------------------------------------------------
// Helper: paginated fetch
// ---------------------------------------------------------------------------

async function fetchAllPaginated<T extends Models.Document>(
  databases: ReturnType<typeof createAdminClient>['databases'],
  collectionId: string,
  queries: string[],
  maxDocs = 500
): Promise<T[]> {
  const allDocs: T[] = [];
  let offset = 0;
  const batchSize = 100;

  while (offset < maxDocs) {
    const result = await databases.listDocuments<T>(
      APPWRITE_DATABASE,
      collectionId,
      [...queries, Query.limit(batchSize), Query.offset(offset)]
    );

    allDocs.push(...result.documents);

    if (result.documents.length < batchSize) break;
    offset += batchSize;
  }

  return allDocs;
}

// ---------------------------------------------------------------------------
// Helper: confidence scores
// ---------------------------------------------------------------------------

async function fetchConfidenceScores(
  databases: ReturnType<typeof createAdminClient>['databases'],
  conversationIds: string[]
): Promise<number[]> {
  const scores: number[] = [];

  // Fetch in batches
  for (let i = 0; i < conversationIds.length; i += 25) {
    const batch = conversationIds.slice(i, i + 25);

    for (const convId of batch) {
      try {
        const msgs = await databases.listDocuments<Message>(
          APPWRITE_DATABASE,
          COLLECTION.MESSAGES,
          [
            Query.equal('conversationId', convId),
            Query.equal('role', 'assistant'),
            Query.orderDesc('$createdAt'),
            Query.limit(1)
          ]
        );

        if (msgs.documents.length > 0 && msgs.documents[0].confidence) {
          scores.push(msgs.documents[0].confidence);
        }
      } catch {
        // Skip individual failures
      }
    }
  }

  return scores;
}

// ---------------------------------------------------------------------------
// Helper: time series
// ---------------------------------------------------------------------------

function buildTimeseries(
  conversations: Conversation[],
  startDate: Date,
  endDate: Date
): TimeseriesPoint[] {
  const days: Record<
    string,
    { total: number; resolved: number; escalated: number }
  > = {};

  // Initialize all dates
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateKey = current.toISOString().split('T')[0];
    days[dateKey] = { total: 0, resolved: 0, escalated: 0 };
    current.setDate(current.getDate() + 1);
  }

  // Populate counts
  for (const conv of conversations) {
    const dateKey = conv.$createdAt.split('T')[0];
    if (days[dateKey]) {
      days[dateKey].total++;
      if (conv.status === 'resolved') days[dateKey].resolved++;
      if (conv.status === 'escalated') days[dateKey].escalated++;
    }
  }

  return Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      ...data
    }));
}

// ---------------------------------------------------------------------------
// Helper: top topics
// ---------------------------------------------------------------------------

async function extractTopTopics(
  databases: ReturnType<typeof createAdminClient>['databases'],
  conversations: Conversation[]
): Promise<TopicEntry[]> {
  // Fetch first user message of each conversation
  const topicCounts: Record<
    string,
    { count: number; totalConfidence: number }
  > = {};

  for (const conv of conversations.slice(0, 100)) {
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
        // Simple topic extraction: first 60 chars as topic
        const firstMessage = msgs.documents[0].content;
        const topic = firstMessage.substring(0, 60).trim();

        if (!topicCounts[topic]) {
          topicCounts[topic] = { count: 0, totalConfidence: 0 };
        }
        topicCounts[topic].count++;

        // Get assistant confidence for this conversation
        const assistantMsgs = await databases.listDocuments<Message>(
          APPWRITE_DATABASE,
          COLLECTION.MESSAGES,
          [
            Query.equal('conversationId', conv.$id),
            Query.equal('role', 'assistant'),
            Query.orderDesc('$createdAt'),
            Query.limit(1)
          ]
        );
        if (assistantMsgs.documents.length > 0) {
          topicCounts[topic].totalConfidence +=
            assistantMsgs.documents[0].confidence ?? 0;
        }
      }
    } catch {
      // Skip
    }
  }

  return Object.entries(topicCounts)
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      avgConfidence: data.count > 0 ? data.totalConfidence / data.count : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}
