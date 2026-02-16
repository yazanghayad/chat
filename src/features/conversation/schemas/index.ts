import { z } from 'zod';

// ---------------------------------------------------------------------------
// Send message (used by server action)
// ---------------------------------------------------------------------------
export const sendMessageSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  conversationId: z.string().nullable(),
  message: z.string().min(1, 'Message cannot be empty').max(4000),
  channel: z.enum(['web', 'email']).default('web'),
  userId: z.string().nullable().optional()
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ---------------------------------------------------------------------------
// Chat API request (used by widget / external callers)
// ---------------------------------------------------------------------------
export const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  channel: z.enum(['web', 'email']).default('web')
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
