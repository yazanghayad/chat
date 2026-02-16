import PageContainer from '@/components/layout/page-container';
import AnalyticsPageClient from '@/features/analytics/components/analytics-page-client';

export const metadata = { title: 'Dashboard: Analytics' };

export default function AnalyticsPage() {
  return (
    <PageContainer
      scrollable
      pageTitle='Analytics'
      pageDescription='Monitor AI resolution rates, confidence scores, and content gaps.'
    >
      <AnalyticsPageClient />
    </PageContainer>
  );
}
