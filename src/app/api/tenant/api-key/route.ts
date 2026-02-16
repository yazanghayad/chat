/**
 * API Key rotation endpoint.
 *
 * POST /api/tenant/api-key – Regenerate the tenant's API key
 *
 * Session-authenticated. The old key gets a 24-hour grace period
 * stored in `previousApiKey` + `previousApiKeyExpiresAt` on tenant doc.
 */

import { NextResponse } from 'next/server';
import { createSessionClient, createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query } from 'node-appwrite';
import type { Tenant } from '@/types/appwrite';
import { logAuditEventAsync } from '@/lib/audit/logger';
import crypto from 'node:crypto';

// Grace period: old key remains valid for 24 hours after rotation
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

export async function POST() {
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

  // Generate new API key
  const newApiKey = crypto.randomUUID().replace(/-/g, '');
  const now = new Date();
  const graceExpiresAt = new Date(
    now.getTime() + GRACE_PERIOD_MS
  ).toISOString();

  // Parse existing config
  let config: Record<string, unknown> = {};
  try {
    config =
      typeof tenant.config === 'string'
        ? JSON.parse(tenant.config)
        : (tenant.config as Record<string, unknown>);
  } catch {
    config = {};
  }

  // Store previous key with expiry in config
  config.previousApiKey = tenant.apiKey;
  config.previousApiKeyExpiresAt = graceExpiresAt;

  // Update tenant document
  const { databases } = createAdminClient();
  await databases.updateDocument(
    APPWRITE_DATABASE,
    COLLECTION.TENANTS,
    tenant.$id,
    {
      apiKey: newApiKey,
      config: JSON.stringify(config)
    }
  );

  logAuditEventAsync(tenant.$id, 'apikey.rotated', {
    graceExpiresAt,
    rotatedAt: now.toISOString()
  });

  return NextResponse.json({
    apiKey: newApiKey,
    previousKeyValidUntil: graceExpiresAt,
    message:
      'New API key generated. Your old key will remain valid for 24 hours.'
  });
}
