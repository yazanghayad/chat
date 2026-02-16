import PageContainer from '@/components/layout/page-container';
import SecuritySettingsClient from '@/features/settings/components/security-settings-client';

export const metadata = { title: 'Settings: Security' };

export default function SecuritySettingsPage() {
  return (
    <PageContainer scrollable>
      <SecuritySettingsClient />
    </PageContainer>
  );
}
