import PageContainer from '@/components/layout/page-container';
import ReportPageClient from '@/features/reports/components/report-page-router';

// Map slug → metadata titles
const REPORT_TITLES: Record<string, string> = {
  conversations: 'Conversations Report',
  'first-response': 'First Response Time',
  'resolution-time': 'Resolution Time',
  csat: 'Customer Satisfaction',
  'fin-performance': 'SWEO AI Performance',
  'fin-deflection': 'Fin Deflection Rate',
  'knowledge-gaps': 'Knowledge Gaps',
  'team-performance': 'Team Performance',
  'busiest-hours': 'Busiest Hours',
  channels: 'Channels Overview'
};

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: REPORT_TITLES[slug] ?? 'Report' };
}

export default async function ReportSlugPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PageContainer scrollable>
      <ReportPageClient slug={slug} />
    </PageContainer>
  );
}
