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
import { Users, Clock, Star, Activity } from 'lucide-react';

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

export default function ReportTeamPerformance() {
  return (
    <ReportShell
      title='Team Performance'
      description='Agent workload, resolution times, and satisfaction scores'
    >
      {({ metrics }) => {
        const { agentStats } = metrics;

        const totalAgents = agentStats.length;
        const totalResolved = agentStats.reduce((s, a) => s + a.resolved, 0);
        const totalActive = agentStats.reduce((s, a) => s + a.active, 0);
        const avgResTime =
          totalAgents > 0
            ? agentStats.reduce((s, a) => s + a.avgResolutionTime, 0) /
              totalAgents
            : 0;
        const avgCsat =
          totalAgents > 0
            ? agentStats.reduce((s, a) => s + a.avgCsat, 0) / totalAgents
            : 0;

        // Sort by resolved desc
        const sorted = [...agentStats].sort((a, b) => b.resolved - a.resolved);

        return (
          <div className='space-y-6'>
            {/* KPIs */}
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
              <KPI label='Agents' value={totalAgents.toString()} icon={Users} />
              <KPI
                label='Total resolved'
                value={totalResolved.toLocaleString()}
                icon={Activity}
              />
              <KPI
                label='Avg resolution'
                value={fmtMin(avgResTime)}
                icon={Clock}
              />
              <KPI
                label='Avg CSAT'
                value={avgCsat.toFixed(2)}
                sub='Team average'
                icon={Star}
              />
            </div>

            {/* Agent table */}
            {sorted.length > 0 ? (
              <div>
                <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                  Individual performance
                </h3>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-xs'>Agent</TableHead>
                        <TableHead className='text-right text-xs'>
                          Resolved
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          Active
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          Avg resolution
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          CSAT
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sorted.map((agent) => (
                        <TableRow key={agent.agent}>
                          <TableCell className='text-xs font-medium'>
                            {agent.agent}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {agent.resolved.toLocaleString()}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {agent.active}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {fmtMin(agent.avgResolutionTime)}
                          </TableCell>
                          <TableCell className='text-right text-xs tabular-nums'>
                            {agent.avgCsat.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className='text-muted-foreground p-6 text-center text-sm'>
                  No agent data available. Agents appear when conversations are
                  assigned via the assignedTo field.
                </CardContent>
              </Card>
            )}

            {/* Workload distribution */}
            {sorted.length > 0 && (
              <div>
                <h3 className='text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase'>
                  Workload distribution
                </h3>
                <Card>
                  <CardContent className='space-y-2 p-4'>
                    {sorted.map((agent) => {
                      const pct =
                        totalResolved > 0
                          ? (agent.resolved / totalResolved) * 100
                          : 0;
                      return (
                        <div
                          key={agent.agent}
                          className='flex items-center gap-3'
                        >
                          <span className='w-32 truncate text-xs font-medium'>
                            {agent.agent}
                          </span>
                          <div className='bg-muted relative h-5 flex-1 overflow-hidden rounded'>
                            <div
                              className='bg-foreground/15 absolute inset-y-0 left-0 rounded'
                              style={{ width: `${pct}%` }}
                            />
                            <span className='relative z-10 flex h-full items-center pl-2 text-[11px] tabular-nums'>
                              {agent.resolved}
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
          </div>
        );
      }}
    </ReportShell>
  );
}
