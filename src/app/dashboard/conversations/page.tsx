import PageContainer from '@/components/layout/page-container';
import ConversationsPageClient from '@/features/conversation/components/conversations-page-client';

export const metadata = { title: 'Dashboard: Conversations' };

export default function ConversationsPage() {
  return (
    <PageContainer
      scrollable
      pageTitle='Conversations'
      pageDescription='Monitor and manage customer support conversations across all channels.'
    >
      <ConversationsPageClient />
    </PageContainer>
  );
}
