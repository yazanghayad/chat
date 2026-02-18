import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/contact
 *
 * Public contact form endpoint. Sends an email via Mailgun HTTP API.
 *
 * Body: { name: string, email: string, subject?: string, message: string }
 */
export async function POST(req: NextRequest) {
  // ─── Parse body ─────────────────────────────────────────────────────
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  const { name, email, subject, message } = body;

  // ─── Validate required fields ───────────────────────────────────────
  if (!name || !email || !message) {
    return NextResponse.json(
      { ok: false, message: 'Missing required fields: name, email, message.' },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { ok: false, message: 'Invalid email address.' },
      { status: 400 }
    );
  }

  // ─── Env vars ───────────────────────────────────────────────────────
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const submitEmail = process.env.SUBMIT_EMAIL;
  const baseUrl = process.env.MAILGUN_BASE_URL || 'https://api.eu.mailgun.net';

  if (!apiKey || !domain || !submitEmail) {
    console.error('Missing Mailgun environment variables');
    return NextResponse.json(
      { ok: false, message: 'Server configuration error.' },
      { status: 500 }
    );
  }

  // ─── Compose email ─────────────────────────────────────────────────
  const emailSubject = subject
    ? `Contact Form: ${subject}`
    : `New contact form submission from ${name}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">
        New Contact Form Submission
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; color: #555; width: 100px;">Name</td>
          <td style="padding: 8px 12px;">${escapeHtml(name)}</td>
        </tr>
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: bold; color: #555;">Email</td>
          <td style="padding: 8px 12px;">
            <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
          </td>
        </tr>
        ${
          subject
            ? `<tr>
          <td style="padding: 8px 12px; font-weight: bold; color: #555;">Subject</td>
          <td style="padding: 8px 12px;">${escapeHtml(subject)}</td>
        </tr>`
            : ''
        }
      </table>
      <div style="margin-top: 20px; padding: 16px; background: #f5f5f5; border-radius: 6px;">
        <h3 style="margin: 0 0 8px; color: #333;">Message</h3>
        <p style="margin: 0; white-space: pre-wrap; color: #444;">${escapeHtml(message)}</p>
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #999;">
        Sent via contact form at ${new Date().toISOString()}
      </p>
    </div>
  `;

  const textBody = [
    `Name: ${name}`,
    `Email: ${email}`,
    subject ? `Subject: ${subject}` : null,
    '',
    'Message:',
    message
  ]
    .filter(Boolean)
    .join('\n');

  // ─── Send via Mailgun ──────────────────────────────────────────────
  try {
    const form = new URLSearchParams();
    form.append('from', `${name} <noreplay@${domain}>`);
    form.append('to', submitEmail);
    form.append('subject', emailSubject);
    form.append('text', textBody);
    form.append('html', htmlBody);
    form.append('h:Reply-To', email);

    const response = await fetch(`${baseUrl}/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`
      },
      body: form
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`Mailgun error ${response.status}:`, result);
      return NextResponse.json(
        { ok: false, message: 'Failed to send email.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: 'Email sent successfully.' });
  } catch (err) {
    console.error('Failed to send email:', err);
    return NextResponse.json(
      { ok: false, message: 'Failed to send email. Please try again later.' },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(str).replace(/[&<>"']/g, (c) => map[c]);
}
