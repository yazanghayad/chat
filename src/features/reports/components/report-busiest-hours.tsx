'use client';

import ReportShell from './report-shell';
import { Card, CardContent } from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_LABELS = HOURS.map((h) =>
  h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportBusiestHours() {
  return (
    <ReportShell
      title='Busiest Hours'
      description='Conversation volume by time of day and day of week'
    >
      {({ metrics }) => {
        const { hourlyDistribution, dailyDistribution, heatmap } = metrics;

        const maxHourly = Math.max(...hourlyDistribution, 1);
        const maxDaily = Math.max(...dailyDistribution, 1);
        const maxHeat = Math.max(...heatmap.flatMap((r) => r), 1);

        // Peak hour
        const peakHourIdx = hourlyDistribution.indexOf(
          Math.max(...hourlyDistribution)
        );
        const peakDayIdx = dailyDistribution.indexOf(
          Math.max(...dailyDistribution)
        );

        return (
          <div className='space-y-6'>
            {/* Peak summary */}
            <div className='grid grid-cols-2 gap-3'>
              <Card>
                <CardContent className='p-4'>
                  <p className='text-muted-foreground text-[11px] font-medium tracking-wider uppercase'>
                    Peak hour
                  </p>
                  <p className='mt-0.5 text-xl font-semibold'>
                    {HOUR_LABELS[peakHourIdx]}
                  </p>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    {hourlyDistribution[peakHourIdx]} conversations
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className='p-4'>
                  <p className='text-muted-foreground text-[11px] font-medium tracking-wider uppercase'>
                    Peak day
                  </p>
                  <p className='mt-0.5 text-xl font-semibold'>
                    {DAY_LABELS[peakDayIdx]}
                  </p>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    {dailyDistribution[peakDayIdx]} conversations
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Heatmap */}
            <div>
              <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                Weekly heatmap
              </h3>
              <Card>
                <CardContent className='overflow-x-auto p-4'>
                  <div className='min-w-[600px]'>
                    {/* Hour labels */}
                    <div className='mb-1 flex'>
                      <div className='w-10 shrink-0' />
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className='text-muted-foreground flex-1 text-center text-[9px]'
                        >
                          {h % 3 === 0 ? HOUR_LABELS[h] : ''}
                        </div>
                      ))}
                    </div>
                    {/* Rows */}
                    {DAY_LABELS.map((day, dayIdx) => (
                      <div key={day} className='flex items-center'>
                        <div className='text-muted-foreground w-10 shrink-0 text-[10px] font-medium'>
                          {day}
                        </div>
                        <div className='flex flex-1 gap-px'>
                          {HOURS.map((h) => {
                            const val = heatmap[dayIdx]
                              ? (heatmap[dayIdx][h] ?? 0)
                              : 0;
                            const intensity = maxHeat > 0 ? val / maxHeat : 0;
                            return (
                              <div
                                key={h}
                                className='bg-muted flex-1 rounded-[2px]'
                                style={{
                                  height: '18px',
                                  backgroundColor:
                                    intensity > 0
                                      ? `oklch(0.55 0.15 250 / ${(intensity * 0.85 + 0.1).toFixed(2)})`
                                      : undefined
                                }}
                                title={`${day} ${HOUR_LABELS[h]}: ${val}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {/* Legend */}
                    <div className='mt-2 flex items-center justify-end gap-1.5'>
                      <span className='text-muted-foreground text-[9px]'>
                        Less
                      </span>
                      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                        <div
                          key={v}
                          className='h-2.5 w-2.5 rounded-[2px]'
                          style={{
                            backgroundColor:
                              v > 0
                                ? `oklch(0.55 0.15 250 / ${(v * 0.85 + 0.1).toFixed(2)})`
                                : 'var(--color-muted)'
                          }}
                        />
                      ))}
                      <span className='text-muted-foreground text-[9px]'>
                        More
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Hourly distribution */}
            <div>
              <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                Hourly distribution
              </h3>
              <Card>
                <CardContent className='p-4'>
                  <div
                    className='flex items-end gap-px'
                    style={{ height: 120 }}
                  >
                    {hourlyDistribution.map((val, i) => {
                      const h = maxHourly > 0 ? (val / maxHourly) * 100 : 0;
                      return (
                        <div
                          key={i}
                          className='group relative flex-1'
                          title={`${HOUR_LABELS[i]}: ${val}`}
                        >
                          <div
                            className='bg-foreground/15 hover:bg-foreground/25 mx-auto w-full rounded-t transition-colors'
                            style={{ height: `${Math.max(h, 2)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className='mt-1 flex'>
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className='text-muted-foreground flex-1 text-center text-[8px]'
                      >
                        {h % 4 === 0 ? HOUR_LABELS[h] : ''}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily distribution */}
            <div>
              <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                Daily distribution
              </h3>
              <Card>
                <CardContent className='space-y-2 p-4'>
                  {DAY_LABELS.map((day, i) => {
                    const val = dailyDistribution[i] ?? 0;
                    const pct = maxDaily > 0 ? (val / maxDaily) * 100 : 0;
                    return (
                      <div key={day} className='flex items-center gap-3'>
                        <span className='w-10 text-xs font-medium'>{day}</span>
                        <div className='bg-muted relative h-5 flex-1 overflow-hidden rounded'>
                          <div
                            className='bg-foreground/15 absolute inset-y-0 left-0 rounded'
                            style={{ width: `${pct}%` }}
                          />
                          <span className='relative z-10 flex h-full items-center pl-2 text-[11px] tabular-nums'>
                            {val}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        );
      }}
    </ReportShell>
  );
}
