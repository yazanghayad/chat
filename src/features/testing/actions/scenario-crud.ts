'use server';

/**
 * Test scenario CRUD server actions.
 */

import { createAdminClient, createSessionClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { ID, Query } from 'node-appwrite';
import type { TestScenario, TestScenarioExpected } from '@/types/appwrite';
import { runSimulation } from '@/lib/ai/simulation-engine';
import { logAuditEventAsync } from '@/lib/audit/logger';

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listScenariosAction(
  tenantId: string
): Promise<{ success: boolean; scenarios?: TestScenario[]; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();
    const result = await databases.listDocuments<TestScenario>(
      APPWRITE_DATABASE,
      COLLECTION.TEST_SCENARIOS,
      [
        Query.equal('tenantId', tenantId),
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ]
    );

    const scenarios = result.documents.map(parseScenarioDoc);

    return { success: true, scenarios };
  } catch (err) {
    console.error('listScenariosAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to list scenarios'
    };
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface CreateScenarioInput {
  name: string;
  messages: string[];
  expectedOutcome: TestScenarioExpected;
}

export async function createScenarioAction(
  tenantId: string,
  input: CreateScenarioInput
): Promise<{ success: boolean; scenarioId?: string; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    if (!input.name || input.name.trim().length === 0) {
      return { success: false, error: 'Name is required' };
    }
    if (!input.messages || input.messages.length === 0) {
      return { success: false, error: 'At least one message is required' };
    }

    const { databases } = createAdminClient();

    const doc = await databases.createDocument(
      APPWRITE_DATABASE,
      COLLECTION.TEST_SCENARIOS,
      ID.unique(),
      {
        tenantId,
        name: input.name.trim(),
        messages: JSON.stringify(input.messages),
        expectedOutcome: JSON.stringify(input.expectedOutcome),
        lastRun: null
      }
    );

    return { success: true, scenarioId: doc.$id };
  } catch (err) {
    console.error('createScenarioAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create scenario'
    };
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateScenarioAction(
  scenarioId: string,
  tenantId: string,
  input: Partial<CreateScenarioInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();

    const existing = await databases.getDocument<TestScenario>(
      APPWRITE_DATABASE,
      COLLECTION.TEST_SCENARIOS,
      scenarioId
    );
    if (existing.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.messages !== undefined)
      updates.messages = JSON.stringify(input.messages);
    if (input.expectedOutcome !== undefined)
      updates.expectedOutcome = JSON.stringify(input.expectedOutcome);

    await databases.updateDocument(
      APPWRITE_DATABASE,
      COLLECTION.TEST_SCENARIOS,
      scenarioId,
      updates
    );

    return { success: true };
  } catch (err) {
    console.error('updateScenarioAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update scenario'
    };
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteScenarioAction(
  scenarioId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();

    const existing = await databases.getDocument<TestScenario>(
      APPWRITE_DATABASE,
      COLLECTION.TEST_SCENARIOS,
      scenarioId
    );
    if (existing.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    await databases.deleteDocument(
      APPWRITE_DATABASE,
      COLLECTION.TEST_SCENARIOS,
      scenarioId
    );

    return { success: true };
  } catch (err) {
    console.error('deleteScenarioAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete scenario'
    };
  }
}

// ---------------------------------------------------------------------------
// Run scenario
// ---------------------------------------------------------------------------

export interface RunScenarioResult {
  success: boolean;
  passed: boolean;
  actualResolution: boolean;
  actualAvgConfidence: number;
  expectedResolution: boolean;
  expectedMinConfidence: number;
  turns: number;
  error?: string;
}

export async function runScenarioAction(
  scenarioId: string,
  tenantId: string
): Promise<RunScenarioResult> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();

    const doc = await databases.getDocument<TestScenario>(
      APPWRITE_DATABASE,
      COLLECTION.TEST_SCENARIOS,
      scenarioId
    );
    if (doc.tenantId !== tenantId) {
      return {
        success: false,
        passed: false,
        actualResolution: false,
        actualAvgConfidence: 0,
        expectedResolution: false,
        expectedMinConfidence: 0,
        turns: 0,
        error: 'Access denied'
      };
    }

    const scenario = parseScenarioDoc(doc);
    const messages = scenario.messages;
    const expected = scenario.expectedOutcome;

    // Run simulation
    const result = await runSimulation({
      tenantId,
      messages,
      testProcedures: true
    });

    // Update lastRun
    await databases.updateDocument(
      APPWRITE_DATABASE,
      COLLECTION.TEST_SCENARIOS,
      scenarioId,
      { lastRun: new Date().toISOString() }
    );

    // Compare result vs expected
    const actualResolution = result.metrics.resolutionRate > 0.5;
    const actualAvgConfidence = result.metrics.avgConfidence;
    const expectedResolution = expected.resolved;
    const expectedMinConfidence = expected.minConfidence ?? 0;

    const passed =
      actualResolution === expectedResolution &&
      actualAvgConfidence >= expectedMinConfidence;

    logAuditEventAsync(tenantId, 'simulation.run', {
      scenarioId,
      passed,
      actualResolution,
      actualAvgConfidence,
      turns: result.metrics.totalTurns
    });

    return {
      success: true,
      passed,
      actualResolution,
      actualAvgConfidence,
      expectedResolution,
      expectedMinConfidence,
      turns: result.metrics.totalTurns
    };
  } catch (err) {
    console.error('runScenarioAction error:', err);
    return {
      success: false,
      passed: false,
      actualResolution: false,
      actualAvgConfidence: 0,
      expectedResolution: false,
      expectedMinConfidence: 0,
      turns: 0,
      error: err instanceof Error ? err.message : 'Failed to run scenario'
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseScenarioDoc(doc: TestScenario): TestScenario {
  return {
    ...doc,
    messages:
      typeof doc.messages === 'string'
        ? JSON.parse(doc.messages)
        : doc.messages,
    expectedOutcome:
      typeof doc.expectedOutcome === 'string'
        ? JSON.parse(doc.expectedOutcome)
        : doc.expectedOutcome
  };
}
