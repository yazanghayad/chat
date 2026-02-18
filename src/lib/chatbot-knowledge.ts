/**
 * Chatbot Knowledge Loader
 *
 * Extracts plain-text knowledge from docs-data.json and provides it
 * as a pre-built string that can be injected into the SWEO chatbot
 * system prompt. Cached at module level so JSON is only parsed once.
 */

import docsData from '@/config/docs-data.json';

// ── Strip HTML tags & normalise whitespace ────────────────────────────────
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Build knowledge text (runs once, cached) ──────────────────────────────
function buildKnowledgeText(): string {
  const lines: string[] = [];

  for (const category of docsData as Array<{
    title: string;
    articles?: Array<{
      title: string;
      content?: string;
      sections?: Array<{ title: string; content: string }>;
    }>;
  }>) {
    lines.push(`\n## ${category.title}`);

    for (const article of category.articles ?? []) {
      lines.push(`\n### ${article.title}`);
      if (article.content) {
        lines.push(stripHtml(article.content));
      }
      for (const section of article.sections ?? []) {
        lines.push(`#### ${section.title}`);
        lines.push(stripHtml(section.content));
      }
    }
  }

  return lines.join('\n');
}

/** Full platform knowledge as plain text (cached at module level). */
export const PLATFORM_KNOWLEDGE = buildKnowledgeText();
