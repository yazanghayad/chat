/**
 * Inngest serve endpoint.
 *
 * Registers all Inngest functions and exposes the HTTP handler
 * that Inngest's event bus uses to trigger function executions.
 */

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { inngestFunctions } from '@/lib/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions
});
