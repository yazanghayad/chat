'use client';

import ReportShell from './report-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Activity
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Stat({
  label,
  value,
  sub,
  icon: Icon
}: {
  label: string;
  value: string | number;
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

function pct(n: number, d: number): string {
  if (d === 0) return '0%';
  return ((n / d) * 100).toFixed(1) + '%';
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportConversations() {
  return (
    <ReportShell
      title='Conversations'
      description='Volume, status breakdown, and resolution rate'
    >
      {({ metrics }) => {
        const {
          totalConversations: total,
          totalResolved,
          totalEscalated,
          totalActive,
          resolutionRate,
          statusBreakdown,
          timeseries
        } = metrics;

        const statuses = Object.entries(statusBreakdown).sort(
          (a, b) => b[1] - a[1]
        );

        return (
          <div className='space-y-6'>
            {/* KPI strip */}
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
              <Stat label='Total' value={fmt(total)} icon={MessageSquare} />
              <Stat
                label='Resolved'
                value={fmt(totalResolved)}
                sub={pct(totalResolved, total)}
                icon={CheckCircle}
              />
              <Stat
                label='Escalated'
                value={fmt(totalEscalated)}
                sub={pct(totalEscalated, total)}
                icon={AlertTriangle}
              />
              <Stat
                label='Active'
                value={fmt(totalActive)}
                sub={pct(totalActive, total)}
                icon={Activity}
              />
            </div>

            {/* Resolution rate highlight */}
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-baseline gap-2'>
                  <span className='text-3xl font-semibold tabular-nums'>
                    {(resolutionRate * 100).toFixed(1)}%
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    AI resolution rate
                  </span>
                </div>
                <div className='bg-muted mt-3 h-1.5 w-full overflow-hidden rounded-full'>
                  <div
                    className='bg-foreground h-full rounded-full transition-all'
                    style={{ width: `${(resolutionRate * 100).toFixed(1)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Status breakdown table */}
            <div>
              <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                Status breakdown
              </h3>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs'>Status</TableHead>
                      <TableHead className='text-right text-xs'>
                        Count
                      </TableHead>
                      <TableHead className='text-right text-xs'>
                        Share
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statuses.map(([status, count]) => (
                      <TableRow key={status}>
                        <TableCell className='text-xs font-medium capitalize'>
                          {status.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className='text-right text-xs tabular-nums'>
                          {fmt(count)}
                        </TableCell>
                        <TableCell className='text-muted-foreground text-right text-xs tabular-nums'>
                          {pct(count, total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Daily trend table */}
            {timeseries.length > 0 && (
              <div>
                <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                  Daily trend
                </h3>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-xs'>Date</TableHead>
                        <TableHead className='text-right text-xs'>
                          Total
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          Resolved
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          Escalated
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          Resolution %
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeseries.map((p) => (
                        <TableRow key={p.date}>
                          <TableCell className='text-xs'>{p.date}</TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {p.total}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {p.resolved}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {p.escalated}
                          </TableCell>
                          <TableCell className='text-muted-foreground text-right text-xs tabular-nums'>
                            {pct(p.resolved, p.total)}
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
