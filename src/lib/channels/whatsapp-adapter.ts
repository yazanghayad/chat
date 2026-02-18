/**
 * WhatsApp channel adapter (Twilio).
 *
 * Handles inbound WhatsApp messages via Twilio webhook and sends
 * replies back through the Twilio Messaging API.
 */

import { ChannelAdapter, type IncomingMessage } from './base-adapter';
import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import type { Conversation, ConversationChannel } from '@/types/appwrite';
import { Query } from 'node-appwrite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TwilioWhatsAppPayload {
  /** Sender phone, e.g. "whatsapp:+1234567890". */
  From: string;
  /** Message body. */
  Body: string;
  /** Twilio message SID. */
  MessageSid: string;
  /** Account SID for verification. */
  AccountSid: string;
  /** Number receiving the message, e.g. "whatsapp:+0987654321". */
  To: string;
  /** Number of media items. */
  NumMedia?: string;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class WhatsAppAdapter extends ChannelAdapter {
  readonly channelType: ConversationChannel = 'whatsapp';

  private get accountSid(): string {
    return process.env.TWILIO_ACCOUNT_SID ?? '';
  }

  private get authToken(): string {
    return process.env.TWILIO_AUTH_TOKEN ?? '';
  }

  private get whatsappNumber(): string {
    return process.env.TWILIO_WHATSAPP_NUMBER ?? '';
  }

  /**
   * Send a message back to the customer via Twilio WhatsApp API.
   */
  async sendMessage(conversationId: string, content: string): Promise<void> {
    const { databases } = createAdminClient();
    const conversation = await databases.getDocument<Conversation>(
      APPWRITE_DATABASE,
      COLLECTION.CONVERSATIONS,
      conversationId
    );

    const convMeta =
      typeof conversation.metadata === 'string'
        ? JSON.parse(conversation.metadata)
        : conversation.metadata;

    const phoneNumber = convMeta.phoneNumber as string | undefined;
    if (!phoneNumber) {
      console.error(
        `[whatsapp-adapter] No phone number for conversation ${conversationId}`
      );
      return;
    }

    if (!this.accountSid || !this.authToken) {
      console.error('[whatsapp-adapter] Twilio credentials not configured');
      return;
    }

    // Twilio REST API – send WhatsApp message
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const basicAuth = Buffer.from(
      `${this.accountSid}:${this.authToken}`
    ).toString('base64');

    const body = new URLSearchParams({
      From: `whatsapp:${this.whatsappNumber}`,
      To: `whatsapp:${phoneNumber}`,
      Body: content
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[whatsapp-adapter] Twilio send failed: ${response.status} – ${errorBody}`
      );
    }
  }

  /**
   * Parse a Twilio WhatsApp webhook payload into IncomingMessage.
   */
  async receiveMessage(payload: unknown): Promise<IncomingMessage> {
    const data = payload as TwilioWhatsAppPayload & {
      tenantApiKey?: string;
    };

    // Strip "whatsapp:" prefix
    const phoneNumber = data.From.replace('whatsapp:', '');

    // Resolve tenant
    const tenantApiKey = data.tenantApiKey;
    if (!tenantApiKey) {
      throw new Error('Missing tenantApiKey in webhook payload');
    }
    const tenantId = await this.resolveTenantId(tenantApiKey);

    // Find or create conversation by phone number
    const conversationId = await this.findOrCreateConversation(
      tenantId,
      phoneNumber
    );

    return {
      tenantId,
      conversationId,
      content: data.Body,
      channel: 'whatsapp',
      userId: phoneNumber,
      metadata: {
        phoneNumber,
        messageSid: data.MessageSid
      }
    };
  }

  private async resolveTenantId(apiKey: string): Promise<string> {
    const { databases } = createAdminClient();
    const result = await databases.listDocuments(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      [Query.equal('apiKey', apiKey), Query.limit(1)]
    );
    if (result.documents.length === 0) {
      throw new Error('Invalid tenant API key');
    }
    return result.documents[0].$id;
  }

  private async findOrCreateConversation(
    tenantId: string,
    phoneNumber: string
  ): Promise<string> {
    const { databases } = createAdminClient();
    const { ID: AppwriteID } = await import('node-appwrite');

    // Find active conversation for this phone number
    const existing = await databases.listDocuments<Conversation>(
      APPWRITE_DATABASE,
      COLLECTION.CONVERSATIONS,
      [
        Query.equal('tenantId', tenantId),
        Query.equal('channel', 'whatsapp'),
        Query.equal('status', 'active'),
        Query.limit(20)
      ]
    );

    for (const conv of existing.documents) {
      const meta =
        typeof conv.metadata === 'string'
          ? JSON.parse(conv.metadata)
          : conv.metadata;
      if (meta.phoneNumber === phoneNumber) {
        return conv.$id;
      }
    }

    // Create new conversation
    const doc = await databases.createDocument(
      APPWRITE_DATABASE,
      COLLECTION.CONVERSATIONS,
      AppwriteID.unique(),
      {
        tenantId,
        channel: 'whatsapp',
        status: 'active',
        userId: phoneNumber,
        metadata: JSON.stringify({ phoneNumber }),
        resolvedAt: null,
        firstResponseAt: null,
        csatScore: null,
        assignedTo: null
      }
    );

    return doc.$id;
  }
}

// Singleton
export const whatsappAdapter = new WhatsAppAdapter();
