/**
 * Text extraction utilities for PDF, DOCX, and URL sources.
 */

import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

/**
 * Extract plain text from a PDF buffer.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

/**
 * Extract plain text from a DOCX buffer.
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Scrape and extract main text content from a URL.
 */
export async function extractTextFromURL(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; SupportAI/1.0; +https://example.com)'
    },
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch URL: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove non-content elements
  $(
    'script, style, nav, header, footer, aside, iframe, noscript, [role="navigation"], [role="banner"], [role="contentinfo"]'
  ).remove();

  // Try to get main content first, fall back to body
  const mainContent =
    $('main').text() || $('article').text() || $('[role="main"]').text();

  const text = mainContent || $('body').text();

  // Clean up whitespace
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Detect file type from the file name and return extracted text.
 */
export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const ext = fileName.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pdf':
      return extractTextFromPDF(buffer);
    case 'docx':
      return extractTextFromDOCX(buffer);
    case 'txt':
    case 'md':
    case 'csv':
      return buffer.toString('utf-8');
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}
