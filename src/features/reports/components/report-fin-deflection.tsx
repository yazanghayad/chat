'use client';

import ReportShell from './report-shell';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Bot, Clock, ShieldCheck, TrendingDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtMin(n: number): string {
  if (n < 1) return `${Math.round(n * 60)}s`;
  if (n < 60) return `${n.toFixed(1)}m`;
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function KPI({
  label,
  value,
  sub,
  icon: Icon
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className='flex items-start gap-3 p-4'>
        {Icon && (
          <div className='bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md'>
            <Icon className='text-muted-foreground h-3.5 w-3.5' />
          </div>
        )}
        <div className='min-w-0'>
          <p className='text-muted-foreground text-[11px] font-medium tracking-wider uppercase'>
            {label}
          </p>
          <p className='mt-0.5 text-xl font-semibold tabular-nums'>{value}</p>
          {sub && <p className='text-muted-foreground mt-0.5 text-xs'>{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportFinDeflection() {
  return (
    <ReportShell
      title='Fin AI Deflection'
      description='Conversations resolved without human intervention'
    >
      {({ metrics }) => {
        const {
          totalConversations,
          totalResolved,
          totalEscalated,
          resolutionRate,
          aiResolutionTimeAvg,
          humanResolutionTimeAvg
        } = metrics;

        const deflected = totalResolved;
        const deflectionRate =
          totalConversations > 0 ? totalResolved / totalConversations : 0;

        // Time saved: if AI resolves faster, estimate savings
        const timeSavedPerConv = Math.max(
          humanResolutionTimeAvg - aiResolutionTimeAvg,
          0
        );
        const totalTimeSavedMin = timeSavedPerConv * deflected;
        const totalTimeSavedHours = totalTimeSavedMin / 60;

        // Cost savings estimate ($25/hr agent cost)
        const costPerHour = 25;
        const costSaved = totalTimeSavedHours * costPerHour;

        return (
          <div className='space-y-6'>
            {/* KPIs */}
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
              <KPI
                label='Deflection rate'
                value={`${(deflectionRate * 100).toFixed(1)}%`}
                sub={`${deflected} of ${totalConversations}`}
                icon={ShieldCheck}
              />
              <KPI
                label='Deflected'
                value={deflected.toLocaleString()}
                sub='Resolved by AI'
                icon={Bot}
              />
              <KPI
                label='Escalated'
                value={totalEscalated.toLocaleString()}
                sub='Required human'
                icon={TrendingDown}
              />
              <KPI
                label='Time saved'
                value={
                  totalTimeSavedHours >= 1
                    ? `${totalTimeSavedHours.toFixed(0)}h`
                    : `${totalTimeSavedMin.toFixed(0)}m`
                }
                sub={`≈ $${costSaved.toFixed(0)} saved`}
                icon={Clock}
              />
            </div>

            {/* Deflection bar */}
            <Card>
              <CardContent className='p-4'>
                <p className='text-muted-foreground mb-2 text-[11px] font-medium tracking-wider uppercase'>
                  Deflection rate
                </p>
                <div className='flex items-baseline gap-2'>
                  <span className='text-3xl font-semibold tabular-nums'>
                    {(deflectionRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className='bg-muted mt-3 h-1.5 w-full overflow-hidden rounded-full'>
                  <div
                    className='bg-foreground h-full rounded-full transition-all'
                    style={{
                      width: `${(deflectionRate * 100).toFixed(1)}%`
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Savings breakdown */}
            <div>
              <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                Estimated savings
              </h3>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs'>Metric</TableHead>
                      <TableHead className='text-right text-xs'>
                        Value
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className='text-xs font-medium'>
                        Conversations deflected
                      </TableCell>
                      <TableCell className='text-right text-xs tabular-nums'>
                        {deflected.toLocaleString()}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className='text-xs font-medium'>
                        Avg time saved per conversation
                      </TableCell>
                      <TableCell className='text-right text-xs tabular-nums'>
                        {fmtMin(timeSavedPerConv)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className='text-xs font-medium'>
                        Total time saved
                      </TableCell>
                      <TableCell className='text-right text-xs tabular-nums'>
                        {totalTimeSavedHours >= 1
                          ? `${totalTimeSavedHours.toFixed(1)} hours`
                          : `${totalTimeSavedMin.toFixed(0)} minutes`}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className='text-xs font-medium'>
                        Estimated cost savings
                      </TableCell>
                      <TableCell className='text-right text-xs tabular-nums'>
                        $
                        {costSaved.toLocaleString('en-US', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className='text-muted-foreground text-xs'>
                        AI avg resolution time
                      </TableCell>
                      <TableCell className='text-muted-foreground text-right text-xs tabular-nums'>
                        {fmtMin(aiResolutionTimeAvg)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className='text-muted-foreground text-xs'>
                        Human avg resolution time
                      </TableCell>
                      <TableCell className='text-muted-foreground text-right text-xs tabular-nums'>
                        {fmtMin(humanResolutionTimeAvg)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Note */}
            <div className='text-muted-foreground border-t pt-4 text-xs'>
              Cost savings estimated at ${costPerHour}/hr average agent cost.
              Actual savings may vary.
            </div>
          </div>
        );
      }}
    </ReportShell>
  );
}
