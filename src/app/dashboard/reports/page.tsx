import PageContainer from '@/components/layout/page-container';
import ReportsPageClient from '@/features/reports/components/reports-page-client';

export const metadata = { title: 'Reports' };

export default function ReportsPage() {
  return (
    <PageContainer scrollable pageTitle='Reports' pageDescription=''>
      <ReportsPageClient />
    </PageContainer>
  );
}
