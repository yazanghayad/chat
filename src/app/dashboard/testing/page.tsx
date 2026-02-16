import PageContainer from '@/components/layout/page-container';
import TestingPageClient from '@/features/testing/components/testing-page-client';

export const metadata = { title: 'Dashboard: Testing' };

export default function TestingPage() {
  return (
    <PageContainer
      scrollable
      pageTitle='AI Testing'
      pageDescription='Run simulated conversations to validate AI behavior before deploying.'
    >
      <TestingPageClient />
    </PageContainer>
  );
}
