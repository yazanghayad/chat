/**
 * Inngest client singleton.
 *
 * Provides the configured Inngest client used across all background
 * functions (chunking, embedding, cache invalidation, cron jobs).
 */

import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'support-ai',
  eventKey: process.env.INNGEST_EVENT_KEY
});
