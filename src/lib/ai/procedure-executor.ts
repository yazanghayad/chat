/**
 * Procedure executor – state machine that runs multi-step workflows.
 *
 * A procedure is a sequence of steps (message, api_call, data_lookup,
 * conditional, approval) that the AI can execute when triggered by an
 * intent or keyword match.
 */

import type {
  Procedure,
  ProcedureStep,
  DataConnector,
  ConnectorEndpoint
} from '@/types/appwrite';
import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query } from 'node-appwrite';
import { logAuditEventAsync } from '@/lib/audit/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcedureContext {
  tenantId: string;
  conversationId: string;
  userId?: string;
  /** Template variables available for interpolation (e.g. {{user.email}}). */
  variables: Record<string, unknown>;
  /** When true, skip actual API calls and approvals (simulation mode). */
  dryRun?: boolean;
}

export interface StepResult {
  stepId: string;
  type: ProcedureStep['type'];
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
}

export interface ProcedureResult {
  procedureId: string;
  procedureName: string;
  success: boolean;
  steps: StepResult[];
  /** Final message to send back to the user, if any. */
  finalMessage: string | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Template interpolation
// ---------------------------------------------------------------------------

/**
 * Replace `{{key}}` and `{{nested.key}}` placeholders with values from context.
 */
function interpolate(
  template: string,
  variables: Record<string, unknown>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
    const keys = path.trim().split('.');
    let value: unknown = variables;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return `{{${path}}}`; // keep original if not found
      }
    }
    return String(value ?? '');
  });
}

/**
 * Evaluate a simple condition expression like `{{order.total}} > 100`.
 * Supports: >, <, >=, <=, ==, !=
 */
