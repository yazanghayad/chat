import { NextRequest, NextResponse } from 'next/server';
import { whatsappAdapter } from '@/lib/channels/whatsapp-adapter';
import {
  verifyTwilioSignature,
  buildWebhookUrl,
  isTwilioVerificationEnabled
} from '@/lib/channels/twilio-verify';
import { sanitizeText } from '@/lib/sanitize';

/**
 * POST /api/webhooks/whatsapp
 *
 * Twilio WhatsApp webhook. Receives inbound WhatsApp messages and
 * routes them through the AI pipeline.
 *
 * Query params:
 *   ?key=<tenant-api-key>
 *
 * Body: URL-encoded Twilio webhook payload
 */
export async function POST(request: NextRequest) {
  const tenantApiKey = request.nextUrl.searchParams.get('key');

  if (!tenantApiKey) {
    return NextResponse.json(
      { error: 'Missing tenant API key (?key=...)' },
      { status: 401 }
    );
  }

  let payload: Record<string, unknown>;
  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      payload = Object.fromEntries(formData.entries()) as Record<
        string,
        unknown
      >;
    } else {
      payload = await request.json();
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse request body' },
      { status: 400 }
    );
  }

  // Validate required Twilio fields
  if (!payload.From || !payload.Body) {
    return NextResponse.json(
      { error: 'Missing required Twilio fields: From, Body' },
      { status: 400 }
    );
  }

  // Verify Twilio webhook signature
  if (isTwilioVerificationEnabled()) {
    const signature = request.headers.get('x-twilio-signature') ?? '';
    const webhookUrl = buildWebhookUrl(request, '/api/webhooks/whatsapp');
    const isValid = verifyTwilioSignature(
      payload as Record<string, string>,
      signature,
      webhookUrl
    );
    if (!isValid) {
      console.warn('[whatsapp] Twilio signature verification failed');
      return new Response('Unauthorized', { status: 403 });
    }
  }

  // Sanitize user input
  payload.Body = sanitizeText(payload.Body as string);

  // Inject tenant key into payload
  payload.tenantApiKey = tenantApiKey;

  try {
    const result = await whatsappAdapter.handleIncoming(payload);

    // Twilio expects a 200 with TwiML or empty body
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
