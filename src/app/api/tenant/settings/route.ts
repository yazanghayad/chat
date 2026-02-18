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
import {
  validateSubdomain,
  normalizeSubdomain,
  isSubdomainAvailable
} from '@/lib/tenant/subdomain';

// ---------------------------------------------------------------------------
// Validation schemas
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

/**
 * Schema for "general settings" fields that live on the tenant document
 * and/or in the config JSON (timezone, language).
 */
const generalSettingsSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  subdomain: z.string().min(3).max(63).optional(),
  timezone: z.string().max(64).optional(),
  language: z.string().max(10).optional()
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
  const generalParsed = generalSettingsSchema.safeParse(body);

  // At least one schema should match
  if (!parsed.success && !generalParsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid settings',
        details: [
          ...(parsed.error?.issues ?? []).map((i) => ({
            path: i.path.join('.'),
            message: i.message
          })),
          ...(generalParsed.error?.issues ?? []).map((i) => ({
            path: i.path.join('.'),
            message: i.message
          }))
        ]
      },
      { status: 400 }
    );
  }

  const { databases } = createAdminClient();

  // ── Handle general settings (name, subdomain, timezone, language) ──
  const general = generalParsed.success ? generalParsed.data : {};
  const docUpdate: Record<string, unknown> = {};

  if (general.name) {
    docUpdate.name = general.name;
  }

  if (general.subdomain) {
    const normalized = normalizeSubdomain(general.subdomain);
    const validationError = validateSubdomain(normalized);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const available = await isSubdomainAvailable(normalized, tenant.$id);
    if (!available) {
      return NextResponse.json(
        { error: 'This subdomain is already taken. Please choose another.' },
        { status: 409 }
      );
    }
    docUpdate.subdomain = normalized;
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

  const configUpdate = parsed.success ? parsed.data : {};
  const updatedConfig: TenantConfig = {
    ...existingConfig,
    ...configUpdate,
    // Store timezone & language in config JSON too
    ...(general.timezone ? { timezone: general.timezone } : {}),
    ...(general.language ? { language: general.language } : {}),
    ...(general.subdomain
      ? { subdomain: normalizeSubdomain(general.subdomain) }
      : {})
  };

  // Remove empty string values (treat as "unset")
  for (const [key, value] of Object.entries(updatedConfig)) {
    if (value === '') {
      delete (updatedConfig as Record<string, unknown>)[key];
    }
  }

  // Merge doc-level fields + config
  docUpdate.config = JSON.stringify(updatedConfig);

  // Save
  await databases.updateDocument(
    APPWRITE_DATABASE,
    COLLECTION.TENANTS,
    tenant.$id,
    docUpdate
  );

  logAuditEventAsync(tenant.$id, 'tenant.config_updated', {
    updatedFields: [...Object.keys(configUpdate), ...Object.keys(general)]
  });

  return NextResponse.json({
    config: updatedConfig,
    name: general.name ?? tenant.name,
    subdomain: (docUpdate.subdomain as string) ?? tenant.subdomain
  });
}
