import PageContainer from '@/components/layout/page-container';
import WorkspaceGeneralClient from '@/features/workspace/components/workspace-general-client';

export const metadata = { title: 'Workspace: General' };

export default function WorkspaceGeneralPage() {
  return (
    <PageContainer scrollable>
      <WorkspaceGeneralClient />
    </PageContainer>
  );
}
