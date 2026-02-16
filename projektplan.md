# Projektplan: Support AI Agent

> **Projekt:** AI-driven kundsupport-agent med admin-dashboard  
> **Startdatum:** 2026-02-15  
> **Uppdaterad:** 2026-02-16  
> **Baserat på:** Next.js 16 + Shadcn dashboard-template  
> **Status:** Implementation (Backend ~90% klar, Frontend ~20%)

---

## 1. Sammanfattning

Målet är att bygga en **multi-tenant SaaS-plattform** för AI-driven kundsupport. Plattformen ska bestå av:

1. **Admin Dashboard** – hantering av konversationer, kunskapskällor, policyer och analytics
2. **AI Orchestrator** – RAG-pipeline (Retrieval-Augmented Generation) med policy-kontroller
3. **Chat Widget** – embeddbar widget för slutkunder (web + e-post)
4. **Knowledge Ingestion** – uppladdning och indexering av PDF/DOCX/URL-innehåll

Projektet utgår från det befintliga **next-shadcn-dashboard-starter**-templatet och ersätter Clerk-autentisering med **Appwrite**.

---

## 2. Teknisk stack

| Komponent | Lösning | Noteringar |
|---|---|---|
| Frontend / Admin UI | Next.js 16 + Shadcn/ui + Tailwind v4 | Befintligt template |
| Backend API | Next.js App Router + Server Actions | API routes i `/app/api/` |
| Autentisering | Appwrite (SSR + session cookies) | Ersätter Clerk |
| Databas | Appwrite Database Collections | Multi-tenant med `tenantId`-filter |
| Vektorsökning | Pinecone (alternativ: Qdrant / Weaviate) | Extern tjänst – Appwrite saknar native vector search |
| Fillagring | Appwrite Storage | PDF/DOCX-uploads vid knowledge ingestion |
| Realtid | Appwrite Realtime | WebSocket för live-chat och dashboard-notiser |
| LLM | OpenAI GPT-4 / Azure OpenAI | Via `openai` SDK |
| Embeddings | OpenAI `text-embedding-3-large` | För vektorsökning |

---

## 3. Projektfaser och milstolpar

### Fas 0 – Förberedelse (vecka 1) ✅

- [x] Sätta upp Appwrite-instans (Cloud eller self-hosted)
- [x] Konfigurera environment-variabler (`env.example.txt` uppdaterad med alla nycklar)
- [x] Ta bort Clerk-beroenden med cleanup-script (`node __CLEANUP__/scripts/cleanup.js clerk`)
- [x] Verifiera att template bygger utan Clerk

**Milstolpe:** ✅ Rent projekt utan Clerk, redo för Appwrite-integration.

### Fas 1 – Autentisering & Multi-tenancy (vecka 2–3) ⚠️ ~95%

- [x] Installera `appwrite` och `node-appwrite` SDK:er
- [x] Implementera Appwrite client (`src/lib/appwrite/client.ts`)
- [x] Implementera server-side client med admin/session (`src/lib/appwrite/server.ts`)
- [x] Bygga login/signup server actions (`src/features/auth/actions/`)
- [ ] ~~Skapa middleware för route-skydd (`src/middleware.ts`)~~ **BORTTAGEN – behöver återskapas**
- [x] Skapa `tenants`-collection i Appwrite med tenant-modell
- [x] Implementera `useTenant()` hook för klient-sidan
- [x] Implementera tenant-scoped dokument-helpers (`getTenantDocuments`, `createTenantDocument`)
- [x] _Bonus:_ Team management med RBAC + audit logging (`src/features/auth/actions/team-management.ts`)
- [x] _Bonus:_ Appwrite Teams-integration (`src/lib/appwrite/teams.ts`)

**Milstolpe:** ⚠️ Auth och tenant-isolering fungerar. **Saknas: route-skydd via middleware.**

### Fas 2 – Databasschema (vecka 3–4) ✅

Skapa collections i Appwrite Console (databas: `support-ai-prod`):

