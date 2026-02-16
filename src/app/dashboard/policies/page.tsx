import PageContainer from '@/components/layout/page-container';
import PoliciesPageClient from '@/features/policies/components/policies-page-client';

export const metadata = { title: 'Dashboard: Policies' };

export default function PoliciesPage() {
  return (
    <PageContainer
      scrollable
      pageTitle='Policies'
      pageDescription='Configure pre- and post-generation rules for AI responses.'
    >
      <PoliciesPageClient />
    </PageContainer>
  );
}
