/**
 * LLM client – wraps OpenAI Chat Completions with streaming support.
 *
 * Provides both streaming and non-streaming interfaces for generating
 * AI responses from the RAG-augmented context.
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });
  }
  return _openai;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LLMCompletionOptions {
  /** Model to use. Defaults to gpt-4o. */
  model?: string;
  /** System prompt – sets the assistant's behavior. */
  systemPrompt?: string;
  /** Maximum tokens in the response. */
  maxTokens?: number;
  /** Sampling temperature (0 = deterministic, 1 = creative). */
  temperature?: number;
}

export interface LLMResponse {
  /** The generated text content. */
  content: string;
  /** The model used. */
  model: string;
  /** Token usage stats. */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Finish reason from OpenAI. */
  finishReason: string | null;
}

export interface LLMStreamChunk {
  /** Incremental text delta. */
  delta: string;
  /** True when the stream is complete. */
  done: boolean;
}

// ---------------------------------------------------------------------------
// Default system prompt for Support AI
// ---------------------------------------------------------------------------

const DEFAULT_SYSTEM_PROMPT = `You are a helpful customer support AI assistant. Your role is to answer customer questions accurately and professionally using the provided context.

Rules:
- Only answer based on the provided context. If the context does not contain enough information, say so honestly.
- Be concise but thorough. Use bullet points or numbered lists for multi-step answers.
- Maintain a friendly, professional tone.
- If the question is unclear, ask for clarification.
- Never make up information. If unsure, recommend the customer contact a human agent.
- Include relevant details from the context but do not copy it verbatim.`;

// ---------------------------------------------------------------------------
// Build messages array from context + user query
// ---------------------------------------------------------------------------

export interface RAGContext {
  /** Retrieved text chunks from the knowledge base. */
  chunks: Array<{
    text: string;
    sourceId: string;
    score: number;
  }>;
  /** The user's original query. */
  query: string;
  /** Optional conversation history for multi-turn conversations. */
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  /** Optional prefix to prepend to the system prompt (tenant custom instructions). */
  systemPromptPrefix?: string;
}

/**
 * Build the chat messages array from retrieval context and user query.
 */
export function buildMessages(
  context: RAGContext,
  options: LLMCompletionOptions = {}
): ChatCompletionMessageParam[] {
  const basePrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const systemPrompt = context.systemPromptPrefix
    ? `${context.systemPromptPrefix}\n\n${basePrompt}`
    : basePrompt;

  // Build context block from retrieved chunks
  const contextBlock = context.chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1}] (relevance: ${(chunk.score * 100).toFixed(1)}%)\n${chunk.text}`
    )
    .join('\n\n---\n\n');

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `${systemPrompt}\n\n## Retrieved Context\n\n${contextBlock}`
    }
  ];

  // Add conversation history if present
  if (context.conversationHistory?.length) {
    for (const msg of context.conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add the current user query
  messages.push({ role: 'user', content: context.query });

  return messages;
}

// ---------------------------------------------------------------------------
// Non-streaming completion
// ---------------------------------------------------------------------------

/**
 * Generate a complete response (non-streaming).
 */
export async function generateCompletion(
  context: RAGContext,
  options: LLMCompletionOptions = {}
): Promise<LLMResponse> {
  const openai = getOpenAI();
  const messages = buildMessages(context, options);

  const response = await openai.chat.completions.create({
    model: options.model ?? 'gpt-4o',
    messages,
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.3
  });

  const choice = response.choices[0];

  return {
    content: choice.message.content ?? '',
    model: response.model,
    usage: {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0
    },
    finishReason: choice.finish_reason
  };
}

// ---------------------------------------------------------------------------
// Streaming completion
// ---------------------------------------------------------------------------

/**
 * Generate a streaming response. Returns an async iterable of text chunks.
 */
export async function* generateStreamingCompletion(
  context: RAGContext,
  options: LLMCompletionOptions = {}
): AsyncGenerator<LLMStreamChunk> {
  const openai = getOpenAI();
  const messages = buildMessages(context, options);

  const stream = await openai.chat.completions.create({
    model: options.model ?? 'gpt-4o',
    messages,
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.3,
    stream: true
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    const done = chunk.choices[0]?.finish_reason !== null;

    if (delta || done) {
      yield { delta, done };
    }
  }
}

/**
 * Generate a streaming response and return a Web ReadableStream
 * (useful for SSE / Next.js streaming responses).
 */
export function generateCompletionStream(
  context: RAGContext,
  options: LLMCompletionOptions = {}
): ReadableStream<string> {
  return new ReadableStream<string>({
    async start(controller) {
      try {
        const gen = generateStreamingCompletion(context, options);

        for await (const chunk of gen) {
          if (chunk.delta) {
            controller.enqueue(chunk.delta);
          }
          if (chunk.done) {
            break;
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    }
  });
}
