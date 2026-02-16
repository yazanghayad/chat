/**
 * GET /api/knowledge/export
 *
 * Export knowledge base as a downloadable JSON file.
 * Session-authenticated (dashboard).
 */

import { NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query } from 'node-appwrite';
import { exportKnowledgeBaseAction } from '@/features/knowledge/actions/export-import';
import type { Tenant } from '@/types/appwrite';

export async function GET() {
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

  const { success, manifest, error } = await exportKnowledgeBaseAction(
    tenant.$id
  );

  if (!success || !manifest) {
    return NextResponse.json(
      { error: error ?? 'Export failed' },
      { status: 500 }
    );
  }

  const jsonStr = JSON.stringify(manifest, null, 2);
  const fileName = `knowledge-export-${tenant.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(jsonStr, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store'
    }
  });
}
