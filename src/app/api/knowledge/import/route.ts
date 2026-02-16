/**
 * POST /api/knowledge/import
 *
 * Import knowledge base from a JSON manifest file.
 * Session-authenticated (dashboard).
 *
 * Accepts: application/json body with the manifest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query } from 'node-appwrite';
import { importKnowledgeBaseAction } from '@/features/knowledge/actions/export-import';
import type { Tenant } from '@/types/appwrite';

export async function POST(request: NextRequest) {
  // Authenticate via session
  let tenant: Tenant;
  try {
    const { account, databases } = await createSessionClient();
    const user = await account.get();

    const result = await databases.listDocuments<Tenant>(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      [Query.equal('userId', user.$id), Query.limit(1)]
    );

    if (result.documents.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    tenant = result.documents[0];
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse manifest from body
  let manifest: unknown;
  try {
    manifest = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Basic validation
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    (manifest as Record<string, unknown>).version !== 1
  ) {
    return NextResponse.json(
      { error: 'Invalid manifest format. Expected version: 1' },
      { status: 400 }
    );
  }

  const { success, result, error } = await importKnowledgeBaseAction(
    tenant.$id,
    manifest as Parameters<typeof importKnowledgeBaseAction>[1]
  );

  if (!success) {
    return NextResponse.json(
      { error: error ?? 'Import failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, result });
}
