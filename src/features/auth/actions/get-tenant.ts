'use server';

import { createSessionClient, createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query, ID } from 'node-appwrite';
import type { Tenant } from '@/types/appwrite';

/**
 * Server action to get the current user's tenant.
 * Uses the session cookie for authentication (works with httpOnly cookies).
 * Auto-creates a tenant if none exists.
 */
export async function getCurrentTenantAction(): Promise<{
  tenant: Tenant | null;
  error: string | null;
}> {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();

    const { databases } = createAdminClient();

    // Look up existing tenant
    const result = await databases.listDocuments(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      [Query.equal('userId', user.$id), Query.limit(1)]
    );

    if (result.documents.length > 0) {
      return {
        tenant: JSON.parse(JSON.stringify(result.documents[0])) as Tenant,
        error: null
      };
    }

    // No tenant found – signup should have created one.
    // For legacy users without a tenant, auto-create with a generated subdomain.
    const slug =
      (user.name || user.email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 63) || `tenant-${Date.now()}`;

    const tenant = await databases.createDocument(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      ID.unique(),
      {
        name: user.name || user.email,
        plan: 'trial',
        config: JSON.stringify({ subdomain: slug }),
        apiKey: crypto.randomUUID().replace(/-/g, ''),
        userId: user.$id,
        subdomain: slug
      }
    );

    return {
      tenant: JSON.parse(JSON.stringify(tenant)) as Tenant,
      error: null
    };
  } catch (err) {
    return {
      tenant: null,
      error: err instanceof Error ? err.message : 'Failed to load tenant'
    };
  }
}
