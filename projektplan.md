# Projektplan: Support AI Agent

> **Projekt:** AI-driven kundsupport-agent med admin-dashboard  
> **Startdatum:** 2026-02-15  
> **Baserat på:** Next.js 16 + Shadcn dashboard-template  
> **Status:** Planering

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

### Fas 0 – Förberedelse (vecka 1)

- [ ] Sätta upp Appwrite-instans (Cloud eller self-hosted)
- [ ] Konfigurera environment-variabler (`.env.local`)
- [ ] Ta bort Clerk-beroenden med cleanup-script (`node __CLEANUP__/scripts/cleanup.js clerk`)
- [ ] Verifiera att template bygger utan Clerk

**Milstolpe:** Rent projekt utan Clerk, redo för Appwrite-integration.

### Fas 1 – Autentisering & Multi-tenancy (vecka 2–3)

- [ ] Installera `appwrite` och `node-appwrite` SDK:er
- [ ] Implementera Appwrite client (`src/lib/appwrite/client.ts`)
- [ ] Implementera server-side client med admin/session (`src/lib/appwrite/server.ts`)
- [ ] Bygga login/signup server actions (`src/features/auth/actions/`)
- [ ] Skapa middleware för route-skydd (`src/middleware.ts`)
- [ ] Skapa `tenants`-collection i Appwrite med tenant-modell
- [ ] Implementera `useTenant()` hook för klient-sidan
- [ ] Implementera tenant-scoped dokument-helpers (`getTenantDocuments`, `createTenantDocument`)

**Milstolpe:** Fungerande inloggning, registrering och tenant-isolering.

### Fas 2 – Databasschema (vecka 3–4)

Skapa collections i Appwrite Console (databas: `support-ai-prod`):

- [ ] `tenants` – namn, plan, config, apiKey, userId
- [ ] `knowledge_sources` – tenantId, type, url, fileId, status, version, metadata
- [ ] `conversations` – tenantId, channel, status, userId, metadata, resolvedAt
- [ ] `messages` – conversationId, role, content, confidence, citations, metadata
- [ ] `policies` – tenantId, name, type, mode, config, enabled, priority
- [ ] `audit_events` – tenantId, eventType, userId, payload, createdAt
- [ ] Sätta upp index för alla collections
- [ ] Konfigurera permissions (document-level tenant isolation)

**Milstolpe:** Komplett databasschema med multi-tenant-isolering.

### Fas 3 – Knowledge Ingestion (vecka 4–5)

- [ ] Bygga `source-uploader.tsx` komponent (drag & drop, PDF/DOCX/URL)
- [ ] Implementera filuppladdning till Appwrite Storage
- [ ] Skapa API-route för bakgrunds-embedding (`/api/embeddings/route.ts`)
- [ ] Integrera text-extraktion (pdf-parse, mammoth)
- [ ] Implementera chunking-logik (recursive text splitter)
- [ ] Koppla ihop med Pinecone – upsert med tenant namespace
- [ ] Bygga `source-list.tsx` med status-visning (processing/ready/failed)
- [ ] Stödja URL-ingestion (scraping + chunking)

**Milstolpe:** Man kan ladda upp dokument och de indexeras automatiskt i vektordatabasen.

### Fas 4 – AI Orchestrator & RAG-pipeline (vecka 5–7)

- [ ] Implementera `vectorSearch()` – embedding av query + Pinecone-sök
- [ ] Bygga LLM-client (`src/lib/ai/llm.ts`) med streaming-stöd
- [ ] Implementera orchestrator-flöde:
  1. Pre-policy check
  2. RAG retrieval
  3. Konfidens-kontroll (threshold 0.7)
  4. LLM-generering med kontext
  5. Post-policy check
  6. Spara meddelande och citations
- [ ] Skapa policy-engine (`validatePolicy`) med stöd för:
  - Topic filter
  - PII filter
  - Tone/längd-kontroller
- [ ] Bygga `sendMessageAction()` server action

**Milstolpe:** End-to-end AI-svar med RAG och policy-kontroller.

### Fas 5 – Dashboard-vyer (vecka 7–9)

Utnyttja befintliga template-komponenter (sidebar, data tables, charts):

- [ ] **Conversations** – inbox med lista + meddelandetråd
  - `conversation-list.tsx`
  - `message-thread.tsx`
  - Filter: status (active/resolved/escalated), kanal, datum
- [ ] **Knowledge** – sources-hantering med uploader
- [ ] **Policies** – policy-editor med on/off, prioritet, konfiguration
- [ ] **Analytics** – resolution rate, confidence distribution, volym
  - Återanvänd Recharts från template
  - `resolution-chart.tsx`, `overview-cards.tsx`
- [ ] **Settings** – tenant-konfiguration (plan, kanaler, LLM-modell)
- [ ] Uppdatera navigation i `nav-config.ts`

**Milstolpe:** Komplett admin-dashboard med alla vyer.

### Fas 6 – Chat Widget & Realtime (vecka 9–11)

- [ ] Bygga embeddbar chat-widget (React-komponent)
- [ ] Implementera Appwrite Realtime-prenumeration för nya meddelanden
- [ ] Skapa `/api/chat/message/route.ts` endpoint (API-key auth för tenants)
- [ ] Implementera webhook för e-post-ingestion (`/api/webhooks/email/route.ts`)
- [ ] Widget: loading states, typing indicator, felhantering
- [ ] Testa cross-origin embedding (iframe / script-tag)

