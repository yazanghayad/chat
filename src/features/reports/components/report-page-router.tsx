'use client';

import dynamic from 'next/dynamic';

const REPORT_COMPONENTS: Record<string, React.ComponentType> = {
  conversations: dynamic(() => import('./report-conversations')),
  'first-response': dynamic(() => import('./report-first-response')),
  'resolution-time': dynamic(() => import('./report-resolution-time')),
  csat: dynamic(() => import('./report-csat')),
  'fin-performance': dynamic(() => import('./report-fin-performance')),
  'fin-deflection': dynamic(() => import('./report-fin-deflection')),
  'knowledge-gaps': dynamic(() => import('./report-knowledge-gaps')),
  'team-performance': dynamic(() => import('./report-team-performance')),
  'busiest-hours': dynamic(() => import('./report-busiest-hours')),
  channels: dynamic(() => import('./report-channels'))
};

export default function ReportPageClient({ slug }: { slug: string }) {
  const Component = REPORT_COMPONENTS[slug];

  if (!Component) {
    return (
      <div className='flex flex-col items-center justify-center py-20'>
        <p className='text-muted-foreground text-lg'>Report not found</p>
        <a
          href='/dashboard/reports'
          className='text-primary mt-2 text-sm underline'
        >
          Back to Reports
        </a>
      </div>
    );
  }

  return <Component />;
}
