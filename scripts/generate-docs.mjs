#!/usr/bin/env node
// ── Generate rich docs content via NVIDIA API (Mistral Large 3 675B) ──
// Usage: node scripts/generate-docs.mjs
//
// Reads the current docs structure, sends each article to the AI
// to get comprehensive Swedish documentation, then writes back
// an updated src/config/docs-config.ts.

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load .env.local
config({ path: resolve(ROOT, '.env.local') });

const API_URL = process.env.NVIDIA_API_URL;
const API_KEY = process.env.NVIDIA_API_KEY;
const MODEL = process.env.NVIDIA_MODEL;

if (!API_URL || !API_KEY || !MODEL) {
  console.error('❌ Missing NVIDIA_API_URL, NVIDIA_API_KEY or NVIDIA_MODEL in .env.local');
  process.exit(1);
}

// ── Current docs skeleton (extracted from docs-config.ts) ─────────────
// We define the structure here so the script is self-contained.
// The AI will write rich content for each section.

const categories = [
  {
    slug: 'getting-started',
    title: 'Kom igång',
    icon: 'arrowRight',
    description: 'Skapa konto, konfigurera workspace och anslut din första kanal.',
    articles: [
      {
        slug: 'introduction',
        title: 'Introduktion till SWEO AI',
        description: 'En överblick av plattformen och hur du snabbt kommer igång.',
        sections: [
          { id: 'overview', title: 'Översikt' },
          { id: 'flywheel', title: 'Flywheel-modellen' },
          { id: 'core-concepts', title: 'Grundläggande koncept' },
          { id: 'quick-start', title: 'Snabbstart' },
          { id: 'architecture', title: 'Teknisk arkitektur' },
          { id: 'next-steps', title: 'Nästa steg' }
        ]
      },
      {
        slug: 'account-setup',
        title: 'Skapa ditt konto & workspace',
        description: 'Steg-för-steg guide för att registrera dig, bjuda in team och konfigurera workspace.',
        sections: [
          { id: 'create-account', title: 'Skapa konto' },
          { id: 'create-workspace', title: 'Skapa ett workspace' },
          { id: 'invite-team', title: 'Bjud in teammedlemmar' },
          { id: 'roles-permissions', title: 'Roller & behörigheter' },
          { id: 'basic-settings', title: 'Grundinställningar' },
          { id: 'first-channel', title: 'Anslut din första kanal' }
        ]
      }
    ]
  },
  {
    slug: 'knowledge',
    title: 'Knowledge Base',
    icon: 'knowledge',
    description: 'Kunskapskällor, policies och regler för din AI-agent.',
    articles: [
      {
        slug: 'knowledge-sources',
        title: 'Hantera kunskapskällor',
        description: 'Ladda upp dokument, crawla URL:er och hantera AI-agentens kunskapsinnehåll.',
        sections: [
          { id: 'source-types', title: 'Typer av kunskapskällor' },
          { id: 'url-crawling', title: 'URL-crawling i detalj' },
          { id: 'file-upload', title: 'Filuppladdning' },
          { id: 'manual-content', title: 'Manuellt innehåll' },
          { id: 'versioning', title: 'Versionshantering' },
          { id: 'chunking-embeddings', title: 'Chunking & Embeddings' },
          { id: 'sync-status', title: 'Synkstatus' },
          { id: 'best-practices', title: 'Tips & best practices' }
        ]
      },
      {
        slug: 'policies',
        title: 'Policies & Regler',
        description: 'Ställ in regler som styr hur AI-agenten beter sig och svarar.',
        sections: [
          { id: 'what-is-policy', title: 'Vad är en policy?' },
          { id: 'create-policy', title: 'Skapa en policy' },
          { id: 'policy-examples', title: 'Exempelpolicies' },
          { id: 'priority', title: 'Policyprioritet & konflikter' },
          { id: 'test-policies', title: 'Testa policies' },
          { id: 'gdpr-compliance', title: 'GDPR & compliance-policies' }
        ]
      }
    ]
  },
  {
    slug: 'ai-automation',
    title: 'AI & Automation',
    icon: 'sparkles',
    description: 'Konfigurera AI-agenten, bygg procedurer och testa innan lansering.',
    articles: [
      {
        slug: 'procedures',
        title: 'Procedures – Automatiska workflows',
        description: 'Bygg multi-step procedurer som AI:n utför automatiskt.',
        sections: [
          { id: 'what-is-procedure', title: 'Vad är en Procedure?' },
          { id: 'step-types', title: 'Steg-typer' },
          { id: 'triggers', title: 'Triggers & villkor' },
          { id: 'variables', title: 'Variabler & kontext' },
          { id: 'example-return', title: 'Exempel: Returhantering' },
          { id: 'example-order-status', title: 'Exempel: Orderstatus-check' },
          { id: 'create-procedure', title: 'Skapa en procedure steg-för-steg' },
          { id: 'debugging', title: 'Felsökning & loggning' }
        ]
      },
      {
        slug: 'ai-settings',
        title: 'AI-agentens inställningar',
        description: 'Konfigurera tonalitet, confidence-trösklar, eskalering och modellval.',
        sections: [
          { id: 'tone', title: 'Tonalitet & personlighet' },
          { id: 'confidence', title: 'Confidence-tröskel' },
          { id: 'escalation', title: 'Eskaleringsregler' },
          { id: 'language', title: 'Språkhantering' },
          { id: 'model-selection', title: 'Modellval & prestanda' },
          { id: 'response-format', title: 'Svarsformattering' },
          { id: 'fallback', title: 'Fallback-beteende' }
        ]
      },
      {
        slug: 'testing',
        title: 'Testa din AI-agent',
        description: 'Kör simulerade konversationer för att verifiera AI:n innan lansering.',
        sections: [
          { id: 'simulation-runner', title: 'Simulation Runner' },
          { id: 'create-scenario', title: 'Skapa testscenarier' },
          { id: 'batch-testing', title: 'Batch-testning' },
          { id: 'result-analysis', title: 'Resultatanalys' },
          { id: 'regression-testing', title: 'Regressionstester' },
          { id: 'testing-tips', title: 'Best practices' }
        ]
      }
    ]
  },
  {
    slug: 'channels',
    title: 'Kanaler & Deploy',
    icon: 'settings',
    description: 'Chat-widget, e-post, WhatsApp, SMS och telefoni.',
    articles: [
      {
        slug: 'web-messenger',
        title: 'Web Messenger (Chat Widget)',
        description: 'Installera och anpassa din chattwidget på din webbplats.',
        sections: [
          { id: 'installation', title: 'Installation' },
          { id: 'customize', title: 'Anpassa utseende' },
          { id: 'behavior', title: 'Beteendeinställningar' },
          { id: 'proactive-messages', title: 'Proaktiva meddelanden' },
          { id: 'features', title: 'Funktioner' },
          { id: 'troubleshooting', title: 'Felsökning' }
        ]
      },
      {
        slug: 'email-channel',
        title: 'E-post',
        description: 'Koppla din support-email och låt AI:n svara automatiskt.',
        sections: [
          { id: 'connect-email', title: 'Koppla din support-e-post' },
          { id: 'how-it-works', title: 'Hur det fungerar' },
          { id: 'auto-reply', title: 'Auto-reply inställningar' },
          { id: 'email-templates', title: 'E-postmallar' },
          { id: 'dkim-spf', title: 'DKIM, SPF & leveransbarhet' },
          { id: 'troubleshooting', title: 'Felsökning' }
        ]
      },
      {
        slug: 'messaging-channels',
        title: 'WhatsApp, SMS & Telefoni',
        description: 'Aktivera WhatsApp Business, SMS och röstkanal via Twilio.',
        sections: [
          { id: 'whatsapp', title: 'WhatsApp Business' },
          { id: 'whatsapp-templates', title: 'WhatsApp-meddelanden & mallar' },
          { id: 'sms', title: 'SMS-kanal' },
          { id: 'voice', title: 'Telefoni (Voice)' },
          { id: 'shared-settings', title: 'Gemensamma inställningar' },
          { id: 'channel-routing', title: 'Kanaldirigering' }
        ]
      }
    ]
  },
  {
    slug: 'integrations',
    title: 'Integrationer & CRM',
    icon: 'connectors',
    description: 'Shopify, Stripe, Salesforce och andra datakällor.',
    articles: [
      {
        slug: 'data-connectors',
        title: 'Koppla Data Connectors',
        description: 'Anslut tredjeparter så AI:n kan hämta och agera på kunddata.',
        sections: [
          { id: 'available-connectors', title: 'Tillgängliga connectors' },
          { id: 'connect-steps', title: 'Koppla en connector' },
          { id: 'shopify-deep', title: 'Shopify-integration i detalj' },
          { id: 'stripe-deep', title: 'Stripe-integration i detalj' },
          { id: 'custom-api', title: 'Custom API Connector' },
          { id: 'webhooks', title: 'Webhooks' },
          { id: 'security', title: 'Säkerhet & kryptografi' }
        ]
      },
      {
        slug: 'crm-integration',
        title: 'CRM-integration',
        description: 'Synka kontakter, ärenden och historik med ditt CRM-system.',
        sections: [
          { id: 'why-crm', title: 'Varför CRM-integration?' },
          { id: 'connect-salesforce', title: 'Koppla Salesforce' },
          { id: 'connect-hubspot', title: 'Koppla HubSpot' },
          { id: 'field-mapping', title: 'Fältmappning' },
          { id: 'sync-settings', title: 'Synkinställningar' },
          { id: 'crm-in-inbox', title: 'CRM-data i Inbox' }
        ]
      }
    ]
  },
  {
    slug: 'inbox',
    title: 'Inbox & Konversationer',
    icon: 'conversations',
    description: 'Hantera ärenden, tilldela agenter och följ upp konversationer.',
    articles: [
      {
        slug: 'inbox-workflow',
        title: 'Arbeta i Inbox',
        description: 'Hantera ärenden, tilldela agenter och använd AI Copilot.',
        sections: [
          { id: 'inbox-layout', title: 'Inbox-vy & layout' },
          { id: 'status-flow', title: 'Ärendestatus & flöde' },
          { id: 'filters-views', title: 'Filter & vyer' },
          { id: 'assign', title: 'Tilldela ärenden' },
          { id: 'copilot', title: 'AI Copilot för agenter' },
          { id: 'macros', title: 'Macros & snabbsvar' },
          { id: 'shortcuts', title: 'Tangentbordsgenvägar' },
          { id: 'bulk-actions', title: 'Masshantering' }
        ]
      }
    ]
  },
  {
    slug: 'analytics',
    title: 'Analytics & Rapporter',
    icon: 'analytics',
    description: 'Resolution rate, responstid, content gaps och rapporter.',
    articles: [
      {
        slug: 'analytics-dashboard',
        title: 'Dashboard & KPI:er',
        description: 'Förstå AI-agentens prestanda med realtidsdata och grafer.',
        sections: [
          { id: 'kpis', title: 'KPI:er & nyckeltal' },
          { id: 'charts', title: 'Grafer & visualiseringar' },
          { id: 'content-gaps', title: 'Content Gaps & AI-förslag' },
          { id: 'filter-data', title: 'Filtrera & segmentera data' },
          { id: 'benchmarks', title: 'Benchmarks & mål' },
          { id: 'alerts', title: 'Notifieringar & tröskelvärden' }
        ]
      },
      {
        slug: 'reports',
        title: 'Rapporter & Export',
        description: 'Generera rapporter och exportera data för vidare analys.',
        sections: [
          { id: 'report-types', title: 'Tillgängliga rapporter' },
          { id: 'custom-reports', title: 'Bygg egna rapporter' },
          { id: 'schedule-reports', title: 'Schemalägg rapporter' },
          { id: 'export-formats', title: 'Exportformat' },
          { id: 'api-access', title: 'API-åtkomst till data' }
        ]
      }
    ]
  }
];

