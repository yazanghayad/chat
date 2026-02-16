import PageContainer from '@/components/layout/page-container';
import WorkspaceMultilingualClient from '@/features/workspace/components/workspace-multilingual-client';

export const metadata = { title: 'Workspace: Multilingual' };

export default function WorkspaceMultilingualPage() {
  return (
    <PageContainer scrollable>
      <WorkspaceMultilingualClient />
    </PageContainer>
  );
}