**Milstolpe:** Fungerande live-chat widget med realtidsuppdateringar.

### Fas 7 – Kvalitet & Lansering (vecka 11–13)

- [ ] End-to-end tester (Playwright)
- [ ] Komponent-tester (Vitest + React Testing Library)
- [ ] Säkerhetsgranskning (OWASP top 10, tenant-isolering)
- [ ] Performance-optimering (caching, edge functions)
- [ ] Sentry-konfiguration för error tracking
- [ ] Dokumentation (API-docs, deployment guide)
- [ ] Deploy till Vercel + Appwrite Cloud

**Milstolpe:** Produktionsklar MVP.

---

## 4. Projektstruktur (mål)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/
│   │   ├── layout.tsx                   # Sidebar + header
│   │   ├── page.tsx                     # Overview (analytics)
│   │   ├── conversations/               # Conversation inbox
│   │   ├── knowledge/                   # Knowledge sources
│   │   ├── policies/                    # Policy configuration
│   │   ├── analytics/                   # Resolution metrics
│   │   └── settings/                    # Tenant settings
│   └── api/
│       ├── chat/message/route.ts        # Chat endpoint (widget)
│       ├── webhooks/email/route.ts      # Email ingestion
│       └── embeddings/route.ts          # Background embedding
│
├── features/
│   ├── auth/actions/                    # Login, logout, signup
│   ├── conversation/
│   │   ├── components/                  # conversation-list, message-thread
│   │   ├── actions/                     # send-message, escalate
│   │   └── schemas/                     # Zod schemas
│   ├── knowledge/
│   │   ├── components/                  # source-uploader, source-list
│   │   └── actions/                     # ingest-url, upload-file
│   ├── policy/
│   │   ├── components/                  # policy-editor
│   │   └── actions/                     # update-policy
│   └── analytics/
│       ├── components/                  # resolution-chart
│       └── utils/                       # metrics
│
├── lib/
│   ├── appwrite/
│   │   ├── client.ts                    # Browser client
│   │   ├── server.ts                    # Server client (admin + session)
│   │   └── collections.ts              # Tenant-scoped helpers
│   └── ai/
│       ├── orchestrator.ts              # RAG + policy pipeline
│       ├── retrieval.ts                 # Pinecone vector search
│       └── llm.ts                       # OpenAI/Azure client
│
├── hooks/
│   └── use-tenant.ts                    # Tenant context hook
│
└── types/
    ├── conversation.ts
    ├── knowledge.ts
    └── policy.ts
```

---

## 5. Appwrite – Databasschema

**Databas:** `support-ai-prod`

### 5.1 Collections

| Collection | Nyckelattribut | Index |
|---|---|---|
| `tenants` | name, plan, config (JSON), apiKey, userId | `apiKey_unique` |
| `knowledge_sources` | tenantId, type, url, fileId, status, version, metadata | `tenantId_idx` |
| `conversations` | tenantId, channel, status, userId, metadata, resolvedAt | `tenantId_status_idx`, `tenantId_createdAt_idx` |
| `messages` | conversationId, role, content, confidence, citations, metadata | `conversationId_idx` |
| `policies` | tenantId, name, type, mode, config, enabled, priority | `tenantId_enabled_idx` |
| `audit_events` | tenantId, eventType, userId, payload, createdAt | `tenantId_eventType_createdAt_idx` |

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

## Appendix A – Nyckelkod (referensimplementation)

Detaljerade kodexempel för varje modul finns i separata filer under respektive `src/`-katalog när de implementeras. Se fas 1–6 ovan för vilka filer som ska skapas.

Sammanfattning av centrala moduler:

| Modul | Fil | Beskrivning |
|---|---|---|
| Appwrite Client | `src/lib/appwrite/client.ts` | Browser-side Appwrite SDK |
| Appwrite Server | `src/lib/appwrite/server.ts` | Server-side admin + session clients |
| Auth Actions | `src/features/auth/actions/login.ts` | Login, logout server actions |
| Middleware | `src/middleware.ts` | Route-skydd (redirect om ej inloggad) |
| Tenant Helpers | `src/lib/appwrite/collections.ts` | `getTenantDocuments`, `createTenantDocument` |
| Tenant Hook | `src/hooks/use-tenant.ts` | Client-side tenant context |
| Vector Search | `src/lib/ai/retrieval.ts` | Pinecone query med tenant namespace |
| LLM Client | `src/lib/ai/llm.ts` | OpenAI/Azure generering |
| Orchestrator | `src/features/conversation/actions/send-message.ts` | RAG-pipeline server action |
| File Upload | `src/features/knowledge/actions/upload-file.ts` | Appwrite Storage upload + trigger embedding |
| Embedding Job | `src/app/api/embeddings/route.ts` | Bakgrunds-chunking och Pinecone upsert |
| Chat Widget | `widget/src/chat-widget.tsx` | Embeddbar Realtime-chat |
| Dashboard | `src/app/(dashboard)/page.tsx` | Analytics med Recharts |