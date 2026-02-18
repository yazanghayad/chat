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
import { Clock, Bot, User } from 'lucide-react';

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

export default function ReportResolutionTime() {
  return (
    <ReportShell
      title='Resolution Time'
      description='Time to resolve conversations from creation to close'
    >
      {({ metrics }) => {
        const {
          resolutionTime,
          aiResolutionTimeAvg,
          humanResolutionTimeAvg,
          resolutionTimeByChannel
        } = metrics;
        const channels = Object.entries(resolutionTimeByChannel).sort(
          (a, b) => a[1] - b[1]
        );

        return (
          <div className='space-y-6'>
            {/* KPIs */}
            <div className='grid grid-cols-3 gap-3'>
              <KPI
                label='Median'
                value={fmtMin(resolutionTime.median)}
                icon={Clock}
              />
              <KPI
                label='AI only'
                value={fmtMin(aiResolutionTimeAvg)}
                sub='Automated resolution'
                icon={Bot}
              />
              <KPI
                label='Human'
                value={fmtMin(humanResolutionTimeAvg)}
                sub='Agent-assisted'
                icon={User}
              />
            </div>

            {/* Comparison bar */}
            <Card>
              <CardContent className='p-4'>
                <p className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                  AI vs Human
                </p>
                <div className='space-y-3'>
                  {[
                    { label: 'AI resolution', val: aiResolutionTimeAvg },
                    { label: 'Human resolution', val: humanResolutionTimeAvg }
                  ].map((row) => {
                    const max = Math.max(
                      aiResolutionTimeAvg,
                      humanResolutionTimeAvg,
                      1
                    );
                    return (
                      <div key={row.label} className='flex items-center gap-3'>
                        <span className='w-32 text-xs font-medium'>
                          {row.label}
                        </span>
                        <div className='bg-muted relative h-5 flex-1 overflow-hidden rounded'>
                          <div
                            className='bg-foreground/15 absolute inset-y-0 left-0 rounded'
                            style={{
                              width: `${((row.val / max) * 100).toFixed(1)}%`
                            }}
                          />
                          <span className='relative z-10 flex h-full items-center pl-2 text-[11px] tabular-nums'>
                            {fmtMin(row.val)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Distribution */}
            {resolutionTime.distribution.length > 0 && (
              <div>
                <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                  Distribution
                </h3>
                <Card>
                  <CardContent className='space-y-2 p-4'>
                    {resolutionTime.distribution.map((b) => (
                      <div key={b.label} className='flex items-center gap-3'>
                        <span className='w-24 text-xs font-medium'>
                          {b.label}
                        </span>
                        <div className='bg-muted relative h-5 flex-1 overflow-hidden rounded'>
                          <div
                            className='bg-foreground/15 absolute inset-y-0 left-0 rounded'
                            style={{ width: `${Math.min(b.pct, 100)}%` }}
                          />
                          <span className='relative z-10 flex h-full items-center pl-2 text-[11px] tabular-nums'>
                            {b.count}{' '}
                            <span className='text-muted-foreground ml-1'>
                              ({b.pct.toFixed(0)}%)
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* By channel */}
            {channels.length > 0 && (
              <div>
                <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                  By channel
                </h3>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-xs'>Channel</TableHead>
                        <TableHead className='text-right text-xs'>
                          Avg resolution time
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {channels.map(([ch, avg]) => (
                        <TableRow key={ch}>
                          <TableCell className='text-xs font-medium capitalize'>
                            {ch}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {fmtMin(avg)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            )}
          </div>
        );
      }}
    </ReportShell>
  );
}
