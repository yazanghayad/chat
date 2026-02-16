/**
 * Tenant settings API.
 *
 * GET  /api/tenant/settings – Read current tenant config
 * PATCH /api/tenant/settings – Update tenant config (partial merge)
 *
 * Session-authenticated (dashboard use only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient, createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query } from 'node-appwrite';
import { z } from 'zod';
import type { Tenant, TenantConfig } from '@/types/appwrite';
import { logAuditEventAsync } from '@/lib/audit/logger';

// ---------------------------------------------------------------------------
// Validation schema for config updates
// ---------------------------------------------------------------------------

const tenantConfigSchema = z.object({
  channels: z
    .array(z.enum(['web', 'email', 'whatsapp', 'sms', 'voice']))
    .optional(),
  model: z.string().min(1).max(100).optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  maxHistoryMessages: z.number().int().min(1).max(50).optional(),
  customSystemPrompt: z.string().max(5000).optional(),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  cacheTtlSeconds: z.number().int().min(0).max(86400).optional()
});

// ---------------------------------------------------------------------------
// Helper: get tenant for session
// ---------------------------------------------------------------------------

async function getTenantFromSession(): Promise<Tenant | null> {
  try {
    const { account, databases } = await createSessionClient();
    const user = await account.get();

    const result = await databases.listDocuments<Tenant>(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      [Query.equal('userId', user.$id), Query.limit(1)]
    );

    return result.documents[0] ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET – read config
// ---------------------------------------------------------------------------

export async function GET() {
  const tenant = await getTenantFromSession();
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse config (stored as JSON string)
  let config: TenantConfig = {};
  try {
    config =
      typeof tenant.config === 'string'
        ? JSON.parse(tenant.config)
        : (tenant.config as TenantConfig);
  } catch {
    config = {};
  }

  return NextResponse.json({
    tenantId: tenant.$id,
    name: tenant.name,
    plan: tenant.plan,
    config
  });
}

// ---------------------------------------------------------------------------
// PATCH – update config
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  const tenant = await getTenantFromSession();
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = tenantConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid config',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message
        }))
      },
      { status: 400 }
    );
  }

  // Merge with existing config
  let existingConfig: TenantConfig = {};
  try {
    existingConfig =
      typeof tenant.config === 'string'
        ? JSON.parse(tenant.config)
        : (tenant.config as TenantConfig);
  } catch {
    existingConfig = {};
  }

  const updatedConfig: TenantConfig = {
    ...existingConfig,
    ...parsed.data
  };

  // Remove empty string values (treat as "unset")
  for (const [key, value] of Object.entries(updatedConfig)) {
    if (value === '') {
      delete (updatedConfig as Record<string, unknown>)[key];
    }
  }

  // Save
  const { databases } = createAdminClient();
  await databases.updateDocument(
    APPWRITE_DATABASE,
    COLLECTION.TENANTS,
    tenant.$id,
    { config: JSON.stringify(updatedConfig) }
  );

  logAuditEventAsync(tenant.$id, 'tenant.config_updated', {
    updatedFields: Object.keys(parsed.data)
  });

  return NextResponse.json({ config: updatedConfig });
}
