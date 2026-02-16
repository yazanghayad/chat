'use server';

import { APPWRITE_BUCKET, APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { createAdminClient, createSessionClient } from '@/lib/appwrite/server';
import { COLLECTION } from '@/lib/appwrite/collections';
import { ID } from 'node-appwrite';

/**
 * Upload a file to Appwrite Storage and create a knowledge_source record.
 * Then triggers the background embedding process via the API route.
 */
export async function uploadFileAction(
  tenantId: string,
  formData: FormData
): Promise<{ success: boolean; sourceId?: string; error?: string }> {
  try {
    // Validate session
    const { account } = await createSessionClient();
    await account.get();

    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'text/csv'
    ];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.md')) {
      return {
        success: false,
        error: 'Unsupported file type. Allowed: PDF, DOCX, TXT, MD, CSV'
      };
    }

    // Size limit: 20 MB
    if (file.size > 20 * 1024 * 1024) {
      return {
        success: false,
        error: 'File too large. Maximum size is 20 MB.'
      };
    }

    const admin = createAdminClient();

    // Upload file to Appwrite Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { Storage } = await import('node-appwrite');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { InputFile } = require('node-appwrite/file') as {
      InputFile: {
        fromBuffer: (data: Buffer | Blob, name: string) => File;
      };
    };
    const storage = new Storage(admin.client);

    const uploaded = await storage.createFile(
      APPWRITE_BUCKET,
      ID.unique(),
      InputFile.fromBuffer(buffer, file.name)
    );

    // Create knowledge_source document
    const source = await admin.databases.createDocument(
      APPWRITE_DATABASE,
      COLLECTION.KNOWLEDGE_SOURCES,
      ID.unique(),
      {
        tenantId,
        type: 'file',
        url: null,
        fileId: uploaded.$id,
        status: 'processing',
        version: 1,
        metadata: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        })
      }
    );

    // Trigger background embedding asynchronously
    triggerEmbeddingJob(source.$id, tenantId, uploaded.$id, file.name).catch(
      (err) => console.error('Failed to trigger embedding job:', err)
    );

    return { success: true, sourceId: source.$id };
  } catch (err) {
    console.error('uploadFileAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Upload failed'
    };
  }
}

/**
 * Trigger the embedding job via Inngest (preferred) or fallback to API route.
 */
async function triggerEmbeddingJob(
  sourceId: string,
  tenantId: string,
  fileId: string,
  fileName: string
): Promise<void> {
  try {
    const { inngest } = await import('@/lib/inngest/client');
    await inngest.send({
      name: 'knowledge/chunk-and-embed',
      data: {
        sourceId,
        tenantId,
        type: 'file' as const,
        fileId,
        title: fileName,
        version: 1
      }
    });
    return;
  } catch {
    // Inngest not available, fall back to API
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceId,
      tenantId,
      fileId,
      fileName,
      type: 'file'
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Embedding API returned ${response.status}: ${body}`);
  }
}
