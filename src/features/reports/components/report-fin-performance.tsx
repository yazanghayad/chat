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
import { Bot, Target, Gauge, CheckCircle } from 'lucide-react';

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

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportFinPerformance() {
  return (
    <ReportShell
      title='Fin AI Performance'
      description='AI resolution rate, confidence, and accuracy metrics'
    >
      {({ metrics }) => {
        const {
          resolutionRate,
          avgConfidence,
          totalResolved,
          totalConversations,
          confidenceDistribution,
          confidenceScores
        } = metrics;

        // Accuracy proxy: % of resolved conversations with confidence >= 0.7
        const highConfidenceResolved = confidenceScores.filter(
          (s) => s >= 0.7
        ).length;
        const accuracy =
          confidenceScores.length > 0
            ? highConfidenceResolved / confidenceScores.length
            : 0;

        const distTotal =
          confidenceDistribution.high +
          confidenceDistribution.medium +
          confidenceDistribution.low;

        const distRows = [
          {
            label: 'High (≥ 0.7)',
            count: confidenceDistribution.high,
            pct:
              distTotal > 0
                ? (confidenceDistribution.high / distTotal) * 100
                : 0
          },
          {
            label: 'Medium (0.4–0.7)',
            count: confidenceDistribution.medium,
            pct:
              distTotal > 0
                ? (confidenceDistribution.medium / distTotal) * 100
                : 0
          },
          {
            label: 'Low (< 0.4)',
            count: confidenceDistribution.low,
            pct:
              distTotal > 0 ? (confidenceDistribution.low / distTotal) * 100 : 0
          }
        ];

        return (
          <div className='space-y-6'>
            {/* KPIs */}
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
              <KPI
                label='Resolution rate'
                value={pct(resolutionRate)}
                sub={`${totalResolved} of ${totalConversations}`}
                icon={CheckCircle}
              />
              <KPI
                label='Avg confidence'
                value={pct(avgConfidence)}
                icon={Gauge}
              />
              <KPI
                label='Accuracy'
                value={pct(accuracy)}
                sub='Confidence ≥ 0.7'
                icon={Target}
              />
              <KPI
                label='Total resolved'
                value={totalResolved.toLocaleString()}
                icon={Bot}
              />
            </div>

            {/* Resolution rate bar */}
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-baseline gap-2'>
                  <span className='text-3xl font-semibold tabular-nums'>
                    {pct(resolutionRate)}
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

            {/* Confidence distribution */}
            <div>
              <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                Confidence distribution
              </h3>
              <Card>
                <CardContent className='space-y-2 p-4'>
                  {distRows.map((row) => (
                    <div key={row.label} className='flex items-center gap-3'>
                      <span className='w-32 text-xs font-medium'>
                        {row.label}
                      </span>
                      <div className='bg-muted relative h-5 flex-1 overflow-hidden rounded'>
                        <div
                          className='bg-foreground/15 absolute inset-y-0 left-0 rounded'
                          style={{ width: `${Math.min(row.pct, 100)}%` }}
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

            {/* Performance summary table */}
            <div>
              <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                Performance summary
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
                        AI resolution rate
                      </TableCell>
                      <TableCell className='text-right text-xs tabular-nums'>
                        {pct(resolutionRate)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className='text-xs font-medium'>
                        Average confidence
                      </TableCell>
                      <TableCell className='text-right text-xs tabular-nums'>
                        {pct(avgConfidence)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className='text-xs font-medium'>
                        High-confidence accuracy
                      </TableCell>
                      <TableCell className='text-right text-xs tabular-nums'>
                        {pct(accuracy)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className='text-xs font-medium'>
                        Total conversations analyzed
                      </TableCell>
                      <TableCell className='text-right text-xs tabular-nums'>
                        {confidenceScores.length.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>
        );
      }}
    </ReportShell>
  );
}