- [x] `tenants` – namn, plan, config, apiKey, userId
- [x] `knowledge_sources` – tenantId, type, url, fileId, status, version, metadata
- [x] `conversations` – tenantId, channel, status, userId, metadata, resolvedAt
- [x] `messages` – conversationId, role, content, confidence, citations, metadata
- [x] `policies` – tenantId, name, type, mode, config, enabled, priority
- [x] `audit_events` – tenantId, eventType, userId, payload, createdAt
- [x] `procedures` – tenantId, name, trigger, steps, enabled _(Fin.ai-tillägg)_
- [x] `data_connectors` – tenantId, provider, auth, config _(Fin.ai-tillägg)_
- [x] `test_scenarios` – tenantId, name, messages, expectedOutcome _(Fin.ai-tillägg)_
- [x] `content_suggestions` – tenantId, topic, frequency, suggestedContent _(Fin.ai-tillägg)_
- [x] Sätta upp index för alla collections
- [x] Konfigurera permissions (document-level tenant isolation)
- [x] Automatiserat setup-script (`scripts/setup-appwrite-db.mjs` – 280 rader)
- [x] Komplett TypeScript-typer (`src/types/appwrite.ts` – 214 rader)

**Milstolpe:** ✅ Komplett databasschema med multi-tenant-isolering + setup-automatisering.

### Fas 3 – Knowledge Ingestion (vecka 4–5) ✅

- [x] Bygga `source-uploader.tsx` komponent (drag & drop, PDF/DOCX/URL)
- [x] Implementera filuppladdning till Appwrite Storage
- [x] Skapa API-route för bakgrunds-embedding (`/api/embeddings/route.ts`)
- [x] Integrera text-extraktion (pdf-parse, mammoth, cheerio)
- [x] Implementera chunking-logik (recursive text splitter med overlap)
- [x] Koppla ihop med Pinecone – upsert med tenant namespace
- [x] Bygga `source-list.tsx` med status-visning (processing/ready/failed)
- [x] Stödja URL-ingestion (scraping + chunking)
- [x] _Bonus:_ Manuell textkälla med direkt embedding (`manual-source.ts`)
- [x] _Bonus:_ Versionshantering med rollback (`version-management.ts`)
- [x] _Bonus:_ Export/import av kunskapsbaser (`export-import.ts`)
- [x] _Bonus:_ Inngest bakgrundsjobb för chunking (`src/lib/inngest/functions.ts`)

**Milstolpe:** ✅ Komplett knowledge ingestion med versioning och export/import.

### Fas 4 – AI Orchestrator & RAG-pipeline (vecka 5–7) ✅

- [x] Implementera `vectorSearch()` – embedding av query + Pinecone-sök
- [x] Bygga LLM-client (`src/lib/ai/llm.ts`) med streaming-stöd
- [x] Implementera orchestrator-flöde:
  1. Pre-policy check
  2. RAG retrieval
  3. Konfidens-kontroll (threshold 0.7)
  4. LLM-generering med kontext
  5. Post-policy check
  6. Spara meddelande och citations
- [x] Skapa policy-engine (`validatePolicy`) med stöd för:
  - Topic filter
  - PII filter
  - Tone/längd-kontroller
- [x] Bygga `sendMessageAction()` server action
- [x] _Bonus:_ Procedure executor med state machine + dry-run (`procedure-executor.ts` – 655 rader)
- [x] _Bonus:_ Simulation engine för testning (`simulation-engine.ts`)
- [x] _Bonus:_ Semantisk cache med Redis hash (`semantic-cache.ts`)
- [x] _Bonus:_ Streaming SSE endpoint (`/api/chat/stream/route.ts`)

**Milstolpe:** ✅ End-to-end AI-svar med RAG, policy-kontroller, procedures och caching.

### Fas 5 – Dashboard-vyer (vecka 7–9) 🔴 ~20%

Utnyttja befintliga template-komponenter (sidebar, data tables, charts):

- [ ] **Conversations** – inbox med lista + meddelandetråd
  - `conversation-list.tsx`
  - `message-thread.tsx`
  - Filter: status (active/resolved/escalated), kanal, datum
  - Dashboard-sida: `src/app/dashboard/conversations/page.tsx`
- [x] **Knowledge** – sources-hantering med uploader _(klar med drag & drop + versioning)_
- [ ] **Policies** – policy-editor med on/off, prioritet, konfiguration
  - Dashboard-sida: `src/app/dashboard/policies/page.tsx`
