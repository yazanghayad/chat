/**
 * Cron endpoint for content gap detection (AI Flywheel).
 *
 * Designed to be called by a cron scheduler (e.g. Vercel Cron, GitHub Actions).
 * Iterates over all active tenants and runs the gap detector.
 *
 * Authorization: Bearer token matching CRON_SECRET env variable.
 *
 * POST /api/cron/detect-gaps
 * Headers: Authorization: Bearer <CRON_SECRET>
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query } from 'node-appwrite';
import { detectContentGaps } from '@/lib/analytics/gap-detector';
import type { Tenant } from '@/types/appwrite';

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Run gap detection for all active tenants ──────────────────────────
  const { databases } = createAdminClient();

  let tenants: Tenant[] = [];
  try {
    const result = await databases.listDocuments<Tenant>(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      [Query.limit(500)]
    );
    tenants = result.documents;
  } catch (err) {
    console.error('Failed to list tenants for gap detection:', err);
    return NextResponse.json(
      { error: 'Failed to list tenants' },
      { status: 500 }
    );
  }

  const results: Array<{
    tenantId: string;
    suggestions: number;
    error?: string;
  }> = [];

  for (const tenant of tenants) {
    try {
      const suggestions = await detectContentGaps(tenant.$id);
      results.push({
        tenantId: tenant.$id,
        suggestions: suggestions.length
      });
    } catch (err) {
      console.error(`Gap detection failed for tenant ${tenant.$id}:`, err);
      results.push({
        tenantId: tenant.$id,
        suggestions: 0,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }

  const totalSuggestions = results.reduce((sum, r) => sum + r.suggestions, 0);
  const failures = results.filter((r) => r.error).length;

  return NextResponse.json({
    success: true,
    tenantsProcessed: tenants.length,
    totalSuggestions,
    failures,
    results
  });
}
