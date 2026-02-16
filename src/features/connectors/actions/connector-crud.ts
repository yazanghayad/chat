'use server';

/**
 * Data connector CRUD server actions.
 *
 * Data connectors integrate with third-party services (Shopify, Stripe, etc.)
 * and are used by procedure steps (api_call, data_lookup) to execute actions
 * on behalf of the tenant.
 */

import { createAdminClient, createSessionClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { ID, Query } from 'node-appwrite';
import type {
  DataConnector,
  DataConnectorProvider,
  ConnectorEndpoint
} from '@/types/appwrite';
import { logAuditEventAsync } from '@/lib/audit/logger';
import {
  encryptCredentials,
  decryptCredentials,
  maskCredentials,
  isEncryptionConfigured
} from '@/lib/encryption';

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listConnectorsAction(tenantId: string): Promise<{
  success: boolean;
  connectors?: DataConnector[];
  error?: string;
}> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();
    const result = await databases.listDocuments<DataConnector>(
      APPWRITE_DATABASE,
      COLLECTION.DATA_CONNECTORS,
      [
        Query.equal('tenantId', tenantId),
        Query.orderDesc('$createdAt'),
        Query.limit(50)
      ]
    );

    const connectors = result.documents.map((doc) => {
      const parsed = parseConnectorDoc(doc);
      // Mask credentials for listing
      if (parsed.auth?.credentials) {
        parsed.auth = {
          ...parsed.auth,
          credentials: maskCredentials(parsed.auth.credentials)
        };
      }
      return parsed;
    });

    return { success: true, connectors };
  } catch (err) {
    console.error('listConnectorsAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to list connectors'
    };
  }
}

// ---------------------------------------------------------------------------
// Get
// ---------------------------------------------------------------------------

