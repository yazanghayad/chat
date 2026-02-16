/**
 * Audit event logger – writes append-only audit events to Appwrite.
 *
 * Usage:
 *   import { logAuditEvent } from '@/lib/audit/logger';
 *   await logAuditEvent(tenantId, 'message.sent', { conversationId, role });
 */

import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { ID } from 'node-appwrite';
import type { AuditEvent } from '@/types/appwrite';

// ---------------------------------------------------------------------------
// Well-known event types
// ---------------------------------------------------------------------------

export type AuditEventType =
  | 'message.sent'
  | 'message.received'
  | 'conversation.created'
  | 'conversation.resolved'
  | 'conversation.escalated'
  | 'policy.violated'
  | 'knowledge.created'
  | 'knowledge.deleted'
  | 'knowledge.processed'
  | 'knowledge.rollback'
  | 'knowledge.exported'
  | 'knowledge.imported'
  | 'procedure.triggered'
  | 'procedure.completed'
  | 'procedure.failed'
  | 'connector.called'
  | 'connector.error'
  | 'handover.triggered'
  | 'handover.completed'
  | 'suggestion.created'
  | 'suggestion.approved'
  | 'suggestion.dismissed'
  | 'simulation.run'
  | 'rate_limit.exceeded'
  | 'apikey.rotated'
  | 'tenant.config_updated'
  | 'cache.hit'
  | 'cache.miss'
  | 'team.created'
  | 'team.member_invited'
  | 'team.member_removed'
  | 'team.role_updated';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

/**
 * Write an immutable audit event. Fires and forgets by default –
 * failures are logged to stderr but never throw.
 */
export async function logAuditEvent(
  tenantId: string,
  eventType: AuditEventType | string,
  payload: Record<string, unknown> = {},
  userId: string | null = null
): Promise<AuditEvent | null> {
  try {
    const { databases } = createAdminClient();

    const doc = await databases.createDocument<AuditEvent>(
      APPWRITE_DATABASE,
      COLLECTION.AUDIT_EVENTS,
      ID.unique(),
      {
        tenantId,
        eventType,
        userId,
        payload: JSON.stringify(payload) as unknown as Record<string, unknown>
      }
    );

    return doc;
  } catch (err) {
    console.error(`[audit] Failed to log event "${eventType}":`, err);
    return null;
  }
}

/**
 * Fire-and-forget variant – returns void and never blocks the caller.
 */
export function logAuditEventAsync(
  tenantId: string,
  eventType: AuditEventType | string,
  payload: Record<string, unknown> = {},
  userId: string | null = null
): void {
  logAuditEvent(tenantId, eventType, payload, userId).catch(() => {
    // Already logged inside logAuditEvent
  });
}