// ── AI call ───────────────────────────────────────────────────────────

async function callAI(systemPrompt, userPrompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.4,
          max_tokens: 4096
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
    } catch (err) {
      console.error(`  ⚠ Attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await sleep(2000 * attempt);
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── System prompt ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Du är en teknisk skribent för SWEO AI – en AI-driven kundsupportplattform. 
Du skriver professionell produktdokumentation på svenska.

SWEO AI är en SaaS-plattform som:
- Använder AI (GPT-4o) för att automatiskt svara på kundsupportärenden
- Stödjer flera kanaler: Web chat widget, e-post, WhatsApp, SMS, telefoni
- Har en "Flywheel"-modell: Train → Test → Deploy → Analyze (loop)
- Knowledge Base med URL-crawling, filuppladdning, manuellt innehåll
- Policies (regler i naturligt språk som AI:n följer)
- Procedures (multi-step automatiska workflows)
- Data Connectors (Shopify, Stripe, Salesforce, HubSpot, Custom API)
- Inbox för att hantera ärenden manuellt med AI Copilot
- Analytics dashboard med KPI:er, content gaps, rapporter
- Multi-tenant (varje organisation har isolerat workspace)
- Byggd med Next.js, Appwrite, Pinecone, OpenAI

Regler för ditt skrivande:
1. Skriv BARA valid HTML (p, ul, ol, li, strong, em, code, pre, table, thead, tbody, tr, th, td, h4, blockquote).
2. Skriv INTE markdown, bara HTML.
3. Var saklig, konkret och professionell. Undvik floskler.
4. Inkludera konkreta steg, exempelkonfigurationer och tips.
5. Varje sektion ska vara 150-400 ord. Skriv rikt och detaljerat.
6. Använd inte emojis.
7. Svara ENBART med HTML-innehållet, utan inledande text.
8. Skriv som om du vore en senior produktdokumentation-skribent hos ett SaaS-företag.
9. Inkludera praktiska tips-rutor med <blockquote><strong>Tips:</strong> ...</blockquote> där relevant.`;

// ── Generate content for one article ──────────────────────────────────

async function generateArticle(category, article) {
  const sectionTitles = article.sections.map((s) => `- ${s.title}`).join('\n');

  const prompt = `Skriv rikt HTML-innehåll för varje sektion i denna dokumentationsartikel.

Kategori: ${category.title}
Artikel: ${article.title}
Beskrivning: ${article.description}

Sektioner att skriva (i exakt denna ordning):
${sectionTitles}

Svara i exakt detta JSON-format (en array med objekt):
[
  {"id": "section-id", "content": "<p>HTML content here...</p>"},
  ...
]

KRITISKT: All HTML-innehåll MÅSTE vara på EN rad per "content"-värde. Inga radbrytningar inuti strängvärden.
Använd \\n om du behöver radbrytningar inuti HTML. Eller ännu bättre, låt HTML-taggarna hantera layout (p, ul, li, etc).

Varje "id" ska matcha exakt det id som sektionen har. Sektions-ID:na är:
${article.sections.map((s) => s.id).join(', ')}

Svara ENBART med valid JSON-arrayen. Ingen annan text.`;

  const raw = await callAI(SYSTEM_PROMPT, prompt);

  // Extract JSON from response (handle code fences)
  let jsonStr = raw;
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Try to find the JSON array
  const bracketStart = jsonStr.indexOf('[');
  const bracketEnd = jsonStr.lastIndexOf(']');
  if (bracketStart !== -1 && bracketEnd !== -1) {
    jsonStr = jsonStr.slice(bracketStart, bracketEnd + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    // Common issue: newlines inside JSON string values. Fix them.
    try {
      // Replace literal newlines inside string values with spaces
      const fixed = jsonStr
        .replace(/\n\s*/g, ' ')  // collapse newlines
        .replace(/\t/g, ' ');     // collapse tabs
      parsed = JSON.parse(fixed);
    } catch (err2) {
      // Last resort: try to extract sections manually with regex
      try {
        parsed = [];
        const sectionRegex = /"id"\s*:\s*"([^"]+)"[\s\S]*?"content"\s*:\s*"([\s\S]*?)(?:"\s*\})/g;
        let match;
        while ((match = sectionRegex.exec(raw)) !== null) {
          parsed.push({
            id: match[1],
            content: match[2].replace(/\n\s*/g, ' ').replace(/\\n/g, ' ').replace(/"/g, '"')
          });
        }
        if (parsed.length === 0) throw new Error('No sections extracted');
        console.log(`  ⚡ Extracted ${parsed.length} sections via regex fallback`);
      } catch (err3) {
        console.error(`  ❌ Failed to parse for "${article.title}". Using fallback.`);
        return article.sections.map((s) => ({
          id: s.id,
          title: s.title,
          content: `<p>Innehåll genereras...</p>`
        }));
      }
    }
  }

  // Map back to full section objects
  return article.sections.map((s) => {
    const generated = parsed.find((p) => p.id === s.id);
    return {
      id: s.id,
      title: s.title,
      content: generated?.content || `<p>Innehåll genereras...</p>`
    };
  });
}

// ── Build output ──────────────────────────────────────────────────────

function escapeForTemplate(html) {
  // Escape backticks and ${} in template literals
  return html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function buildDocsConfig(cats) {
  let lines = [];

  lines.push(`// ── Docs configuration ─────────────────────────────────────────────────`);
  lines.push(`// Auto-generated by scripts/generate-docs.mjs on ${new Date().toISOString()}`);
  lines.push(`// Content written by Mistral Large 3 675B via NVIDIA API.`);
  lines.push(`// Mirrors a GitHub-Docs-style structure: categories → articles.`);
  lines.push(`// Each article carries its own content sections so we can build a`);
  lines.push(`// right-hand "In this article" table-of-contents automatically.`);
  lines.push(``);
  lines.push(`export interface DocsSection {`);
  lines.push(`  id: string;`);
  lines.push(`  title: string;`);
  lines.push(`  content: string; // HTML-safe string (rendered via dangerouslySetInnerHTML)`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export interface DocsArticle {`);
  lines.push(`  slug: string;`);
  lines.push(`  title: string;`);
  lines.push(`  description: string;`);
  lines.push(`  sections: DocsSection[];`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export interface DocsCategory {`);
  lines.push(`  slug: string;`);
  lines.push(`  title: string;`);
  lines.push(`  icon: string; // tabler icon key from Icons map`);
  lines.push(`  description: string;`);
  lines.push(`  articles: DocsArticle[];`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`// ── Categories & articles ──────────────────────────────────────────────`);
  lines.push(``);
  lines.push(`export const docsCategories: DocsCategory[] = [`);

  for (const cat of cats) {
    lines.push(`  {`);
    lines.push(`    slug: '${cat.slug}',`);
    lines.push(`    title: '${cat.title}',`);
    lines.push(`    icon: '${cat.icon}',`);
    lines.push(`    description: '${cat.description.replace(/'/g, "\\'")}',`);
    lines.push(`    articles: [`);

    for (const article of cat.articles) {
      lines.push(`      {`);
      lines.push(`        slug: '${article.slug}',`);
      lines.push(`        title: '${article.title.replace(/'/g, "\\'")}',`);
      lines.push(`        description: '${article.description.replace(/'/g, "\\'")}',`);
      lines.push(`        sections: [`);

      for (const section of article.sections) {
        const escaped = escapeForTemplate(section.content);
        lines.push(`          {`);
        lines.push(`            id: '${section.id}',`);
        lines.push(`            title: '${section.title.replace(/'/g, "\\'")}',`);
        lines.push(`            content: \`${escaped}\``);
        lines.push(`          },`);
      }

      lines.push(`        ]`);
      lines.push(`      },`);
    }

    lines.push(`    ]`);
    lines.push(`  },`);
  }

  lines.push(`];`);
  lines.push(``);
  lines.push(`// ── Helpers ────────────────────────────────────────────────────────────`);
  lines.push(``);
  lines.push(`export function findArticle(categorySlug: string, articleSlug: string) {`);
  lines.push(`  const cat = docsCategories.find((c) => c.slug === categorySlug);`);
  lines.push(`  if (!cat) return null;`);
  lines.push(`  const article = cat.articles.find((a) => a.slug === articleSlug);`);
  lines.push(`  if (!article) return null;`);
  lines.push(`  return { category: cat, article };`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function getAllArticlePaths() {`);
  lines.push(`  return docsCategories.flatMap((cat) =>`);
  lines.push(`    cat.articles.map((a) => ({ category: cat.slug, slug: a.slug }))`);
  lines.push(`  );`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function getAdjacentArticles(categorySlug: string, articleSlug: string) {`);
  lines.push(`  const all = docsCategories.flatMap((cat) =>`);
  lines.push(`    cat.articles.map((a) => ({ category: cat, article: a }))`);
  lines.push(`  );`);
  lines.push(`  const idx = all.findIndex(`);
  lines.push(`    (x) => x.category.slug === categorySlug && x.article.slug === articleSlug`);
  lines.push(`  );`);
  lines.push(`  return {`);
  lines.push(`    prev: idx > 0 ? all[idx - 1] : null,`);
  lines.push(`    next: idx < all.length - 1 ? all[idx + 1] : null`);
  lines.push(`  };`);
  lines.push(`}`);
  lines.push(``);

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 SWEO AI Docs Generator');
  console.log(`   Model: ${MODEL}`);
  console.log(`   API: ${API_URL}`);
  console.log('');

  const totalArticles = categories.reduce((sum, c) => sum + c.articles.length, 0);
  let completed = 0;

  for (const cat of categories) {
    console.log(`📂 ${cat.title}`);

    for (const article of cat.articles) {
      completed++;
      console.log(`  📄 [${completed}/${totalArticles}] ${article.title}...`);

      const sections = await generateArticle(cat, article);
      article.sections = sections;

      // Rate-limit: wait between requests
      await sleep(1500);
    }
  }

  console.log('');
  console.log('✍️  Writing src/config/docs-config.ts...');

  const output = buildDocsConfig(categories);
  const outPath = resolve(ROOT, 'src/config/docs-config.ts');

  // Backup current file
  const current = readFileSync(outPath, 'utf-8');
  writeFileSync(outPath + '.bak', current, 'utf-8');
  console.log(`   Backup saved: docs-config.ts.bak`);

  writeFileSync(outPath, output, 'utf-8');
  console.log(`   ✅ Written ${output.length} chars to docs-config.ts`);
  console.log('');
  console.log('Done! Run `npm run dev` and check /docs to see the new content.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
