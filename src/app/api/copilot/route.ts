import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { messages, conversationContext } = await req.json();

  const apiUrl = process.env.NVIDIA_API_URL;
  const apiKey = process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_MODEL;

  if (!apiUrl || !apiKey || !model) {
    return Response.json(
      { error: 'NVIDIA API not configured' },
      { status: 500 }
    );
  }

  const systemPrompt = `You are SWEO AI Copilot — an intelligent assistant for customer support agents. You help agents working inside the SWEO Inbox.

Your capabilities:
- **Summarize** conversation threads into concise summaries
- **Translate** messages between any languages
- **Suggest replies** — draft professional customer responses
- **Analyze sentiment** and CX score of conversations
- **Find answers** from knowledge base context
- **Explain** technical issues in simple terms
- **Draft notes** for internal team communication

Rules:
- Be concise and professional
- When translating, detect the source language automatically
- When suggesting replies, match the customer's language
- Format responses with markdown when helpful
- If conversation context is provided, use it to give relevant answers

${
  conversationContext
    ? `\n--- CURRENT CONVERSATION CONTEXT ---\nChannel: ${conversationContext.channel ?? 'Unknown'}\nStatus: ${conversationContext.status ?? 'Unknown'}\nMessages:\n${(conversationContext.messages ?? []).map((m: { role: string; content: string }) => `[${m.role}]: ${m.content}`).join('\n')}\n--- END CONTEXT ---`
    : ''
}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content
          }))
        ],
        temperature: 0.7,
        max_tokens: 2048,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NVIDIA API error:', response.status, errorText);
      return Response.json(
        { error: `API error: ${response.status}` },
        { status: response.status }
      );
    }

    // Stream the response back
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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
  } catch (error) {
    console.error('Copilot API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
