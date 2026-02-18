import type { Models } from 'node-appwrite';

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------
/**
 * Typed tenant config stored as JSON in the `config` field.
 */
export interface TenantConfig {
  /** Enabled communication channels. */
  channels?: ConversationChannel[];
  /** LLM model override (e.g. 'gpt-4o-mini'). */
  model?: string;
  /** Minimum RAG confidence to resolve (0-1). Default 0.7. */
  confidenceThreshold?: number;
  /** Max conversation history messages for context. Default 10. */
  maxHistoryMessages?: number;
  /** Custom system prompt prepended to LLM calls. */
  customSystemPrompt?: string;
  /** Webhook URL for handover/escalation notifications. */
  webhookUrl?: string;
  /** Semantic cache TTL in seconds. Default 3600. */
  cacheTtlSeconds?: number;
  /** Appwrite team ID for team management. */
  teamId?: string;
  /** Previous API key kept for grace period rotation. */
  previousApiKey?: string;
  /** ISO timestamp when previousApiKey expires. */
  previousApiKeyExpiresAt?: string;
  /** Subdomain slug (stored on tenant doc, mirrored here for convenience). */
  subdomain?: string;
  /** Default timezone. */
  timezone?: string;
  /** Default language code. */
  language?: string;
}

export interface Tenant extends Models.Document {
  name: string;
  plan: 'trial' | 'growth' | 'enterprise';
  config: Record<string, unknown>;
  apiKey: string;
  userId: string;
  /** Unique subdomain slug, e.g. 'acme' → acme.optitech.software */
  subdomain?: string;
}

// ---------------------------------------------------------------------------
// Knowledge Source
// ---------------------------------------------------------------------------
export type KnowledgeSourceType = 'url' | 'file' | 'manual';
export type KnowledgeSourceStatus = 'processing' | 'ready' | 'failed';

export interface KnowledgeSource extends Models.Document {
  tenantId: string;
  type: KnowledgeSourceType;
  url: string | null;
  fileId: string | null;
  status: KnowledgeSourceStatus;
  version: number;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------
export type ConversationChannel =
  | 'web'
  | 'email'
  | 'whatsapp'
  | 'sms'
  | 'voice';
export type ConversationStatus = 'active' | 'resolved' | 'escalated';

export interface Conversation extends Models.Document {
  tenantId: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  userId: string | null;
  metadata: Record<string, unknown>;
  resolvedAt: string | null;
  /** ISO timestamp of the first assistant reply. */
  firstResponseAt: string | null;
  /** CSAT score (1-5) left by the customer. */
  csatScore: number | null;
  /** Agent ID/name when escalated or assigned. */
  assignedTo: string | null;
}

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------
export type MessageRole = 'user' | 'assistant';

export interface Citation {
  sourceId: string;
}

export interface Message extends Models.Document {
  conversationId: string;
  role: MessageRole;
  content: string;
  confidence: number | null;
  citations: Citation[];
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------
export type PolicyType = 'topic_filter' | 'pii_filter' | 'tone' | 'length';
export type PolicyMode = 'pre' | 'post';

export interface Policy extends Models.Document {
  tenantId: string;
  name: string;
  type: PolicyType;
  mode: PolicyMode;
  config: Record<string, unknown>;
  enabled: boolean;
  priority: number;
}

// ---------------------------------------------------------------------------
// Audit Event
// ---------------------------------------------------------------------------
export interface AuditEvent extends Models.Document {
  tenantId: string;
  eventType: string;
  userId: string | null;
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Procedure (multi-step workflow)
// ---------------------------------------------------------------------------
export type ProcedureTriggerType = 'keyword' | 'intent' | 'manual';
export type ProcedureStepType =
  | 'message'
  | 'api_call'
  | 'data_lookup'
  | 'conditional'
  | 'approval';

export interface ProcedureTrigger {
  type: ProcedureTriggerType;
  condition: string;
}

export interface ProcedureStep {
  id: string;
  type: ProcedureStepType;
  config: Record<string, unknown>;
  nextStep?: string;
}

export interface Procedure extends Models.Document {
  tenantId: string;
  name: string;
  description: string;
  trigger: ProcedureTrigger;
  steps: ProcedureStep[];
  enabled: boolean;
  version: number;
}

// ---------------------------------------------------------------------------
// Data Connector
// ---------------------------------------------------------------------------
export type DataConnectorProvider =
  | 'shopify'
  | 'stripe'
  | 'zendesk'
  | 'salesforce'
  | 'custom';
export type DataConnectorAuthType = 'oauth' | 'api_key' | 'basic';

export interface ConnectorEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  params: Record<string, string>;
  responseMapping: Record<string, string>;
}

export interface DataConnector extends Models.Document {
  tenantId: string;
  name: string;
  provider: DataConnectorProvider;
  auth: {
    type: DataConnectorAuthType;
    credentials: Record<string, string>;
  };
  config: Record<string, unknown>;
  endpoints: ConnectorEndpoint[];
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Test Scenario
// ---------------------------------------------------------------------------
export interface TestScenarioExpected {
  resolved: boolean;
  minConfidence?: number;
}

export interface TestScenario extends Models.Document {
  tenantId: string;
  name: string;
  messages: string[];
  expectedOutcome: TestScenarioExpected;
  lastRun: string | null;
}

// ---------------------------------------------------------------------------
// Content Suggestion (AI Flywheel)
// ---------------------------------------------------------------------------
export type ContentSuggestionStatus = 'pending' | 'approved' | 'dismissed';

export interface ContentSuggestion extends Models.Document {
  tenantId: string;
  topic: string;
  frequency: number;
  exampleQueries: string[];
  suggestedContent: string;
  status: ContentSuggestionStatus;
}

// ---------------------------------------------------------------------------
// Chatbot (public SWEO website chatbot)
// ---------------------------------------------------------------------------
export type ChatbotDepartment = 'sales' | 'support';
export type ChatbotConversationStatus = 'active' | 'closed';

export interface ChatbotConversation extends Models.Document {
  sessionId: string;
  department: ChatbotDepartment;
  status: ChatbotConversationStatus;
  visitorIp: string | null;
  visitorUserAgent: string | null;
  metadata: Record<string, unknown>;
}

export interface ChatbotMessage extends Models.Document {
  conversationId: string;
  role: MessageRole;
  content: string;
}