- [ ] **Analytics** – resolution rate, confidence distribution, volym
  - Återanvänd Recharts från template
  - `resolution-chart.tsx`, `overview-cards.tsx`
  - Dashboard-sida: `src/app/dashboard/analytics/page.tsx`
- [ ] **Procedures** – visuell procedure-editor (steg, branching)
  - Dashboard-sida: `src/app/dashboard/procedures/page.tsx`
- [ ] **Connectors** – data connector-hantering (Shopify, Stripe, etc.)
  - Dashboard-sida: `src/app/dashboard/connectors/page.tsx`
- [ ] **Testing** – simulations-runner för test-scenarion
  - Dashboard-sida: `src/app/dashboard/testing/page.tsx`
- [ ] **Settings** – tenant-konfiguration (plan, kanaler, LLM-modell, API-nycklar)
  - Dashboard-sida: `src/app/dashboard/settings/page.tsx`
- [ ] Uppdatera navigation i `nav-config.ts` med alla nya sidor

> **Backend-actions finns redan** för policies, procedures, connectors, testing och analytics.
> Det som saknas är **UI-komponenterna och dashboard-sidorna**.

**Milstolpe:** Komplett admin-dashboard med alla vyer.

### Fas 6 – Chat Widget & Realtime (vecka 9–11) ⚠️ ~60%

- [x] Bygga API-endpoint för chat (`/api/chat/message/route.ts` – API-key auth)
- [x] Bygga streaming SSE endpoint (`/api/chat/stream/route.ts`)
- [ ] Bygga embeddbar chat-widget (React-komponent för slutkunder)
- [ ] Implementera Appwrite Realtime-prenumeration för nya meddelanden
- [x] Implementera webhook för e-post-ingestion (`/api/webhooks/email/route.ts`)
- [x] _Bonus:_ WhatsApp-kanal via Twilio (`/api/webhooks/whatsapp/route.ts` + adapter)
- [x] _Bonus:_ SMS-kanal via Twilio (`/api/webhooks/sms/route.ts` + adapter)
- [x] _Bonus:_ Channel adapter-arkitektur (`base-adapter.ts`, `email-adapter.ts`, etc.)
- [x] _Bonus:_ Twilio signaturverifiering (`twilio-verify.ts`)
- [x] _Bonus:_ Agent handover endpoint (`/api/conversations/handover/route.ts`)
- [ ] Widget: loading states, typing indicator, felhantering
- [ ] Testa cross-origin embedding (iframe / script-tag)

**Milstolpe:** ⚠️ API-endpoints och kanaler klara. **Saknas: embeddbar widget + Realtime.**

### Fas 7 – Kvalitet & Lansering (vecka 11–13) ⚠️ ~20%

- [ ] End-to-end tester (Playwright)
- [ ] Komponent-tester (Vitest + React Testing Library)
- [ ] Säkerhetsgranskning (OWASP top 10, tenant-isolering)
- [ ] Performance-optimering (caching, edge functions)
- [x] Sentry-konfiguration för error tracking (server + klient + global error boundary)
- [ ] Dokumentation (API-docs, deployment guide)
- [ ] Deploy till Vercel + Appwrite Cloud
- [ ] ~~Middleware~~ → **Behöver återskapas** (`src/middleware.ts` – borttagen)

**Milstolpe:** Produktionsklar MVP.

---

## 3b. Fin.ai Flywheel – Utökade funktioner (implementerade i backend)

Utöver den ursprungliga planen har backend-stöd implementerats för Fin.ai:s "Flywheel"-koncept:

### Train ✅ Backend klar
- [x] Procedures CRUD (`src/features/procedures/actions/procedure-crud.ts`)
- [x] Procedure executor med state machine + dry-run (`src/lib/ai/procedure-executor.ts`)
- [x] Data Connectors CRUD med krypterade credentials (`src/features/connectors/actions/connector-crud.ts`)
- [x] Krypteringsmodul AES-256-GCM (`src/lib/encryption/index.ts`)
- [ ] UI: Procedure-editor med visuell stegbyggare
- [ ] UI: Connector-konfigurering

