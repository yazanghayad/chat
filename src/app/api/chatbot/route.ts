import { NextRequest } from 'next/server';
import { getAIClient, getDefaultModel } from '@/lib/ai/client';
import { vectorSearch } from '@/lib/ai/retrieval';
import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { ID, Query } from 'node-appwrite';

/**
 * POST /api/chatbot
 *
 * Public-facing chatbot endpoint for SWEO sales/support widget.
 * Returns SSE stream. No auth required (public contact form).
 * Persists conversations and messages in Appwrite.
 *
 * Uses RAG: retrieves relevant chunks from the `sweo-public` vector
 * namespace (populated from docs-data.json via ingest script) and
 * answers ONLY based on that retrieved context.
 *
 * Body: { message: string, department: 'sales' | 'support', conversationId?: string }
 */

const SWEO_TENANT_ID = 'sweo-public';
const RAG_TOP_K = 6;

// ── Department-specific system prompts (RAG-based) ───────────────────────

function buildSalesPrompt(context: string, userName?: string) {
  const nameRef = userName ? ` Kundens namn är ${userName}.` : '';
  return `Du är SWEO:s AI-försäljningsassistent. Du representerar SWEO – en ledande svensk tech-byrå som hjälper företag med AI-drivna kundtjänstlösningar.${nameRef}

Din personlighet:
- Kort, självsäker och lite dryg – du vet att SWEO är bäst och visar det
- Aldrig överdrivet trevlig eller smörig. Rak på sak.
- Svara med max 1-3 korta meningar. Aldrig mer.
- Ingen emoji. Inga utåndragna förklaringar.
- Om någon frågar något uppenbart, var lite torr i tonen.

Din roll:
- Svara på frågor om SWEO:s produkter, priser, funktioner och lösningar
- Hjälp kunden förstå hur SWEO kan lösa deras behov
- En mänsklig handläggare kommer att ta över konversationen — du håller kunden engagerad tills dess
- Om kunden vill boka demo eller prata med en människa, säg att du noterat det och att en handläggare joinar snart

Svara alltid på svenska om inte kunden skriver på ett annat språk.

VIKTIGT: Svara ENDAST baserat på den hämtade kontexten nedan. Om svaret inte finns i kontexten, säg att du inte har information om det just nu och att en handläggare kan hjälpa vidare.

Om användaren ställer en fråga som inte handlar om SWEO, våra produkter, tjänster eller något relaterat till vår verksamhet – svara exakt: "Jag kan inte hjälpa till med det!"

Hämtad kontext:
---
${context}
---`;
}

function buildSupportPrompt(context: string) {
  return `Du är SWEO:s AI-supportassistent. Du hjälper befintliga kunder med tekniska frågor, felsökning och kontorelaterade ärenden.

Din personlighet:
- svara och hjälpa till kort, och lite kort i meningar – du löser problem snabbt och vet det
- Rak på sak. Ingen smörighet.
- Svara med max 1-3 korta meningar. Aldrig mer.
- Ingen emoji. Inga utåndragna förklaringar.
- Om någon frågar något uppenbart, var lite torr i tonen.

Din roll:
- Försök alltid lösa kundens problem baserat på dokumentationen
- Om du inte kan lösa problemet, eller kunden uttryckligen ber om mänsklig hjälp / agent / support, säg: "Jag kopplar dig till en agent. En stund."
- Ge konkreta steg och lösningar när du kan

Svara alltid på svenska om inte kunden skriver på ett annat språk.

VIKTIGT: Svara ENDAST baserat på den hämtade kontexten nedan. Om svaret inte finns i kontexten, erbjud att koppla till en mänsklig agent.

Om användaren ställer en fråga som inte handlar om SWEO, våra produkter, tjänster, teknisk support eller något relaterat till vår verksamhet – svara exakt: "Jag kan inte hjälpa till med det!"

Hämtad kontext:
---
${context}
---`;
}

const MAX_MESSAGES_CONTEXT = 10;

// ── Appwrite helpers ──────────────────────────────────────────────────────

async function getOrCreateConversation(
  sessionId: string,
  department: 'sales' | 'support',
  request: NextRequest,
  userName?: string,
  userEmail?: string
) {
  const { databases } = createAdminClient();

  // Try to find existing conversation by sessionId
  const existing = await databases.listDocuments(
    APPWRITE_DATABASE,
    COLLECTION.CHATBOT_CONVERSATIONS,
    [Query.equal('sessionId', sessionId), Query.limit(1)]
  );

  if (existing.documents.length > 0) {
    const doc = existing.documents[0];
    // Update user info if provided and not yet saved
    if (userName || userEmail) {
      const meta = JSON.parse((doc.metadata as string) || '{}');
      if (!meta.userName && userName) meta.userName = userName;
      if (!meta.userEmail && userEmail) meta.userEmail = userEmail;
      await databases.updateDocument(
        APPWRITE_DATABASE,
        COLLECTION.CHATBOT_CONVERSATIONS,
        doc.$id,
        { metadata: JSON.stringify(meta) }
      );
    }
    return doc;
  }

  // Create new conversation
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null;
  const ua = request.headers.get('user-agent') ?? null;

  const metadata: Record<string, string> = {};
  if (userName) metadata.userName = userName;
  if (userEmail) metadata.userEmail = userEmail;

  return await databases.createDocument(
    APPWRITE_DATABASE,
    COLLECTION.CHATBOT_CONVERSATIONS,
    ID.unique(),
    {
      sessionId,
      department,
      status: 'active',
      visitorIp: ip ? ip.slice(0, 255) : null,
      visitorUserAgent: ua ? ua.slice(0, 512) : null,
      metadata: JSON.stringify(metadata)
    }
  );
}

