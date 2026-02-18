/**
 * SMS channel adapter (Twilio).
 *
 * Handles inbound SMS messages via Twilio webhook and sends
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

export interface TwilioSMSPayload {
  From: string;
  Body: string;
  MessageSid: string;
  AccountSid: string;
  To: string;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class SMSAdapter extends ChannelAdapter {
  readonly channelType: ConversationChannel = 'sms';

  private get accountSid(): string {
    return process.env.TWILIO_ACCOUNT_SID ?? '';
  }

  private get authToken(): string {
    return process.env.TWILIO_AUTH_TOKEN ?? '';
  }

  private get smsNumber(): string {
    return process.env.TWILIO_SMS_NUMBER ?? '';
  }

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
        `[sms-adapter] No phone number for conversation ${conversationId}`
      );
      return;
    }

    if (!this.accountSid || !this.authToken) {
      console.error('[sms-adapter] Twilio credentials not configured');
      return;
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const basicAuth = Buffer.from(
      `${this.accountSid}:${this.authToken}`
    ).toString('base64');

    const body = new URLSearchParams({
      From: this.smsNumber,
      To: phoneNumber,
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
        `[sms-adapter] Twilio send failed: ${response.status} – ${errorBody}`
      );
    }
  }

  async receiveMessage(payload: unknown): Promise<IncomingMessage> {
    const data = payload as TwilioSMSPayload & {
      tenantApiKey?: string;
    };

    const phoneNumber = data.From;

    const tenantApiKey = data.tenantApiKey;
    if (!tenantApiKey) {
      throw new Error('Missing tenantApiKey in webhook payload');
    }
    const tenantId = await this.resolveTenantId(tenantApiKey);

    const conversationId = await this.findOrCreateConversation(
      tenantId,
      phoneNumber
    );

    return {
      tenantId,
      conversationId,
      content: data.Body,
      channel: 'sms',
      userId: phoneNumber,
      metadata: { phoneNumber, messageSid: data.MessageSid }
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

    const existing = await databases.listDocuments<Conversation>(
      APPWRITE_DATABASE,
      COLLECTION.CONVERSATIONS,
      [
        Query.equal('tenantId', tenantId),
        Query.equal('channel', 'sms'),
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

    const doc = await databases.createDocument(
      APPWRITE_DATABASE,
      COLLECTION.CONVERSATIONS,
      AppwriteID.unique(),
      {
        tenantId,
        channel: 'sms',
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
export const smsAdapter = new SMSAdapter();
