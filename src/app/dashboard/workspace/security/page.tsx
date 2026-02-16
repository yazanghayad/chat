import PageContainer from '@/components/layout/page-container';
import WorkspaceSecurityClient from '@/features/workspace/components/workspace-security-client';

export const metadata = { title: 'Workspace: Security' };

export default function WorkspaceSecurityPage() {
  return (
    <PageContainer scrollable>
      <WorkspaceSecurityClient />
    </PageContainer>
  );
}