function evaluateCondition(
  expression: string,
  variables: Record<string, unknown>
): boolean {
  const interpolated = interpolate(expression, variables);

  // Try numeric comparison patterns
  const match = interpolated.match(/^(.+?)\s*(>=|<=|!=|==|>|<)\s*(.+?)$/);
  if (!match) return false;

  const [, leftStr, operator, rightStr] = match;
  const left = parseFloat(leftStr.trim());
  const right = parseFloat(rightStr.trim());

  if (isNaN(left) || isNaN(right)) {
    // String comparison for == and !=
    const l = leftStr.trim();
    const r = rightStr.trim();
    if (operator === '==') return l === r;
    if (operator === '!=') return l !== r;
    return false;
  }

  switch (operator) {
    case '>':
      return left > right;
    case '<':
      return left < right;
    case '>=':
      return left >= right;
    case '<=':
      return left <= right;
    case '==':
      return left === right;
    case '!=':
      return left !== right;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Step executors
// ---------------------------------------------------------------------------

async function executeMessageStep(
  step: ProcedureStep,
  context: ProcedureContext
): Promise<StepResult> {
  const template =
    (step.config.template as string) ?? (step.config.message as string) ?? '';
  const message = interpolate(template, context.variables);

  return {
    stepId: step.id,
    type: 'message',
    success: true,
    output: { message }
  };
}

async function executeAPICallStep(
  step: ProcedureStep,
  context: ProcedureContext
): Promise<StepResult> {
  if (context.dryRun) {
    return {
      stepId: step.id,
      type: 'api_call',
      success: true,
      output: { _dryRun: true, message: 'API call skipped (dry run)' }
    };
  }

  const connectorId = step.config.dataConnector as string;
  const endpointId = step.config.endpoint as string;

  if (!connectorId || !endpointId) {
    return {
      stepId: step.id,
      type: 'api_call',
      success: false,
      output: {},
      error: 'Missing dataConnector or endpoint in step config'
    };
  }

  try {
    const connector = await loadConnector(context.tenantId, connectorId);
    if (!connector) {
      return {
        stepId: step.id,
        type: 'api_call',
        success: false,
        output: {},
        error: `Connector "${connectorId}" not found`
      };
    }

    const endpoint = connector.endpoints.find(
      (e: ConnectorEndpoint) => e.id === endpointId
    );
    if (!endpoint) {
      return {
        stepId: step.id,
        type: 'api_call',
        success: false,
        output: {},
        error: `Endpoint "${endpointId}" not found on connector "${connectorId}"`
      };
    }

    // Build URL with interpolated params
    const params = step.config.params as Record<string, string> | undefined;
    let path = endpoint.path;
    const queryParams: Record<string, string> = {};

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        const interpolated = interpolate(String(value), context.variables);
        if (path.includes(`{{${key}}}`)) {
          path = path.replace(`{{${key}}}`, encodeURIComponent(interpolated));
        } else {
          queryParams[key] = interpolated;
        }
      }
    }

    // Get base URL from connector auth
    const authConfig =
      typeof connector.auth === 'string'
        ? JSON.parse(connector.auth)
        : connector.auth;
    const baseUrl = (authConfig.baseUrl as string) ?? '';
    const url = new URL(path, baseUrl);

    for (const [k, v] of Object.entries(queryParams)) {
      url.searchParams.set(k, v);
    }

    // Execute HTTP request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add auth headers
    if (authConfig.type === 'api_key' && authConfig.credentials?.apiKey) {
      headers['Authorization'] = `Bearer ${authConfig.credentials.apiKey}`;
    } else if (
      authConfig.type === 'basic' &&
      authConfig.credentials?.username
    ) {
      const basic = Buffer.from(
        `${authConfig.credentials.username}:${authConfig.credentials.password ?? ''}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    } else if (
      authConfig.type === 'oauth' &&
      authConfig.credentials?.accessToken
    ) {
      headers['Authorization'] = `Bearer ${authConfig.credentials.accessToken}`;
    }

    const response = await fetch(url.toString(), {
      method: endpoint.method,
      headers,
      ...(endpoint.method !== 'GET' && params
        ? { body: JSON.stringify(params) }
        : {})
    });

    const responseBody = await response.json().catch(() => ({}));

    // Apply response mapping to context variables
    const mapped: Record<string, unknown> = {};
    for (const [jsonPath, varName] of Object.entries(
      endpoint.responseMapping
    )) {
      const value = resolveJsonPath(responseBody, jsonPath);
      if (value !== undefined) {
        mapped[varName] = value;
        setNestedValue(context.variables, varName, value);
      }
    }

    logAuditEventAsync(context.tenantId, 'connector.called', {
      connectorId,
      endpointId,
      status: response.status,
      conversationId: context.conversationId
    });

    return {
      stepId: step.id,
      type: 'api_call',
      success: response.ok,
      output: { status: response.status, mapped, raw: responseBody },
      error: response.ok ? undefined : `API returned ${response.status}`
    };
  } catch (err) {
    logAuditEventAsync(context.tenantId, 'connector.error', {
      connectorId,
      endpointId,
      error: err instanceof Error ? err.message : 'Unknown error',
      conversationId: context.conversationId
    });

    return {
      stepId: step.id,
      type: 'api_call',
      success: false,
      output: {},
      error: err instanceof Error ? err.message : 'API call failed'
    };
  }
}

async function executeDataLookupStep(
  step: ProcedureStep,
  context: ProcedureContext
): Promise<StepResult> {
  // Data lookup is essentially an API call with a GET method
  return executeAPICallStep(
    {
      ...step,
      type: 'api_call',
      config: { ...step.config, method: 'GET' }
    },
    context
  );
}

async function executeConditionalStep(
  step: ProcedureStep,
  context: ProcedureContext
): Promise<StepResult> {
  const condition = (step.config.condition as string) ?? '';
  const result = evaluateCondition(condition, context.variables);

  return {
    stepId: step.id,
    type: 'conditional',
    success: true,
    output: {
      condition,
      result,
      nextStep: result
        ? (step.config.trueStep as string)
        : (step.config.falseStep as string)
    }
  };
}

async function executeApprovalStep(
  step: ProcedureStep,
  context: ProcedureContext
): Promise<StepResult> {
  if (context.dryRun) {
    return {
      stepId: step.id,
      type: 'approval',
      success: true,
      output: {
        _dryRun: true,
        message: 'Approval auto-granted (dry run)'
      }
    };
  }

  // In production, create an approval request and pause execution.
  // For now we auto-approve and log the event.
  const approvalMessage =
    (step.config.message as string) ?? 'Approval required';

  logAuditEventAsync(context.tenantId, 'procedure.triggered', {
    type: 'approval_request',
    message: approvalMessage,
    approvers: step.config.approvers,
    conversationId: context.conversationId
  });

  // Auto-approve for MVP (would normally create a pending approval record)
  return {
    stepId: step.id,
    type: 'approval',
    success: true,
    output: {
      approved: true,
      autoApproved: true,
      message: approvalMessage
    }
  };
}

// ---------------------------------------------------------------------------
// Main executor
// ---------------------------------------------------------------------------

/**
 * Execute a procedure through its step sequence.
 */
export async function executeProcedure(
  procedure: Procedure,
  context: ProcedureContext
): Promise<ProcedureResult> {
  const steps = parseProcedureSteps(procedure);
  if (steps.length === 0) {
    return {
      procedureId: procedure.$id,
      procedureName: procedure.name,
      success: false,
      steps: [],
      finalMessage: null,
      error: 'Procedure has no steps'
    };
  }

  const results: StepResult[] = [];
  let currentStep: ProcedureStep | undefined = steps[0];
  let finalMessage: string | null = null;
  const maxIterations = 50; // Safety limit
  let iterations = 0;

  logAuditEventAsync(context.tenantId, 'procedure.triggered', {
    procedureId: procedure.$id,
    procedureName: procedure.name,
    conversationId: context.conversationId,
    dryRun: context.dryRun ?? false
  });

  while (currentStep && iterations < maxIterations) {
    iterations++;

    const result = await executeStep(currentStep, context);
    results.push(result);

    if (!result.success) {
      logAuditEventAsync(context.tenantId, 'procedure.failed', {
        procedureId: procedure.$id,
        stepId: currentStep.id,
        error: result.error,
        conversationId: context.conversationId
      });

      return {
        procedureId: procedure.$id,
        procedureName: procedure.name,
        success: false,
        steps: results,
        finalMessage: null,
        error: `Step "${currentStep.id}" failed: ${result.error}`
      };
    }

    // Capture final message from message steps
    if (currentStep.type === 'message' && result.output.message) {
      finalMessage = result.output.message as string;
    }

    // Determine next step
    let nextStepId: string | undefined;

    if (currentStep.type === 'conditional') {
      nextStepId = result.output.nextStep as string | undefined;
    } else {
      nextStepId = currentStep.nextStep;
    }

    if (!nextStepId) {
      break; // No more steps
    }

    currentStep = steps.find((s) => s.id === nextStepId);
  }

  logAuditEventAsync(context.tenantId, 'procedure.completed', {
    procedureId: procedure.$id,
    procedureName: procedure.name,
    conversationId: context.conversationId,
    stepsExecuted: results.length
  });

  return {
    procedureId: procedure.$id,
    procedureName: procedure.name,
    success: true,
    steps: results,
    finalMessage
  };
}

// ---------------------------------------------------------------------------
// Procedure matching
// ---------------------------------------------------------------------------

/**
 * Find a matching procedure for a user message based on triggers.
 * Returns the first matching procedure (highest priority = enabled first match).
 */
export async function findMatchingProcedure(
  tenantId: string,
  userMessage: string
): Promise<Procedure | null> {
  const { databases } = createAdminClient();

  const result = await databases.listDocuments<Procedure>(
    APPWRITE_DATABASE,
    COLLECTION.PROCEDURES,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('enabled', true),
      Query.limit(100)
    ]
  );

  const lowerMessage = userMessage.toLowerCase();

  for (const doc of result.documents) {
    const trigger = parseTrigger(doc);
    if (!trigger) continue;

    switch (trigger.type) {
      case 'keyword': {
        const keywords = trigger.condition
          .split(',')
          .map((k: string) => k.trim().toLowerCase());
        if (keywords.some((kw: string) => lowerMessage.includes(kw))) {
          return doc;
        }
        break;
      }
      case 'intent': {
        // Simple intent matching via keyword matching for now.
        // In production, this would use an intent classifier (LLM or trained model).
        if (lowerMessage.includes(trigger.condition.toLowerCase())) {
          return doc;
        }
        break;
      }
      case 'manual':
        // Manual procedures are never auto-triggered
        break;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseProcedureSteps(procedure: Procedure): ProcedureStep[] {
  const steps = procedure.steps;
  if (typeof steps === 'string') {
    try {
      return JSON.parse(steps);
    } catch {
      return [];
    }
  }
  return Array.isArray(steps) ? steps : [];
}

function parseTrigger(
  procedure: Procedure
): { type: string; condition: string } | null {
  const trigger = procedure.trigger;
  if (typeof trigger === 'string') {
    try {
      return JSON.parse(trigger);
    } catch {
      return null;
    }
  }
  if (trigger && typeof trigger === 'object') {
    return trigger as { type: string; condition: string };
  }
  return null;
}

async function loadConnector(
  tenantId: string,
  connectorId: string
): Promise<DataConnector | null> {
  try {
    const { databases } = createAdminClient();
    const doc = await databases.getDocument<DataConnector>(
      APPWRITE_DATABASE,
      COLLECTION.DATA_CONNECTORS,
      connectorId
    );
    if (doc.tenantId !== tenantId) return null;

    // Parse JSON fields
    if (typeof doc.auth === 'string') {
      doc.auth = JSON.parse(doc.auth);
    }
    if (typeof doc.endpoints === 'string') {
      doc.endpoints = JSON.parse(doc.endpoints);
    }

    return doc;
  } catch {
    return null;
  }
}

async function executeStep(
  step: ProcedureStep,
  context: ProcedureContext
): Promise<StepResult> {
  switch (step.type) {
    case 'message':
      return executeMessageStep(step, context);
    case 'api_call':
      return executeAPICallStep(step, context);
    case 'data_lookup':
      return executeDataLookupStep(step, context);
    case 'conditional':
      return executeConditionalStep(step, context);
    case 'approval':
      return executeApprovalStep(step, context);
    default:
      return {
        stepId: step.id,
        type: step.type,
        success: false,
        output: {},
        error: `Unknown step type: ${step.type}`
      };
  }
}

/**
 * Resolve a simple JSON path like "orders[0].id" to a value.
 */
function resolveJsonPath(obj: unknown, path: string): unknown {
  const parts = path.split(/[.\[\]]+/).filter(Boolean);
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Set a nested value in an object, e.g. setNestedValue(obj, "order.total", 100).
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}