### Test ✅ Backend klar
- [x] Test Scenarios CRUD (`src/features/testing/actions/scenario-crud.ts`)
- [x] Simulation engine (`src/lib/ai/simulation-engine.ts`)
- [x] Simulate API-endpoint (`src/app/api/simulate/route.ts`)
- [ ] UI: Simulation runner med resultatvy

### Deploy ✅ Backend klar
- [x] Web Chat API (message + streaming)
- [x] Email-kanal (adapter + webhook)
- [x] WhatsApp-kanal (adapter + webhook + Twilio-verifiering)
- [x] SMS-kanal (adapter + webhook)
- [ ] Embeddbar widget-komponent
- [ ] Appwrite Realtime

### Analyze ✅ Backend klar
- [x] Analytics engine med metrics-aggregering (`src/lib/analytics/analytics-engine.ts`)
- [x] Content gap detector med AI-förslag (`src/lib/analytics/gap-detector.ts`)
- [x] Content Suggestions CRUD (`src/features/analytics/actions/suggestion-crud.ts`)
- [x] Cron-jobb för gap detection (`src/app/api/cron/detect-gaps/route.ts`)
- [ ] UI: Analytics dashboard
- [ ] UI: Content suggestions med approve/dismiss

### Infrastruktur ✅
- [x] Rate limiting per tenant + IP (`src/lib/rate-limit/`)
- [x] Redis-cache via Upstash (`src/lib/cache/`)
- [x] Semantisk cache (`src/lib/cache/semantic-cache.ts`)
- [x] Audit logging (`src/lib/audit/logger.ts`)
- [x] HTML-sanering (`src/lib/sanitize/index.ts`)
- [x] Inngest bakgrundsjobb (`src/lib/inngest/`)
- [x] Health-check endpoint (`src/app/api/health/route.ts`)
- [x] API-nyckelrotation (`src/app/api/tenant/api-key/route.ts`)
- [x] Tenant settings API (`src/app/api/tenant/settings/route.ts`)

---

## 4. Projektstruktur (aktuell)

