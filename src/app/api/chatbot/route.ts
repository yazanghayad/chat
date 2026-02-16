import { NextRequest } from 'next/server';
import { getAIClient, getDefaultModel } from '@/lib/ai/client';

/**
 * POST /api/chatbot
 *
 * Public-facing chatbot endpoint for SWEO sales/support widget.
 * Returns SSE stream. No auth required (public contact form).
 *
 * Body: { message: string, department: 'sales' | 'support', conversationId?: string }
 */

// ── Department-specific system prompts ────────────────────────────────────

const SALES_SYSTEM_PROMPT = `Du är SWEO:s AI-försäljningsassistent. Du representerar SWEO – en ledande svensk tech-byrå som hjälper företag med AI-drivna kundtjänstlösningar.

Din personlighet:
- Kort, självsäker och lite dryg – du vet att SWEO är bäst och visar det
- Aldrig överdrivet trevlig eller smörig. Rak på sak.
- Svara med max 1-2 korta meningar. Aldrig mer.
- Ingen emoji. Inga utåndragna förklaringar.
- Om någon frågar något uppenbart, var lite torr i tonen.

SWEO erbjuder:
- AI-driven kundtjänstplattform med stöd för chatt, e-post, WhatsApp, SMS och telefon
- Kunskapsbas-hantering med automatisk URL-crawling och dokumentuppladdning
- Multi-step workflows (Procedures) för att automatisera komplexa kundärenden
- Analytics och insikter med AI-drivna content gap-förslag
- Enterprise-anpassade lösningar med SOC2-compliance
- Priser börjar från 4 990 kr/mån (Starter), 14 990 kr/mån (Business), Enterprise efter offert

Svara alltid på svenska om inte kunden skriver på ett annat språk.

Om användaren ställer en fråga som inte handlar om SWEO, våra produkter, tjänster eller något relaterat till vår verksamhet – svara exakt: "Jag kan inte hjälpa till med det!"`;

const SUPPORT_SYSTEM_PROMPT = `Du är SWEO:s AI-supportassistent. Du hjälper befintliga kunder med tekniska frågor, felsökning och kontorelaterade ärenden.

Din personlighet:
- svara och hjälpa till kort, och lite kort i meningar – du löser problem snabbt och vet det
- Rak på sak. Ingen smörighet.
- Svara med max 1-2 korta meningar. Aldrig mer.
- Ingen emoji. Inga utåndragna förklaringar.
- Om någon frågar något uppenbart, var lite torr i tonen.

Vanliga supportämnen:
- Inloggningsproblem och kontoverifiering
- Kunskapsbas-konfiguration och URL-crawling
- Widget-installation och anpassning
- API-nycklar och integrationer (Shopify, Stripe, Slack, WhatsApp)
- Fakturering, prenumerationer och uppgraderingar
- AI-agentens beteende och utbildning
- Dataexport och GDPR-frågor

Svara alltid på svenska om inte kunden skriver på ett annat språk.

Om användaren ställer en fråga som inte handlar om SWEO, våra produkter, tjänster, teknisk support eller något relaterat till vår verksamhet – svara exakt: "Jag kan inte hjälpa till med det!"`;

const MAX_MESSAGES_CONTEXT = 10;

// ── In-memory session store (ephemeral) ───────────────────────────────────
const sessions = new Map<
  string,
  { messages: Array<{ role: 'user' | 'assistant'; content: string }> }
>();

export async function POST(request: NextRequest) {
  // ── Parse body ────────────────────────────────────────────────────────
  let body: {
    message: string;
    department?: 'sales' | 'support';
    conversationId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ogiltig JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { message, department = 'support' } = body;
  let conversationId = body.conversationId ?? null;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return new Response(JSON.stringify({ error: 'Meddelande krävs' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create or reuse session
  if (!conversationId) {
    conversationId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  if (!sessions.has(conversationId)) {
    sessions.set(conversationId, { messages: [] });
  }
  const session = sessions.get(conversationId)!;

  // Add user message to history
  session.messages.push({ role: 'user', content: message.trim() });

  // Trim history
  if (session.messages.length > MAX_MESSAGES_CONTEXT * 2) {
    session.messages = session.messages.slice(-MAX_MESSAGES_CONTEXT * 2);
  }

  // ── System prompt ─────────────────────────────────────────────────────
  const systemPrompt =
    department === 'sales' ? SALES_SYSTEM_PROMPT : SUPPORT_SYSTEM_PROMPT;

  // ── Build messages ────────────────────────────────────────────────────
  const chatMessages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [
    { role: 'system', content: systemPrompt },
    ...session.messages.slice(-MAX_MESSAGES_CONTEXT).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))
  ];

  // ── SSE stream ────────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  function sseEvent(data: Record<string, unknown>): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = getAIClient();
        const model = getDefaultModel();

        const completion = await client.chat.completions.create({
          model,
          messages: chatMessages,
          stream: true,
          max_tokens: 300,
          temperature: 0.7
        });

        let fullContent = '';

        for await (const chunk of completion) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            controller.enqueue(sseEvent({ type: 'delta', content: delta }));
          }
        }

        // Save assistant message to session
        session.messages.push({ role: 'assistant', content: fullContent });

        controller.enqueue(sseEvent({ type: 'done', conversationId }));
        controller.close();
      } catch (err) {
        console.error('[Chatbot API] Stream error:', err);

        // Fallback: provide a helpful non-AI response
        const fallbackMessage =
          department === 'sales'
            ? 'Tack för ditt intresse! Vårt säljteam återkommer till dig snart. Du kan också maila oss på kontakt@sweo.ai eller ringa +46 70 123 45 67.'
            : 'Vi har mottagit ditt ärende. En supportagent kommer att kontakta dig inom kort. För brådskande hjälp, ring +46 70 123 45 67.';

        session.messages.push({
          role: 'assistant',
          content: fallbackMessage
        });

        controller.enqueue(
          sseEvent({ type: 'delta', content: fallbackMessage })
        );
        controller.enqueue(sseEvent({ type: 'done', conversationId }));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
}
