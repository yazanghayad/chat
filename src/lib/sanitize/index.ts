/**
 * Input sanitization utilities.
 *
 * Uses DOMPurify to strip dangerous HTML/JavaScript from user input.
 * Provides both HTML-safe and plain-text sanitization.
 */

import DOMPurify from 'isomorphic-dompurify';

// ---------------------------------------------------------------------------
// HTML sanitization (keeps safe formatting tags)
// ---------------------------------------------------------------------------

const ALLOWED_TAGS = [
  'b',
  'i',
  'em',
  'strong',
  'a',
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'code',
  'pre',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6'
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel'];

/**
 * Sanitize HTML content – strips dangerous tags/attributes but keeps
 * safe formatting (bold, italic, links, lists, code blocks, etc.).
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false
  });
}

// ---------------------------------------------------------------------------
// Plain text sanitization (strips ALL HTML)
// ---------------------------------------------------------------------------

/**
 * Strip all HTML tags and normalize whitespace.
 * Use for chat messages, search queries, and other plain-text fields.
 */
export function sanitizeText(input: string): string {
  if (!input) return '';

  // Strip all HTML
  const stripped = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });

  // Normalize whitespace: collapse multiple spaces/newlines
  return stripped.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Object sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitize specific string fields on an object.
 * Non-string fields and fields not in the list are left unchanged.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  mode: 'html' | 'text' = 'text'
): T {
  const sanitized = { ...obj };
  const sanitizer = mode === 'html' ? sanitizeHtml : sanitizeText;

  for (const field of fields) {
    const value = sanitized[field];
    if (typeof value === 'string') {
      (sanitized[field] as unknown) = sanitizer(value);
    }
  }

  return sanitized;
}

/**
 * Sanitize a value that should be plain text.
 * Returns an empty string if the input is not a string.
 */
export function sanitizeInput(value: unknown): string {
  if (typeof value !== 'string') return '';
  return sanitizeText(value);
}
