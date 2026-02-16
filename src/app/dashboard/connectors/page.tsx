import PageContainer from '@/components/layout/page-container';
import ConnectorsPageClient from '@/features/connectors/components/connectors-page-client';

export const metadata = { title: 'Dashboard: Connectors' };

export default function ConnectorsPage() {
  return (
    <PageContainer
      scrollable
      pageTitle='Data Connectors'
      pageDescription='Integrate third-party services for AI procedures to query and act on.'
    >
      <ConnectorsPageClient />
    </PageContainer>
  );
}