```
src/
├── app/
│   ├── auth/
│   │   ├── sign-in/                     # Login-sida
│   │   └── sign-up/                     # Registrering
│   ├── dashboard/
│   │   ├── layout.tsx                   # Sidebar + header
│   │   ├── overview/                    # Dashboard overview (template)
│   │   ├── knowledge/page.tsx           # ✅ Knowledge sources
│   │   ├── conversations/               # ❌ SAKNAS
│   │   ├── policies/                    # ❌ SAKNAS
│   │   ├── analytics/                   # ❌ SAKNAS
│   │   ├── procedures/                  # ❌ SAKNAS
│   │   ├── connectors/                  # ❌ SAKNAS
│   │   ├── testing/                     # ❌ SAKNAS
│   │   └── settings/                    # ❌ SAKNAS
│   └── api/
│       ├── chat/
│       │   ├── message/route.ts         # ✅ Chat endpoint (API-key auth)
│       │   └── stream/route.ts          # ✅ SSE streaming
│       ├── embeddings/route.ts          # ✅ Background embedding
│       ├── simulate/route.ts            # ✅ Test simulation
│       ├── conversations/
│       │   └── handover/route.ts        # ✅ Agent handover
│       ├── tenant/
│       │   ├── api-key/route.ts         # ✅ API-nyckelrotation
│       │   └── settings/route.ts        # ✅ Tenant config
│       ├── knowledge/
│       │   ├── export/route.ts          # ✅ Knowledge export
│       │   └── import/route.ts          # ✅ Knowledge import
│       ├── analytics/                   # Analytics API
│       ├── cron/
│       │   └── detect-gaps/route.ts     # ✅ Gap detection cron
│       ├── health/route.ts              # ✅ System health check
│       ├── inngest/route.ts             # ✅ Inngest webhook
│       └── webhooks/
│           ├── email/route.ts           # ✅ Email ingestion
│           ├── whatsapp/route.ts        # ✅ Twilio WhatsApp
│           └── sms/route.ts             # ✅ Twilio SMS
│
├── features/
│   ├── auth/actions/                    # ✅ Login, logout, signup, tenant, teams
│   ├── conversation/
│   │   ├── actions/send-message.ts      # ✅ Send message action
│   │   ├── schemas/                     # ✅ Zod schemas
│   │   └── components/                  # ❌ SAKNAS (list, thread)
│   ├── knowledge/
│   │   ├── actions/                     # ✅ upload, ingest-url, manual, versions, export
│   │   ├── components/                  # ✅ source-uploader, source-list, page-client
│   │   └── schemas/                     # ✅ Zod schemas
│   ├── policies/
│   │   └── actions/policy-crud.ts       # ✅ CRUD + audit
│   ├── procedures/
│   │   └── actions/procedure-crud.ts    # ✅ CRUD
│   ├── connectors/
│   │   └── actions/connector-crud.ts    # ✅ CRUD + encryption
│   ├── testing/
│   │   └── actions/scenario-crud.ts     # ✅ CRUD + simulation
│   ├── analytics/
│   │   └── actions/suggestion-crud.ts   # ✅ Content suggestions
│   └── overview/                        # Template analytics
│
├── lib/
│   ├── appwrite/
│   │   ├── client.ts                    # ✅ Browser client
│   │   ├── server.ts                    # ✅ Server client (admin + session)
│   │   ├── collections.ts              # ✅ Collection ID:er
│   │   ├── constants.ts                # ✅ Env-baserade konstanter
│   │   ├── teams.ts                    # ✅ Team management
│   │   └── tenant-helpers.ts           # ✅ Tenant-scoped CRUD
│   ├── ai/
│   │   ├── orchestrator.ts              # ✅ RAG + policy pipeline (722 rader)
│   │   ├── retrieval.ts                 # ✅ Pinecone vector search
│   │   ├── llm.ts                       # ✅ OpenAI client + streaming
│   │   ├── policy-engine.ts             # ✅ Pre/post policy validation
│   │   ├── procedure-executor.ts        # ✅ Multi-step procedures (655 rader)
│   │   ├── simulation-engine.ts         # ✅ Test simulations
│   │   ├── extraction.ts               # ✅ PDF/DOCX/URL extraction
│   │   └── chunking.ts                 # ✅ Recursive text splitter
│   ├── channels/
│   │   ├── base-adapter.ts             # ✅ Abstract channel adapter
│   │   ├── email-adapter.ts            # ✅ Email channel
│   │   ├── whatsapp-adapter.ts         # ✅ WhatsApp channel
│   │   ├── sms-adapter.ts             # ✅ SMS channel
│   │   └── twilio-verify.ts           # ✅ Twilio signature verification
│   ├── analytics/
│   │   ├── analytics-engine.ts         # ✅ Metrics aggregering
│   │   └── gap-detector.ts            # ✅ Content gap AI
│   ├── audit/logger.ts                 # ✅ Append-only audit log
│   ├── cache/
│   │   ├── redis.ts                    # ✅ Upstash Redis
│   │   └── semantic-cache.ts           # ✅ Query hash cache
│   ├── encryption/index.ts             # ✅ AES-256-GCM
│   ├── inngest/
│   │   ├── client.ts                   # ✅ Inngest client
│   │   └── functions.ts               # ✅ Background jobs
│   ├── rate-limit/
│   │   ├── index.ts                    # ✅ Per-tenant rate limiting
│   │   └── middleware.ts              # ✅ Rate limit wrapper
│   └── sanitize/index.ts              # ✅ DOMPurify sanering
│
├── hooks/
│   └── use-tenant.ts                    # ✅ Client-side tenant context
│
├── types/
│   └── appwrite.ts                     # ✅ Alla entitetstyper (214 rader)
│
└── middleware.ts                        # ❌ BORTTAGEN – behöver återskapas
```

---

## 5. Appwrite – Databasschema ✅

**Databas:** `support-ai-prod`  
**Setup-script:** `scripts/setup-appwrite-db.mjs` (idempotent, skapar alla collections + index)

### 5.1 Collections

