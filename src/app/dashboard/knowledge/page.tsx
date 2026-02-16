import PageContainer from '@/components/layout/page-container';
import KnowledgePageClient from '@/features/knowledge/components/knowledge-page-client';

export const metadata = {
  title: 'Dashboard: Knowledge Sources'
};

export default function KnowledgePage() {
  return (
    <PageContainer
      scrollable
      pageTitle='Knowledge Sources'
      pageDescription='Upload documents and URLs to build your AI support knowledge base.'
    >
      <KnowledgePageClient />
    </PageContainer>
  );
}
