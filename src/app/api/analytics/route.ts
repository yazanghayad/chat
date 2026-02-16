/**
 * Analytics API route.
 *
 * GET  /api/analytics?tenantId=xxx&days=30
 *
 * Returns aggregated metrics for a tenant: resolution rate, confidence,
 * conversations by channel, timeseries data, and top topics.
 *
 * Requires session-based authentication (dashboard user).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwrite/server';
import { getAnalytics } from '@/lib/analytics/analytics-engine';

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────
  let account;
  try {
    const { account: sessionAccount } = await createSessionClient();
    account = await sessionAccount.get();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse params ──────────────────────────────────────────────────────
  const tenantId = req.nextUrl.searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json(
      { error: 'Missing tenantId parameter' },
      { status: 400 }
    );
  }

  const days = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10);
  if (isNaN(days) || days < 1 || days > 365) {
    return NextResponse.json(
      { error: 'Invalid days parameter (1-365)' },
      { status: 400 }
    );
  }

  // ── Compute analytics ─────────────────────────────────────────────────
  try {
    // We use account.$id for potential future tenant-access verification
    void account;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await getAnalytics(tenantId, startDate, endDate);

    return NextResponse.json({ success: true, metrics });
  } catch (err) {
    console.error('Analytics API error:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to compute analytics'
      },
      { status: 500 }
    );
  }
}
