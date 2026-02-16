import PageContainer from '@/components/layout/page-container';
import SettingsHubClient from '@/features/settings/components/settings-hub-client';

export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <PageContainer scrollable pageTitle='Settings' pageDescription=''>
      <SettingsHubClient />
    </PageContainer>
  );
}
