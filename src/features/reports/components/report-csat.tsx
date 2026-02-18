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
import { Star, ThumbsUp, Bot, User } from 'lucide-react';

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

export default function ReportCSAT() {
  return (
    <ReportShell
      title='Customer Satisfaction'
      description='CSAT scores and sentiment breakdown'
    >
      {({ metrics }) => {
        const { csat } = metrics;

        const sentimentRows = [
          {
            label: 'Positive (4-5)',
            count: csat.positive,
            pct:
              csat.totalRatings > 0
                ? (csat.positive / csat.totalRatings) * 100
                : 0
          },
          {
            label: 'Neutral (3)',
            count: csat.neutral,
            pct:
              csat.totalRatings > 0
                ? (csat.neutral / csat.totalRatings) * 100
                : 0
          },
          {
            label: 'Negative (1-2)',
            count: csat.negative,
            pct:
              csat.totalRatings > 0
                ? (csat.negative / csat.totalRatings) * 100
                : 0
          }
        ];

        return (
          <div className='space-y-6'>
            {/* KPIs */}
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
              <KPI
                label='CSAT Score'
                value={csat.avgScore.toFixed(2)}
                sub='out of 5.0'
                icon={Star}
              />
              <KPI
                label='Satisfaction'
                value={`${csat.satisfactionRate.toFixed(1)}%`}
                sub={`${csat.totalRatings} ratings`}
                icon={ThumbsUp}
              />
              <KPI
                label='AI CSAT'
                value={csat.aiCsatAvg.toFixed(2)}
                sub='Automated'
                icon={Bot}
              />
              <KPI
                label='Human CSAT'
                value={csat.humanCsatAvg.toFixed(2)}
                sub='Agent-assisted'
                icon={User}
              />
            </div>

            {/* Sentiment distribution */}
            <div>
              <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                Sentiment breakdown
              </h3>
              <Card>
                <CardContent className='space-y-3 p-4'>
                  {sentimentRows.map((row) => (
                    <div key={row.label} className='flex items-center gap-3'>
                      <span className='w-28 text-xs font-medium'>
                        {row.label}
                      </span>
                      <div className='bg-muted relative h-5 flex-1 overflow-hidden rounded'>
                        <div
                          className='bg-foreground/15 absolute inset-y-0 left-0 rounded'
                          style={{
                            width: `${Math.min(row.pct, 100).toFixed(1)}%`
                          }}
                        />
                        <span className='relative z-10 flex h-full items-center pl-2 text-[11px] tabular-nums'>
                          {row.count}
                          <span className='text-muted-foreground ml-1'>
                            ({row.pct.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* AI vs Human comparison */}
            <div>
              <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                AI vs Human CSAT
              </h3>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs'>Handler</TableHead>
                      <TableHead className='text-right text-xs'>
                        Avg CSAT
                      </TableHead>
                      <TableHead className='text-right text-xs'>
                        vs. overall
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { label: 'AI (automated)', val: csat.aiCsatAvg },
                      { label: 'Human agents', val: csat.humanCsatAvg }
                    ].map((row) => {
                      const diff = row.val - csat.avgScore;
                      return (
                        <TableRow key={row.label}>
                          <TableCell className='text-xs font-medium'>
                            {row.label}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {row.val.toFixed(2)}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            <span
                              className={
                                diff > 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : diff < 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-muted-foreground'
                              }
                            >
                              {diff > 0 ? '+' : ''}
                              {diff.toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Total ratings note */}
            <div className='text-muted-foreground border-t pt-4 text-xs'>
              Based on {csat.totalRatings} customer ratings collected during
              this period.
            </div>
          </div>
        );
      }}
    </ReportShell>
  );
}
