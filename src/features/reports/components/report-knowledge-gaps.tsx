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
import { AlertTriangle, BookOpen, Search } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

export default function ReportKnowledgeGaps() {
  return (
    <ReportShell
      title='Knowledge Gaps'
      description='Topics where AI had low confidence or could not resolve'
    >
      {({ metrics }) => {
        const {
          topTopics,
          confidenceDistribution,
          avgConfidence,
          totalEscalated,
          totalConversations
        } = metrics;

        // Topics sorted by confidence (lowest first = biggest gaps)
        const gapTopics = [...topTopics].sort(
          (a, b) => a.avgConfidence - b.avgConfidence
        );

        const lowConfidenceTopics = gapTopics.filter(
          (t) => t.avgConfidence < 0.5
        );
        const medConfidenceTopics = gapTopics.filter(
          (t) => t.avgConfidence >= 0.5 && t.avgConfidence < 0.7
        );

        return (
          <div className='space-y-6'>
            {/* KPIs */}
            <div className='grid grid-cols-3 gap-3'>
              <KPI
                label='Low confidence topics'
                value={lowConfidenceTopics.length.toString()}
                sub='Confidence < 50%'
                icon={AlertTriangle}
              />
              <KPI
                label='Needs improvement'
                value={medConfidenceTopics.length.toString()}
                sub='Confidence 50–70%'
                icon={Search}
              />
              <KPI
                label='Escalation rate'
                value={
                  totalConversations > 0
                    ? `${((totalEscalated / totalConversations) * 100).toFixed(1)}%`
                    : '0%'
                }
                icon={BookOpen}
              />
            </div>

            {/* Confidence overview */}
            <Card>
              <CardContent className='p-4'>
                <p className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                  Confidence distribution
                </p>
                <div className='space-y-2'>
                  {[
                    {
                      label: 'High (≥ 0.7)',
                      count: confidenceDistribution.high
                    },
                    {
                      label: 'Medium (0.4–0.7)',
                      count: confidenceDistribution.medium
                    },
                    { label: 'Low (< 0.4)', count: confidenceDistribution.low }
                  ].map((row) => {
                    const total =
                      confidenceDistribution.high +
                      confidenceDistribution.medium +
                      confidenceDistribution.low;
                    const pct = total > 0 ? (row.count / total) * 100 : 0;
                    return (
                      <div key={row.label} className='flex items-center gap-3'>
                        <span className='w-32 text-xs font-medium'>
                          {row.label}
                        </span>
                        <div className='bg-muted relative h-5 flex-1 overflow-hidden rounded'>
                          <div
                            className='bg-foreground/15 absolute inset-y-0 left-0 rounded'
                            style={{ width: `${pct}%` }}
                          />
                          <span className='relative z-10 flex h-full items-center pl-2 text-[11px] tabular-nums'>
                            {row.count}
                            <span className='text-muted-foreground ml-1'>
                              ({pct.toFixed(1)}%)
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Gap topics table */}
            {gapTopics.length > 0 && (
              <div>
                <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                  All topics by confidence
                </h3>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-xs'>Topic</TableHead>
                        <TableHead className='text-right text-xs'>
                          Volume
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          Avg confidence
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gapTopics.map((topic) => {
                        const level =
                          topic.avgConfidence < 0.4
                            ? 'Critical'
                            : topic.avgConfidence < 0.7
                              ? 'Review'
                              : 'Good';
                        return (
                          <TableRow key={topic.topic}>
                            <TableCell className='max-w-[300px] truncate text-xs font-medium'>
                              {topic.topic}
                            </TableCell>
                            <TableCell className='text-right text-xs tabular-nums'>
                              {topic.count}
                            </TableCell>
                            <TableCell className='text-right text-xs tabular-nums'>
                              {(topic.avgConfidence * 100).toFixed(0)}%
                            </TableCell>
                            <TableCell className='text-right'>
                              <span
                                className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${
                                  level === 'Critical'
                                    ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                                    : level === 'Review'
                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                                }`}
                              >
                                {level}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            )}

            {gapTopics.length === 0 && (
              <Card>
                <CardContent className='text-muted-foreground p-6 text-center text-sm'>
                  No topic data available for this period.
                </CardContent>
              </Card>
            )}
          </div>
        );
      }}
    </ReportShell>
  );
}
