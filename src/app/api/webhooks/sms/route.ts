import { NextRequest, NextResponse } from 'next/server';
import { smsAdapter } from '@/lib/channels/sms-adapter';
import {
  verifyTwilioSignature,
  buildWebhookUrl,
  isTwilioVerificationEnabled
} from '@/lib/channels/twilio-verify';
import { sanitizeText } from '@/lib/sanitize';

/**
 * POST /api/webhooks/sms
 *
 * Twilio SMS webhook. Receives inbound SMS messages and routes them
 * through the AI pipeline.
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

  if (!payload.From || !payload.Body) {
    return NextResponse.json(
      { error: 'Missing required Twilio fields: From, Body' },
      { status: 400 }
    );
  }

  // Verify Twilio webhook signature
  if (isTwilioVerificationEnabled()) {
    const signature = request.headers.get('x-twilio-signature') ?? '';
    const webhookUrl = buildWebhookUrl(request, '/api/webhooks/sms');
    const isValid = verifyTwilioSignature(
      payload as Record<string, string>,
      signature,
      webhookUrl
    );
    if (!isValid) {
      console.warn('[sms] Twilio signature verification failed');
      return new Response('Unauthorized', { status: 403 });
    }
  }

  // Sanitize user input
  payload.Body = sanitizeText(payload.Body as string);

  payload.tenantApiKey = tenantApiKey;

  try {
    await smsAdapter.handleIncoming(payload);

    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (err) {
    console.error('SMS webhook error:', err);
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
