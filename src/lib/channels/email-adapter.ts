/**
 * Email channel adapter.
 *
 * Handles inbound emails (parsed by a webhook from SendGrid/CloudMailin)
 * and sends replies via a transactional email API (Resend / SendGrid).
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

export interface InboundEmailPayload {
  /** Sender email address. */
  from: string;
  /** Email subject line. */
  subject: string;
  /** Plain text body (signatures stripped). */
  text: string;
  /** The tenant API key (passed as query param on webhook URL). */
  tenantApiKey: string;
  /** In-Reply-To header for threading. */
  inReplyTo?: string;
  /** Message-ID header. */
  messageId?: string;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class EmailAdapter extends ChannelAdapter {
  readonly channelType: ConversationChannel = 'email';

  async sendMessage(
    conversationId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    // Load conversation to get reply-to email
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

    const recipientEmail = convMeta.email as string | undefined;
    const subject = convMeta.subject as string | undefined;
    const inReplyTo = convMeta.messageId as string | undefined;

    if (!recipientEmail) {
      console.error(
        `[email-adapter] No recipient email for conversation ${conversationId}`
      );
      return;
    }

    // Send via API (Resend or SendGrid)
    const apiKey = process.env.EMAIL_API_KEY;
    const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? 'support@example.com';
    const provider = process.env.EMAIL_PROVIDER ?? 'resend';

    if (!apiKey) {
      console.error('[email-adapter] EMAIL_API_KEY not configured');
      return;
    }

    if (provider === 'resend') {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: recipientEmail,
          subject: subject
            ? `Re: ${subject.replace(/^Re:\s*/i, '')}`
            : 'Support Reply',
          text: content,
          headers: inReplyTo
            ? { 'In-Reply-To': inReplyTo, References: inReplyTo }
            : undefined
        })
      });
    } else if (provider === 'sendgrid') {
      await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipientEmail }] }],
          from: { email: fromAddress },
          subject: subject
            ? `Re: ${subject.replace(/^Re:\s*/i, '')}`
            : 'Support Reply',
          content: [{ type: 'text/plain', value: content }],
          ...(inReplyTo
            ? { headers: { 'In-Reply-To': inReplyTo, References: inReplyTo } }
            : {})
        })
      });
    }
  }

  async receiveMessage(payload: unknown): Promise<IncomingMessage> {
    const data = payload as InboundEmailPayload;

    // Resolve tenant from API key
    const tenantId = await this.resolveTenantId(data.tenantApiKey);

    // Find or create conversation by email threading
    const conversationId = await this.findOrCreateConversation(
      tenantId,
      data.from,
      data.subject,
      data.inReplyTo,
      data.messageId
    );

    return {
      tenantId,
      conversationId,
      content: stripEmailSignature(data.text),
      channel: 'email',
      userId: data.from,
      metadata: {
        email: data.from,
        subject: data.subject,
        messageId: data.messageId,
        inReplyTo: data.inReplyTo
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
    email: string,
    subject: string | undefined,
    inReplyTo: string | undefined,
    messageId: string | undefined
  ): Promise<string> {
    const { databases } = createAdminClient();
    const { ID: AppwriteID } = await import('node-appwrite');

    // Try to find existing conversation by In-Reply-To header
    if (inReplyTo) {
      const existing = await databases.listDocuments<Conversation>(
        APPWRITE_DATABASE,
        COLLECTION.CONVERSATIONS,
        [
          Query.equal('tenantId', tenantId),
          Query.equal('channel', 'email'),
          Query.limit(50)
        ]
      );

      for (const conv of existing.documents) {
        const meta =
          typeof conv.metadata === 'string'
            ? JSON.parse(conv.metadata)
            : conv.metadata;
        if (meta.messageId === inReplyTo || meta.email === email) {
          return conv.$id;
        }
      }
    }

    // Create new conversation
    const doc = await databases.createDocument(
      APPWRITE_DATABASE,
      COLLECTION.CONVERSATIONS,
      AppwriteID.unique(),
      {
        tenantId,
        channel: 'email',
        status: 'active',
        userId: email,
        metadata: JSON.stringify({
          email,
          subject: subject ?? '',
          messageId: messageId ?? ''
        }),
        resolvedAt: null
      }
    );

    return doc.$id;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip common email signatures from text body.
 */
function stripEmailSignature(text: string): string {
  // Common signature delimiters
  const markers = [
    '\n-- \n', // RFC 3676 standard signature delimiter
    '\n--\n',
    '\nSent from my iPhone',
    '\nSent from my Android',
    '\nGet Outlook for',
    '\n_______________'
  ];

  let cleaned = text;
  for (const marker of markers) {
    const idx = cleaned.indexOf(marker);
    if (idx > 0) {
      cleaned = cleaned.substring(0, idx);
    }
  }

  return cleaned.trim();
}

// Singleton
export const emailAdapter = new EmailAdapter();
