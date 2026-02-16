/**
 * Base channel adapter – abstract class for multi-channel message routing.
 *
 * Each channel (web, email, WhatsApp, SMS, voice) implements this adapter
 * to standardise how messages flow into and out of the orchestrator.
 */

import { orchestrate, type OrchestratorResult } from '@/lib/ai/orchestrator';
import type { ConversationChannel } from '@/types/appwrite';
import { logAuditEventAsync } from '@/lib/audit/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IncomingMessage {
  tenantId: string;
  conversationId: string | null;
  content: string;
  channel: ConversationChannel;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface OutgoingMessage {
  conversationId: string;
  content: string;
  citations?: Array<{ sourceId: string }>;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Abstract adapter
// ---------------------------------------------------------------------------

export abstract class ChannelAdapter {
  abstract readonly channelType: ConversationChannel;

  /**
   * Send a message back to the customer via this channel.
   */
  abstract sendMessage(
    conversationId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Parse a raw inbound payload into a normalised IncomingMessage.
   */
  abstract receiveMessage(payload: unknown): Promise<IncomingMessage>;

  /**
   * Full incoming message handler: parse → orchestrate → reply (or escalate).
   */
  async handleIncoming(payload: unknown): Promise<OrchestratorResult> {
    const message = await this.receiveMessage(payload);

    logAuditEventAsync(message.tenantId, 'message.received', {
      channel: this.channelType,
      conversationId: message.conversationId
    });

    const result = await orchestrate({
      tenantId: message.tenantId,
      conversationId: message.conversationId,
      userMessage: message.content,
      channel: this.channelType,
      userId: message.userId
    });

    if (result.resolved && result.content) {
      await this.sendMessage(result.conversationId, result.content, {
        citations: result.citations
      });

      logAuditEventAsync(message.tenantId, 'message.sent', {
        channel: this.channelType,
        conversationId: result.conversationId,
        resolved: true
      });
    } else if (result.escalated) {
      logAuditEventAsync(message.tenantId, 'handover.triggered', {
        channel: this.channelType,
        conversationId: result.conversationId,
        reason: result.blockedReason ?? 'low_confidence'
      });
    }

    return result;
  }
}
