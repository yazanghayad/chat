'use server';

/**
 * Server action: Send a message through the AI orchestrator pipeline.
 *
 * This is the primary entry point for sending user messages from the
 * admin dashboard or any server-side context.
 */

import { createSessionClient } from '@/lib/appwrite/server';
import { orchestrate, type OrchestratorResult } from '@/lib/ai/orchestrator';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const sendMessageSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  conversationId: z.string().nullable(),
  message: z.string().min(1, 'Message cannot be empty').max(4000),
  channel: z.enum(['web', 'email']).default('web'),
  userId: z.string().nullable().optional()
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ---------------------------------------------------------------------------
// Response type
// ---------------------------------------------------------------------------

export interface SendMessageResult {
  success: boolean;
  data?: OrchestratorResult;
  error?: string;
}

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

/**
 * Send a customer message and get an AI response via the RAG pipeline.
 *
 * Flow:
 * 1. Validate session
 * 2. Validate input
 * 3. Run orchestrator (pre-policy → RAG → LLM → post-policy → save)
 * 4. Return result
 */
export async function sendMessageAction(
  input: SendMessageInput
): Promise<SendMessageResult> {
  try {
    // Validate session (ensures the caller is authenticated)
    const { account } = await createSessionClient();
    await account.get();

    // Validate input
    const parsed = sendMessageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(', ')
      };
    }

    const { tenantId, conversationId, message, channel, userId } = parsed.data;

    // Run the orchestrator pipeline
    const result = await orchestrate({
      tenantId,
      conversationId,
      userMessage: message,
      channel,
      userId: userId ?? undefined
    });

    return { success: true, data: result };
  } catch (err) {
    console.error('sendMessageAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to process message'
    };
  }
}
