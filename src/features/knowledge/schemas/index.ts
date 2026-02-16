import { z } from 'zod';

// ---------------------------------------------------------------------------
// Upload file schema
// ---------------------------------------------------------------------------
export const uploadFileSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required')
});

// ---------------------------------------------------------------------------
// Ingest URL schema
// ---------------------------------------------------------------------------
export const ingestUrlSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  url: z.string().url('A valid URL is required')
});

// ---------------------------------------------------------------------------
// Embeddings request schema (API route body)
// ---------------------------------------------------------------------------
export const embeddingRequestSchema = z.object({
  sourceId: z.string().min(1),
  tenantId: z.string().min(1),
  content: z.string().min(1),
  metadata: z
    .object({
      fileName: z.string().optional(),
      url: z.string().optional(),
      type: z.enum(['file', 'url', 'manual'])
    })
    .passthrough()
});

export type EmbeddingRequest = z.infer<typeof embeddingRequestSchema>;