| Collection | Nyckelattribut | Index |
|---|---|---|
| `tenants` | name, plan, config (JSON), apiKey, userId | `apiKey_unique` |
| `knowledge_sources` | tenantId, type, url, fileId, status, version, metadata | `tenantId_idx` |
| `conversations` | tenantId, channel, status, userId, metadata, resolvedAt | `tenantId_status_idx`, `tenantId_createdAt_idx` |
| `messages` | conversationId, role, content, confidence, citations, metadata | `conversationId_idx` |
| `policies` | tenantId, name, type, mode, config, enabled, priority | `tenantId_enabled_idx` |
| `audit_events` | tenantId, eventType, userId, payload, createdAt | `tenantId_eventType_createdAt_idx` |
| `procedures` | tenantId, name, description, trigger, steps, enabled, version | `tenantId_idx` |
| `data_connectors` | tenantId, provider, name, auth (krypterad), config, enabled | `tenantId_idx` |
| `test_scenarios` | tenantId, name, messages, expectedOutcome | `tenantId_idx` |
| `content_suggestions` | tenantId, topic, frequency, exampleQueries, suggestedContent, status | `tenantId_status_idx` |

### 5.2 Permissions (multi-tenant isolation)

```
Read/Write: Document-level – where tenantId = user.tenantId
Admin:      Server-side via API key
```

---

## 6. Environment-variabler

```env
# Appwrite
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=<project-id>
NEXT_PUBLIC_APPWRITE_DATABASE=support-ai-prod
NEXT_PUBLIC_APPWRITE_BUCKET=<bucket-id>
APPWRITE_API_KEY=<server-api-key>

# AI / LLM
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=<pinecone-key>
PINECONE_INDEX=<index-name>

# Cache / Rate Limiting
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Background Jobs
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# Channels (valfritt)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=...
TWILIO_SMS_NUMBER=...
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Security
ENCRYPTION_KEY=<64-hex-chars>

# Sentry (valfritt)
NEXT_PUBLIC_SENTRY_DSN=https://...@ingest.sentry.io/...
NEXT_PUBLIC_SENTRY_DISABLED=true

# App
NEXT_PUBLIC_URL=http://localhost:3000
```

---

## 7. Risker och mitigeringar

| Risk | Sannolikhet | Konsekvens | Mitigation |
|---|---|---|---|
| Appwrite saknar vector search | Hög | Medel | Extern tjänst (Pinecone) med tenant namespace |
| LLM-hallucinationer | Medel | Hög | Konfidens-threshold + citations + policy-engine |
| Multi-tenant data-läcka | Låg | Kritisk | Tenant-scoped queries + server-side validering + audit log |
| Performance vid stora kunskapsbaser | Medel | Medel | Chunk-optimering, caching, lazy loading |
| Appwrite rate limits | Låg | Medel | Caching-lager, batch-operationer |

---

## 8. Definitioner

| Term | Beskrivning |
|---|---|
| **Tenant** | En kundorganisation med egen data-isolering |
| **RAG** | Retrieval-Augmented Generation – hämta relevant kontext innan LLM-generering |
| **Knowledge Source** | Uppladdad fil, URL eller manuell text som indexeras för sökning |
| **Policy** | Regel som filtrerar/validerar input eller output (t.ex. PII-filter, tone) |
| **Orchestrator** | Backend-logik som koordinerar RAG-pipeline, policyer och LLM |
| **Confidence** | Poäng (0–1) som indikerar hur relevant den hämtade kontexten är |

---

## Appendix A – Nyckelkod (implementationsstatus)

