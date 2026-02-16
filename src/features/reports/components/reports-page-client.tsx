'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { getAnalyticsAction } from '@/features/analytics/actions/analytics-actions';
import type { AnalyticsMetrics } from '@/lib/analytics/analytics-engine';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bot,
  Calendar,
  Clock,
  Download,
  Filter,
  Globe,
  MessageSquare,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportItem {
  id: string;
  name: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const reports: ReportItem[] = [
  {
    id: 'conversations',
    name: 'Conversations',
    category: 'Conversations',
    icon: MessageSquare,
    description: 'Overview of all conversations and trends'
  },
  {
    id: 'first-response',
    name: 'First response time',
    category: 'Conversations',
    icon: Clock,
    description: 'How quickly your team responds'
  },
  {
    id: 'resolution-time',
    name: 'Resolution time',
    category: 'Conversations',
    icon: Clock,
    description: 'Time to resolve conversations'
  },
  {
    id: 'csat',
    name: 'Customer satisfaction',
    category: 'Conversations',
    icon: TrendingUp,
    description: 'CSAT scores and trends'
  },
  {
    id: 'fin-performance',
    name: 'SWEO AI performance',
    category: 'AI & Automation',
    icon: Bot,
    description: 'AI resolution rate and accuracy'
  },
  {
    id: 'fin-deflection',
    name: 'Fin deflection rate',
    category: 'AI & Automation',
    icon: Zap,
    description: 'Conversations resolved without human'
  },
  {
    id: 'knowledge-gaps',
    name: 'Knowledge gaps',
    category: 'AI & Automation',
    icon: BarChart3,
    description: 'Topics where AI lacks information'
  },
  {
    id: 'team-performance',
    name: 'Team performance',
    category: 'Team',
    icon: Users,
    description: 'Agent workload and performance metrics'
  },
  {
    id: 'busiest-hours',
    name: 'Busiest hours',
    category: 'Team',
    icon: Clock,
    description: 'Peak conversation times'
  },
  {
    id: 'channels',
    name: 'Channels overview',
    category: 'Channels',
    icon: Globe,
    description: 'Volume and performance by channel'
  }
];

const reportCategories = [
  'All',
  'Conversations',
  'AI & Automation',
  'Team',
  'Channels'
];

export default function ReportsPageClient() {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [activeCategory, setActiveCategory] = useState('All');
  const [timezone, setTimezone] = useState('UTC');

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const res = await getAnalyticsAction(tenant.$id, parseInt(dateRange));
    if (res.success && res.metrics) {
      setMetrics(res.metrics);
    }
    setLoading(false);
  }, [tenant, dateRange]);

  useEffect(() => {
    if (tenant) load();
  }, [tenant, load]);

  if (tenantLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (tenantError || !tenant) {
    return (
      <div className='text-destructive py-20 text-center'>
        {tenantError ?? 'Could not load tenant'}
      </div>
    );
  }

  const filteredReports =
    activeCategory === 'All'
      ? reports
      : reports.filter((r) => r.category === activeCategory);

  return (
    <div className='space-y-6 pb-8'>
      {/* Header Controls */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className='h-8 w-[150px] text-xs'>
              <Calendar className='mr-1.5 h-3.5 w-3.5' />
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
            <SelectTrigger className='h-8 w-[140px] text-xs'>
              <Globe className='mr-1.5 h-3.5 w-3.5' />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='UTC'>UTC</SelectItem>
              <SelectItem value='local'>Local Time</SelectItem>
              <SelectItem value='EST'>EST</SelectItem>
              <SelectItem value='CET'>CET</SelectItem>
            </SelectContent>
          </Select>
          <Button variant='outline' size='sm' className='h-8 text-xs'>
            <Filter className='mr-1.5 h-3.5 w-3.5' />
            Filters
          </Button>
        </div>
        <Button variant='outline' size='sm' className='h-8 text-xs'>
          <Download className='mr-1.5 h-3.5 w-3.5' />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <Icons.spinner className='text-muted-foreground h-6 w-6 animate-spin' />
        </div>
      ) : (
        <>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <MetricCard
              title='Total Conversations'
              value={metrics?.totalConversations ?? 0}
              change={12.5}
              icon={MessageSquare}
            />
            <MetricCard
              title='Resolution Rate'
              value={`${metrics?.resolutionRate?.toFixed(1) ?? 0}%`}
              change={5.2}
              icon={TrendingUp}
            />
            <MetricCard
              title='Avg Confidence'
              value={`${((metrics?.avgConfidence ?? 0) * 100).toFixed(0)}%`}
              change={3.1}
              icon={Bot}
            />
            <MetricCard
              title='Escalations'
              value={metrics?.totalEscalated ?? 0}
              change={-8.3}
              icon={Users}
            />
          </div>

          {/* Charts Row */}
          <div className='grid gap-4 md:grid-cols-2'>
            {/* Bar Chart — How you're handling conversations */}
            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>
                  How you&apos;re handling conversations
                </CardTitle>
                <CardDescription className='text-xs'>
                  Breakdown by resolution method
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  <ChartBar
                    label='Resolved by Fin'
                    value={metrics?.totalResolved ?? 0}
                    total={metrics?.totalConversations ?? 1}
                    color='bg-purple-500'
                  />
                  <ChartBar
                    label='Resolved by Agent'
                    value={Math.floor((metrics?.totalResolved ?? 0) * 0.3)}
                    total={metrics?.totalConversations ?? 1}
                    color='bg-blue-500'
                  />
                  <ChartBar
                    label='Escalated'
                    value={metrics?.totalEscalated ?? 0}
                    total={metrics?.totalConversations ?? 1}
                    color='bg-orange-500'
                  />
                  <ChartBar
                    label='Active / Pending'
                    value={metrics?.totalActive ?? 0}
                    total={metrics?.totalConversations ?? 1}
                    color='bg-green-500'
                  />
                </div>
              </CardContent>
            </Card>

            {/* Volume Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Overall volume growth</CardTitle>
                <CardDescription className='text-xs'>
                  Conversations over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Simple visual chart representation */}
                <div className='flex h-40 items-end gap-1'>
                  {Array.from({
                    length: parseInt(dateRange) > 14 ? 14 : parseInt(dateRange)
                  }).map((_, i) => {
                    const height = 20 + Math.random() * 80;
                    return (
                      <div
                        key={i}
                        className='bg-primary/20 hover:bg-primary/40 flex-1 rounded-t transition-colors'
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                </div>
                <div className='text-muted-foreground mt-2 flex justify-between text-[10px]'>
                  <span>
                    {new Date(
                      Date.now() - parseInt(dateRange) * 86400000
                    ).toLocaleDateString()}
                  </span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Channel & Status Breakdown */}
          <div className='grid gap-4 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  <ChartBar
                    label='Resolved'
                    value={metrics?.totalResolved ?? 0}
                    total={metrics?.totalConversations ?? 1}
                    color='bg-green-500'
                  />
                  <ChartBar
                    label='Active'
                    value={metrics?.totalActive ?? 0}
                    total={metrics?.totalConversations ?? 1}
                    color='bg-blue-500'
                  />
                  <ChartBar
                    label='Escalated'
                    value={metrics?.totalEscalated ?? 0}
                    total={metrics?.totalConversations ?? 1}
                    color='bg-orange-500'
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Channel Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {Object.entries(metrics?.channelBreakdown ?? {}).map(
                    ([ch, count]) => (
                      <ChartBar
                        key={ch}
                        label={ch.charAt(0).toUpperCase() + ch.slice(1)}
                        value={count}
                        total={metrics?.totalConversations ?? 1}
                        color='bg-primary'
                      />
                    )
                  )}
                  {Object.keys(metrics?.channelBreakdown ?? {}).length ===
                    0 && (
                    <p className='text-muted-foreground text-sm'>No data yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Topics */}
          {metrics?.topTopics && metrics.topTopics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Top Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {metrics.topTopics.slice(0, 10).map((topic, i) => (
                    <div
                      key={i}
                      className='flex items-center justify-between text-sm'
                    >
                      <span>{topic.topic}</span>
                      <div className='flex items-center gap-3'>
                        <span className='text-muted-foreground'>
                          {topic.count} conversation
                          {topic.count !== 1 ? 's' : ''}
                        </span>
                        <Badge variant='outline' className='text-[10px]'>
                          {(topic.avgConfidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Separator />

      {/* Reports Catalog */}
      <div>
        <h3 className='mb-3 text-sm font-semibold'>Reports</h3>

        {/* Category Tabs */}
        <div className='mb-4 flex gap-1'>
          {reportCategories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'default' : 'outline'}
              size='sm'
              className='h-7 text-xs'
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Report List */}
        <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {filteredReports.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                className='hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 text-left transition-colors'
              >
                <div className='bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-lg'>
                  <Icon className='text-muted-foreground h-4 w-4' />
                </div>
                <div>
                  <p className='text-sm font-medium'>{report.name}</p>
                  <p className='text-muted-foreground text-xs'>
                    {report.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <Card>
      <CardContent className='pt-4'>
        <div className='flex items-center justify-between'>
          <div className='bg-muted flex h-8 w-8 items-center justify-center rounded-lg'>
            <Icon className='text-muted-foreground h-4 w-4' />
          </div>
          {change != null && (
            <Badge
              variant='outline'
              className={cn(
                'text-[10px]',
                isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {isPositive ? (
                <ArrowUp className='mr-0.5 h-2.5 w-2.5' />
              ) : (
                <ArrowDown className='mr-0.5 h-2.5 w-2.5' />
              )}
              {Math.abs(change).toFixed(1)}%
            </Badge>
          )}
        </div>
        <p className='mt-3 text-2xl font-bold'>{value}</p>
        <p className='text-muted-foreground text-xs'>{title}</p>
      </CardContent>
    </Card>
  );
}

function ChartBar({
  label,
  value,
  total,
  color
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between text-xs'>
        <span>{label}</span>
        <span className='text-muted-foreground'>
          {value} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className='bg-muted h-2 overflow-hidden rounded-full'>
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
