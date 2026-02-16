import { NextRequest, NextResponse } from 'next/server';
import { emailAdapter } from '@/lib/channels/email-adapter';

/**
 * POST /api/webhooks/email
 *
 * Inbound email webhook. Receives parsed email from SendGrid Inbound Parse
 * or CloudMailin and routes it through the AI pipeline.
 *
 * Query params:
 *   ?key=<tenant-api-key>
 *
 * Body: JSON with { from, subject, text, inReplyTo?, messageId? }
 */
export async function POST(request: NextRequest) {
  const tenantApiKey = request.nextUrl.searchParams.get('key');

  if (!tenantApiKey) {
    return NextResponse.json(
      { error: 'Missing tenant API key (?key=...)' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    } else {
      body = await request.json();
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse request body' },
      { status: 400 }
    );
  }

  const payload = {
    from: (body.from as string) ?? (body.sender as string) ?? '',
    subject: (body.subject as string) ?? '',
    text: (body.text as string) ?? (body['stripped-text'] as string) ?? '',
    tenantApiKey,
    inReplyTo: body['In-Reply-To'] as string | undefined,
    messageId: body['Message-Id'] as string | undefined
  };

  if (!payload.from || !payload.text) {
    return NextResponse.json(
      { error: 'Missing required fields: from, text' },
      { status: 400 }
    );
  }

  try {
    const result = await emailAdapter.handleIncoming(payload);

    return NextResponse.json({
      success: true,
      conversationId: result.conversationId,
      resolved: result.resolved
    });
  } catch (err) {
    console.error('Email webhook error:', err);
    return NextResponse.json(
      { error: 'Failed to process email' },
      { status: 500 }
    );
  }
}
