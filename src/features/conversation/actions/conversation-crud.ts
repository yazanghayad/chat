'use server';

import { createSessionClient, createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query, ID } from 'node-appwrite';
import type {
  Conversation,
  ConversationStatus,
  Message
} from '@/types/appwrite';
import type { InboxCounts } from '@/features/inbox/components/inbox-page-client';

/**
 * Get conversation counts by channel and status for the inbox sidebar.
 */
export async function getInboxCountsAction(
  tenantId: string
): Promise<{ success: boolean; counts?: InboxCounts; error?: string }> {
  try {
    await createSessionClient();
    const { databases } = createAdminClient();

    // Fetch all conversations for this tenant (up to 5000)
    const result = await databases.listDocuments(
      APPWRITE_DATABASE,
      COLLECTION.CONVERSATIONS,
      [
        Query.equal('tenantId', tenantId),
        Query.limit(5000),
        Query.select(['status', 'channel'])
      ]
    );

    const docs = result.documents as unknown as Array<{
      status: string;
      channel: string;
    }>;

    const byChannel: Record<string, number> = {};
    let active = 0;
    let resolved = 0;
    let escalated = 0;

    for (const d of docs) {
      // Channel counts
      const ch = d.channel ?? 'web';
      byChannel[ch] = (byChannel[ch] ?? 0) + 1;

      // Status counts
      if (d.status === 'resolved') resolved++;
      else if (d.status === 'escalated') escalated++;
      else active++;
    }

    return {
      success: true,
      counts: {
        total: docs.length,
        active,
        resolved,
        escalated,
        byChannel
      }
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get inbox counts'
    };
  }
}

/**
 * List conversations for a tenant with optional filters.
 */
export async function listConversationsAction(
  tenantId: string,
  options?: {
    status?: ConversationStatus;
    channel?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{
  success: boolean;
  conversations?: Conversation[];
  total?: number;
  error?: string;
}> {
  try {
    await createSessionClient();
    const { databases } = createAdminClient();

    const queries = [
      Query.equal('tenantId', tenantId),
      Query.orderDesc('$createdAt'),
      Query.limit(options?.limit ?? 25),
      Query.offset(options?.offset ?? 0)
    ];

    if (options?.status) {
      queries.push(Query.equal('status', options.status));
    }
    if (options?.channel) {
      queries.push(Query.equal('channel', options.channel));
    }

    const result = await databases.listDocuments(
      APPWRITE_DATABASE,
      COLLECTION.CONVERSATIONS,
      queries
    );

    return {
      success: true,
      conversations: result.documents.map((d) =>
        JSON.parse(JSON.stringify(d))
      ) as Conversation[],
      total: result.total
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to list conversations'
    };
  }
}

/**
 * Get a single conversation by ID.
 */
export async function getConversationAction(
  conversationId: string,
  tenantId: string
): Promise<{
  success: boolean;
  conversation?: Conversation;
  error?: string;
}> {
  try {
    await createSessionClient();
    const { databases } = createAdminClient();

    const doc = await databases.getDocument(
      APPWRITE_DATABASE,
      COLLECTION.CONVERSATIONS,
      conversationId
    );

    if ((doc as unknown as Conversation).tenantId !== tenantId) {
      return { success: false, error: 'Not found' };
    }

    return {
      success: true,
      conversation: JSON.parse(JSON.stringify(doc)) as Conversation
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get conversation'
    };
  }
}

/**
 * Get messages for a conversation.
 */
export async function listMessagesAction(
  conversationId: string,
  tenantId: string
): Promise<{
  success: boolean;
  messages?: Message[];
  error?: string;
}> {
  try {
    await createSessionClient();
    const { databases } = createAdminClient();

    // Verify conversation belongs to tenant
    const convo = await databases.getDocument(
      APPWRITE_DATABASE,
      COLLECTION.CONVERSATIONS,
      conversationId
    );
    if ((convo as unknown as Conversation).tenantId !== tenantId) {
      return { success: false, error: 'Not found' };
    }

    const result = await databases.listDocuments(
      APPWRITE_DATABASE,
      COLLECTION.MESSAGES,
      [
        Query.equal('conversationId', conversationId),
        Query.orderAsc('$createdAt'),
        Query.limit(100)
      ]
    );

    return {
      success: true,
      messages: result.documents.map((d) =>
        JSON.parse(JSON.stringify(d))
      ) as Message[]
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to list messages'
    };
  }
}

/**
 * Update conversation status (resolve / escalate / reopen).
 */
export async function updateConversationStatusAction(
  conversationId: string,
  tenantId: string,
  status: ConversationStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await createSessionClient();
    const { databases } = createAdminClient();

    const convo = await databases.getDocument(
      APPWRITE_DATABASE,
      COLLECTION.CONVERSATIONS,
      conversationId
    );
    if ((convo as unknown as Conversation).tenantId !== tenantId) {
      return { success: false, error: 'Not found' };
    }

    const update: Record<string, unknown> = { status };
    if (status === 'resolved') {
      update.resolvedAt = new Date().toISOString();
    }

    await databases.updateDocument(
      APPWRITE_DATABASE,
      COLLECTION.CONVERSATIONS,
      conversationId,
      update
    );

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Failed to update conversation'
    };
  }
}

/**
 * Save an agent (human) reply message to a conversation.
 * This bypasses the AI orchestrator — it's a direct write.
 */
export async function saveAgentReplyAction(input: {
  conversationId: string;
  tenantId: string;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    await createSessionClient();
    const { databases } = createAdminClient();

    // Verify conversation belongs to tenant
    const convo = await databases.getDocument(
      APPWRITE_DATABASE,
      COLLECTION.CONVERSATIONS,
      input.conversationId
    );
    if ((convo as unknown as Conversation).tenantId !== input.tenantId) {
      return { success: false, error: 'Not found' };
    }

    // Create the message
    const doc = await databases.createDocument(
      APPWRITE_DATABASE,
      COLLECTION.MESSAGES,
      ID.unique(),
      {
        conversationId: input.conversationId,
        role: 'assistant',
        content: input.content,
        confidence: 1,
        citations: JSON.stringify([]),
        metadata: JSON.stringify(input.metadata ?? {})
      }
    );

    // Track first response time if not set
    if (!(convo as unknown as Conversation).firstResponseAt) {
      await databases.updateDocument(
        APPWRITE_DATABASE,
        COLLECTION.CONVERSATIONS,
        input.conversationId,
        { firstResponseAt: new Date().toISOString() }
      );
    }

    return { success: true, messageId: doc.$id };
  } catch (err) {
    console.error('saveAgentReplyAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save reply'
    };
  }
}
