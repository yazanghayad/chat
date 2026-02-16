import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwrite/server';
import {
  runSimulation,
  type SimulationInput
} from '@/lib/ai/simulation-engine';
import { logAuditEventAsync } from '@/lib/audit/logger';

/**
 * POST /api/simulate
 *
 * Run a simulated conversation for testing. Requires authentication
 * via session cookie (admin dashboard only).
 *
 * Body:
 *   {
 *     tenantId: string,
 *     messages: string[],
 *     testProcedures?: boolean
 *   }
 */
export async function POST(request: NextRequest) {
  // Verify session
  try {
    const { account } = await createSessionClient();
    await account.get();
  } catch {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  let body: SimulationInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.tenantId || !body.messages || body.messages.length === 0) {
    return NextResponse.json(
      { error: 'tenantId and messages[] are required' },
      { status: 400 }
    );
  }

  if (body.messages.length > 20) {
    return NextResponse.json(
      { error: 'Maximum 20 messages per simulation' },
      { status: 400 }
    );
  }

  try {
    const result = await runSimulation(body);

    logAuditEventAsync(body.tenantId, 'simulation.run', {
      totalTurns: result.metrics.totalTurns,
      resolutionRate: result.metrics.resolutionRate,
      avgConfidence: result.metrics.avgConfidence
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Simulation failed:', err);
    return NextResponse.json(
      {
        error: 'Simulation failed',
        details: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
