'use server';

/**
 * Policy CRUD server actions.
 * Manages pre- and post-generation policies per tenant.
 */

import { createAdminClient, createSessionClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { ID, Query } from 'node-appwrite';
import type { Policy, PolicyType, PolicyMode } from '@/types/appwrite';
import { logAuditEventAsync } from '@/lib/audit/logger';

// ---------------------------------------------------------------------------
// List policies for a tenant
// ---------------------------------------------------------------------------

export async function listPoliciesAction(
  tenantId: string
): Promise<{ success: boolean; policies?: Policy[]; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();
    const result = await databases.listDocuments<Policy>(
      APPWRITE_DATABASE,
      COLLECTION.POLICIES,
      [
        Query.equal('tenantId', tenantId),
        Query.orderAsc('priority'),
        Query.limit(100)
      ]
    );

    const policies = result.documents.map(parsePolicyDoc);
    return { success: true, policies };
  } catch (err) {
    console.error('listPoliciesAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to list policies'
    };
  }
}

// ---------------------------------------------------------------------------
// Get single policy
// ---------------------------------------------------------------------------

export async function getPolicyAction(
  policyId: string,
  tenantId: string
): Promise<{ success: boolean; policy?: Policy; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();
    const doc = await databases.getDocument<Policy>(
      APPWRITE_DATABASE,
      COLLECTION.POLICIES,
      policyId
    );

    if (doc.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    return { success: true, policy: parsePolicyDoc(doc) };
  } catch (err) {
    console.error('getPolicyAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get policy'
    };
  }
}

// ---------------------------------------------------------------------------
// Create policy
// ---------------------------------------------------------------------------

interface CreatePolicyInput {
  tenantId: string;
  name: string;
  type: PolicyType;
  mode: PolicyMode;
  config: Record<string, unknown>;
  enabled?: boolean;
  priority?: number;
}

export async function createPolicyAction(
  input: CreatePolicyInput
): Promise<{ success: boolean; policyId?: string; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();

    // Determine priority (append to end if not specified)
    let priority = input.priority;
    if (priority === undefined) {
      const existing = await databases.listDocuments(
        APPWRITE_DATABASE,
        COLLECTION.POLICIES,
        [
          Query.equal('tenantId', input.tenantId),
          Query.orderDesc('priority'),
          Query.limit(1)
        ]
      );
      priority =
        existing.documents.length > 0
          ? (existing.documents[0].priority as number) + 10
          : 10;
    }

    const doc = await databases.createDocument(
      APPWRITE_DATABASE,
      COLLECTION.POLICIES,
      ID.unique(),
      {
        tenantId: input.tenantId,
        name: input.name,
        type: input.type,
        mode: input.mode,
        config: JSON.stringify(input.config),
        enabled: input.enabled ?? true,
        priority
      }
    );

    logAuditEventAsync(input.tenantId, 'policy.created', {
      policyId: doc.$id,
      name: input.name,
      type: input.type
    });

    return { success: true, policyId: doc.$id };
  } catch (err) {
    console.error('createPolicyAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create policy'
    };
  }
}

// ---------------------------------------------------------------------------
// Update policy
// ---------------------------------------------------------------------------

interface UpdatePolicyInput {
  policyId: string;
  tenantId: string;
  name?: string;
  type?: PolicyType;
  mode?: PolicyMode;
  config?: Record<string, unknown>;
  enabled?: boolean;
  priority?: number;
}

export async function updatePolicyAction(
  input: UpdatePolicyInput
): Promise<{ success: boolean; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();

    // Verify tenant ownership
    const doc = await databases.getDocument(
      APPWRITE_DATABASE,
      COLLECTION.POLICIES,
      input.policyId
    );
    if (doc.tenantId !== input.tenantId) {
      return { success: false, error: 'Access denied' };
    }

    const update: Record<string, unknown> = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.type !== undefined) update.type = input.type;
    if (input.mode !== undefined) update.mode = input.mode;
    if (input.config !== undefined)
      update.config = JSON.stringify(input.config);
    if (input.enabled !== undefined) update.enabled = input.enabled;
    if (input.priority !== undefined) update.priority = input.priority;

    await databases.updateDocument(
      APPWRITE_DATABASE,
      COLLECTION.POLICIES,
      input.policyId,
      update
    );

    logAuditEventAsync(input.tenantId, 'policy.updated', {
      policyId: input.policyId,
      changes: Object.keys(update)
    });

    return { success: true };
  } catch (err) {
    console.error('updatePolicyAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update policy'
    };
  }
}

// ---------------------------------------------------------------------------
// Delete policy
// ---------------------------------------------------------------------------

export async function deletePolicyAction(
  policyId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();

    const doc = await databases.getDocument(
      APPWRITE_DATABASE,
      COLLECTION.POLICIES,
      policyId
    );
    if (doc.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    await databases.deleteDocument(
      APPWRITE_DATABASE,
      COLLECTION.POLICIES,
      policyId
    );

    logAuditEventAsync(tenantId, 'policy.deleted', { policyId });

    return { success: true };
  } catch (err) {
    console.error('deletePolicyAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete policy'
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePolicyDoc(doc: Policy): Policy {
  const plain = JSON.parse(JSON.stringify(doc));
  return {
    ...plain,
    config:
      typeof plain.config === 'string' ? JSON.parse(plain.config) : plain.config
  };
}
