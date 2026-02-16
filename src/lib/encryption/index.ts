/**
 * AES-256-GCM encryption for sensitive data (connector credentials, etc.).
 *
 * Uses Node.js built-in `crypto` module — zero external dependencies.
 *
 * Format: `iv:authTag:ciphertext` (all base64-encoded)
 *
 * Configuration:
 *   ENCRYPTION_KEY – 32 bytes as hex (64 hex chars)
 */

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits – recommended for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment.
 * Returns null if not configured.
 */
function getKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    return null;
  }
  return Buffer.from(hex, 'hex');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if encryption is configured.
 */
export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

/**
 * Encrypt a plaintext string.
 * Returns the encrypted string in format `iv:authTag:ciphertext` (base64).
 * If encryption is not configured, returns the plaintext unchanged.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string.
 * If the input doesn't look encrypted (no colons), returns it unchanged.
 * If encryption is not configured, returns the input unchanged.
 */
export function decrypt(encrypted: string): string {
  const key = getKey();
  if (!key) return encrypted;

  // Check if the string looks encrypted (format: iv:authTag:ciphertext)
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    // Not encrypted – return as-is (backwards compatibility)
    return encrypted;
  }

  try {
    const [ivB64, authTagB64, ciphertext] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('[encryption] Decryption failed:', err);
    // Return the input as-is if decryption fails (e.g. wrong key)
    return encrypted;
  }
}

/**
 * Encrypt a credentials object (Record<string, string>).
 * Encrypts each value individually.
 */
export function encryptCredentials(
  credentials: Record<string, string>
): Record<string, string> {
  const encrypted: Record<string, string> = {};
  for (const [k, v] of Object.entries(credentials)) {
    encrypted[k] = encrypt(v);
  }
  return encrypted;
}

/**
 * Decrypt a credentials object.
 */
export function decryptCredentials(
  credentials: Record<string, string>
): Record<string, string> {
  const decrypted: Record<string, string> = {};
  for (const [k, v] of Object.entries(credentials)) {
    decrypted[k] = decrypt(v);
  }
  return decrypted;
}

/**
 * Mask credential values for display (show first 4 chars + ***).
 */
export function maskCredentials(
  credentials: Record<string, string>
): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(credentials)) {
    if (v.length > 4) {
      masked[k] = `${v.slice(0, 4)}${'*'.repeat(Math.min(v.length - 4, 20))}`;
    } else {
      masked[k] = '****';
    }
  }
  return masked;
}
