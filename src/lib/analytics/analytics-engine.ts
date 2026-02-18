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
  /** Percentage of conversations resolved by AI (0-1). */
  resolutionRate: number;
  /** Average confidence score across all resolved conversations (0-1). */
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

  // ── Extended metrics (computed from real data) ────────────────────────

  /** First response time stats in minutes. */
  firstResponse: ResponseTimeStats;
  /** Resolution time stats in minutes. */
  resolutionTime: ResponseTimeStats;
  /** First response time per channel (minutes). */
  firstResponseByChannel: Record<string, number>;
  /** Resolution time per channel (minutes). */
  resolutionTimeByChannel: Record<string, number>;

  /** CSAT stats computed from csatScore field on conversations. */
  csat: CsatStats;

  /** Confidence distribution buckets. */
  confidenceDistribution: { high: number; medium: number; low: number };
  /** Per-conversation confidence scores for accuracy estimation. */
  confidenceScores: number[];

  /** Hourly conversation volume (0-23). */
  hourlyDistribution: number[];
  /** Day-of-week volume (0=Mon..6=Sun). */
  dailyDistribution: number[];
  /** Heatmap[day][hour] counts. */
  heatmap: number[][];

  /** Per-channel extended stats. */
  channelStats: ChannelStats[];

  /** Per-agent stats (from assignedTo). */
  agentStats: AgentStats[];

  /** Average resolution time for AI-only conversations (minutes). */
  aiResolutionTimeAvg: number;
  /** Average resolution time for human-assigned conversations (minutes). */
  humanResolutionTimeAvg: number;
}

export interface ResponseTimeStats {
  /** Median in minutes. */
  median: number;
  /** Average in minutes. */
  avg: number;
  /** 90th percentile in minutes. */
  p90: number;
  /** Distribution buckets. */
  distribution: { label: string; count: number; pct: number }[];
}

export interface CsatStats {
  /** Average score (1-5). */
  avgScore: number;
  /** Satisfaction rate: % of scores >= 4. */
  satisfactionRate: number;
  /** Total number of ratings received. */
  totalRatings: number;
  /** Breakdown: positive (4-5), neutral (3), negative (1-2). */
  positive: number;
  neutral: number;
  negative: number;
  /** AI-resolved CSAT avg. */
  aiCsatAvg: number;
  /** Human-resolved CSAT avg. */
  humanCsatAvg: number;
}

export interface ChannelStats {
  channel: string;
  volume: number;
  resolved: number;
  resolutionRate: number;
  avgFirstResponse: number;
  avgResolutionTime: number;
  avgCsat: number;
}

export interface AgentStats {
  agent: string;
  resolved: number;
  avgResolutionTime: number;
  avgCsat: number;
  active: number;
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

  // Fetch confidence scores for resolved conversations
  const resolvedConvIds = conversations
    .filter((c) => c.status === 'resolved')
    .map((c) => c.$id);

  const confidenceScores =
    resolvedConvIds.length > 0
      ? await fetchConfidenceScores(databases, resolvedConvIds.slice(0, 100))
      : [];

  const avgConfidence =
    confidenceScores.length > 0
      ? confidenceScores.reduce((s, c) => s + c, 0) / confidenceScores.length
      : 0;

  // Compute basic metrics
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

  // Top topics
  const topTopics = await extractTopTopics(
    databases,
    conversations.slice(0, 200)
  );

  // ── Extended: First response time ────────────────────────────────────
  const firstResponse = computeResponseTimes(conversations, 'firstResponseAt', [
    { label: 'Under 1 min', max: 1 },
    { label: '1–3 min', max: 3 },
    { label: '3–5 min', max: 5 },
    { label: '5–15 min', max: 15 },
    { label: 'Over 15 min', max: Infinity }
  ]);

  // ── Extended: Resolution time ────────────────────────────────────────
  const resolutionTime = computeResponseTimes(conversations, 'resolvedAt', [
    { label: 'Under 5 min', max: 5 },
    { label: '5–15 min', max: 15 },
    { label: '15–30 min', max: 30 },
    { label: '30–60 min', max: 60 },
    { label: 'Over 1 hour', max: Infinity }
  ]);

  // Per-channel timing
  const firstResponseByChannel = computeTimingByChannel(
    conversations,
    'firstResponseAt'
  );
  const resolutionTimeByChannel = computeTimingByChannel(
    conversations,
    'resolvedAt'
  );

  // ── Extended: CSAT ───────────────────────────────────────────────────
  const csat = computeCsat(conversations);

