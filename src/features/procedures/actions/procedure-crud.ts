'use server';

/**
 * Procedure CRUD server actions.
 */

import { createAdminClient, createSessionClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { ID, Query } from 'node-appwrite';
import type {
  Procedure,
  ProcedureTrigger,
  ProcedureStep
} from '@/types/appwrite';
import { logAuditEventAsync } from '@/lib/audit/logger';

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listProceduresAction(
  tenantId: string
): Promise<{ success: boolean; procedures?: Procedure[]; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();
    const result = await databases.listDocuments<Procedure>(
      APPWRITE_DATABASE,
      COLLECTION.PROCEDURES,
      [
        Query.equal('tenantId', tenantId),
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ]
    );

    // Parse JSON fields
    const procedures = result.documents.map(parseProcedureDoc);

    return { success: true, procedures };
  } catch (err) {
    console.error('listProceduresAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to list procedures'
    };
  }
}

// ---------------------------------------------------------------------------
// Get
// ---------------------------------------------------------------------------

export async function getProcedureAction(
  procedureId: string,
  tenantId: string
): Promise<{ success: boolean; procedure?: Procedure; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();
    const doc = await databases.getDocument<Procedure>(
      APPWRITE_DATABASE,
      COLLECTION.PROCEDURES,
      procedureId
    );

    if (doc.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    return { success: true, procedure: parseProcedureDoc(doc) };
  } catch (err) {
    console.error('getProcedureAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get procedure'
    };
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface CreateProcedureInput {
  name: string;
  description?: string;
  trigger: ProcedureTrigger;
  steps: ProcedureStep[];
  enabled?: boolean;
}

export async function createProcedureAction(
  tenantId: string,
  input: CreateProcedureInput
): Promise<{ success: boolean; procedureId?: string; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    if (!input.name || input.name.trim().length === 0) {
      return { success: false, error: 'Name is required' };
    }

    if (!input.steps || input.steps.length === 0) {
      return { success: false, error: 'At least one step is required' };
    }

    const { databases } = createAdminClient();

    const doc = await databases.createDocument(
      APPWRITE_DATABASE,
      COLLECTION.PROCEDURES,
      ID.unique(),
      {
        tenantId,
        name: input.name.trim(),
        description: input.description ?? '',
        trigger: JSON.stringify(input.trigger),
        steps: JSON.stringify(input.steps),
        enabled: input.enabled ?? true,
        version: 1
      }
    );

    logAuditEventAsync(tenantId, 'procedure.triggered', {
      action: 'created',
      procedureId: doc.$id,
      name: input.name
    });

    return { success: true, procedureId: doc.$id };
  } catch (err) {
    console.error('createProcedureAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create procedure'
    };
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export interface UpdateProcedureInput {
  name?: string;
  description?: string;
  trigger?: ProcedureTrigger;
  steps?: ProcedureStep[];
  enabled?: boolean;
}

export async function updateProcedureAction(
  procedureId: string,
  tenantId: string,
  input: UpdateProcedureInput
): Promise<{ success: boolean; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();

    // Verify ownership
    const existing = await databases.getDocument<Procedure>(
      APPWRITE_DATABASE,
      COLLECTION.PROCEDURES,
      procedureId
    );
    if (existing.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.trigger !== undefined)
      updates.trigger = JSON.stringify(input.trigger);
    if (input.steps !== undefined) {
      updates.steps = JSON.stringify(input.steps);
      // Increment version when steps change
      updates.version = (existing.version ?? 1) + 1;
    }
    if (input.enabled !== undefined) updates.enabled = input.enabled;

    await databases.updateDocument(
      APPWRITE_DATABASE,
      COLLECTION.PROCEDURES,
      procedureId,
      updates
    );

    return { success: true };
  } catch (err) {
    console.error('updateProcedureAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update procedure'
    };
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteProcedureAction(
  procedureId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();

    const existing = await databases.getDocument<Procedure>(
      APPWRITE_DATABASE,
      COLLECTION.PROCEDURES,
      procedureId
    );
    if (existing.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    await databases.deleteDocument(
      APPWRITE_DATABASE,
      COLLECTION.PROCEDURES,
      procedureId
    );

    return { success: true };
  } catch (err) {
    console.error('deleteProcedureAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete procedure'
    };
  }
}

// ---------------------------------------------------------------------------
// Toggle enabled
// ---------------------------------------------------------------------------

export async function toggleProcedureAction(
  procedureId: string,
  tenantId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  return updateProcedureAction(procedureId, tenantId, { enabled });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseProcedureDoc(doc: Procedure): Procedure {
  const plain = JSON.parse(JSON.stringify(doc));
  return {
    ...plain,
    trigger:
      typeof plain.trigger === 'string'
        ? JSON.parse(plain.trigger)
        : plain.trigger,
    steps:
      typeof plain.steps === 'string' ? JSON.parse(plain.steps) : plain.steps
  };
}
