import PageContainer from '@/components/layout/page-container';
import ProceduresPageClient from '@/features/procedures/components/procedures-page-client';

export const metadata = { title: 'Dashboard: Procedures' };

export default function ProceduresPage() {
  return (
    <PageContainer
      scrollable
      pageTitle='Procedures'
      pageDescription='Create multi-step AI workflows with triggers, conditions, and actions.'
    >
      <ProceduresPageClient />
    </PageContainer>
  );
}