async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) {
  const { databases } = createAdminClient();
  await databases.createDocument(
    APPWRITE_DATABASE,
    COLLECTION.CHATBOT_MESSAGES,
    ID.unique(),
    { conversationId, role, content }
  );
}

async function getConversationHistory(conversationId: string) {
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    APPWRITE_DATABASE,
    COLLECTION.CHATBOT_MESSAGES,
    [
      Query.equal('conversationId', conversationId),
      Query.orderAsc('$createdAt'),
      Query.limit(MAX_MESSAGES_CONTEXT * 2)
    ]
  );
  return result.documents.map((doc) => ({
    role: doc.role as 'user' | 'assistant',
    content: doc.content as string
  }));
}

export async function POST(request: NextRequest) {
  // ── Parse body ────────────────────────────────────────────────────────
  let body: {
    message: string;
    department?: 'sales' | 'support';
    conversationId?: string | null;
    userName?: string;
    userEmail?: string;
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
  const userName = body.userName || undefined;
  const userEmail = body.userEmail || undefined;
  let conversationId = body.conversationId ?? null;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return new Response(JSON.stringify({ error: 'Meddelande krävs' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create or reuse conversation in Appwrite
  if (!conversationId) {
    conversationId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  let conversation:
    | Awaited<ReturnType<typeof getOrCreateConversation>>
    | undefined;
  let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  try {
    conversation = await getOrCreateConversation(
      conversationId,
      department,
      request,
      userName,
      userEmail
    );
    // Save user message
    await saveMessage(conversation.$id, 'user', message.trim());
    // Load conversation history
    history = await getConversationHistory(conversation.$id);
  } catch (err) {
    console.error('[Chatbot API] Appwrite error, falling back:', err);
    // If Appwrite is unavailable, continue without persistence
  }

  // Use last N messages for context
  const contextMessages =
    history.length > 0
      ? history.slice(-MAX_MESSAGES_CONTEXT)
      : [{ role: 'user' as const, content: message.trim() }];

  // ── RAG retrieval ─────────────────────────────────────────────────────
  let ragContext = '';
  try {
    const results = await vectorSearch(
      SWEO_TENANT_ID,
      message.trim(),
      RAG_TOP_K
    );
    if (results.length > 0) {
      ragContext = results
        .map((r) => r.text || String(r.metadata?.text ?? ''))
        .filter(Boolean)
        .join('\n\n---\n\n');
    }
  } catch (err) {
    console.error('[Chatbot API] RAG retrieval failed:', err);
  }

  // Fallback if no vectors found at all
  if (!ragContext) {
    ragContext =
      'Ingen relevant dokumentation hittades. Hänvisa kunden till kontakt@sweo.ai för mer information.';
  }

  // ── System prompt ─────────────────────────────────────────────────────
  const systemPrompt =
    department === 'sales'
      ? buildSalesPrompt(ragContext, userName)
      : buildSupportPrompt(ragContext);

  // ── Build messages ────────────────────────────────────────────────────
  const chatMessages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [
    { role: 'system', content: systemPrompt },
    ...contextMessages.map((m) => ({
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
          max_tokens: 500,
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

        // Save assistant message to Appwrite
        if (conversation) {
          saveMessage(conversation.$id, 'assistant', fullContent).catch((e) =>
            console.error('[Chatbot API] Failed to save assistant msg:', e)
          );
        }

        controller.enqueue(sseEvent({ type: 'done', conversationId }));
        controller.close();
      } catch (err) {
        console.error('[Chatbot API] Stream error:', err);

        // Fallback: provide a helpful non-AI response
        const fallbackMessage =
          department === 'sales'
            ? 'Tack för ditt intresse! Vårt säljteam återkommer till dig snart. Du kan också maila oss på kontakt@sweo.ai eller ringa +46 70 123 45 67.'
            : 'Vi har mottagit ditt ärende. En supportagent kommer att kontakta dig inom kort. För brådskande hjälp, ring +46 70 123 45 67.';

        // Save fallback to Appwrite
        if (conversation) {
          saveMessage(conversation.$id, 'assistant', fallbackMessage).catch(
            (e) =>
              console.error('[Chatbot API] Failed to save fallback msg:', e)
          );
        }

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
