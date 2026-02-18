'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/hooks/use-tenant';
import { getAnalyticsAction } from '@/features/analytics/actions/analytics-actions';
import type { AnalyticsMetrics } from '@/lib/analytics/analytics-engine';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Globe,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportShellProps {
  title: string;
  description: string;
  children: (props: {
    metrics: AnalyticsMetrics;
    dateRange: string;
    loading: boolean;
  }) => ReactNode;
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function metricsToCSV(metrics: AnalyticsMetrics, title: string): string {
  const rows: string[] = [];
  const ts = new Date().toISOString();
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;

  rows.push(`${esc('Report')},${esc(title)}`);
  rows.push(`${esc('Generated')},${esc(ts)}`);
  rows.push('');

  rows.push(`${esc('Metric')},${esc('Value')}`);
  rows.push(`${esc('Total Conversations')},${metrics.totalConversations}`);
  rows.push(`${esc('Resolved')},${metrics.totalResolved}`);
  rows.push(`${esc('Escalated')},${metrics.totalEscalated}`);
  rows.push(`${esc('Active')},${metrics.totalActive}`);
  rows.push(
    `${esc('Resolution Rate')},${esc((metrics.resolutionRate * 100).toFixed(1) + '%')}`
  );
  rows.push(
    `${esc('Avg Confidence')},${esc((metrics.avgConfidence * 100).toFixed(1) + '%')}`
  );
  rows.push(
    `${esc('First Response Median')},${esc(metrics.firstResponse.median.toFixed(1) + ' min')}`
  );
  rows.push(
    `${esc('First Response Avg')},${esc(metrics.firstResponse.avg.toFixed(1) + ' min')}`
  );
  rows.push(
    `${esc('Resolution Time Median')},${esc(metrics.resolutionTime.median.toFixed(1) + ' min')}`
  );
  rows.push(
    `${esc('Resolution Time Avg')},${esc(metrics.resolutionTime.avg.toFixed(1) + ' min')}`
  );
  rows.push(`${esc('CSAT Avg')},${metrics.csat.avgScore.toFixed(2)}`);
  rows.push(
    `${esc('Satisfaction Rate')},${esc(metrics.csat.satisfactionRate.toFixed(1) + '%')}`
  );
  rows.push('');

  // Timeseries
  rows.push(
    `${esc('Date')},${esc('Total')},${esc('Resolved')},${esc('Escalated')}`
  );
  for (const p of metrics.timeseries) {
    rows.push(`${esc(p.date)},${p.total},${p.resolved},${p.escalated}`);
  }
  rows.push('');

  // Channels
  if (metrics.channelStats.length > 0) {
    rows.push(
      [
        'Channel',
        'Volume',
        'Resolved',
        'Resolution %',
        'Avg First Resp',
        'Avg Res Time',
        'CSAT'
      ]
        .map(esc)
        .join(',')
    );
    for (const c of metrics.channelStats) {
      rows.push(
        `${esc(c.channel)},${c.volume},${c.resolved},${c.resolutionRate.toFixed(1)}%,${c.avgFirstResponse.toFixed(1)},${c.avgResolutionTime.toFixed(1)},${c.avgCsat.toFixed(2)}`
      );
    }
    rows.push('');
  }

  // Agents
  if (metrics.agentStats.length > 0) {
    rows.push(
      ['Agent', 'Resolved', 'Avg Res Time', 'CSAT', 'Active'].map(esc).join(',')
    );
    for (const a of metrics.agentStats) {
      rows.push(
        `${esc(a.agent)},${a.resolved},${a.avgResolutionTime.toFixed(1)},${a.avgCsat.toFixed(2)},${a.active}`
      );
    }
    rows.push('');
  }

  // Topics
  if (metrics.topTopics.length > 0) {
    rows.push(['Topic', 'Count', 'Avg Confidence'].map(esc).join(','));
    for (const t of metrics.topTopics) {
      rows.push(
        `${esc(t.topic)},${t.count},${(t.avgConfidence * 100).toFixed(0)}%`
      );
    }
  }

  return rows.join('\n');
}

function download(content: string, name: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportShell({
  title,
  description,
  children
}: ReportShellProps) {
  const router = useRouter();
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [timezone, setTimezone] = useState('UTC');

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

  // Export handlers
  const slug = title.toLowerCase().replace(/\s+/g, '-');
  const stamp = new Date().toISOString().split('T')[0];

  const exportCSV = () => {
    if (!metrics) return;
    download(
      metricsToCSV(metrics, title),
      `${slug}-${stamp}.csv`,
      'text/csv;charset=utf-8;'
    );
    toast.success('Exported', { description: `${slug}-${stamp}.csv` });
  };

  const exportJSON = () => {
    if (!metrics) return;
    download(
      JSON.stringify(metrics, null, 2),
      `${slug}-${stamp}.json`,
      'application/json'
    );
    toast.success('Exported', { description: `${slug}-${stamp}.json` });
  };

  // States
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
      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div className='border-b'>
        <div className='flex h-12 items-center gap-3 px-6'>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 shrink-0'
                  onClick={() => router.push('/dashboard/reports')}
                >
                  <ArrowLeft className='h-3.5 w-3.5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='bottom' className='text-xs'>
                All reports
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation='vertical' className='h-4' />

          <div className='min-w-0 flex-1'>
            <h1 className='truncate text-sm leading-tight font-semibold'>
              {title}
            </h1>
          </div>

          {/* Right controls */}
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

            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className='h-7 w-[90px] text-xs font-normal'>
                <Globe className='mr-1 h-3 w-3 opacity-40' />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='UTC'>UTC</SelectItem>
                <SelectItem value='local'>Local</SelectItem>
                <SelectItem value='EST'>EST</SelectItem>
                <SelectItem value='CET'>CET</SelectItem>
              </SelectContent>
            </Select>

            <Separator orientation='vertical' className='mx-0.5 h-4' />

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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 px-2.5 text-xs'
                  disabled={!metrics}
                >
                  <Download className='mr-1 h-3 w-3' />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-44'>
                <DropdownMenuItem onClick={exportCSV} className='text-xs'>
                  <FileSpreadsheet className='mr-2 h-3.5 w-3.5 opacity-60' />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportJSON} className='text-xs'>
                  <FileText className='mr-2 h-3.5 w-3.5 opacity-60' />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                Loading report…
              </span>
            </div>
          ) : (
            children({ metrics, dateRange, loading })
          )}
        </div>
      </div>
    </div>
  );
}
