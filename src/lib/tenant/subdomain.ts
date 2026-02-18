/**
 * Subdomain validation & lookup utilities.
 */

import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query } from 'node-appwrite';
import type { Tenant } from '@/types/appwrite';

/** Reserved subdomains that cannot be claimed by tenants. */
const RESERVED = new Set([
  'www',
  'app',
  'api',
  'admin',
  'mail',
  'smtp',
  'imap',
  'pop',
  'ftp',
  'dev',
  'staging',
  'test',
  'demo',
  'help',
  'docs',
  'status',
  'blog',
  'support',
  'dashboard',
  'auth',
  'login',
  'signup',
  'register',
  'billing',
  'cdn',
  'assets',
  'static',
  'ns1',
  'ns2'
]);

/** Regex for valid subdomain slug: lowercase alphanumeric + hyphens, 3-63 chars. */
const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

/**
 * Validate a subdomain slug.
 * Returns null if valid, or an error message string.
 */
export function validateSubdomain(slug: string): string | null {
  if (!slug) return 'Subdomain is required';
  const normalized = slug.toLowerCase().trim();
  if (normalized.length < 3) return 'Subdomain must be at least 3 characters';
  if (normalized.length > 63) return 'Subdomain must be at most 63 characters';
  if (!SUBDOMAIN_REGEX.test(normalized))
    return 'Only lowercase letters, numbers, and hyphens allowed (cannot start/end with hyphen)';
  if (RESERVED.has(normalized))
    return 'This subdomain is reserved. Please choose another.';
  return null;
}

/**
 * Normalize a subdomain slug (lowercase, trim).
 */
export function normalizeSubdomain(slug: string): string {
  return slug.toLowerCase().trim();
}

/**
 * Check if a subdomain is available (not taken by another tenant).
 * @param slug  The subdomain to check.
 * @param excludeTenantId  Exclude this tenant (for updates).
 * @returns true if available.
 */
export async function isSubdomainAvailable(
  slug: string,
  excludeTenantId?: string
): Promise<boolean> {
  const { databases } = createAdminClient();
  const normalized = normalizeSubdomain(slug);

  const result = await databases.listDocuments<Tenant>(
    APPWRITE_DATABASE,
    COLLECTION.TENANTS,
    [Query.equal('subdomain', normalized), Query.limit(1)]
  );

  if (result.documents.length === 0) return true;
  if (excludeTenantId && result.documents[0].$id === excludeTenantId)
    return true;
  return false;
}

/**
 * Look up a tenant by subdomain slug.
 */
export async function getTenantBySubdomain(
  slug: string
): Promise<Tenant | null> {
  const { databases } = createAdminClient();
  const normalized = normalizeSubdomain(slug);

  const result = await databases.listDocuments<Tenant>(
    APPWRITE_DATABASE,
    COLLECTION.TENANTS,
    [Query.equal('subdomain', normalized), Query.limit(1)]
  );

  return result.documents[0] ?? null;
}
