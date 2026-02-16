/**
 * Recursive text splitter for chunking documents before embedding.
 *
 * Splits text into overlapping chunks to preserve context across boundaries.
 */

export interface ChunkOptions {
  /** Maximum number of characters per chunk. */
  chunkSize?: number;
  /** Number of characters to overlap between consecutive chunks. */
  chunkOverlap?: number;
  /** Separator hierarchy – the splitter tries each in order. */
  separators?: string[];
}

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ' ', ''];
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * Split `text` into chunks using a recursive character text splitter strategy.
 */
export function splitTextIntoChunks(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    separators = DEFAULT_SEPARATORS
  } = options;

  if (text.length <= chunkSize) {
    return [text.trim()].filter(Boolean);
  }

  // Find the first separator that exists in the text
  let chosenSeparator = '';
  for (const sep of separators) {
    if (sep === '' || text.includes(sep)) {
      chosenSeparator = sep;
      break;
    }
  }

  const parts =
    chosenSeparator === '' ? text.split('') : text.split(chosenSeparator);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const part of parts) {
    const candidate = currentChunk
      ? currentChunk + chosenSeparator + part
      : part;

    if (candidate.length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());

      // Overlap: keep the tail of the current chunk
      const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
      currentChunk = currentChunk.slice(overlapStart) + chosenSeparator + part;
    } else {
      currentChunk = candidate;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(Boolean);
}

/**
 * Convenience: compute total token-estimate (rough char/4 approximation).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