export async function getConnectorAction(
  connectorId: string,
  tenantId: string
): Promise<{
  success: boolean;
  connector?: DataConnector;
  error?: string;
}> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();
    const doc = await databases.getDocument<DataConnector>(
      APPWRITE_DATABASE,
      COLLECTION.DATA_CONNECTORS,
      connectorId
    );

    if (doc.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    return { success: true, connector: parseConnectorDoc(doc) };
  } catch (err) {
    console.error('getConnectorAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get connector'
    };
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface CreateConnectorInput {
  name: string;
  provider: DataConnectorProvider;
  auth: {
    type: 'oauth' | 'api_key' | 'basic';
    credentials: Record<string, string>;
    baseUrl?: string;
  };
  config?: Record<string, unknown>;
  endpoints?: ConnectorEndpoint[];
  enabled?: boolean;
}

export async function createConnectorAction(
  tenantId: string,
  input: CreateConnectorInput
): Promise<{ success: boolean; connectorId?: string; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    if (!input.name || input.name.trim().length === 0) {
      return { success: false, error: 'Name is required' };
    }

    const { databases } = createAdminClient();

    // Encrypt credentials before storing
    const authToStore = { ...input.auth };
    if (isEncryptionConfigured() && authToStore.credentials) {
      authToStore.credentials = encryptCredentials(authToStore.credentials);
    }

    const doc = await databases.createDocument(
      APPWRITE_DATABASE,
      COLLECTION.DATA_CONNECTORS,
      ID.unique(),
      {
        tenantId,
        name: input.name.trim(),
        provider: input.provider,
        auth: JSON.stringify(authToStore),
        config: JSON.stringify(input.config ?? {}),
        endpoints: JSON.stringify(input.endpoints ?? []),
        enabled: input.enabled ?? true
      }
    );

    logAuditEventAsync(tenantId, 'connector.called', {
      action: 'created',
      connectorId: doc.$id,
      provider: input.provider,
      name: input.name
    });

    return { success: true, connectorId: doc.$id };
  } catch (err) {
    console.error('createConnectorAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create connector'
    };
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export interface UpdateConnectorInput {
  name?: string;
  auth?: {
    type: 'oauth' | 'api_key' | 'basic';
    credentials: Record<string, string>;
    baseUrl?: string;
  };
  config?: Record<string, unknown>;
  endpoints?: ConnectorEndpoint[];
  enabled?: boolean;
}

export async function updateConnectorAction(
  connectorId: string,
  tenantId: string,
  input: UpdateConnectorInput
): Promise<{ success: boolean; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();

    const existing = await databases.getDocument<DataConnector>(
      APPWRITE_DATABASE,
      COLLECTION.DATA_CONNECTORS,
      connectorId
    );
    if (existing.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.auth !== undefined) {
      // Encrypt credentials before storing
      const authToStore = { ...input.auth };
      if (isEncryptionConfigured() && authToStore.credentials) {
        authToStore.credentials = encryptCredentials(authToStore.credentials);
      }
      updates.auth = JSON.stringify(authToStore);
    }
    if (input.config !== undefined)
      updates.config = JSON.stringify(input.config);
    if (input.endpoints !== undefined)
      updates.endpoints = JSON.stringify(input.endpoints);
    if (input.enabled !== undefined) updates.enabled = input.enabled;

    await databases.updateDocument(
      APPWRITE_DATABASE,
      COLLECTION.DATA_CONNECTORS,
      connectorId,
      updates
    );

    return { success: true };
  } catch (err) {
    console.error('updateConnectorAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update connector'
    };
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteConnectorAction(
  connectorId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();

    const existing = await databases.getDocument<DataConnector>(
      APPWRITE_DATABASE,
      COLLECTION.DATA_CONNECTORS,
      connectorId
    );
    if (existing.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    await databases.deleteDocument(
      APPWRITE_DATABASE,
      COLLECTION.DATA_CONNECTORS,
      connectorId
    );

    return { success: true };
  } catch (err) {
    console.error('deleteConnectorAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete connector'
    };
  }
}

// ---------------------------------------------------------------------------
// Test connection
// ---------------------------------------------------------------------------

/**
 * Test a connector by making a simple request to its first endpoint.
 */
export async function testConnectorAction(
  connectorId: string,
  tenantId: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();
    const doc = await databases.getDocument<DataConnector>(
      APPWRITE_DATABASE,
      COLLECTION.DATA_CONNECTORS,
      connectorId
    );

    if (doc.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    const connector = parseConnectorDoc(doc);
    const authConfig = connector.auth;
    const baseUrl = (authConfig as Record<string, unknown>).baseUrl as
      | string
      | undefined;

    if (!baseUrl) {
      return { success: false, error: 'Connector has no baseUrl configured' };
    }

    // Simple health check: GET to baseUrl
    const headers: Record<string, string> = {};
    const creds = authConfig.credentials ?? {};

    if (authConfig.type === 'api_key' && creds.apiKey) {
      headers['Authorization'] = `Bearer ${creds.apiKey}`;
    } else if (authConfig.type === 'basic' && creds.username) {
      const basic = Buffer.from(
        `${creds.username}:${creds.password ?? ''}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    } else if (authConfig.type === 'oauth' && creds.accessToken) {
      headers['Authorization'] = `Bearer ${creds.accessToken}`;
    }

    const response = await fetch(baseUrl, { headers, method: 'GET' });

    return { success: response.ok, status: response.status };
  } catch (err) {
    console.error('testConnectorAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Connection test failed'
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseConnectorDoc(doc: DataConnector): DataConnector {
  const plain = JSON.parse(JSON.stringify(doc));
  const parsed = {
    ...plain,
    auth: typeof plain.auth === 'string' ? JSON.parse(plain.auth) : plain.auth,
    config:
      typeof plain.config === 'string'
        ? JSON.parse(plain.config)
        : (plain.config ?? {}),
    endpoints:
      typeof plain.endpoints === 'string'
        ? JSON.parse(plain.endpoints)
        : (plain.endpoints ?? [])
  };

  // Decrypt credentials if encryption is configured
  if (isEncryptionConfigured() && parsed.auth?.credentials) {
    try {
      parsed.auth = {
        ...parsed.auth,
        credentials: decryptCredentials(parsed.auth.credentials)
      };
    } catch {
      // If decryption fails, credentials may be stored unencrypted (legacy)
    }
  }

  return parsed;
}
