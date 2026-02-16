'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { getAnalyticsAction } from '@/features/analytics/actions/analytics-actions';
import {
  listSuggestionsAction,
  approveSuggestionAction,
  dismissSuggestionAction
} from '@/features/analytics/actions/suggestion-crud';
import type { AnalyticsMetrics } from '@/lib/analytics/analytics-engine';
import type { ContentSuggestion } from '@/types/appwrite';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function AnalyticsPageClient() {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const [metricsRes, suggestionsRes] = await Promise.all([
      getAnalyticsAction(tenant.$id, 30),
      listSuggestionsAction(tenant.$id, 'pending')
    ]);
    if (metricsRes.success && metricsRes.metrics) {
      setMetrics(metricsRes.metrics);
    }
    if (suggestionsRes.success) {
      setSuggestions(suggestionsRes.suggestions ?? []);
    }
    setLoading(false);
  }, [tenant]);

  useEffect(() => {
    if (tenant) load();
  }, [tenant, load]);

  async function handleApprove(id: string) {
    const res = await approveSuggestionAction(id, tenant!.$id);
    if (res.success) {
      setSuggestions((prev) => prev.filter((s) => s.$id !== id));
      toast.success('Approved and added to knowledge base');
    } else {
      toast.error(res.error ?? 'Failed to approve');
    }
  }

  async function handleDismiss(id: string) {
    const res = await dismissSuggestionAction(id, tenant!.$id);
    if (res.success) {
      setSuggestions((prev) => prev.filter((s) => s.$id !== id));
      toast.success('Suggestion dismissed');
    } else {
      toast.error(res.error ?? 'Failed to dismiss');
    }
  }

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

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <Tabs defaultValue='overview' className='space-y-4'>
      <TabsList>
        <TabsTrigger value='overview'>Overview</TabsTrigger>
        <TabsTrigger value='suggestions'>
          AI Suggestions
          {suggestions.length > 0 && (
            <Badge variant='secondary' className='ml-1.5'>
              {suggestions.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value='overview' className='space-y-4'>
        {/* Metric Cards */}
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <MetricCard
            title='Resolution Rate'
            value={`${metrics?.resolutionRate?.toFixed(1) ?? 0}%`}
          />
          <MetricCard
            title='Avg Confidence'
            value={`${((metrics?.avgConfidence ?? 0) * 100).toFixed(0)}%`}
          />
          <MetricCard
            title='Total Conversations'
            value={String(metrics?.totalConversations ?? 0)}
          />
          <MetricCard
            title='Escalations'
            value={String(metrics?.totalEscalated ?? 0)}
          />
        </div>

        {/* Status Breakdown */}
        <div className='grid gap-4 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                <BreakdownRow
                  label='Resolved'
                  value={metrics?.totalResolved ?? 0}
                  total={metrics?.totalConversations ?? 1}
                  color='bg-green-500'
                />
                <BreakdownRow
                  label='Active'
                  value={metrics?.totalActive ?? 0}
                  total={metrics?.totalConversations ?? 1}
                  color='bg-blue-500'
                />
                <BreakdownRow
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
              <CardTitle className='text-base'>Channel Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {Object.entries(metrics?.channelBreakdown ?? {}).map(
                  ([ch, count]) => (
                    <BreakdownRow
                      key={ch}
                      label={ch.charAt(0).toUpperCase() + ch.slice(1)}
                      value={count}
                      total={metrics?.totalConversations ?? 1}
                      color='bg-primary'
                    />
                  )
                )}
                {Object.keys(metrics?.channelBreakdown ?? {}).length === 0 && (
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
              <CardTitle className='text-base'>Top Topics</CardTitle>
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
                        {topic.count} conversation{topic.count !== 1 ? 's' : ''}
                      </span>
                      <Badge variant='outline'>
                        {(topic.avgConfidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Suggestions Tab */}
      <TabsContent value='suggestions' className='space-y-4'>
        {suggestions.length === 0 ? (
          <Card>
            <CardContent className='py-12 text-center'>
              <p className='text-muted-foreground'>
                No pending content suggestions. The AI will suggest new content
                when it detects knowledge gaps.
              </p>
            </CardContent>
          </Card>
        ) : (
          suggestions.map((s) => (
            <Card key={s.$id}>
              <CardHeader>
                <CardTitle className='text-base'>{s.topic}</CardTitle>
                <CardDescription>
                  {s.frequency} customer{s.frequency !== 1 ? 's' : ''} asked
                  about this
                </CardDescription>
              </CardHeader>
              <CardContent>
                {s.exampleQueries && s.exampleQueries.length > 0 && (
                  <>
                    <p className='text-muted-foreground mb-1 text-xs font-medium'>
                      Example queries:
                    </p>
                    <ul className='text-muted-foreground mb-3 space-y-1 text-sm'>
                      {s.exampleQueries.slice(0, 3).map((q, i) => (
                        <li key={i}>• {q}</li>
                      ))}
                    </ul>
                    <Separator className='my-3' />
                  </>
                )}
                <div className='prose prose-sm dark:prose-invert max-h-48 overflow-auto rounded border p-3 text-sm'>
                  {s.suggestedContent}
                </div>
              </CardContent>
              <CardFooter className='gap-2'>
                <Button size='sm' onClick={() => handleApprove(s.$id)}>
                  ✓ Approve & Add
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleDismiss(s.$id)}
                >
                  Dismiss
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardDescription className='text-xs'>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className='text-2xl font-bold'>{value}</p>
      </CardContent>
    </Card>
  );
}

function BreakdownRow({
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
      <div className='flex items-center justify-between text-sm'>
        <span>{label}</span>
        <span className='text-muted-foreground'>
          {value} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className='bg-muted h-2 overflow-hidden rounded-full'>
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