  // ── Extended: Confidence distribution ────────────────────────────────
  const high = confidenceScores.filter((c) => c >= 0.8).length;
  const medium = confidenceScores.filter((c) => c >= 0.6 && c < 0.8).length;
  const low = confidenceScores.filter((c) => c < 0.6).length;
  const confTotal = high + medium + low || 1;
  const confidenceDistribution = {
    high: Math.round((high / confTotal) * 100),
    medium: Math.round((medium / confTotal) * 100),
    low: Math.round((low / confTotal) * 100)
  };

  // ── Extended: Hourly / daily distribution ────────────────────────────
  const hourlyDistribution = new Array(24).fill(0);
  const dailyDistribution = new Array(7).fill(0);
  const heatmap: number[][] = Array.from({ length: 7 }, () =>
    new Array(24).fill(0)
  );

  for (const conv of conversations) {
    const d = new Date(conv.$createdAt);
    const hour = d.getUTCHours();
    const dayOfWeek = (d.getUTCDay() + 6) % 7; // Mon=0, Sun=6
    hourlyDistribution[hour]++;
    dailyDistribution[dayOfWeek]++;
    heatmap[dayOfWeek][hour]++;
  }

  // ── Extended: Per-channel stats ──────────────────────────────────────
  const channelStats = computeChannelStats(conversations);

  // ── Extended: Per-agent stats ────────────────────────────────────────
  const agentStats = computeAgentStats(conversations);

  // ── Extended: AI vs Human resolution time ────────────────────────────
  const aiResTimes = conversations
    .filter((c) => c.resolvedAt && !c.assignedTo)
    .map(
      (c) =>
        (new Date(c.resolvedAt!).getTime() - new Date(c.$createdAt).getTime()) /
        60000
    )
    .filter((m) => m >= 0 && m < 10080);
  const aiResolutionTimeAvg =
    aiResTimes.length > 0
      ? aiResTimes.reduce((s, d) => s + d, 0) / aiResTimes.length
      : 0;

  const humanResTimes = conversations
    .filter((c) => c.resolvedAt && c.assignedTo)
    .map(
      (c) =>
        (new Date(c.resolvedAt!).getTime() - new Date(c.$createdAt).getTime()) /
        60000
    )
    .filter((m) => m >= 0 && m < 10080);
  const humanResolutionTimeAvg =
    humanResTimes.length > 0
      ? humanResTimes.reduce((s, d) => s + d, 0) / humanResTimes.length
      : 0;

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
    topTopics,
    firstResponse,
    resolutionTime,
    firstResponseByChannel,
    resolutionTimeByChannel,
    csat,
    confidenceDistribution,
    confidenceScores,
    hourlyDistribution,
    dailyDistribution,
    heatmap,
    channelStats,
    agentStats,
    aiResolutionTimeAvg,
    humanResolutionTimeAvg
  };
}

// ---------------------------------------------------------------------------
// Extended compute helpers
// ---------------------------------------------------------------------------

function computeResponseTimes(
  conversations: Conversation[],
  timestampField: 'firstResponseAt' | 'resolvedAt',
  buckets: { label: string; max: number }[]
): ResponseTimeStats {
  const durations: number[] = [];

  for (const conv of conversations) {
    const ts = conv[timestampField];
    if (!ts) continue;
    const created = new Date(conv.$createdAt).getTime();
    const responded = new Date(ts).getTime();
    const minutes = (responded - created) / 60000;
    if (minutes >= 0 && minutes < 10080) {
      // Cap at 7 days to exclude stale data
      durations.push(minutes);
    }
  }

  if (durations.length === 0) {
    return {
      median: 0,
      avg: 0,
      p90: 0,
      distribution: buckets.map((b) => ({ label: b.label, count: 0, pct: 0 }))
    };
  }

  durations.sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)];
  const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
  const p90 = durations[Math.floor(durations.length * 0.9)];

  const distribution = buckets.map((bucket, i) => {
    const min = i === 0 ? 0 : buckets[i - 1].max;
    const count = durations.filter((d) => d >= min && d < bucket.max).length;
    return {
      label: bucket.label,
      count,
      pct: Math.round((count / durations.length) * 100)
    };
  });

  return { median, avg, p90, distribution };
}

function computeTimingByChannel(
  conversations: Conversation[],
  timestampField: 'firstResponseAt' | 'resolvedAt'
): Record<string, number> {
  const byChannel: Record<string, number[]> = {};

  for (const conv of conversations) {
    const ts = conv[timestampField];
    if (!ts) continue;
    const minutes =
      (new Date(ts).getTime() - new Date(conv.$createdAt).getTime()) / 60000;
    if (minutes < 0 || minutes >= 10080) continue;
    if (!byChannel[conv.channel]) byChannel[conv.channel] = [];
    byChannel[conv.channel].push(minutes);
  }

  const result: Record<string, number> = {};
  for (const [ch, durations] of Object.entries(byChannel)) {
    result[ch] = durations.reduce((s, d) => s + d, 0) / durations.length;
  }
  return result;
}

