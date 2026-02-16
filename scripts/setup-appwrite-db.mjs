#!/usr/bin/env node

/**
 * Appwrite database setup script.
 *
 * Creates the database, all collections, attributes and indexes defined in the
 * project plan (Fas 2). Safe to run multiple times – existing resources are
 * silently skipped.
 *
 * Usage:
 *   node scripts/setup-appwrite-db.mjs
 *
 * Required env vars (reads from .env.local via dotenv-style parsing):
 *   NEXT_PUBLIC_APPWRITE_ENDPOINT
 *   NEXT_PUBLIC_APPWRITE_PROJECT
 *   NEXT_PUBLIC_APPWRITE_DATABASE
 *   APPWRITE_API_KEY
 */

import { Client, Databases, ID } from 'node-appwrite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Load .env.local ──────────────────────────────────────────────────────────
function loadEnv() {
  const envFile = resolve(process.cwd(), '.env.local');
  try {
    const content = readFileSync(envFile, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local is optional when env vars are already set
  }
}

loadEnv();

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT  = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const DB_ID    = process.env.NEXT_PUBLIC_APPWRITE_DATABASE;
const API_KEY  = process.env.APPWRITE_API_KEY;

if (!ENDPOINT || !PROJECT || !DB_ID || !API_KEY) {
  console.error('Missing required env vars. Check .env.local');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT)
  .setKey(API_KEY);

const db = new Databases(client);

// ── Helpers ──────────────────────────────────────────────────────────────────
async function safe(fn) {
  try { await fn(); }
  catch (e) {
    if (e?.code === 409) return; // resource already exists
    throw e;
  }
}

async function ensureDatabase() {
  await safe(() => db.create(DB_ID, 'support-ai'));
  console.log('✓ Database ready');
}

async function ensureCollection(id, name) {
  await safe(() => db.createCollection(DB_ID, id, name));
  console.log(`  ✓ Collection: ${name}`);
}

async function attr(type, collId, key, opts = {}) {
  const map = {
    string:   () => db.createStringAttribute(DB_ID, collId, key, opts.size ?? 255, opts.required ?? false, opts.default, opts.array ?? false),
    longtext: () => db.createLongtextAttribute(DB_ID, collId, key, opts.required ?? false, opts.default, opts.array ?? false),
    enum:     () => db.createEnumAttribute(DB_ID, collId, key, opts.elements, opts.required ?? false, opts.default, opts.array ?? false),
    boolean:  () => db.createBooleanAttribute(DB_ID, collId, key, opts.required ?? false, opts.default, opts.array ?? false),
    integer:  () => db.createIntegerAttribute(DB_ID, collId, key, opts.required ?? false, opts.min, opts.max, opts.default, opts.array ?? false),
    float:    () => db.createFloatAttribute(DB_ID, collId, key, opts.required ?? false, opts.min, opts.max, opts.default, opts.array ?? false),
    datetime: () => db.createDatetimeAttribute(DB_ID, collId, key, opts.required ?? false, opts.default, opts.array ?? false),
    url:      () => db.createUrlAttribute(DB_ID, collId, key, opts.required ?? false, opts.default, opts.array ?? false),
  };
  await safe(map[type]);
}

/** Wait for all attributes in a collection to become 'available'. */
async function waitForAttributes(collId, maxWait = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const result = await db.listAttributes(DB_ID, collId);
      const attrs = result.attributes ?? result;
      const pending = (Array.isArray(attrs) ? attrs : []).filter(a => a.status !== 'available');
      if (pending.length === 0) return;
    } catch {
      // If listAttributes fails fall back to a fixed delay
      await new Promise(r => setTimeout(r, 3000));
      return;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for attributes in ${collId}`);
}

async function idx(collId, key, type, attributes, orders) {
  await safe(() => db.createIndex(DB_ID, collId, key, type, attributes, orders));
}

// ── Schema definition ────────────────────────────────────────────────────────

async function setupTenants() {
  const C = 'tenants';
  await ensureCollection(C, 'Tenants');
  await attr('string',  C, 'name',   { required: true });
  await attr('enum',    C, 'plan',   { elements: ['trial', 'growth', 'enterprise'], required: true });
  await attr('longtext',C, 'config');
  await attr('string',  C, 'apiKey', { size: 64, required: true });
  await attr('string',  C, 'userId', { required: true });
  await waitForAttributes(C);
  await idx(C, 'apiKey_unique', 'unique', ['apiKey']);
  await idx(C, 'userId_idx',   'key',    ['userId']);
}

async function setupKnowledgeSources() {
  const C = 'knowledge_sources';
  await ensureCollection(C, 'Knowledge Sources');
  await attr('string',  C, 'tenantId', { required: true });
  await attr('enum',    C, 'type',     { elements: ['url', 'file', 'manual'], required: true });
  await attr('url',     C, 'url');
  await attr('string',  C, 'fileId');
  await attr('enum',    C, 'status',   { elements: ['processing', 'ready', 'failed'], required: true });
  await attr('integer', C, 'version',  { min: 1, default: 1 });
  await attr('longtext',C, 'metadata');
  await waitForAttributes(C);
  await idx(C, 'tenantId_idx', 'key', ['tenantId']);
}

async function setupConversations() {
  const C = 'conversations';
  await ensureCollection(C, 'Conversations');
  await attr('string',   C, 'tenantId',   { required: true });
  await attr('enum',     C, 'channel',    { elements: ['web', 'email', 'whatsapp', 'sms', 'voice'], required: true });
  await attr('enum',     C, 'status',     { elements: ['active', 'resolved', 'escalated'], required: true });
  await attr('string',   C, 'userId');
  await attr('longtext', C, 'metadata');
  await attr('datetime', C, 'resolvedAt');
  await waitForAttributes(C);
  await idx(C, 'tenantId_status_idx',    'key', ['tenantId', 'status']);
  await idx(C, 'tenantId_createdAt_idx', 'key', ['tenantId', '$createdAt']);
}

async function setupMessages() {
  const C = 'messages';
  await ensureCollection(C, 'Messages');
  await attr('string',   C, 'conversationId', { required: true });
  await attr('enum',     C, 'role',           { elements: ['user', 'assistant'], required: true });
  await attr('longtext', C, 'content',        { required: true });
  await attr('float',    C, 'confidence');
  await attr('longtext', C, 'citations');
  await attr('longtext', C, 'metadata');
  await waitForAttributes(C);
  await idx(C, 'conversationId_idx', 'key', ['conversationId']);
}

async function setupPolicies() {
  const C = 'policies';
  await ensureCollection(C, 'Policies');
  await attr('string',  C, 'tenantId', { required: true });
  await attr('string',  C, 'name',     { required: true });
  await attr('enum',    C, 'type',     { elements: ['topic_filter', 'pii_filter', 'tone', 'length'], required: true });
  await attr('enum',    C, 'mode',     { elements: ['pre', 'post'], required: true });
  await attr('longtext',C, 'config');
  await attr('boolean', C, 'enabled',  { default: true });
  await attr('integer', C, 'priority', { min: 0, default: 0 });
  await waitForAttributes(C);
  await idx(C, 'tenantId_enabled_idx', 'key', ['tenantId', 'enabled']);
}

async function setupAuditEvents() {
  const C = 'audit_events';
  await ensureCollection(C, 'Audit Events');
  await attr('string',   C, 'tenantId',  { required: true });
  await attr('string',   C, 'eventType', { required: true });
  await attr('string',   C, 'userId');
  await attr('longtext', C, 'payload');
  await waitForAttributes(C);
  await idx(C, 'tenantId_eventType_createdAt_idx', 'key', ['tenantId', 'eventType', '$createdAt']);
}

async function setupProcedures() {
  const C = 'procedures';
  await ensureCollection(C, 'Procedures');
  await attr('string',  C, 'tenantId',    { required: true });
  await attr('string',  C, 'name',        { required: true });
  await attr('longtext',C, 'description');
  await attr('longtext',C, 'trigger',     { required: true }); // JSON
  await attr('longtext',C, 'steps',       { required: true }); // JSON array
  await attr('boolean', C, 'enabled',     { default: true });
  await attr('integer', C, 'version',     { min: 1, default: 1 });
  await waitForAttributes(C);
  await idx(C, 'tenantId_enabled_idx', 'key', ['tenantId', 'enabled']);
}

async function setupDataConnectors() {
  const C = 'data_connectors';
  await ensureCollection(C, 'Data Connectors');
  await attr('string',  C, 'tenantId', { required: true });
  await attr('string',  C, 'name',     { required: true });
  await attr('enum',    C, 'provider', { elements: ['shopify', 'stripe', 'zendesk', 'salesforce', 'custom'], required: true });
  await attr('longtext',C, 'auth');       // JSON (encrypted)
  await attr('longtext',C, 'config');     // JSON
  await attr('longtext',C, 'endpoints');  // JSON array
  await attr('boolean', C, 'enabled',  { default: true });
  await waitForAttributes(C);
  await idx(C, 'tenantId_idx', 'key', ['tenantId']);
}

async function setupTestScenarios() {
  const C = 'test_scenarios';
  await ensureCollection(C, 'Test Scenarios');
  await attr('string',   C, 'tenantId',        { required: true });
  await attr('string',   C, 'name',            { required: true });
  await attr('longtext', C, 'messages',         { required: true }); // JSON array of strings
  await attr('longtext', C, 'expectedOutcome',  { required: true }); // JSON
  await attr('datetime', C, 'lastRun');
  await waitForAttributes(C);
  await idx(C, 'tenantId_idx', 'key', ['tenantId']);
}

async function setupContentSuggestions() {
  const C = 'content_suggestions';
  await ensureCollection(C, 'Content Suggestions');
  await attr('string',   C, 'tenantId',         { required: true });
  await attr('string',   C, 'topic',            { required: true });
  await attr('integer',  C, 'frequency',        { min: 0, default: 1 });
  await attr('longtext', C, 'exampleQueries');   // JSON array
  await attr('longtext', C, 'suggestedContent');
  await attr('enum',     C, 'status',           { elements: ['pending', 'approved', 'dismissed'], required: true });
  await waitForAttributes(C);
  await idx(C, 'tenantId_status_idx', 'key', ['tenantId', 'status']);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Setting up Appwrite database…\n');
  await ensureDatabase();

  await setupTenants();
  await setupKnowledgeSources();
  await setupConversations();
  await setupMessages();
  await setupPolicies();
  await setupAuditEvents();
  await setupProcedures();
  await setupDataConnectors();
  await setupTestScenarios();
  await setupContentSuggestions();

  console.log('\n✅ All collections, attributes, and indexes created.');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