| Modul | Fil | Status | Rader |
|---|---|---|---|
| Appwrite Client | `src/lib/appwrite/client.ts` | ✅ | 21 |
| Appwrite Server | `src/lib/appwrite/server.ts` | ✅ | 48 |
| Auth Actions | `src/features/auth/actions/login.ts` | ✅ | – |
| Team Management | `src/features/auth/actions/team-management.ts` | ✅ | 268 |
| Middleware | `src/middleware.ts` | ❌ Borttagen | – |
| Tenant Helpers | `src/lib/appwrite/tenant-helpers.ts` | ✅ | 129 |
| Tenant Hook | `src/hooks/use-tenant.ts` | ✅ | – |
| Vector Search | `src/lib/ai/retrieval.ts` | ✅ | 157 |
| LLM Client | `src/lib/ai/llm.ts` | ✅ | 233 |
| Orchestrator | `src/lib/ai/orchestrator.ts` | ✅ | 722 |
| Policy Engine | `src/lib/ai/policy-engine.ts` | ✅ | 340 |
| Procedure Executor | `src/lib/ai/procedure-executor.ts` | ✅ | 655 |
| Simulation Engine | `src/lib/ai/simulation-engine.ts` | ✅ | 252 |
| Text Extraction | `src/lib/ai/extraction.ts` | ✅ | 85 |
| Chunking | `src/lib/ai/chunking.ts` | ✅ | 81 |
| Email Adapter | `src/lib/channels/email-adapter.ts` | ✅ | 251 |
| WhatsApp Adapter | `src/lib/channels/whatsapp-adapter.ts` | ✅ | 211 |
| SMS Adapter | `src/lib/channels/sms-adapter.ts` | ✅ | 189 |
| Analytics Engine | `src/lib/analytics/analytics-engine.ts` | ✅ | 318 |
| Gap Detector | `src/lib/analytics/gap-detector.ts` | ✅ | 282 |
| Rate Limiter | `src/lib/rate-limit/index.ts` | ✅ | 188 |
| Semantic Cache | `src/lib/cache/semantic-cache.ts` | ✅ | 144 |
| Encryption | `src/lib/encryption/index.ts` | ✅ | 147 |
| Audit Logger | `src/lib/audit/logger.ts` | ✅ | 102 |
| Sanitizer | `src/lib/sanitize/index.ts` | ✅ | 107 |
| Knowledge Upload | `src/features/knowledge/actions/upload-file.ts` | ✅ | 151 |
| Knowledge Version | `src/features/knowledge/actions/version-management.ts` | ✅ | 312 |
| Knowledge Export | `src/features/knowledge/actions/export-import.ts` | ✅ | 337 |
| Source Uploader UI | `src/features/knowledge/components/source-uploader.tsx` | ✅ | 214 |
| Source List UI | `src/features/knowledge/components/source-list.tsx` | ✅ | 272 |
| Procedures CRUD | `src/features/procedures/actions/procedure-crud.ts` | ✅ | 268 |
| Connectors CRUD | `src/features/connectors/actions/connector-crud.ts` | ✅ | 377 |
| Policies CRUD | `src/features/policies/actions/policy-crud.ts` | ✅ | 264 |
| Testing CRUD | `src/features/testing/actions/scenario-crud.ts` | ✅ | 302 |
| Suggestions CRUD | `src/features/analytics/actions/suggestion-crud.ts` | ✅ | 167 |
| DB Setup Script | `scripts/setup-appwrite-db.mjs` | ✅ | 280 |
| Inngest Functions | `src/lib/inngest/functions.ts` | ✅ | 223 |
| Health Check | `src/app/api/health/route.ts` | ✅ | 189 |

---

## Appendix B – Nästa steg (prioritetsordning)

Baserat på nuvarande status behövs följande för MVP:

### Prio 1 – Kritiska blockerare
1. **Återskapa `src/middleware.ts`** – route-skydd för dashboard
2. **Uppdatera `nav-config.ts`** – lägg till alla nya sidor

### Prio 2 – Dashboard UI (Fas 5)
3. **Conversations-sida** – inbox, meddelandetråd, filter
4. **Policies-sida** – lista, editor, toggle
5. **Analytics-sida** – metrics-kort, grafer, gap-lista
6. **Settings-sida** – tenant-config, API-nyckel, team

### Prio 3 – Fin.ai UI
7. **Procedures-sida** – stegbyggare, trigger-konfiguration
8. **Connectors-sida** – provider-val, auth-konfiguration
9. **Testing-sida** – scenarios, simulation runner

### Prio 4 – Widget & Realtime (Fas 6)
10. ~~**Embeddbar chat-widget**~~ ✅ – standalone vanilla JS (6.8kb), SSE streaming, configurable via data-attributes
11. ~~**Appwrite Realtime**~~ ✅ – `useRealtime` hook, live messages + conversation updates

### Prio 5 – Kvalitet (Fas 7)
12. **Tester** – Vitest + Playwright
13. **Dokumentation**
14. **Deploy-pipeline**