function computeCsat(conversations: Conversation[]): CsatStats {
  const rated = conversations.filter(
    (c) => c.csatScore != null && c.csatScore >= 1 && c.csatScore <= 5
  );

  if (rated.length === 0) {
    return {
      avgScore: 0,
      satisfactionRate: 0,
      totalRatings: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      aiCsatAvg: 0,
      humanCsatAvg: 0
    };
  }

  const scores = rated.map((c) => c.csatScore!);
  const avgScore = scores.reduce((s, c) => s + c, 0) / scores.length;
  const positive = scores.filter((s) => s >= 4).length;
  const neutral = scores.filter((s) => s === 3).length;
  const negative = scores.filter((s) => s <= 2).length;
  const satisfactionRate = (positive / scores.length) * 100;

  // AI vs Human CSAT
  const aiRated = rated.filter((c) => c.status === 'resolved' && !c.assignedTo);
  const humanRated = rated.filter((c) => c.assignedTo);
  const aiCsatAvg =
    aiRated.length > 0
      ? aiRated.reduce((s, c) => s + c.csatScore!, 0) / aiRated.length
      : 0;
  const humanCsatAvg =
    humanRated.length > 0
      ? humanRated.reduce((s, c) => s + c.csatScore!, 0) / humanRated.length
      : 0;

  return {
    avgScore,
    satisfactionRate,
    totalRatings: rated.length,
    positive,
    neutral,
    negative,
    aiCsatAvg,
    humanCsatAvg
  };
}

function computeChannelStats(conversations: Conversation[]): ChannelStats[] {
  const byChannel: Record<string, Conversation[]> = {};
  for (const conv of conversations) {
    if (!byChannel[conv.channel]) byChannel[conv.channel] = [];
    byChannel[conv.channel].push(conv);
  }

  return Object.entries(byChannel).map(([channel, convs]) => {
    const resolved = convs.filter((c) => c.status === 'resolved').length;
    const resolutionRate =
      convs.length > 0 ? (resolved / convs.length) * 100 : 0;

    // Avg first response
    const frTimes = convs
      .filter((c) => c.firstResponseAt)
      .map(
        (c) =>
          (new Date(c.firstResponseAt!).getTime() -
            new Date(c.$createdAt).getTime()) /
          60000
      )
      .filter((m) => m >= 0 && m < 10080);
    const avgFirstResponse =
      frTimes.length > 0
        ? frTimes.reduce((s, d) => s + d, 0) / frTimes.length
        : 0;

    // Avg resolution time
    const resTimes = convs
      .filter((c) => c.resolvedAt)
      .map(
        (c) =>
          (new Date(c.resolvedAt!).getTime() -
            new Date(c.$createdAt).getTime()) /
          60000
      )
      .filter((m) => m >= 0 && m < 10080);
    const avgResolutionTime =
      resTimes.length > 0
        ? resTimes.reduce((s, d) => s + d, 0) / resTimes.length
        : 0;

    // Avg CSAT
    const rated = convs.filter((c) => c.csatScore != null);
    const avgCsat =
      rated.length > 0
        ? rated.reduce((s, c) => s + c.csatScore!, 0) / rated.length
        : 0;

    return {
      channel,
      volume: convs.length,
      resolved,
      resolutionRate,
      avgFirstResponse,
      avgResolutionTime,
      avgCsat
    };
  });
}

function computeAgentStats(conversations: Conversation[]): AgentStats[] {
  const byAgent: Record<string, Conversation[]> = {};
  for (const conv of conversations) {
    if (!conv.assignedTo) continue;
    if (!byAgent[conv.assignedTo]) byAgent[conv.assignedTo] = [];
    byAgent[conv.assignedTo].push(conv);
  }

  return Object.entries(byAgent).map(([agent, convs]) => {
    const resolved = convs.filter((c) => c.status === 'resolved').length;
    const active = convs.filter(
      (c) => c.status === 'active' || c.status === 'escalated'
    ).length;

    const resTimes = convs
      .filter((c) => c.resolvedAt)
      .map(
        (c) =>
          (new Date(c.resolvedAt!).getTime() -
            new Date(c.$createdAt).getTime()) /
          60000
      )
      .filter((m) => m >= 0 && m < 10080);
    const avgResolutionTime =
      resTimes.length > 0
        ? resTimes.reduce((s, d) => s + d, 0) / resTimes.length
        : 0;

    const rated = convs.filter((c) => c.csatScore != null);
    const avgCsat =
      rated.length > 0
        ? rated.reduce((s, c) => s + c.csatScore!, 0) / rated.length
        : 0;

    return { agent, resolved, avgResolutionTime, avgCsat, active };
  });
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
