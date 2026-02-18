/**
 * Collection IDs – central mapping used by helpers and the setup script.
 */
export const COLLECTION = {
  TENANTS: 'tenants',
  KNOWLEDGE_SOURCES: 'knowledge_sources',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  POLICIES: 'policies',
  AUDIT_EVENTS: 'audit_events',
  PROCEDURES: 'procedures',
  DATA_CONNECTORS: 'data_connectors',
  TEST_SCENARIOS: 'test_scenarios',
  CONTENT_SUGGESTIONS: 'content_suggestions',
  VECTORS: 'vectors',
  CHATBOT_CONVERSATIONS: 'chatbot_conversations',
  CHATBOT_MESSAGES: 'chatbot_messages'
} as const;
