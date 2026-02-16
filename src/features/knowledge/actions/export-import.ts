'use server';

/**
 * Knowledge base export/import server actions.
 *
 * Export: Packages all knowledge sources + content into a JSON manifest.
 * Import: Restores from a manifest, creating sources + triggering embeddings.
 */

import { createSessionClient, createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE, APPWRITE_BUCKET } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { ID, Query } from 'node-appwrite';
import { logAuditEventAsync } from '@/lib/audit/logger';
import type { KnowledgeSource } from '@/types/appwrite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KnowledgeExportManifest {
  version: 1;
  exportedAt: string;
  tenantId: string;
  tenantName: string;
  sourceCount: number;
  sources: ExportedSource[];
}

export interface ExportedSource {
  type: 'url' | 'file' | 'manual';
  url: string | null;
  title: string | null;
  content: string | null;
  fileName: string | null;
  version: number;
  metadata: Record<string, unknown>;
  originalId: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  details: Array<{
    originalId: string;
    status: 'imported' | 'skipped' | 'failed';
    newId?: string;
    reason?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Export all knowledge sources for a tenant as a JSON manifest.
 */
export async function exportKnowledgeBaseAction(tenantId: string): Promise<{
  success: boolean;
  manifest?: KnowledgeExportManifest;
  error?: string;
}> {
  try {
    const { account, databases } = await createSessionClient();
    const user = await account.get();

    // Verify tenant ownership
    const tenants = await databases.listDocuments(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      [Query.equal('userId', user.$id), Query.limit(1)]
    );

    if (
      tenants.documents.length === 0 ||
      tenants.documents[0].$id !== tenantId
    ) {
      return { success: false, error: 'Access denied' };
    }

    const tenant = tenants.documents[0];

    // Fetch all knowledge sources
    const admin = createAdminClient();
    const result = await admin.databases.listDocuments<KnowledgeSource>(
      APPWRITE_DATABASE,
      COLLECTION.KNOWLEDGE_SOURCES,
      [Query.equal('tenantId', tenantId), Query.limit(500)]
    );

    const sources: ExportedSource[] = [];

    for (const source of result.documents) {
      const metadata = (() => {
        try {
          return typeof source.metadata === 'string'
            ? JSON.parse(source.metadata as unknown as string)
            : source.metadata;
        } catch {
          return {};
        }
      })();

      let content: string | null = null;

      // For file sources, try to download content
      if (source.type === 'file' && source.fileId) {
        try {
          const { Storage } = await import('node-appwrite');
          const storage = new Storage(admin.client);
          const fileData = await storage.getFileDownload(
            APPWRITE_BUCKET,
            source.fileId
          );
          if (fileData instanceof ArrayBuffer) {
            content = new TextDecoder().decode(fileData);
          }
        } catch (err) {
          console.warn(
            `[export] Could not download file ${source.fileId}:`,
            err
          );
        }
      }

      sources.push({
        type: source.type,
        url: source.url ?? null,
        title: metadata.title ?? null,
        content,
        fileName: metadata.fileName ?? null,
        version: source.version ?? 1,
        metadata,
        originalId: source.$id
      });
    }

    const manifest: KnowledgeExportManifest = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tenantId,
      tenantName: tenant.name as string,
      sourceCount: sources.length,
      sources
    };

    logAuditEventAsync(tenantId, 'knowledge.exported', {
      sourceCount: sources.length
    });

    return { success: true, manifest };
  } catch (err) {
    console.error('exportKnowledgeBaseAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Export failed'
    };
  }
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Import knowledge sources from a JSON manifest.
 * Skips duplicates (by URL or title match).
 */
export async function importKnowledgeBaseAction(
  tenantId: string,
  manifest: KnowledgeExportManifest
): Promise<{
  success: boolean;
  result?: ImportResult;
  error?: string;
}> {
  try {
    await (await createSessionClient()).account.get();

    // Validate manifest format
    if (manifest.version !== 1) {
      return { success: false, error: 'Unsupported manifest version' };
    }

    if (!Array.isArray(manifest.sources)) {
      return {
        success: false,
        error: 'Invalid manifest: sources must be an array'
      };
    }

    const admin = createAdminClient();

    // Fetch existing sources to detect duplicates
    const existing = await admin.databases.listDocuments<KnowledgeSource>(
      APPWRITE_DATABASE,
      COLLECTION.KNOWLEDGE_SOURCES,
      [Query.equal('tenantId', tenantId), Query.limit(500)]
    );

    const existingUrls = new Set(
      existing.documents.filter((s) => s.url).map((s) => s.url)
    );

    const existingTitles = new Set(
      existing.documents
        .map((s) => {
          try {
            const meta =
              typeof s.metadata === 'string'
                ? JSON.parse(s.metadata as unknown as string)
                : s.metadata;
            return meta?.title ?? null;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    );

    const importResult: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';

    for (const source of manifest.sources) {
      // Check for duplicates
      if (source.url && existingUrls.has(source.url)) {
        importResult.skipped++;
        importResult.details.push({
          originalId: source.originalId,
          status: 'skipped',
          reason: `URL already exists: ${source.url}`
        });
        continue;
      }

      if (source.title && existingTitles.has(source.title)) {
        importResult.skipped++;
        importResult.details.push({
          originalId: source.originalId,
          status: 'skipped',
          reason: `Title already exists: ${source.title}`
        });
        continue;
      }

      try {
        // Create the knowledge source document
        const doc = await admin.databases.createDocument(
          APPWRITE_DATABASE,
          COLLECTION.KNOWLEDGE_SOURCES,
          ID.unique(),
          {
            tenantId,
            type: source.type,
            url: source.url ?? null,
            fileId: null,
            status: 'processing',
            version: 1,
            metadata: JSON.stringify({
              title: source.title,
              fileName: source.fileName,
              importedFrom: source.originalId,
              importedAt: new Date().toISOString()
            })
          }
        );

        // Trigger embedding via Inngest or fallback to /api/embeddings
        try {
          const { inngest } = await import('@/lib/inngest/client');
          await inngest.send({
            name: 'knowledge/chunk-and-embed',
            data: {
              sourceId: doc.$id,
              tenantId,
              type: source.type,
              url: source.url ?? undefined,
              content: source.content ?? undefined,
              title: source.title ?? undefined,
              version: 1
            }
          });
        } catch {
          // Fallback: fire-and-forget API call
          fetch(`${baseUrl}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceId: doc.$id,
              tenantId,
              type: source.type,
              url: source.url,
              content: source.content
            })
          }).catch(console.error);
        }

        importResult.imported++;
        importResult.details.push({
          originalId: source.originalId,
          status: 'imported',
          newId: doc.$id
        });
      } catch (err) {
        importResult.failed++;
        importResult.details.push({
          originalId: source.originalId,
          status: 'failed',
          reason: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    logAuditEventAsync(tenantId, 'knowledge.imported', {
      imported: importResult.imported,
      skipped: importResult.skipped,
      failed: importResult.failed
    });

    return { success: true, result: importResult };
  } catch (err) {
    console.error('importKnowledgeBaseAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Import failed'
    };
  }
}
