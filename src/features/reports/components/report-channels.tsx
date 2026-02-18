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
import { Radio, BarChart3, TrendingUp } from 'lucide-react';

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

export default function ReportChannels() {
  return (
    <ReportShell
      title='Channels'
      description='Performance breakdown by communication channel'
    >
      {({ metrics }) => {
        const { channelStats, channelBreakdown } = metrics;

        const totalVolume = channelStats.reduce((s, c) => s + c.volume, 0);
        const activeChannels = channelStats.length;

        // Top channel
        const topChannel =
          channelStats.length > 0
            ? [...channelStats].sort((a, b) => b.volume - a.volume)[0]
            : null;

        // Weighted avg resolution rate
        const avgResRate =
          totalVolume > 0
            ? channelStats.reduce(
                (s, c) => s + (c.resolutionRate / 100) * c.volume,
                0
              ) / totalVolume
            : 0;

        // Sort by volume
        const sorted = [...channelStats].sort((a, b) => b.volume - a.volume);

        return (
          <div className='space-y-6'>
            {/* KPIs */}
            <div className='grid grid-cols-3 gap-3'>
              <KPI
                label='Active channels'
                value={activeChannels.toString()}
                icon={Radio}
              />
              <KPI
                label='Total volume'
                value={totalVolume.toLocaleString()}
                icon={BarChart3}
              />
              <KPI
                label='Top channel'
                value={topChannel?.channel ?? '—'}
                sub={
                  topChannel ? `${topChannel.volume} conversations` : undefined
                }
                icon={TrendingUp}
              />
            </div>

            {/* Volume distribution */}
            {sorted.length > 0 && (
              <div>
                <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                  Volume by channel
                </h3>
                <Card>
                  <CardContent className='space-y-2 p-4'>
                    {sorted.map((ch) => {
                      const pct =
                        totalVolume > 0 ? (ch.volume / totalVolume) * 100 : 0;
                      return (
                        <div
                          key={ch.channel}
                          className='flex items-center gap-3'
                        >
                          <span className='w-24 text-xs font-medium capitalize'>
                            {ch.channel}
                          </span>
                          <div className='bg-muted relative h-5 flex-1 overflow-hidden rounded'>
                            <div
                              className='bg-foreground/15 absolute inset-y-0 left-0 rounded'
                              style={{ width: `${pct}%` }}
                            />
                            <span className='relative z-10 flex h-full items-center pl-2 text-[11px] tabular-nums'>
                              {ch.volume}
                              <span className='text-muted-foreground ml-1'>
                                ({pct.toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Full comparison table */}
            {sorted.length > 0 && (
              <div>
                <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                  Channel comparison
                </h3>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-xs'>Channel</TableHead>
                        <TableHead className='text-right text-xs'>
                          Volume
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          Resolved
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          Resolution %
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          First resp
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          Res time
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          CSAT
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sorted.map((ch) => (
                        <TableRow key={ch.channel}>
                          <TableCell className='text-xs font-medium capitalize'>
                            {ch.channel}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {ch.volume.toLocaleString()}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {ch.resolved.toLocaleString()}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {ch.resolutionRate.toFixed(1)}%
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {fmtMin(ch.avgFirstResponse)}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {fmtMin(ch.avgResolutionTime)}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {ch.avgCsat.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            )}

            {sorted.length === 0 && (
              <Card>
                <CardContent className='text-muted-foreground p-6 text-center text-sm'>
                  No channel data available for this period.
                </CardContent>
              </Card>
            )}
          </div>
        );
      }}
    </ReportShell>
  );
}
