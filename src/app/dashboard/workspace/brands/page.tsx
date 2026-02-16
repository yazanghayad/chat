import PageContainer from '@/components/layout/page-container';
import WorkspaceBrandsClient from '@/features/workspace/components/workspace-brands-client';

export const metadata = { title: 'Workspace: Brands' };

export default function WorkspaceBrandsPage() {
  return (
    <PageContainer scrollable>
      <WorkspaceBrandsClient />
    </PageContainer>
  );
}
