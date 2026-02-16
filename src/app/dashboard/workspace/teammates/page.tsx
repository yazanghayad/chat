import PageContainer from '@/components/layout/page-container';
import WorkspaceTeammatesClient from '@/features/workspace/components/workspace-teammates-client';

export const metadata = { title: 'Workspace: Teammates' };

export default function WorkspaceTeammatesPage() {
  return (
    <PageContainer scrollable>
      <WorkspaceTeammatesClient />
    </PageContainer>
  );
}
