/**
 * Twilio webhook signature verification.
 *
 * Validates that incoming webhook requests actually originated from Twilio
 * by checking the `X-Twilio-Signature` header against the request URL + params.
 *
 * Skips verification if TWILIO_AUTH_TOKEN is not set (dev mode).
 */

import twilio from 'twilio';

/**
 * Verify a Twilio webhook request signature.
 *
 * @param params   – The form/body params (key-value pairs)
 * @param signature – The `X-Twilio-Signature` header value
 * @param url       – The full request URL (including query params)
 * @returns true if valid, false if invalid
 */
export function verifyTwilioSignature(
  params: Record<string, string>,
  signature: string,
  url: string
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // Skip verification in dev mode (no auth token configured)
  if (!authToken) {
    console.warn(
      '[twilio-verify] TWILIO_AUTH_TOKEN not set – skipping signature verification'
    );
    return true;
  }

  if (!signature) {
    return false;
  }

  return twilio.validateRequest(authToken, signature, url, params);
}

/**
 * Check whether Twilio signature verification is enabled.
 */
export function isTwilioVerificationEnabled(): boolean {
  return !!process.env.TWILIO_AUTH_TOKEN;
}

/**
 * Build the full webhook URL from a Next.js request.
 * Twilio signs the complete URL including query parameters.
 */
export function buildWebhookUrl(request: Request, pathname: string): string {
  const url = new URL(request.url);

  // Use the public-facing URL if configured, otherwise reconstruct
  const baseUrl = process.env.NEXT_PUBLIC_URL ?? `${url.protocol}//${url.host}`;

  // Include the full path with query string (Twilio signs the complete URL)
  return `${baseUrl}${pathname}${url.search}`;
}
