'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useTenant } from '@/hooks/use-tenant';
import { getAnalyticsAction } from '@/features/analytics/actions/analytics-actions';
import type { AnalyticsMetrics } from '@/lib/analytics/analytics-engine';
import { Icons } from '@/components/icons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Calendar,
  RefreshCw,
  MessageSquare,
  Clock,
  Star,
  Bot,
  ShieldCheck,
  BookOpen,
  Users,
  BarChart3,
  Radio,
  ChevronRight,
  Activity,
  AlertTriangle,
  CheckCircle,
  Target
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Report catalog
// ---------------------------------------------------------------------------

const REPORT_ITEMS = [
  {
    slug: 'conversations',
    title: 'Conversations',
    description: 'Volume, status breakdown, and resolution rate',
    icon: MessageSquare,
    category: 'overview'
  },
  {
    slug: 'first-response',
    title: 'First Response Time',
    description: 'Median, average, and per-channel response times',
    icon: Clock,
    category: 'performance'
  },
  {
    slug: 'resolution-time',
    title: 'Resolution Time',
    description: 'Time to resolve, AI vs human comparison',
    icon: Activity,
    category: 'performance'
  },
  {
    slug: 'csat',
    title: 'Customer Satisfaction',
    description: 'CSAT scores and sentiment analysis',
    icon: Star,
    category: 'quality'
  },
  {
    slug: 'fin-performance',
    title: 'Fin AI Performance',
    description: 'Resolution rate, confidence, and accuracy',
    icon: Bot,
    category: 'ai'
  },
  {
    slug: 'fin-deflection',
    title: 'Fin AI Deflection',
    description: 'Deflection rate and estimated savings',
    icon: ShieldCheck,
    category: 'ai'
  },
  {
    slug: 'knowledge-gaps',
    title: 'Knowledge Gaps',
    description: 'Topics with low confidence scores',
    icon: BookOpen,
    category: 'ai'
  },
  {
    slug: 'team-performance',
    title: 'Team Performance',
    description: 'Agent workload, resolution times, and CSAT',
    icon: Users,
    category: 'team'
  },
  {
    slug: 'busiest-hours',
    title: 'Busiest Hours',
    description: 'Volume by time of day and day of week',
    icon: BarChart3,
    category: 'overview'
  },
  {
    slug: 'channels',
    title: 'Channels',
    description: 'Performance breakdown by channel',
    icon: Radio,
    category: 'overview'
  }
];

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'performance', label: 'Performance' },
  { key: 'quality', label: 'Quality' },
  { key: 'ai', label: 'AI & Automation' },
  { key: 'team', label: 'Team' }
];

// ---------------------------------------------------------------------------
// Mini sparkline – a tiny inline bar chart for timeseries
// ---------------------------------------------------------------------------

