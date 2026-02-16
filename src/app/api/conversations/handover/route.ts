/**
 * Conversation handover API.
 *
 * POST /api/conversations/handover – Initiate handover to human agent
 *
 * Session-authenticated (dashboard).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient, createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query } from 'node-appwrite';
import { z } from 'zod';
import type { Tenant, Conversation, Message } from '@/types/appwrite';
import { logAuditEventAsync } from '@/lib/audit/logger';

const handoverSchema = z.object({
  conversationId: z.string().min(1),
  agentId: z.string().optional(),
  note: z.string().max(2000).optional()
});

const completeSchema = z.object({
  conversationId: z.string().min(1),
  resolution: z.string().max(2000).optional()
});

// ---------------------------------------------------------------------------
// POST – Initiate or complete handover
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Authenticate
  let tenant: Tenant;
  let userId: string;
  try {
    const { account, databases } = await createSessionClient();
    const user = await account.get();
    userId = user.$id;

    const result = await databases.listDocuments<Tenant>(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      [Query.equal('userId', user.$id), Query.limit(1)]
    );

    if (result.documents.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    tenant = result.documents[0];
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Determine action from body
  const action = (body as Record<string, unknown>)?.action;

  if (action === 'complete') {
    return completeHandover(body, tenant, userId);
  }

  return initiateHandover(body, tenant, userId);
}

// ---------------------------------------------------------------------------
// Initiate handover
// ---------------------------------------------------------------------------

async function initiateHandover(
  body: unknown,
  tenant: Tenant,
  userId: string
): Promise<NextResponse> {
  const parsed = handoverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { conversationId, agentId, note } = parsed.data;
  const { databases } = createAdminClient();

  // Verify conversation belongs to tenant
  const conversation = await databases.getDocument<Conversation>(
    APPWRITE_DATABASE,
    COLLECTION.CONVERSATIONS,
    conversationId
  );

  if (conversation.tenantId !== tenant.$id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Fetch last N messages for handover context
  const messagesResult = await databases.listDocuments<Message>(
    APPWRITE_DATABASE,
    COLLECTION.MESSAGES,
    [
      Query.equal('conversationId', conversationId),
      Query.orderDesc('$createdAt'),
      Query.limit(20)
    ]
  );

  const handoverContext = messagesResult.documents.reverse().map((m) => ({
    role: m.role,
    content: m.content,
    timestamp: m.$createdAt
  }));

  // Update conversation status and metadata
  const existingMetadata = (() => {
    try {
      return typeof conversation.metadata === 'string'
        ? JSON.parse(conversation.metadata)
        : conversation.metadata;
    } catch {
      return {};
    }
  })();

  const handoverData = {
    agentId: agentId ?? null,
    initiatedBy: userId,
    note: note ?? null,
    timestamp: new Date().toISOString(),
    messageCount: handoverContext.length
  };

  await databases.updateDocument(
    APPWRITE_DATABASE,
    COLLECTION.CONVERSATIONS,
    conversationId,
    {
      status: 'escalated',
      metadata: JSON.stringify({
        ...existingMetadata,
        handover: handoverData
      })
    }
  );

  logAuditEventAsync(tenant.$id, 'handover.triggered', {
    conversationId,
    agentId: agentId ?? null,
    initiatedBy: userId
  });

  // Send webhook notification if configured
  const tenantConfig = (() => {
    try {
      return typeof tenant.config === 'string'
        ? JSON.parse(tenant.config)
        : tenant.config;
    } catch {
      return {};
    }
  })();

  if (tenantConfig.webhookUrl) {
    fetch(tenantConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'conversation.handover',
        conversationId,
        handover: handoverData,
        context: handoverContext
      })
    }).catch((err) => {
      console.error('[handover] Webhook notification failed:', err);
    });
  }

  return NextResponse.json({
    success: true,
    conversationId,
    handover: handoverData,
    context: handoverContext
  });
}

// ---------------------------------------------------------------------------
// Complete handover
// ---------------------------------------------------------------------------

async function completeHandover(
  body: unknown,
  tenant: Tenant,
  userId: string
): Promise<NextResponse> {
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { conversationId, resolution } = parsed.data;
  const { databases } = createAdminClient();

  // Verify conversation belongs to tenant
  const conversation = await databases.getDocument<Conversation>(
    APPWRITE_DATABASE,
    COLLECTION.CONVERSATIONS,
    conversationId
  );

  if (conversation.tenantId !== tenant.$id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Update conversation status
  const existingMetadata = (() => {
    try {
      return typeof conversation.metadata === 'string'
        ? JSON.parse(conversation.metadata)
        : conversation.metadata;
    } catch {
      return {};
    }
  })();

  await databases.updateDocument(
    APPWRITE_DATABASE,
    COLLECTION.CONVERSATIONS,
    conversationId,
    {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      metadata: JSON.stringify({
        ...existingMetadata,
        handoverResolution: {
          resolvedBy: userId,
          resolution: resolution ?? null,
          resolvedAt: new Date().toISOString()
        }
      })
    }
  );

  logAuditEventAsync(tenant.$id, 'handover.completed', {
    conversationId,
    resolvedBy: userId,
    resolution: resolution ?? null
  });

  return NextResponse.json({
    success: true,
    conversationId,
    status: 'resolved'
  });
}