function Sparkline({ data, height = 32 }: { data: number[]; height?: number }) {
  const max = Math.max(...data, 1);
  const w = 100 / data.length;
  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio='none'
      className='h-8 w-full'
    >
      {data.map((v, i) => {
        const h = (v / max) * height;
        return (
          <rect
            key={i}
            x={i * w + w * 0.15}
            y={height - h}
            width={w * 0.7}
            height={Math.max(h, 0.5)}
            rx={0.6}
            className='fill-foreground/12'
          />
        );
      })}
    </svg>
  );
}

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportsPageClient() {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const res = await getAnalyticsAction(tenant.$id, parseInt(dateRange));
    if (res.success && res.metrics) setMetrics(res.metrics);
    setLoading(false);
  }, [tenant, dateRange]);

  useEffect(() => {
    if (tenant) load();
  }, [tenant, load]);

  // Timeseries data for sparkline
  const sparkData = useMemo(
    () => (metrics ? metrics.timeseries.map((p) => p.total) : []),
    [metrics]
  );

  if (tenantLoading) {
    return (
      <div className='flex h-[calc(100vh-120px)] items-center justify-center'>
        <Icons.spinner className='text-muted-foreground h-5 w-5 animate-spin' />
      </div>
    );
  }

  if (tenantError || !tenant) {
    return (
      <div className='text-muted-foreground flex h-[calc(100vh-120px)] items-center justify-center text-sm'>
        {tenantError ?? 'Could not load workspace'}
      </div>
    );
  }

  return (
    <div className='flex h-full flex-col'>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className='border-b'>
        <div className='flex h-12 items-center gap-3 px-6'>
          <div className='min-w-0 flex-1'>
            <h1 className='text-sm leading-tight font-semibold'>Reports</h1>
          </div>

          <div className='flex items-center gap-1.5'>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className='h-7 w-[130px] text-xs font-normal'>
                <Calendar className='mr-1 h-3 w-3 opacity-40' />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='7'>Last 7 days</SelectItem>
                <SelectItem value='14'>Last 14 days</SelectItem>
                <SelectItem value='30'>Last 30 days</SelectItem>
                <SelectItem value='90'>Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7'
                    onClick={load}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className='text-xs'>Refresh</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className='flex-1 overflow-y-auto'>
        <div className='mx-auto max-w-[1120px] px-6 py-6'>
          {loading || !metrics ? (
            <div className='flex flex-col items-center justify-center gap-2 py-24'>
              <Icons.spinner className='text-muted-foreground h-5 w-5 animate-spin' />
              <span className='text-muted-foreground text-xs'>
                Loading metrics…
              </span>
            </div>
          ) : (
            <div className='space-y-8'>
              {/* ── Executive summary ───────────────────────────────── */}
              <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
                {/* Left: headline KPI + trend */}
                <div className='lg:col-span-2'>
                  <Card>
                    <CardContent className='p-5'>
                      <div className='mb-4 flex items-start justify-between'>
                        <div>
                          <p className='text-muted-foreground text-[11px] font-medium tracking-wider uppercase'>
                            Conversation volume
                          </p>
                          <p className='mt-1 text-3xl font-semibold tabular-nums'>
                            {metrics.totalConversations.toLocaleString()}
                          </p>
                          <p className='text-muted-foreground mt-1 text-xs'>
                            Last {dateRange} days
                          </p>
                        </div>
                        <div className='text-right'>
                          <p className='text-muted-foreground text-[11px] font-medium tracking-wider uppercase'>
                            AI resolution
                          </p>
                          <p className='mt-1 text-3xl font-semibold tabular-nums'>
                            {(metrics.resolutionRate * 100).toFixed(1)}%
                          </p>
                          <p className='text-muted-foreground mt-1 text-xs'>
                            {metrics.totalResolved.toLocaleString()} resolved
                          </p>
                        </div>
                      </div>

                      {/* Sparkline */}
                      {sparkData.length > 1 && (
                        <div className='mt-2'>
                          <Sparkline data={sparkData} />
                          <div className='text-muted-foreground mt-1 flex justify-between text-[9px]'>
                            <span>{metrics.timeseries[0]?.date ?? ''}</span>
                            <span>
                              {metrics.timeseries[metrics.timeseries.length - 1]
                                ?.date ?? ''}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right: key metrics stack */}
                <div className='grid grid-cols-2 gap-3 lg:grid-cols-1'>
                  <Card>
                    <CardContent className='flex items-center gap-3 p-4'>
                      <div className='bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md'>
                        <Star className='text-muted-foreground h-3.5 w-3.5' />
                      </div>
                      <div>
                        <p className='text-muted-foreground text-[11px] font-medium tracking-wider uppercase'>
                          CSAT
                        </p>
                        <p className='text-lg font-semibold tabular-nums'>
                          {metrics.csat.avgScore.toFixed(2)}
                          <span className='text-muted-foreground ml-1 text-xs font-normal'>
                            / 5.0
                          </span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className='flex items-center gap-3 p-4'>
                      <div className='bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md'>
                        <Clock className='text-muted-foreground h-3.5 w-3.5' />
                      </div>
                      <div>
                        <p className='text-muted-foreground text-[11px] font-medium tracking-wider uppercase'>
                          First response
                        </p>
                        <p className='text-lg font-semibold tabular-nums'>
                          {fmtMin(metrics.firstResponse.median)}
                          <span className='text-muted-foreground ml-1 text-xs font-normal'>
                            median
                          </span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className='col-span-2 lg:col-span-1'>
                    <CardContent className='flex items-center gap-3 p-4'>
                      <div className='bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md'>
                        <Target className='text-muted-foreground h-3.5 w-3.5' />
                      </div>
                      <div>
                        <p className='text-muted-foreground text-[11px] font-medium tracking-wider uppercase'>
                          Avg confidence
                        </p>
                        <p className='text-lg font-semibold tabular-nums'>
                          {(metrics.avgConfidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* ── Status breakdown (horizontal bar) ──────────────── */}
              <Card>
                <CardContent className='p-4'>
                  <p className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                    Status breakdown
                  </p>
                  <div className='flex gap-6'>
                    {[
                      {
                        label: 'Resolved',
                        value: metrics.totalResolved,
                        icon: CheckCircle
                      },
                      {
                        label: 'Escalated',
                        value: metrics.totalEscalated,
                        icon: AlertTriangle
                      },
                      {
                        label: 'Active',
                        value: metrics.totalActive,
                        icon: Activity
                      }
                    ].map((item) => {
                      const pct =
                        metrics.totalConversations > 0
                          ? (item.value / metrics.totalConversations) * 100
                          : 0;
                      return (
                        <div key={item.label} className='flex-1'>
                          <div className='mb-1.5 flex items-center gap-1.5'>
                            <item.icon className='text-muted-foreground h-3 w-3' />
                            <span className='text-xs font-medium'>
                              {item.label}
                            </span>
                            <span className='text-muted-foreground ml-auto text-xs tabular-nums'>
                              {item.value.toLocaleString()}
                            </span>
                          </div>
                          <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
                            <div
                              className='bg-foreground/20 h-full rounded-full transition-all'
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className='text-muted-foreground mt-1 text-[10px] tabular-nums'>
                            {pct.toFixed(1)}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* ── Channel quick stats ────────────────────────────── */}
              {metrics.channelStats.length > 0 && (
                <div>
                  <div className='mb-3 flex items-center justify-between'>
                    <h2 className='text-muted-foreground text-[11px] font-medium tracking-wider uppercase'>
                      Channel overview
                    </h2>
                    <Link
                      href='/dashboard/reports/channels'
                      className='text-muted-foreground hover:text-foreground text-xs transition-colors'
                    >
                      View full report →
                    </Link>
                  </div>
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='text-xs'>Channel</TableHead>
                          <TableHead className='text-right text-xs'>
                            Volume
                          </TableHead>
                          <TableHead className='text-right text-xs'>
                            Resolution
                          </TableHead>
                          <TableHead className='text-right text-xs'>
                            CSAT
                          </TableHead>
                          <TableHead className='text-right text-xs'>
                            First resp
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...metrics.channelStats]
                          .sort((a, b) => b.volume - a.volume)
                          .slice(0, 5)
                          .map((ch) => (
                            <TableRow key={ch.channel}>
                              <TableCell className='text-xs font-medium capitalize'>
                                {ch.channel}
                              </TableCell>
                              <TableCell className='text-right text-xs tabular-nums'>
                                {ch.volume.toLocaleString()}
                              </TableCell>
                              <TableCell className='text-right text-xs tabular-nums'>
                                {ch.resolutionRate.toFixed(1)}%
                              </TableCell>
                              <TableCell className='text-right text-xs tabular-nums'>
                                {ch.avgCsat.toFixed(2)}
                              </TableCell>
                              <TableCell className='text-right text-xs tabular-nums'>
                                {fmtMin(ch.avgFirstResponse)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              )}

              <Separator />

              {/* ── Report catalog ─────────────────────────────────── */}
              <div>
                <h2 className='text-muted-foreground mb-5 text-[11px] font-medium tracking-wider uppercase'>
                  All reports
                </h2>
                <div className='space-y-6'>
                  {CATEGORIES.map((cat) => {
                    const items = REPORT_ITEMS.filter(
                      (r) => r.category === cat.key
                    );
                    if (items.length === 0) return null;
                    return (
                      <div key={cat.key}>
                        <p className='text-muted-foreground mb-2 text-[10px] font-semibold tracking-widest uppercase'>
                          {cat.label}
                        </p>
                        <div className='grid gap-1.5 sm:grid-cols-2'>
                          {items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.slug}
                                href={`/dashboard/reports/${item.slug}`}
                                className='group'
                              >
                                <div className='hover:bg-accent/50 flex items-center gap-3 rounded-lg border p-3 transition-colors'>
                                  <div className='bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md'>
                                    <Icon className='text-muted-foreground h-3.5 w-3.5' />
                                  </div>
                                  <div className='min-w-0 flex-1'>
                                    <p className='text-sm leading-tight font-medium'>
                                      {item.title}
                                    </p>
                                    <p className='text-muted-foreground mt-0.5 text-[11px] leading-tight'>
                                      {item.description}
                                    </p>
                                  </div>
                                  <ChevronRight className='text-muted-foreground/40 h-3.5 w-3.5 shrink-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100' />
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
